import { getResidentId } from '@/lib/residentAuth';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createClient } from '@supabase/supabase-js';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function createVoiceServiceClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

async function isAuthorizedResidentCookie(residentId: string): Promise<boolean> {
  const normalized = residentId.trim();
  if (!UUID_RE.test(normalized)) return false;

  const admin = createVoiceServiceClient();
  if (!admin) return false;

  const { data, error } = await admin
    .from('care_residents')
    .select('user_id, org_id')
    .eq('user_id', normalized)
    .maybeSingle();

  if (error || !data) return false;

  const orgId = (data as { org_id?: string | null }).org_id ?? null;
  if (!orgId) return true;

  const { data: orgRow, error: orgError } = await admin
    .from('organisations')
    .select('deactivated_at')
    .eq('id', orgId)
    .maybeSingle();

  if (orgError) return false;
  return !orgRow?.deactivated_at;
}

async function isAuthenticatedPortalStaff(): Promise<
  { ok: true } | { ok: false; status: 401 | 503; message: string }
> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return { ok: false, status: 503, message: 'Server ikke konfigureret' };
  }

  const {
    data: { user },
  } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));
  if (!user) {
    return { ok: false, status: 401, message: 'Unauthorized' };
  }

  const { data: staffRow, error } = await supabase
    .from('care_staff')
    .select('id')
    .eq('id', user.id)
    .maybeSingle();

  if (error || !staffRow) {
    return { ok: false, status: 401, message: 'Unauthorized' };
  }

  return { ok: true };
}

/**
 * TTS/STT må kaldes af indlogget beboer (valideret resident-cookie) eller portal-staff.
 * I development tillades kald uden session, så `/lys-voice-test` matcher sidens adgang
 * (localhost — ikke i production).
 */
export async function assertVoiceApiCaller(): Promise<
  { ok: true; kind: 'resident' | 'staff' } | { ok: false; status: 401 | 503; message: string }
> {
  if (process.env.NODE_ENV !== 'production') {
    return { ok: true, kind: 'staff' };
  }

  const residentId = await getResidentId();
  if (residentId && (await isAuthorizedResidentCookie(residentId))) {
    return { ok: true, kind: 'resident' };
  }

  const staffAuth = await isAuthenticatedPortalStaff();
  if (!staffAuth.ok) return staffAuth;

  return { ok: true, kind: 'staff' };
}
