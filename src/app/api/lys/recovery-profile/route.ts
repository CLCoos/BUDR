import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { getResidentId } from '@/lib/residentAuth';
import { RECOVERY_PROFILE_FIELDS } from '@/types/lys';
import { parseRecoveryProfileBody } from '@/lib/lys/recoveryProfile';

/**
 * GET  /api/lys/recovery-profile — borgerens seneste recovery-profil (eller null).
 * POST /api/lys/recovery-profile — gem de felter borgeren har ændret.
 *
 * Borgeren har ingen Supabase-session, så serveren bruger service role og tager altid
 * borgeren fra cookien. Kun kendte profilfelter kan skrives.
 */

function isUuid(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

const SELECT_COLUMNS = ['id', ...RECOVERY_PROFILE_FIELDS.map((f) => f.key)].join(', ');

export async function GET(): Promise<NextResponse> {
  const residentId = await getResidentId();
  if (!residentId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  if (!isUuid(residentId)) return NextResponse.json({ profile: null });

  const supabase = getServiceClient();
  if (!supabase) return NextResponse.json({ error: 'Server ikke konfigureret' }, { status: 503 });

  const { data, error } = await supabase
    .from('lys_recovery_profile')
    .select(SELECT_COLUMNS)
    .eq('resident_id', residentId)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!data) return NextResponse.json({ profile: null });

  const { id: _id, ...profile } = data as unknown as Record<string, unknown>;
  return NextResponse.json({ profile });
}

export async function POST(req: Request): Promise<NextResponse> {
  const residentId = await getResidentId();
  if (!residentId) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 });
  }
  const parsed = parseRecoveryProfileBody(raw);
  if ('error' in parsed) return NextResponse.json({ error: parsed.error }, { status: 422 });
  if (!isUuid(residentId)) return NextResponse.json({ ok: true, demo: true });

  const supabase = getServiceClient();
  if (!supabase) return NextResponse.json({ error: 'Server ikke konfigureret' }, { status: 503 });

  const { data: resident, error: resErr } = await supabase
    .from('care_residents')
    .select('org_id')
    .eq('user_id', residentId)
    .maybeSingle();
  if (resErr) return NextResponse.json({ error: resErr.message }, { status: 500 });
  if (!resident) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const { data: existing, error: readErr } = await supabase
    .from('lys_recovery_profile')
    .select('id')
    .eq('resident_id', residentId)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (readErr) return NextResponse.json({ error: readErr.message }, { status: 500 });

  const { error } = existing
    ? await supabase
        .from('lys_recovery_profile')
        .update({ ...parsed.fields, updated_at: new Date().toISOString() })
        .eq('id', (existing as { id: string }).id)
        .eq('resident_id', residentId)
    : await supabase.from('lys_recovery_profile').insert({
        resident_id: residentId,
        org_id: (resident as { org_id?: string | null }).org_id ?? null,
        ...parsed.fields,
      });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
