import { getResidentId } from '@/lib/residentAuth';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';

/**
 * TTS/STT må kaldes af indlogget beboer (resident-cookie) eller staff (Supabase session).
 * I development kan kald uden session eksplicit tillades med `BUDR_ALLOW_UNAUTHENTICATED_VOICE_TEST=true`.
 */
export async function assertVoiceApiCaller(): Promise<
  { ok: true; kind: 'resident' | 'staff' } | { ok: false; status: 401 | 503; message: string }
> {
  if (
    process.env.NODE_ENV !== 'production' &&
    process.env.BUDR_ALLOW_UNAUTHENTICATED_VOICE_TEST === 'true'
  ) {
    return { ok: true, kind: 'staff' };
  }

  const residentId = await getResidentId();
  if (residentId) {
    const resident = await validateActiveResidentId(residentId);
    if (resident === 'valid') {
      return { ok: true, kind: 'resident' };
    }
    if (resident === 'unavailable') {
      return { ok: false, status: 503, message: 'Server ikke konfigureret' };
    }
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return { ok: false, status: 503, message: 'Server ikke konfigureret' };
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, status: 401, message: 'Unauthorized' };
  }
  return { ok: true, kind: 'staff' };
}

export async function assertResidentVoiceApiCaller(): Promise<
  { ok: true; residentId: string } | { ok: false; status: 401 | 503; message: string }
> {
  const residentId = await getResidentId();
  if (!residentId) {
    const guidance =
      process.env.NODE_ENV !== 'production'
        ? 'Ingen beboersession fundet. Åbn /lys-chat eller /park-hub først, og prøv igen.'
        : 'Unauthorized';
    return { ok: false, status: 401, message: guidance };
  }

  const resident = await validateActiveResidentId(residentId);
  if (resident === 'valid') {
    return { ok: true, residentId: residentId.trim() };
  }
  if (resident === 'unavailable') {
    return { ok: false, status: 503, message: 'Server ikke konfigureret' };
  }
  return { ok: false, status: 401, message: 'Unauthorized' };
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

type ResidentValidation = 'valid' | 'invalid' | 'unavailable';

function getServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export async function validateActiveResidentId(residentId: string): Promise<ResidentValidation> {
  const normalized = residentId.trim();
  if (!UUID_RE.test(normalized)) {
    return 'invalid';
  }

  const admin = getServiceClient();
  if (!admin) {
    return 'unavailable';
  }

  const { data, error } = await admin
    .from('care_residents')
    .select('user_id, org_id')
    .eq('user_id', normalized)
    .maybeSingle();
  if (error) {
    return 'unavailable';
  }
  if (!data) {
    return 'invalid';
  }

  const orgId = (data as { org_id?: string | null }).org_id ?? null;
  if (!orgId) {
    return 'valid';
  }

  const { data: orgRow, error: orgError } = await admin
    .from('organisations')
    .select('deactivated_at')
    .eq('id', orgId)
    .maybeSingle();
  if (orgError) {
    return 'unavailable';
  }
  return orgRow?.deactivated_at ? 'invalid' : 'valid';
}
