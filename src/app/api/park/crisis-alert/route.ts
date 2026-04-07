import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getResidentId } from '@/lib/residentAuth';

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

/**
 * POST /api/park/crisis-alert
 *
 * Called when a resident activates the crisis card ("Tilkald hjælp nu").
 * Reads budr_resident_id from the HttpOnly cookie, validates the resident
 * exists, deduplicates within a 10-minute window, then inserts a
 * care_portal_notifications row via the service role so RLS is bypassed.
 */
export async function POST(): Promise<NextResponse> {
  const residentId = await getResidentId();
  if (!residentId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getServiceClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Server ikke konfigureret' }, { status: 503 });
  }

  // Confirm the resident exists in care_residents.
  const { data: resident, error: resErr } = await supabase
    .from('care_residents')
    .select('user_id')
    .eq('user_id', residentId)
    .maybeSingle();

  if (resErr) {
    return NextResponse.json({ error: resErr.message }, { status: 500 });
  }
  if (!resident) {
    return NextResponse.json({ error: 'Resident ikke fundet' }, { status: 401 });
  }

  // Deduplicate: skip if an unacknowledged crisis_alert was already fired
  // for this resident within the last 10 minutes.
  const tenMinAgo = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { data: recent, error: dedupErr } = await supabase
    .from('care_portal_notifications')
    .select('id')
    .eq('resident_id', residentId)
    .eq('type', 'crisis_alert')
    .is('acknowledged_at', null)
    .gte('created_at', tenMinAgo)
    .maybeSingle();

  if (dedupErr) {
    return NextResponse.json({ error: dedupErr.message }, { status: 500 });
  }
  if (recent) {
    // Treat as success from the resident's perspective.
    return NextResponse.json({ ok: true, deduplicated: true });
  }

  const { error: insertErr } = await supabase.from('care_portal_notifications').insert({
    resident_id: residentId,
    type: 'crisis_alert',
    detail: 'Beboer har aktiveret krisekort — reagér nu',
    severity: 'roed',
    source_table: 'crisis_plans',
  });

  if (insertErr) {
    return NextResponse.json({ error: insertErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
