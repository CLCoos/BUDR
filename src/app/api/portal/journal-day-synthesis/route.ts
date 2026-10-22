import { NextRequest, NextResponse } from 'next/server';
import { getStaffPermissions } from '@/lib/auth/getStaffPermissions';
import { hasPermission } from '@/lib/auth/hasPermission';
import { callAnthropicJournalPolish } from '@/lib/ai/anthropicJournalPolish';
import { fetchDiaryDraftRowsForSynthesis } from '@/lib/journalEntriesQueryCompat';
import { PERMISSIONS } from '@/lib/permissions';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { parseStaffOrgId } from '@/lib/staffOrgScope';
import { claudeApiKey } from '@/lib/ai/claudeTransport';
import type { ResidentNameRow } from '@/lib/assistant/names';
import { buildDaySynthesisRequest } from '@/lib/journal/daySynthesisPrompt';
import { loadResidents } from '@/lib/assistant/server';

export const maxDuration = 60;

function copenhagenYmd(d: Date): string {
  return new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Copenhagen',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

/**
 * POST /api/portal/journal-day-synthesis
 * Body: { resident_id: string }
 * Samler dagens kladder (vis i dagbog) for beboeren til ét professionelt notat.
 */
export async function POST(req: NextRequest) {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const permissions = await getStaffPermissions(supabase);
  if (!hasPermission(permissions, PERMISSIONS.VIEW_JOURNAL)) {
    return NextResponse.json({ error: 'Ingen adgang' }, { status: 403 });
  }

  const orgId = parseStaffOrgId(user.user_metadata?.org_id);
  if (!orgId) {
    return NextResponse.json({ error: 'Organisation mangler' }, { status: 403 });
  }

  let body: { resident_id?: string };
  try {
    body = (await req.json()) as { resident_id?: string };
  } catch {
    return NextResponse.json({ error: 'Ugyldig JSON' }, { status: 400 });
  }

  const residentId = typeof body.resident_id === 'string' ? body.resident_id.trim() : '';
  if (!residentId) {
    return NextResponse.json({ error: 'Manglende resident_id' }, { status: 400 });
  }

  const { data: cr, error: crErr } = await supabase
    .from('care_residents')
    .select('user_id, first_name, last_name, display_name, nickname')
    .eq('user_id', residentId)
    .eq('org_id', orgId)
    .maybeSingle();

  if (crErr || !cr) {
    return NextResponse.json({ error: 'Beboer ikke fundet eller ingen adgang' }, { status: 403 });
  }

  const todayYmd = copenhagenYmd(new Date());
  const since = new Date(Date.now() - 40 * 3600 * 1000).toISOString();

  const { rows: rawRows, error: fetchErr } = await fetchDiaryDraftRowsForSynthesis(
    supabase,
    residentId,
    since
  );

  if (fetchErr) {
    console.error('[journal-day-synthesis] fetch journal_entries:', fetchErr.message);
    return NextResponse.json(
      {
        error:
          'Kunne ikke hente journal — tjek database-migrationer (journal_status / show_in_diary)',
      },
      { status: 500 }
    );
  }

  const rows = rawRows.filter((r) => copenhagenYmd(new Date(r.created_at)) === todayYmd);

  if (rows.length === 0) {
    return NextResponse.json(
      { error: 'Ingen kladder med «Vis i dagbog» fra i dag til denne beboer' },
      { status: 400 }
    );
  }

  const key = claudeApiKey();
  if (!key) return NextResponse.json({ error: 'AI ikke konfigureret' }, { status: 503 });

  // Personalets navne sendes ikke med; borgerens navn skjules, og svaret får initialer.
  const others = await loadResidents(supabase, orgId);
  const { request, restore } = buildDaySynthesisRequest({
    resident: cr as ResidentNameRow,
    others,
    notes: rows.map((r) => ({
      time: new Date(r.created_at).toLocaleTimeString('da-DK', {
        hour: '2-digit',
        minute: '2-digit',
        timeZone: 'Europe/Copenhagen',
      }),
      category: r.category,
      text: r.entry_text,
    })),
  });

  const ai = await callAnthropicJournalPolish({ apiKey: key, ...request });

  if (!ai.ok) {
    console.error(
      '[journal-day-synthesis] anthropic:',
      ai.lastModel,
      ai.status,
      ai.body.slice(0, 400)
    );
    if (ai.status === 401) {
      return NextResponse.json(
        { error: 'Ugyldig Anthropic API-nøgle på serveren' },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: 'AI svarer ikke — prøv igen' }, { status: 502 });
  }

  return NextResponse.json({ text: restore(ai.text), sourceCount: rows.length });
}
