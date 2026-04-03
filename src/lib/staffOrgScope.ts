import type { SupabaseClient } from '@supabase/supabase-js';

/** Validates `org_id` from Supabase Auth user_metadata (UUID v4). */
export function parseStaffOrgId(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const t = raw.trim();
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(t)
    ? t
    : null;
}

export type StaffOrgResolveError = 'no_client' | 'no_session' | 'no_org' | 'query_failed';

export async function resolveStaffOrgResidents(supabase: SupabaseClient | null): Promise<{
  orgId: string | null;
  residentIds: string[];
  error: StaffOrgResolveError | null;
  queryMessage?: string;
}> {
  if (!supabase) {
    return { orgId: null, residentIds: [], error: 'no_client' };
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session?.user) {
    return { orgId: null, residentIds: [], error: 'no_session' };
  }

  const orgId = parseStaffOrgId(session.user.user_metadata?.org_id);
  if (!orgId) {
    return { orgId: null, residentIds: [], error: 'no_org' };
  }

  const { data, error } = await supabase
    .from('care_residents')
    .select('user_id')
    .eq('org_id', orgId);

  if (error) {
    return { orgId, residentIds: [], error: 'query_failed', queryMessage: error.message };
  }

  return {
    orgId,
    residentIds: (data ?? []).map((r) => (r as { user_id: string }).user_id),
    error: null,
  };
}
