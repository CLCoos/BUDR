import { NextRequest, NextResponse } from 'next/server';
import { callAnthropicJournalPolish } from '@/lib/ai/anthropicJournalPolish';
import { checkApiRateLimit } from '@/lib/apiRateLimit';
import { PERMISSIONS } from '@/lib/permissions';
import {
  STATUS_REPORT_SYSTEM,
  buildSectionUserMessage,
  buildSourceText,
  cleanSectionText,
} from '@/lib/statusReport/prompt';
import { getStatusReportSection } from '@/lib/statusReport/sections';
import { collectStatusReportSources, hasAnySource } from '@/lib/statusReport/sources';
import { UUID_RE, requireStaff } from '../../_auth';

export const maxDuration = 60;

type Params = { params: Promise<{ id: string }> };

/**
 * POST /api/portal/status-reports/[id]/draft
 * Body: { section } — skriver et AI-udkast til ét afsnit ud fra borgerens data i perioden.
 * Gemmer ikke; klienten indsætter teksten og gemmer selv, så personalet altid har sidste ord.
 */
export async function POST(req: NextRequest, { params }: Params) {
  const ctx = await requireStaff(PERMISSIONS.WRITE_JOURNAL);
  if ('error' in ctx) return ctx.error;
  const { id } = await params;
  if (!UUID_RE.test(id)) return NextResponse.json({ error: 'invalid_id' }, { status: 400 });

  const limit = checkApiRateLimit('status-report-draft', ctx.user.id, 60, 60 * 60 * 1000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: 'For mange udkast på kort tid. Prøv igen om lidt.' },
      { status: 429, headers: { 'Retry-After': String(limit.retryAfterSec) } }
    );
  }

  let body: { section?: unknown };
  try {
    body = (await req.json()) as { section?: unknown };
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  const section =
    typeof body.section === 'string' ? getStatusReportSection(body.section) : undefined;
  if (!section || !section.aiDraft) {
    return NextResponse.json({ error: 'Ukendt afsnit' }, { status: 400 });
  }

  const { data: report, error: readErr } = await ctx.supabase
    .from('resident_status_reports')
    .select('resident_id, org_id, period_start, period_end, status')
    .eq('id', id)
    .maybeSingle();
  if (readErr) return NextResponse.json({ error: readErr.message }, { status: 500 });
  if (!report || report.org_id !== ctx.orgId) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }
  if (report.status === 'faerdig') {
    return NextResponse.json({ error: 'Udtalelsen er markeret som færdig' }, { status: 409 });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return NextResponse.json({ error: 'AI er ikke sat op' }, { status: 503 });

  const sources = await collectStatusReportSources(ctx.supabase, {
    residentId: report.resident_id as string,
    orgId: ctx.orgId,
    periodStart: report.period_start as string,
    periodEnd: report.period_end as string,
  });
  if (!hasAnySource(sources)) {
    return NextResponse.json({
      text: '[Udfyldes af personalet: der er ingen data i BUDR for perioden]',
      empty: true,
    });
  }

  const preferred = process.env.ANTHROPIC_STATUS_REPORT_MODEL?.trim();
  const ai = await callAnthropicJournalPolish({
    apiKey,
    system: STATUS_REPORT_SYSTEM,
    userMessage: buildSectionUserMessage(section, buildSourceText(sources)),
    maxTokens: 1000,
    preferredModels: preferred ? [preferred] : [],
  });
  if (!ai.ok) {
    console.error('[status-report-draft] AI-fejl', ai.status, ai.lastModel);
    return NextResponse.json({ error: 'AI-tjenesten svarede ikke. Prøv igen.' }, { status: 502 });
  }

  return NextResponse.json({ text: cleanSectionText(ai.text, section.title) });
}
