import { cookies } from 'next/headers';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export const RESIDENT_ID_COOKIE = 'budr_resident_id';
export const RESIDENT_SESSION_COOKIE = 'budr_resident_session';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type ResidentApiSession =
  | {
      ok: true;
      residentId: string;
      orgId: string | null;
      supabase: SupabaseClient;
    }
  | {
      ok: false;
      status: 401 | 403 | 503;
      message: string;
      clearCookies?: boolean;
    };

export function isResidentSessionUuid(value: string | null | undefined): value is string {
  return typeof value === 'string' && UUID_RE.test(value.trim());
}

export function createResidentServiceClient(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, { auth: { persistSession: false } });
}

export function residentSessionMatches(
  residentId: string,
  session: { resident_id?: string | null } | null
): boolean {
  return !!session?.resident_id && session.resident_id === residentId;
}

export async function requireResidentApiSession(): Promise<ResidentApiSession> {
  const cookieStore = await cookies();
  const residentId = cookieStore.get(RESIDENT_ID_COOKIE)?.value?.trim() ?? '';
  const sessionToken = cookieStore.get(RESIDENT_SESSION_COOKIE)?.value?.trim() ?? '';

  if (!residentId || !sessionToken) {
    return { ok: false, status: 401, message: 'Unauthorized' };
  }
  if (!isResidentSessionUuid(residentId) || !isResidentSessionUuid(sessionToken)) {
    return { ok: false, status: 401, message: 'Unauthorized', clearCookies: true };
  }

  const supabase = createResidentServiceClient();
  if (!supabase) {
    return { ok: false, status: 503, message: 'Server ikke konfigureret' };
  }

  const { data: session, error: sessionError } = await supabase
    .from('resident_sessions')
    .select('resident_id')
    .eq('token', sessionToken)
    .gt('expires_at', new Date().toISOString())
    .maybeSingle();

  if (sessionError || !residentSessionMatches(residentId, session as { resident_id?: string })) {
    return { ok: false, status: 401, message: 'Unauthorized', clearCookies: true };
  }

  const { data: resident, error: residentError } = await supabase
    .from('care_residents')
    .select('user_id, org_id')
    .eq('user_id', residentId)
    .maybeSingle();

  if (residentError || !resident) {
    return { ok: false, status: 401, message: 'Unauthorized', clearCookies: true };
  }

  const orgId = (resident as { org_id?: string | null }).org_id ?? null;
  if (orgId) {
    const { data: orgRow, error: orgError } = await supabase
      .from('organisations')
      .select('deactivated_at')
      .eq('id', orgId)
      .maybeSingle();
    if (orgError) {
      return { ok: false, status: 503, message: 'Server ikke konfigureret' };
    }
    if (orgRow?.deactivated_at) {
      return { ok: false, status: 403, message: 'Organisation er deaktiveret', clearCookies: true };
    }
  }

  return { ok: true, residentId, orgId, supabase };
}
