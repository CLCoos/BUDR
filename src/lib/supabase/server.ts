import { cache } from 'react';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { SupabaseClient, User } from '@supabase/supabase-js';

/**
 * Én Supabase-klient pr. request. `cache` deler instansen mellem server-komponenter
 * i samme render (PortalShell, side, hjælpere), så request-cachede opslag rammer.
 */
export const createServerSupabaseClient = cache(async (): Promise<SupabaseClient | null> => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;

  const cookieStore = await cookies();

  return createServerClient(url, key, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) => cookieStore.set(name, value, options));
        } catch {
          /* Server Component — cookies read-only */
        }
      },
    },
  });
});

/**
 * Den indloggede bruger, verificeret mod Supabase Auth — kun ét netværkskald pr. request.
 * Tidligere kaldte PortalShell, siden og hver hjælper `auth.getUser()` hver for sig.
 */
export const getServerAuthUser = cache(async (): Promise<User | null> => {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser().catch(() => ({ data: { user: null } }));
  return user ?? null;
});

export type CurrentStaffRow = {
  role: string | null;
  role_id: string | null;
  org_id: string | null;
  /** `org_roles.permissions` for `role_id`, hentet i samme forespørgsel. */
  role_permissions: string[] | null;
};

/** `care_staff`-rækken (+ rollens rettigheder) for den indloggede bruger — én forespørgsel pr. request. */
export const getCurrentStaffRow = cache(async (): Promise<CurrentStaffRow | null> => {
  const [supabase, user] = await Promise.all([createServerSupabaseClient(), getServerAuthUser()]);
  if (!supabase || !user) return null;
  const { data } = await supabase
    .from('care_staff')
    .select('role, role_id, org_id, org_roles(permissions)')
    .eq('id', user.id)
    .maybeSingle();
  if (!data) return null;
  const row = data as {
    role?: string | null;
    role_id?: string | null;
    org_id?: string | null;
    org_roles?: { permissions?: unknown } | { permissions?: unknown }[] | null;
  };
  const roleRel = Array.isArray(row.org_roles) ? row.org_roles[0] : row.org_roles;
  const perms = Array.isArray(roleRel?.permissions)
    ? (roleRel.permissions as unknown[]).filter((p): p is string => typeof p === 'string')
    : null;
  return {
    role: row.role ?? null,
    role_id: row.role_id ?? null,
    org_id: row.org_id ?? null,
    role_permissions: row.role_id ? perms : null,
  };
});
