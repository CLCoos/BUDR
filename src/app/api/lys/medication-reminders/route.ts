import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getResidentId } from '@/lib/residentAuth';
import { isValidUuid } from '@/lib/uuid';

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

function copenhagenYmd(d = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Copenhagen',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(d);
}

/**
 * GET /api/lys/medication-reminders
 * Lists today's open medication reminders for the cookie-bound resident.
 * Service role is required: Lys residents use session cookies, not auth.uid().
 */
export async function GET(): Promise<NextResponse> {
  const residentId = await getResidentId();
  if (!residentId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!isValidUuid(residentId)) {
    return NextResponse.json({ reminders: [], demo: true });
  }

  const supabase = getServiceClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Server ikke konfigureret' }, { status: 503 });
  }

  const today = copenhagenYmd();
  const { data, error } = await supabase
    .from('medication_reminders')
    .select('id, label, scheduled_time, taken_at, date')
    .eq('resident_id', residentId)
    .eq('date', today)
    .is('taken_at', null)
    .order('scheduled_time', { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ reminders: data ?? [] });
}

/**
 * POST /api/lys/medication-reminders
 * Marks a reminder taken for the cookie-bound resident.
 * When late (>30 min), inserts a medication_missed staff notification.
 */
export async function POST(req: NextRequest): Promise<NextResponse> {
  const residentId = await getResidentId();
  if (!residentId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (!isValidUuid(residentId)) {
    return NextResponse.json({ ok: true, demo: true });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }

  const reminderId =
    body !== null &&
    typeof body === 'object' &&
    'reminder_id' in body &&
    typeof (body as Record<string, unknown>).reminder_id === 'string'
      ? ((body as Record<string, unknown>).reminder_id as string).trim()
      : null;

  if (!reminderId || !isValidUuid(reminderId)) {
    return NextResponse.json({ error: 'missing_reminder_id' }, { status: 400 });
  }

  const minutesLateRaw =
    body !== null &&
    typeof body === 'object' &&
    'minutes_late' in body &&
    typeof (body as Record<string, unknown>).minutes_late === 'number'
      ? ((body as Record<string, unknown>).minutes_late as number)
      : 0;
  const minutesLate = Number.isFinite(minutesLateRaw) ? Math.max(0, Math.floor(minutesLateRaw)) : 0;
  const isLate = minutesLate > 30;

  const supabase = getServiceClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Server ikke konfigureret' }, { status: 503 });
  }

  const { data: reminder, error: remErr } = await supabase
    .from('medication_reminders')
    .select('id, label, resident_id, taken_at')
    .eq('id', reminderId)
    .eq('resident_id', residentId)
    .maybeSingle();

  if (remErr) {
    return NextResponse.json({ error: remErr.message }, { status: 500 });
  }
  if (!reminder) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 });
  }

  const alreadyTaken = Boolean(reminder.taken_at);
  if (!alreadyTaken) {
    const { error: updateErr } = await supabase
      .from('medication_reminders')
      .update({ taken_at: new Date().toISOString() })
      .eq('id', reminderId)
      .eq('resident_id', residentId)
      .is('taken_at', null);

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 });
    }
  }

  let lateAlert = false;
  if (isLate) {
    const { data: residentRow } = await supabase
      .from('care_residents')
      .select('org_id')
      .eq('user_id', residentId)
      .maybeSingle();

    const { data: existing } = await supabase
      .from('care_portal_notifications')
      .select('id')
      .eq('resident_id', residentId)
      .eq('type', 'medication_missed')
      .eq('source_id', reminderId)
      .is('acknowledged_at', null)
      .maybeSingle();

    if (!existing) {
      const { error: notifErr } = await supabase.from('care_portal_notifications').insert({
        resident_id: residentId,
        type: 'medication_missed',
        detail: `${reminder.label} ikke taget - ${minutesLate} minutter forsinket`,
        severity: 'roed',
        source_table: 'medication_reminders',
        source_id: reminderId,
        org_id: (residentRow as { org_id?: string } | null)?.org_id ?? null,
      });
      if (notifErr) {
        return NextResponse.json({ error: notifErr.message }, { status: 500 });
      }
    }
    lateAlert = true;
  }

  return NextResponse.json({
    ok: true,
    already_taken: alreadyTaken,
    late_alert: lateAlert,
  });
}
