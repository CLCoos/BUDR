import { NextRequest, NextResponse } from 'next/server';
import { createAdminSupabaseClient } from '@/lib/supabase/admin';
import { copenhagenYmd } from '@/lib/copenhagenDay';
import {
  findNotGivenDoses,
  NOT_GIVEN_AFTER_MINUTES,
  NOT_GIVEN_WINDOW_END_MINUTES,
  type ScheduledMedication,
} from '@/lib/medicationSchedule';

/**
 * POST /api/cron/medication-not-given — kaldes hvert 15. minut af
 * netlify/functions/medication-not-given.mts.
 *
 * Giver personalet en rød 'medication_missed'-alarm, når en fast dosis (ikke PN) ikke er
 * registreret udleveret (medication_administrations) en time efter det planlagte tidspunkt.
 * Højst én alarm pr. ordination inden for vinduet, så samme dosis ikke alarmerer hvert kvarter.
 */
export async function POST(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) return NextResponse.json({ error: 'CRON_SECRET mangler' }, { status: 503 });
  if (req.headers.get('x-cron-secret') !== secret) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createAdminSupabaseClient();
  const now = new Date();

  const { data: meds, error: medsErr } = await supabase
    .from('resident_medications')
    .select('id, resident_id, name, dose, time_group, time_label')
    .eq('status', 'aktiv')
    .neq('time_group', 'behoev');
  if (medsErr) {
    console.error('[cron medication-not-given] resident_medications:', medsErr.message);
    return NextResponse.json({ error: 'Kunne ikke hente ordinationer' }, { status: 500 });
  }
  const medications = (meds ?? []) as ScheduledMedication[];
  if (medications.length === 0) return NextResponse.json({ created: 0 });

  const dates = [copenhagenYmd(new Date(now.getTime() - 24 * 60 * 60 * 1000)), copenhagenYmd(now)];
  const { data: given, error: givenErr } = await supabase
    .from('medication_administrations')
    .select('medication_id, scheduled_date')
    .in('scheduled_date', dates)
    .is('cancelled_at', null);
  if (givenErr) {
    console.error('[cron medication-not-given] medication_administrations:', givenErr.message);
    return NextResponse.json({ error: 'Kunne ikke hente udleveringer' }, { status: 500 });
  }
  const givenKeys = new Set(
    (given ?? []).map((g) => `${g.medication_id as string}|${g.scheduled_date as string}`)
  );

  const notGiven = findNotGivenDoses(medications, givenKeys, now);
  if (notGiven.length === 0) return NextResponse.json({ created: 0 });

  // Allerede alarmeret for denne dosis? Vinduet er 3 timer, og to doser af samme ordination
  // ligger mindst ~21 timer fra hinanden, så et opslag 4 timer tilbage skelner dem sikkert.
  const since = new Date(now.getTime() - NOT_GIVEN_WINDOW_END_MINUTES * 60 * 1000).toISOString();
  const { data: existing, error: existingErr } = await supabase
    .from('care_portal_notifications')
    .select('source_id')
    .eq('type', 'medication_missed')
    .eq('source_table', 'resident_medications')
    .in(
      'source_id',
      notGiven.map((n) => n.medication.id)
    )
    .gte('created_at', since);
  if (existingErr) {
    console.error('[cron medication-not-given] notifications:', existingErr.message);
    return NextResponse.json({ error: 'Kunne ikke hente alarmer' }, { status: 500 });
  }
  const alreadyAlerted = new Set((existing ?? []).map((n) => n.source_id as string));
  const toAlert = notGiven.filter((n) => !alreadyAlerted.has(n.medication.id));
  if (toAlert.length === 0) return NextResponse.json({ created: 0 });

  const { data: residents } = await supabase
    .from('care_residents')
    .select('user_id, org_id')
    .in('user_id', [...new Set(toAlert.map((n) => n.medication.resident_id))]);
  const orgByResident = new Map(
    (residents ?? []).map((r) => [r.user_id as string, (r.org_id as string | null) ?? null])
  );

  const rows = toAlert.map((n) => ({
    resident_id: n.medication.resident_id,
    type: 'medication_missed',
    detail: `${n.medication.name} ${n.medication.dose} kl. ${n.hhmm} er ikke registreret udleveret (over ${NOT_GIVEN_AFTER_MINUTES} min.)`,
    severity: 'roed',
    source_table: 'resident_medications',
    source_id: n.medication.id,
    org_id: orgByResident.get(n.medication.resident_id) ?? null,
  }));

  const { error: insertErr } = await supabase.from('care_portal_notifications').insert(rows);
  if (insertErr) {
    console.error('[cron medication-not-given] insert:', insertErr.message);
    return NextResponse.json({ error: 'Kunne ikke oprette alarmer' }, { status: 500 });
  }

  return NextResponse.json({ created: rows.length });
}
