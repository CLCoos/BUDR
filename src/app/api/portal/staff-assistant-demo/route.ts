import { NextRequest, NextResponse } from 'next/server';
import { parseBudrFollowUpsBlock } from '@/lib/portalStaffAssistantFollowUps';
import { CARE_DEMO_RESIDENT_PROFILES } from '@/lib/careDemoResidents';
import { CARE_PORTAL_DEMO_FACILITY_NAME } from '@/lib/carePortalDemoBranding';
import { claudeApiKey, claudeMessagesFetch } from '@/lib/ai/claudeTransport';
import { checkApiRateLimit, getClientIp } from '@/lib/apiRateLimit';
import { residentAliasMap } from '@/lib/ai/aliases';
import { buildStaffAssistantSystem } from '@/lib/assistant/staffAssistantPrompt';

/**
 * Public demo endpoint for /care-portal-demo/assistant — same Anthropic integration as
 * staff-assistant, but with static demo beboer-kontekst (ingen login).
 */
export async function POST(req: NextRequest) {
  const rl = checkApiRateLimit('staff-assistant-demo', getClientIp(req), 15, 10 * 60_000);
  if (!rl.ok) {
    return NextResponse.json(
      { error: 'Demoen har fået mange spørgsmål på kort tid. Prøv igen om lidt.' },
      { status: 429, headers: { 'Retry-After': String(rl.retryAfterSec) } }
    );
  }

  let body: { messages?: Array<{ role: 'user' | 'assistant'; content: string }> };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const messages = (Array.isArray(body.messages) ? body.messages : [])
    .slice(-12)
    .map((m) => ({
      role: m.role === 'assistant' ? ('assistant' as const) : ('user' as const),
      content: typeof m.content === 'string' ? m.content.slice(0, 2000) : '',
    }))
    .filter((m) => m.content.trim().length > 0);
  if (messages.length === 0) {
    return NextResponse.json({ error: 'No messages' }, { status: 400 });
  }

  const key = claudeApiKey();
  if (!key) return NextResponse.json({ error: 'AI ikke konfigureret' }, { status: 503 });

  // Også demoens fiktive borgere står med initialer i svaret.
  const demoRows = CARE_DEMO_RESIDENT_PROFILES.map((r) => ({
    user_id: r.id,
    first_name: null,
    last_name: null,
    display_name: r.displayName,
    nickname: null,
  }));
  const aliases = residentAliasMap(demoRows);
  const residentLines = CARE_DEMO_RESIDENT_PROFILES.map(
    (r, i) => `• ${aliases.alias(i)} (beboer-id: ${r.id}), hus ${r.house}, værelse ${r.room}`
  );

  const system = buildStaffAssistantSystem({
    residentLines,
    stedet: `Dette er en interaktiv demo af BUDR (${CARE_PORTAL_DEMO_FACILITY_NAME}, fiktivt). Der er ingen rigtige journaldata. Svar som om borgerne ovenfor findes, og henvis til demoens sider, hvor det giver mening.`,
    residentTabs:
      'demo: overblik, medicin, dagsplan, plan, haven, notes, goals, medication eller aftaler',
  });
  const aiMessages = messages.map((m) => ({ ...m, content: aliases.hide(m.content) }));
  while (aiMessages[0]?.role === 'assistant') aiMessages.shift();
  if (aiMessages.length === 0) {
    return NextResponse.json({ error: 'No messages' }, { status: 400 });
  }

  const res = await claudeMessagesFetch(
    {
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 900,
      temperature: 0.3,
      system,
      messages: aiMessages,
    },
    { apiKey: key }
  );

  if (!res.ok) {
    const err = await res.text();
    console.error('[staff-assistant-demo] anthropic error:', res.status, err);
    return NextResponse.json({ error: 'AI svarer ikke — prøv igen' }, { status: 502 });
  }

  const data = (await res.json()) as { content?: Array<{ type?: string; text?: string }> };
  const block = data.content?.find((c) => c.type === 'text');
  const text = block?.text ? aliases.restore(block.text.trim()) : '';

  if (!text) {
    return NextResponse.json({ error: 'Tomt svar fra AI' }, { status: 502 });
  }

  const { text: cleanText, followUps } = parseBudrFollowUpsBlock(text);

  return NextResponse.json({
    text: cleanText || text.replace(/<budr_followups>[\s\S]*?<\/budr_followups>/gi, '').trim(),
    followUps,
  });
}
