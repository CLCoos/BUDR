import type { SupabaseClient } from '@supabase/supabase-js';
import { DEFAULT_ROLE_PERMISSIONS, type Permission } from '@/lib/permissions';
import { getCurrentStaffRow } from '@/lib/supabase/server';

/**
 * Rettigheder for den indloggede medarbejder. Bruger den request-cachede staff-række
 * (én forespørgsel inkl. `org_roles`), så PortalShell og sider ikke slår op hver for sig.
 * `supabase`-parameteren beholdes for kompatibilitet med eksisterende kaldere.
 */
export async function getStaffPermissions(_supabase: SupabaseClient): Promise<Permission[]> {
  const staff = await getCurrentStaffRow();
  if (!staff) return [];

  const fallback = DEFAULT_ROLE_PERMISSIONS[staff.role ?? 'medarbejder'] ?? [];
  if (!staff.role_id) return fallback;

  const permissions = (staff.role_permissions ?? []).filter(
    (value): value is Permission => typeof value === 'string' && value.length > 0
  );
  return permissions.length > 0 ? permissions : fallback;
}
