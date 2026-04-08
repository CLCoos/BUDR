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

const UI_TO_DB: Record<string, string> = {
  groen: 'grøn',
  gul: 'gul',
  roed: 'rød',
};

interface CheckinBody {
  mood_score: number;
  traffic_light: string;
  note?: string;
  voice_transcript?: string;
  ai_summary?: string;
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

  const { mood_score, traffic_light, note, voice_transcript, ai_summary } = body;

  if (typeof mood_score !== 'number' || mood_score < 1 || mood_score > 10) {
    return NextResponse.json({ error: 'mood_score must be 1–10' }, { status: 422 });
  }
  const dbTraffic = UI_TO_DB[traffic_light];
  if (!dbTraffic) {
    return NextResponse.json({ error: 'Invalid traffic_light value' }, { status: 422 });
  }

  // Service role: RLS på park_daily_checkin tillader ikke anon/uden staff-JWT indsættelse
  const supabase = getServiceClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
  }

  const { error } = await supabase.from('park_daily_checkin').insert({
    resident_id: residentId,
    mood_score,
    traffic_light: dbTraffic,
    note: note?.trim() || null,
    voice_transcript: typeof voice_transcript === 'string' ? voice_transcript.trim() || null : null,
    ai_summary: typeof ai_summary === 'string' ? ai_summary.trim() || null : null,
    created_at: new Date().toISOString(),
  });

  if (error) {
    console.error('[daily-checkin] insert error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Fire alert notification for low mood or red traffic light
  if (mood_score <= 3 || traffic_light === 'roed') {
    const serviceClient = getServiceClient();

    // Only create if no unacknowledged lav_stemning alert already exists for this resident
    const { data: existing } = await serviceClient
      .from('care_portal_notifications')
      .select('id')
      .eq('resident_id', residentId)
      .eq('type', 'lav_stemning')
      .is('acknowledged_at', null)
      .maybeSingle();

    if (!existing) {
      const trafficLabel = traffic_light === 'roed' ? 'Rød trafiklys' : 'Gul trafiklys';
      const detail = `Stemningsscore ${mood_score}/10 · ${trafficLabel}`;
      const severity = mood_score <= 3 || traffic_light === 'roed' ? 'roed' : 'gul';

      await serviceClient.from('care_portal_notifications').insert({
        resident_id: residentId,
        type: 'lav_stemning',
        detail,
        severity,
        source_table: 'park_daily_checkin',
      });
    }
  }

  return NextResponse.json({ ok: true });
}
