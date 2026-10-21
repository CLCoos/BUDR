import { NextRequest, NextResponse } from 'next/server';
import { getStaffPermissions } from '@/lib/auth/getStaffPermissions';
import { hasPermission } from '@/lib/auth/hasPermission';
import { callAnthropicJournalPolish } from '@/lib/ai/anthropicJournalPolish';
import { PERMISSIONS } from '@/lib/permissions';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { claudeApiKey } from '@/lib/ai/claudeTransport';
import { buildJournalPolishRequest } from '@/lib/journal/polishPrompt';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const permissions = await getStaffPermissions(supabase);
  if (!hasPermission(permissions, PERMISSIONS.WRITE_JOURNAL)) {
    return NextResponse.json({ error: 'Ingen adgang' }, { status: 403 });
  }

  let body: { draft?: string; text?: string; category?: string; residentLabel?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const draft = (body.draft ?? body.text ?? '').trim();
  if (!draft) return NextResponse.json({ error: 'Tomt udkast' }, { status: 400 });

  const key = claudeApiKey();
  if (!key) return NextResponse.json({ error: 'AI ikke konfigureret' }, { status: 503 });

  const request = buildJournalPolishRequest({
    draft,
    category: body.category,
    residentLabel: body.residentLabel,
  });
  const result = await callAnthropicJournalPolish({ apiKey: key, ...request });

  if (!result.ok) {
    console.error(
      '[journal-polish] anthropic failed:',
      result.lastModel,
      result.status,
      result.body.slice(0, 500)
    );
    if (result.status === 401) {
      return NextResponse.json(
        { error: 'Ugyldig Anthropic API-nøgle på serveren' },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: 'AI svarer ikke — prøv igen' }, { status: 502 });
  }

  return NextResponse.json({ text: result.text, polished: result.text });
}
