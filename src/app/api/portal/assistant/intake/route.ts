import { NextResponse } from 'next/server';
import { UUID_RE, readJson, requireStaff } from '@/app/api/portal/documents/_auth';
import { callAnthropicJournalPolish } from '@/lib/ai/anthropicJournalPolish';
import { checkApiRateLimit } from '@/lib/apiRateLimit';
import type { AssistantAction } from '@/lib/assistant/actions';
import { INTAKE_SYSTEM, buildIntakeMessage, parseIntakeResponse } from '@/lib/assistant/intake';
import {
  findResidentsInText,
  replaceNames,
  residentLabel,
  residentNames,
  restoreName,
} from '@/lib/assistant/names';
import { loadResidents } from '@/lib/assistant/server';
import { firstName } from '@/lib/assistant/generators';
import { copenhagenYmd } from '@/lib/copenhagenDay';
import { PERMISSIONS } from '@/lib/permissions';

export const maxDuration = 60;

function restoreAction(a: AssistantAction, name: string): AssistantAction {
  switch (a.type) {
    case 'journal_note':
      return { ...a, text: restoreName(a.text, name) };
    case 'task':
      return { ...a, title: restoreName(a.title, name) };
    case 'calendar':
      return { ...a, title: restoreName(a.title, name) };
    case 'medication_request':
    case 'handover':
      return { ...a, text: restoreName(a.text, name) };
  }
}

/**
 * POST /api/portal/assistant/intake — { text, resident_id?, context? }
 * Medarbejderen fortæller med almindelige ord; assistenten foreslår notater, opgaver og aftaler.
 * Intet gemmes her. Navne erstattes før AI og sættes ind igen bagefter.
 */
export async function POST(req: Request) {
  const ctx = await requireStaff(PERMISSIONS.WRITE_JOURNAL);
  if ('error' in ctx) return ctx.error;

  const body = await readJson(req);
  const text = typeof body?.text === 'string' ? body.text.trim().slice(0, 3000) : '';
  if (text.length < 3) {
    return NextResponse.json({ error: 'Skriv lidt om hvad der er sket' }, { status: 400 });
  }
  const context = typeof body?.context === 'string' ? body.context.trim().slice(0, 400) : '';

  const residents = await loadResidents(ctx.supabase, ctx.orgId);
  let resident = null as (typeof residents)[number] | null;
  if (typeof body?.resident_id === 'string' && UUID_RE.test(body.resident_id)) {
    resident = residents.find((r) => r.user_id === body.resident_id) ?? null;
    if (!resident) return NextResponse.json({ error: 'Ukendt borger' }, { status: 404 });
  } else {
    const found = findResidentsInText(text, residents);
    if (found.length !== 1) {
      return NextResponse.json({
        needsResident: true,
        candidates: found.map((r) => ({ id: r.user_id, name: residentLabel(r) })),
      });
    }
    resident = found[0]!;
  }

  const limit = checkApiRateLimit('assistant-intake', ctx.user.id, 60, 60 * 60 * 1000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: 'Assistenten har fået mange beskeder på kort tid. Prøv igen om lidt.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSec) } }
    );
  }

  const key = process.env.ANTHROPIC_API_KEY;
  if (!key) return NextResponse.json({ error: 'AI ikke konfigureret' }, { status: 503 });

  // Borgeren → "Borgeren"; andre borgere → "en medbeboer". Ingen navne forlader serveren.
  const others = residents.filter((r) => r.user_id !== resident!.user_id).flatMap(residentNames);
  const own = residentNames(resident);
  const clean = (t: string) =>
    replaceNames(replaceNames(t, own, 'Borgeren'), others, 'en medbeboer');
  const today = copenhagenYmd();
  const userMessage = [
    context ? `Assistenten spurgte: "${clean(context)}"` : null,
    buildIntakeMessage(clean(text), today),
  ]
    .filter(Boolean)
    .join('\n\n');

  const result = await callAnthropicJournalPolish({
    apiKey: key,
    system: INTAKE_SYSTEM,
    userMessage,
    maxTokens: 1500,
  });
  if (!result.ok) {
    console.error('[assistant intake] anthropic failed:', result.lastModel, result.status);
    return NextResponse.json(
      { error: 'Assistenten svarer ikke lige nu. Prøv igen.' },
      { status: 502 }
    );
  }

  const parsed = parseIntakeResponse(result.text, today);
  if (!parsed) {
    console.error('[assistant intake] kunne ikke læse svar');
    return NextResponse.json(
      { error: 'Assistenten svarede uforståeligt. Prøv igen.' },
      { status: 502 }
    );
  }

  const name = firstName(resident);
  return NextResponse.json({
    resident: { id: resident.user_id, name: residentLabel(resident) },
    summary: restoreName(parsed.summary, name),
    actions: parsed.actions.map((a) => restoreAction(a, name)),
  });
}
