import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getResidentId } from '@/lib/residentAuth';

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

const MIN_RESIDENT_AGE_DAYS = 3;
const WEEKLY_INTERVAL_DAYS = 7;

interface StatusResponse {
  shouldShowBanner: boolean;
  daysSinceLast: number | null;
  residentAgeDays: number;
  reason: 'eligible' | 'too_new' | 'too_recent' | 'no_resident';
}

export async function GET() {
  const residentId = await getResidentId();
  if (!residentId) return NextResponse.json({ error: 'unauthorized' }, { status: 401 });

  const supabase = getServiceClient();
  if (!supabase) {
    return NextResponse.json({ error: 'server_not_configured' }, { status: 503 });
  }

  const { data: resident, error: residentErr } = await supabase
    .from('care_residents')
    .select('created_at')
    .eq('user_id', residentId)
    .maybeSingle();

  if (residentErr) {
    return NextResponse.json({ error: residentErr.message }, { status: 500 });
  }

  if (!resident) {
    const payload: StatusResponse = {
      shouldShowBanner: false,
      daysSinceLast: null,
      residentAgeDays: 0,
      reason: 'no_resident',
    };
    return NextResponse.json(payload);
  }

  const createdAt = (resident as { created_at: string }).created_at;
  const residentAgeMs = Date.now() - new Date(createdAt).getTime();
  const residentAgeDays = Math.floor(residentAgeMs / (1000 * 60 * 60 * 24));

  if (residentAgeDays < MIN_RESIDENT_AGE_DAYS) {
    const payload: StatusResponse = {
      shouldShowBanner: false,
      daysSinceLast: null,
      residentAgeDays,
      reason: 'too_new',
    };
    return NextResponse.json(payload);
  }

  const { data: lastWeekly, error: weeklyErr } = await supabase
    .from('lys_checkin')
    .select('created_at')
    .eq('resident_id', residentId)
    .eq('checkin_type', 'weekly')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (weeklyErr) {
    return NextResponse.json({ error: weeklyErr.message }, { status: 500 });
  }

  let daysSinceLast: number | null = null;
  if (lastWeekly) {
    const diffMs =
      Date.now() - new Date((lastWeekly as { created_at: string }).created_at).getTime();
    daysSinceLast = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  }

  if (daysSinceLast !== null && daysSinceLast < WEEKLY_INTERVAL_DAYS) {
    const payload: StatusResponse = {
      shouldShowBanner: false,
      daysSinceLast,
      residentAgeDays,
      reason: 'too_recent',
    };
    return NextResponse.json(payload);
  }

  const payload: StatusResponse = {
    shouldShowBanner: true,
    daysSinceLast,
    residentAgeDays,
    reason: 'eligible',
  };
  return NextResponse.json(payload);
}
