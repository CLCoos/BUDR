import { cache } from 'react';
import type { SupabaseClient } from '@supabase/supabase-js';
import { DEFAULT_ROLE_PERMISSIONS, type Permission } from '@/lib/permissions';

type StaffRoleRow = {
  role: string | null;
  role_id: string | null;
};

type RoleRow = {
  permissions: string[] | null;
};

const _getStaffPermissions = cache(async (supabase: SupabaseClient): Promise<Permission[]> => {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: staff } = await supabase
    .from('care_staff')
    .select('role, role_id')
    .eq('id', user.id)
    .single<StaffRoleRow>();

  if (!staff) return [];

  const fallback = DEFAULT_ROLE_PERMISSIONS[staff.role ?? 'medarbejder'] ?? [];
  if (!staff.role_id) return fallback;

  const { data: roleRow } = await supabase
    .from('org_roles')
    .select('permissions')
    .eq('id', staff.role_id)
    .single<RoleRow>();

  const permissions = (roleRow?.permissions ?? []).filter(
    (value): value is Permission => typeof value === 'string' && value.length > 0
  );
  return permissions.length > 0 ? permissions : fallback;
});

export async function getStaffPermissions(supabase: SupabaseClient): Promise<Permission[]> {
  return _getStaffPermissions(supabase);
}
