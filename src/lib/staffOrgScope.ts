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

function isUuidString(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
  );
}

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
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { orgId: null, residentIds: [], error: 'no_session' };
  }

  const { data: staffRow } = await supabase
    .from('care_staff')
    .select('org_id')
    .eq('id', user.id)
    .single();

  const orgId = parseStaffOrgId(staffRow?.org_id ?? null);
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
    residentIds: (data ?? [])
      .map((r) => (r as { user_id: string | null }).user_id)
      .filter(isUuidString),
    error: null,
  };
}
