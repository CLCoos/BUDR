import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createServerSupabaseClient } from '@/lib/supabase/server';

/**
 * POST /api/portal/mood-alert
 *
 * Called from the client when a real-time park_daily_checkin INSERT arrives
 * with a red traffic light (mood 1–2). Inserts a care_portal_notifications row
 * using the service role so that RLS (which blocks INSERT for authenticated
 * staff) is bypassed.
 *
 * Deduplication: if an unacknowledged mood_alert already exists for the same
 * resident, the insert is skipped to avoid flooding the alert panel.
 */
export async function POST(request: Request) {
  // Verify the caller is an authenticated portal staff member.
  const staffClient = await createServerSupabaseClient();
  if (!staffClient) {
    return NextResponse.json({ error: 'not_configured' }, { status: 503 });
  }
  const {
    data: { user },
  } = await staffClient.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: 'unauthorized' }, { status: 401 });
  }

  // Parse + validate body.
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  const residentId =
    body !== null &&
    typeof body === 'object' &&
    'resident_id' in body &&
    typeof (body as Record<string, unknown>).resident_id === 'string'
      ? ((body as Record<string, unknown>).resident_id as string).trim()
      : null;

  if (!residentId) {
    return NextResponse.json({ error: 'missing_resident_id' }, { status: 400 });
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) {
    return NextResponse.json({ error: 'service_role_not_configured' }, { status: 503 });
  }

  const admin = createClient(url, serviceKey);

  // Deduplication: skip if an unacknowledged mood_alert already exists.
  const { data: existing, error: checkErr } = await admin
    .from('care_portal_notifications')
    .select('id')
    .eq('resident_id', residentId)
    .eq('type', 'mood_alert')
    .is('acknowledged_at', null)
    .maybeSingle();

  if (checkErr) {
    return NextResponse.json({ error: checkErr.message }, { status: 500 });
  }
  if (existing) {
    return NextResponse.json({ ok: true, deduplicated: true });
  }

  const { error: insertErr } = await admin.from('care_portal_notifications').insert({
    resident_id: residentId,
    type: 'mood_alert',
    detail: 'Lav stemning registreret — følg op',
    severity: 'roed',
    source_table: 'park_daily_checkin',
  });

  if (insertErr) {
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true }, { status: 201 });
}
