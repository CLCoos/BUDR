import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getResidentId } from '@/lib/residentAuth';

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

type ResidentOnCallShift = 'day' | 'evening' | 'night';

type ResidentOnCallItem = {
  shift: ResidentOnCallShift;
  phone: string;
  staffId: string;
  staffName: string | null;
};

/** Beboer: dagens vagthavende fra `on_call_staff` (+ navn fra `care_staff`) for eget bosted. */
export async function GET(): Promise<NextResponse> {
  const residentId = await getResidentId();
  if (!residentId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = getServiceClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Database unavailable' }, { status: 503 });
  }

  const { data: resRow, error: resErr } = await supabase
    .from('care_residents')
    .select('org_id')
    .eq('user_id', residentId)
    .maybeSingle();

  if (resErr || !resRow?.org_id) {
    return NextResponse.json({ items: [] as ResidentOnCallItem[], orgId: null });
  }

  const orgId = resRow.org_id as string;
  const today = new Date().toISOString().slice(0, 10);

  const { data: onRows, error: onErr } = await supabase
    .from('on_call_staff')
    .select('staff_id, phone, shift, date')
    .eq('org_id', orgId)
    .eq('date', today)
    .order('shift', { ascending: true });

  if (onErr) {
    console.error('[resident-on-call]', onErr.message);
    return NextResponse.json({ error: onErr.message }, { status: 500 });
  }

  const rows = (onRows ?? []) as Array<{
    staff_id: string;
    phone: string;
    shift: ResidentOnCallShift;
    date: string;
  }>;

  const staffIds = [...new Set(rows.map((r) => r.staff_id))];
  const nameById = new Map<string, string>();

  if (staffIds.length > 0) {
    const { data: staffRows } = await supabase
      .from('care_staff')
      .select('id, full_name')
      .in('id', staffIds)
      .eq('org_id', orgId);

    for (const s of staffRows ?? []) {
      const row = s as { id: string; full_name: string };
      nameById.set(row.id, row.full_name);
    }
  }

  const items: ResidentOnCallItem[] = rows.map((r) => ({
    shift: r.shift,
    phone: r.phone?.trim() ?? '',
    staffId: r.staff_id,
    staffName: nameById.get(r.staff_id) ?? null,
  }));

  return NextResponse.json({ items, orgId });
}
