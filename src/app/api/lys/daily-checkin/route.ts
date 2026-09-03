// BUDR — API Route: Daily Check-in (trivselspuls)
// Skriver til lys_checkin med optional CHIME-domæne-scores.
// Trigger notification ved rød traffic light eller mood_score ≤ 3.

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getResidentId } from '@/lib/residentAuth';
import { copenhagenStartOfDateUtcIso, copenhagenYmd } from '@/lib/copenhagenDay';
import { addCalendarDays } from '@/lib/lysCheckinHistory';
import { journalQueryMissingColumn } from '@/lib/journalEntriesQueryCompat';

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

// UI sender ASCII-koder; DB bruger dansk æøå
const UI_TO_DB: Record<string, string> = {
  groen: 'grøn',
  gul: 'gul',
  roed: 'rød',
};

interface CheckinBody {
  mood_score: number;
  traffic_light: string;
  mood_label?: string;
  note?: string;
  voice_transcript?: string;
  ai_summary?: string;
  // CHIME-domæne-scores (alle optional, 1-10 hvis sendt)
  connectedness_score?: number;
  hope_score?: number;
  identity_score?: number;
  meaning_score?: number;
  empowerment_score?: number;
}

function validateScore(score: number | undefined): number | null {
  if (typeof score !== 'number') return null;
  if (score < 1 || score > 10) return null;
  return Math.round(score);
}

function clampHistoryDays(raw: string | null): number {
  const n = Number(raw ?? '30');
  if (!Number.isFinite(n)) return 30;
  return Math.min(90, Math.max(1, Math.round(n)));
}

/**
 * Cookie + service-role history for Lys «Mig».
 * Browser RLS on lys_checkin is staff-only; the compat view park_daily_checkin
 * also lacks the legacy check_in_date / energy_level columns the UI used to select.
 */
export async function GET(req: Request): Promise<NextResponse> {
  const residentId = await getResidentId();
  if (!residentId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const days = clampHistoryDays(new URL(req.url).searchParams.get('days'));

  if (!isUuid(residentId)) {
    return NextResponse.json({ checkins: [], demo: true });
  }

  const supabase = getServiceClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
  }

  const today = copenhagenYmd();
  const fromYmd = addCalendarDays(today, -(days - 1));
  const sinceIso = copenhagenStartOfDateUtcIso(fromYmd);

  const selectCols = 'created_at, mood_score';
  let { data, error } = await supabase
    .from('lys_checkin')
    .select(selectCols)
    .eq('resident_id', residentId)
    .eq('checkin_type', 'daily')
    .not('mood_score', 'is', null)
    .gte('created_at', sinceIso)
    .order('created_at', { ascending: true });

  if (error && journalQueryMissingColumn(error.message, 'checkin_type')) {
    const retry = await supabase
      .from('lys_checkin')
      .select(selectCols)
      .eq('resident_id', residentId)
      .not('mood_score', 'is', null)
      .gte('created_at', sinceIso)
      .order('created_at', { ascending: true });
    data = retry.data;
    error = retry.error;
  }

  if (error) {
    console.error('[daily-checkin] history error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const checkins = ((data ?? []) as Array<{ created_at: string; mood_score: number | null }>)
    .filter((row) => typeof row.mood_score === 'number')
    .map((row) => ({ created_at: row.created_at, mood_score: row.mood_score }));

  return NextResponse.json({ checkins });
}

export async function POST(req: Request): Promise<NextResponse> {
  const residentId = await getResidentId();
  if (!residentId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: CheckinBody;
  try {
    body = (await req.json()) as CheckinBody;
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { mood_score, traffic_light, mood_label, note, voice_transcript, ai_summary } = body;

  if (typeof mood_score !== 'number' || mood_score < 1 || mood_score > 10) {
    return NextResponse.json({ error: 'mood_score must be 1–10' }, { status: 422 });
  }
  const dbTraffic = UI_TO_DB[traffic_light];
  if (!dbTraffic) {
    return NextResponse.json({ error: 'Invalid traffic_light value' }, { status: 422 });
  }

  // Demo-session: returner success uden DB-write
  if (!isUuid(residentId)) {
    return NextResponse.json({ ok: true, demo: true });
  }

  const supabase = getServiceClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
  }

  // Hent org_id
  const { data: residentRow } = await supabase
    .from('care_residents')
    .select('org_id')
    .eq('user_id', residentId)
    .maybeSingle();
  const orgId = (residentRow as { org_id?: string } | null)?.org_id ?? null;

  // Insert checkin med CHIME-scores
  const { data: inserted, error } = await supabase
    .from('lys_checkin')
    .insert({
      resident_id: residentId,
      org_id: orgId,
      mood_score: Math.round(mood_score),
      mood_label: mood_label?.trim() || null,
      traffic_light: dbTraffic,
      free_text: note?.trim() || null,
      voice_transcript:
        typeof voice_transcript === 'string' ? voice_transcript.trim() || null : null,
      ai_summary: typeof ai_summary === 'string' ? ai_summary.trim() || null : null,
      connectedness_score: validateScore(body.connectedness_score),
      hope_score: validateScore(body.hope_score),
      identity_score: validateScore(body.identity_score),
      meaning_score: validateScore(body.meaning_score),
      empowerment_score: validateScore(body.empowerment_score),
      created_at: new Date().toISOString(),
    })
    .select('id')
    .single();

  if (error) {
    console.error('[daily-checkin] insert error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Audit log
  try {
    await supabase.rpc('create_audit_log', {
      p_actor_type: 'resident',
      p_action: 'checkin.submitted',
      p_actor_id: residentId,
      p_actor_org_id: orgId,
      p_target_table: 'lys_checkin',
      p_target_id: (inserted as { id: string }).id,
      p_metadata: {
        mood_score,
        traffic_light: dbTraffic,
      },
    });
  } catch {
    // best-effort
  }

  // Notification trigger ved rød traffic light eller mood ≤ 3
  if (mood_score <= 3 || dbTraffic === 'rød') {
    // Kun opret hvis ingen unacknowledged lav_stemning-notification eksisterer
    const { data: existing } = await supabase
      .from('care_portal_notifications')
      .select('id')
      .eq('resident_id', residentId)
      .eq('type', 'lav_stemning')
      .is('acknowledged_at', null)
      .maybeSingle();

    if (!existing) {
      const trafficLabel = dbTraffic === 'rød' ? 'Rød trafiklys' : 'Gul trafiklys';
      const detail = `Stemningsscore ${mood_score}/10 · ${trafficLabel}`;
      const severity = mood_score <= 3 || dbTraffic === 'rød' ? 'roed' : 'gul';

      await supabase.from('care_portal_notifications').insert({
        resident_id: residentId,
        type: 'lav_stemning',
        detail,
        severity,
        source_table: 'lys_checkin',
        org_id: orgId,
      });
    }
  }

  return NextResponse.json({ ok: true, checkin_id: (inserted as { id: string }).id });
}
