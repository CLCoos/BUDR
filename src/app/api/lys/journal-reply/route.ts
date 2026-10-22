import { NextRequest, NextResponse } from 'next/server';
import { getResidentId } from '@/lib/residentAuth';
import { callAnthropicJournalPolish } from '@/lib/ai/anthropicJournalPolish';
import { claudeApiKey } from '@/lib/ai/claudeTransport';
import { buildLysJournalReplyRequest } from '@/lib/lys/journalReplyPrompt';
import { checkApiRateLimit, getClientIp } from '@/lib/apiRateLimit';

export async function POST(req: NextRequest) {
  const residentId = await getResidentId();
  if (!residentId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const rl = checkApiRateLimit(
    'lys-journal-reply',
    `${residentId}:${getClientIp(req)}`,
    20,
    60_000
  );
  if (!rl.ok) return NextResponse.json({ error: 'For mange forsøg' }, { status: 429 });

  let body: { content?: unknown; mood?: unknown; phase?: unknown; history?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const { content, ...request } = buildLysJournalReplyRequest(body);
  if (!content) return NextResponse.json({ error: 'Tomt indlæg' }, { status: 400 });

  const key = claudeApiKey();
  if (!key) return NextResponse.json({ error: 'AI ikke konfigureret' }, { status: 503 });

  const result = await callAnthropicJournalPolish({ apiKey: key, ...request });
  if (!result.ok) return NextResponse.json({ error: 'AI svarer ikke' }, { status: 502 });
  return NextResponse.json({ text: result.text });
}
