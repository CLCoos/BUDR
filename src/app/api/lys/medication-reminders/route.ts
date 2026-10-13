import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getResidentId } from '@/lib/residentAuth';
import { copenhagenDateString, minutesLate } from '@/lib/lys/medicationReminders';

/**
 * GET  /api/lys/medication-reminders — dagens ikke-tagne påmindelser for den indloggede borger.
 * POST /api/lys/medication-reminders { id } — markér en påmindelse som taget.
 *
 * Borgeren har ingen Supabase-session (kun HttpOnly-cookie), så klienten kan hverken læse
 * medication_reminders eller oprette notifikationer selv. Serveren bruger service role og
 * tager altid borgeren fra cookien. Tages medicinen mere end 30 min for sent, får
 * personalet en 'medication_missed'-notifikation (én pr. påmindelse).
 */

const LATE_THRESHOLD_MINUTES = 30;

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function GET(): Promise<NextResponse> {
  const residentId = await getResidentId();
  if (!residentId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isUuid(residentId)) return NextResponse.json({ reminders: [] });

  const supabase = getServiceClient();
  if (!supabase) return NextResponse.json({ error: 'Server ikke konfigureret' }, { status: 503 });

  const { data, error } = await supabase
    .from('medication_reminders')
    .select('id, label, scheduled_time, taken_at, date')
    .eq('resident_id', residentId)
    .eq('date', copenhagenDateString(new Date()))
    .is('taken_at', null)
    .order('scheduled_time', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ reminders: data ?? [] });
}

export async function POST(req: Request): Promise<NextResponse> {
  const residentId = await getResidentId();
  if (!residentId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  const id = typeof (body as { id?: unknown })?.id === 'string' ? (body as { id: string }).id : '';
  if (!isUuid(id)) return NextResponse.json({ error: 'invalid_id' }, { status: 400 });
  if (!isUuid(residentId)) return NextResponse.json({ ok: true, demo: true });

  const supabase = getServiceClient();
  if (!supabase) return NextResponse.json({ error: 'Server ikke konfigureret' }, { status: 503 });

  const now = new Date();
  const { data: reminder, error: readErr } = await supabase
    .from('medication_reminders')
    .select('id, label, scheduled_time, taken_at, date')
    .eq('id', id)
    .eq('resident_id', residentId)
    .maybeSingle();
  if (readErr) return NextResponse.json({ error: readErr.message }, { status: 500 });
  if (!reminder) return NextResponse.json({ error: 'not_found' }, { status: 404 });
  if (reminder.taken_at) return NextResponse.json({ ok: true, already: true });

  const { error: updErr } = await supabase
    .from('medication_reminders')
    .update({ taken_at: now.toISOString() })
    .eq('id', id)
    .eq('resident_id', residentId)
    .is('taken_at', null);
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

  const late =
    reminder.date === copenhagenDateString(now)
      ? minutesLate(now, String(reminder.scheduled_time))
      : null;
  if (late !== null && late > LATE_THRESHOLD_MINUTES) {
    const { data: resident } = await supabase
      .from('care_residents')
      .select('org_id')
      .eq('user_id', residentId)
      .maybeSingle();
    const { data: existing } = await supabase
      .from('care_portal_notifications')
      .select('id')
      .eq('source_table', 'medication_reminders')
      .eq('source_id', id)
      .maybeSingle();
    if (!existing) {
      const { error: notifyErr } = await supabase.from('care_portal_notifications').insert({
        resident_id: residentId,
        type: 'medication_missed',
        detail: `${reminder.label} taget ${late} minutter for sent`,
        severity: 'gul',
        source_table: 'medication_reminders',
        source_id: id,
        org_id: (resident as { org_id?: string } | null)?.org_id ?? null,
      });
      if (notifyErr) {
        console.error('[medication-reminders] notification failed', notifyErr.message);
      }
    }
  }

  return NextResponse.json({ ok: true });
}
