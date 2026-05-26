// BUDR — API Route: Daily Check-in (trivselspuls)
// Skriver til lys_checkin med optional CHIME-domæne-scores.
// Trigger notification ved rød traffic light eller mood_score ≤ 3.

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getResidentId } from '@/lib/residentAuth';

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } }
  );
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
