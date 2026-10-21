import { NextResponse } from 'next/server';
import { getStaffPermissions } from '@/lib/auth/getStaffPermissions';
import { hasPermission } from '@/lib/auth/hasPermission';
import type { Permission } from '@/lib/permissions';
import { createServerSupabaseClient } from '@/lib/supabase/server';

/** Logget ind som personale med den givne rettighed? Ellers et færdigt fejlsvar. */
export async function requireStaffForAi(
  permission: Permission
): Promise<{ ok: true } | { ok: false; response: NextResponse }> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    return { ok: false, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return { ok: false, response: NextResponse.json({ error: 'Unauthorized' }, { status: 401 }) };
  }
  const permissions = await getStaffPermissions(supabase);
  if (!hasPermission(permissions, permission)) {
    return { ok: false, response: NextResponse.json({ error: 'Ingen adgang' }, { status: 403 }) };
  }
  return { ok: true };
}
