import { NextResponse } from 'next/server';
import type { SupabaseClient, User } from '@supabase/supabase-js';
import { getStaffPermissions } from '@/lib/auth/getStaffPermissions';
import { hasPermission } from '@/lib/auth/hasPermission';
import type { Permission } from '@/lib/permissions';
import { parseStaffOrgId } from '@/lib/staffOrgScope';
import { createServerSupabaseClient, getServerAuthUser } from '@/lib/supabase/server';

export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type StaffContext = {
  supabase: SupabaseClient;
  user: User;
  orgId: string;
  permissions: string[];
};

/** Login, organisation og rettighed for borgerdokumenter. Returnerer et fejlsvar ved afvisning. */
export async function requireStaff(
  permission: Permission
): Promise<StaffContext | { error: NextResponse }> {
  const [supabase, user] = await Promise.all([createServerSupabaseClient(), getServerAuthUser()]);
  if (!supabase || !user) {
    return { error: NextResponse.json({ error: 'unauthorized' }, { status: 401 }) };
  }
  const orgId = parseStaffOrgId(user.user_metadata?.org_id);
  if (!orgId) {
    return { error: NextResponse.json({ error: 'Organisation mangler' }, { status: 403 }) };
  }
  const permissions = await getStaffPermissions(supabase);
  if (!hasPermission(permissions, permission)) {
    return { error: NextResponse.json({ error: 'Ingen adgang' }, { status: 403 }) };
  }
  return { supabase, user, orgId, permissions: permissions ?? [] };
}

export function optionalText(value: unknown, max: number): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (typeof value !== 'string') return undefined;
  const t = value.trim();
  return t ? t.slice(0, max) : null;
}

export async function readJson(req: Request): Promise<Record<string, unknown> | null> {
  try {
    const body = (await req.json()) as unknown;
    return typeof body === 'object' && body !== null && !Array.isArray(body)
      ? (body as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}
