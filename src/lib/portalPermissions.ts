import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { DEFAULT_ROLE_PERMISSIONS, type Permission } from '@/lib/permissions';

export type OrgRole = {
  id: string;
  name: string;
  is_system_role: boolean;
  permissions?: string[];
};

function uniquePermissions(perms: string[]): Permission[] {
  return Array.from(new Set(perms)) as Permission[];
}

export async function getPortalStaffPermissions(): Promise<Permission[]> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return [];

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: staff } = await supabase
    .from('care_staff')
    .select('role, role_id')
    .eq('id', user.id)
    .single();
  if (!staff) return [];

  const fallback = DEFAULT_ROLE_PERMISSIONS[staff.role ?? 'medarbejder'] ?? [];
  if (!staff.role_id) return fallback;

  const { data: assigned } = await supabase
    .from('org_roles')
    .select('permissions')
    .eq('id', staff.role_id)
    .single();
  const assignedPermissions = ((assigned?.permissions ?? []) as unknown[]).filter(
    (v): v is string => typeof v === 'string' && v.length > 0
  );
  if (assignedPermissions.length === 0) return fallback;
  return uniquePermissions(assignedPermissions);
}

export async function hasPortalPermission(permission: Permission): Promise<boolean> {
  const perms = await getPortalStaffPermissions();
  return perms.includes(permission);
}

export async function requirePortalPermission(permission: Permission): Promise<void> {
  const allowed = await hasPortalPermission(permission);
  if (!allowed) {
    redirect('/care-portal-dashboard?error=forbidden');
  }
}

export async function getOrgRolesForCurrentStaff(): Promise<OrgRole[]> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return [];
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];

  const { data: staff } = await supabase
    .from('care_staff')
    .select('org_id')
    .eq('id', user.id)
    .single();
  if (!staff?.org_id) return [];

  const { data: roles } = await supabase
    .from('org_roles')
    .select('id, name, is_system_role, permissions')
    .eq('org_id', staff.org_id)
    .order('name');
  return (roles ?? []).map((r) => ({
    id: r.id,
    name: r.name,
    is_system_role: r.is_system_role,
    permissions: Array.isArray(r.permissions) ? r.permissions : [],
  }));
}
