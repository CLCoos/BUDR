import { NextResponse } from 'next/server';
import { getResidentId } from '@/lib/residentAuth';
import { createServerSupabaseClient } from '@/lib/supabase/server';

const UI_TO_DB: Record<string, string> = {
  groen: 'grøn',
  gul: 'gul',
  roed: 'rød',
};

interface CheckinBody {
  mood_score: number;
  traffic_light: string;
  note?: string;
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

  const { mood_score, traffic_light, note } = body;

  if (typeof mood_score !== 'number' || mood_score < 1 || mood_score > 10) {
    return NextResponse.json({ error: 'mood_score must be 1–10' }, { status: 422 });
  }
  const dbTraffic = UI_TO_DB[traffic_light];
  if (!dbTraffic) {
    return NextResponse.json({ error: 'Invalid traffic_light value' }, { status: 422 });
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
  }

  const { error } = await supabase.from('park_daily_checkin').insert({
    resident_id: residentId,
    mood_score,
    traffic_light: dbTraffic,
    note: note?.trim() || null,
    created_at: new Date().toISOString(),
  });

  if (error) {
    console.error('[daily-checkin] insert error:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
