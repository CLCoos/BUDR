import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getResidentId } from '@/lib/residentAuth';
import { isValidUuid } from '@/lib/uuid';
import { parseRecoveryProfileFields } from '@/lib/lys/recoveryProfileFields';
import type { LysRecoveryProfile } from '@/types/lys';

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

/** Cookie `budr_resident_id` + service role — RLS on lys_recovery_profile is staff-only. */
export async function GET(): Promise<NextResponse> {
  const residentId = await getResidentId();
  if (!residentId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  if (!isValidUuid(residentId)) {
    return NextResponse.json({ profile: null, demo: true });
  }

  const supabase = getServiceClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Server ikke konfigureret' }, { status: 503 });
  }

  const { data, error } = await supabase
    .from('lys_recovery_profile')
    .select('*')
    .eq('resident_id', residentId)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('[recovery-profile GET]', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ profile: (data as LysRecoveryProfile | null) ?? null });
}

export async function POST(req: Request): Promise<NextResponse> {
  const residentId = await getResidentId();
  if (!residentId) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'Ugyldig JSON' }, { status: 400 });
  }

  const parsed = parseRecoveryProfileFields(body);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  if (!isValidUuid(residentId)) {
    return NextResponse.json({ ok: true, demo: true, profile: parsed.fields });
  }

  const supabase = getServiceClient();
  if (!supabase) {
    return NextResponse.json({ error: 'Server ikke konfigureret' }, { status: 503 });
  }

  const { data: resident, error: residentErr } = await supabase
    .from('care_residents')
    .select('org_id')
    .eq('user_id', residentId)
    .maybeSingle();

  if (residentErr) {
    console.error('[recovery-profile POST resident]', residentErr.message);
    return NextResponse.json({ error: residentErr.message }, { status: 500 });
  }
  if (!resident) {
    return NextResponse.json({ error: 'resident_not_found' }, { status: 404 });
  }

  const orgId = (resident as { org_id?: string | null }).org_id ?? null;
  const now = new Date().toISOString();

  const { data: existing, error: existingErr } = await supabase
    .from('lys_recovery_profile')
    .select('id')
    .eq('resident_id', residentId)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (existingErr) {
    console.error('[recovery-profile POST lookup]', existingErr.message);
    return NextResponse.json({ error: existingErr.message }, { status: 500 });
  }

  if (existing?.id) {
    const { data, error } = await supabase
      .from('lys_recovery_profile')
      .update({ ...parsed.fields, updated_at: now })
      .eq('id', existing.id)
      .select('*')
      .single();
    if (error) {
      console.error('[recovery-profile POST update]', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    return NextResponse.json({ ok: true, profile: data as LysRecoveryProfile });
  }

  const { data, error } = await supabase
    .from('lys_recovery_profile')
    .insert({
      resident_id: residentId,
      org_id: orgId,
      ...parsed.fields,
      updated_at: now,
    })
    .select('*')
    .single();

  if (error) {
    console.error('[recovery-profile POST insert]', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, profile: data as LysRecoveryProfile });
}
