import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getResidentId } from '@/lib/residentAuth';
import { isValidUuid } from '@/lib/uuid';
import { copenhagenYmd } from '@/lib/copenhagenDay';
import {
  currentOnCallShift,
  emptyCrisisSupportPayload,
  normalizeCrisisPlan,
  normalizeFacilityContacts,
  normalizeOnCall,
  type CrisisSupportPayload,
} from '@/lib/lys/crisisSupport';

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

/**
 * GET /api/lys/crisis-support
 *
 * Cookie `budr_resident_id` + service role. Live Lys has no resident JWT, so the
 * crisis card cannot read `crisis_plans` / `facility_contacts` / `on_call_staff`
 * through the browser client (RLS requires auth.uid()).
 */
export async function GET(): Promise<NextResponse> {
  const residentId = await getResidentId();
  if (!residentId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isValidUuid(residentId)) {
    return NextResponse.json(emptyCrisisSupportPayload({ demo: true }));
  }

  const supabase = getServiceClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Server ikke konfigureret' }, { status: 503 });
  }

  const { data: resident, error: resErr } = await supabase
    .from('care_residents')
    .select('user_id, org_id')
    .eq('user_id', residentId)
    .maybeSingle();

  if (resErr) {
    return NextResponse.json({ error: resErr.message }, { status: 500 });
  }
  if (!resident) {
    return NextResponse.json({ error: 'Resident ikke fundet' }, { status: 401 });
  }

  const orgId = (resident as { org_id?: string | null }).org_id ?? null;
  const now = new Date();
  const today = copenhagenYmd(now);
  const shift = currentOnCallShift(now);

  const [planRes, contactsRes, onCallRes] = await Promise.all([
    supabase
      .from('crisis_plans')
      .select('warning_signs, helpful_strategies, steps')
      .eq('resident_id', residentId)
      .maybeSingle(),
    orgId
      ? supabase
          .from('facility_contacts')
          .select('id, label, phone, available_hours')
          .eq('facility_id', orgId)
          .order('sort_order')
      : Promise.resolve({ data: [] as unknown[], error: null }),
    orgId
      ? supabase
          .from('on_call_staff')
          .select('id, phone, shift')
          .eq('org_id', orgId)
          .eq('date', today)
          .eq('shift', shift)
          .maybeSingle()
      : Promise.resolve({ data: null, error: null }),
  ]);

  if (planRes.error) {
    console.error('[crisis-support] crisis_plans', planRes.error.message);
    return NextResponse.json({ error: planRes.error.message }, { status: 500 });
  }
  if (contactsRes.error) {
    console.error('[crisis-support] facility_contacts', contactsRes.error.message);
  }
  if (onCallRes.error) {
    console.error('[crisis-support] on_call_staff', onCallRes.error.message);
  }

  const payload: CrisisSupportPayload = {
    crisisPlan: normalizeCrisisPlan(planRes.data),
    contacts: contactsRes.error ? [] : normalizeFacilityContacts(contactsRes.data),
    onCall: onCallRes.error ? null : normalizeOnCall(onCallRes.data),
  };

  return NextResponse.json(payload);
}
