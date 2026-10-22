import { NextRequest, NextResponse } from 'next/server';
import { callAnthropicJournalPolish } from '@/lib/ai/anthropicJournalPolish';
import { claudeApiKey } from '@/lib/ai/claudeTransport';
import { requireStaffForAi } from '@/lib/ai/staffAiAuth';
import { buildOverrapportRequest, type OverrapportResidentIn } from '@/lib/overrapport/aiPrompt';
import { PERMISSIONS } from '@/lib/permissions';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const auth = await requireStaffForAi(PERMISSIONS.VIEW_RESIDENTS);
  if (!auth.ok) return auth.response;

  let body: { residents?: OverrapportResidentIn[]; dateStr?: unknown; timeStr?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  const residents = Array.isArray(body.residents) ? body.residents : [];
  if (residents.length === 0) {
    return NextResponse.json({ error: 'Ingen borgere' }, { status: 400 });
  }

  const key = claudeApiKey();
  if (!key) return NextResponse.json({ error: 'AI ikke konfigureret' }, { status: 503 });

  const { restore, ...request } = buildOverrapportRequest(residents, body.dateStr, body.timeStr);
  const result = await callAnthropicJournalPolish({ apiKey: key, ...request });
  if (!result.ok) {
    console.error('[ai/overrapport] failed:', result.lastModel, result.status);
    return NextResponse.json({ error: 'AI svarer ikke' }, { status: 502 });
  }
  return NextResponse.json({ text: restore(result.text) });
}
