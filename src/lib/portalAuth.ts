import { redirect } from 'next/navigation';
import type { Session, User } from '@supabase/supabase-js';
import {
  createServerSupabaseClient,
  getCurrentStaffRow,
  getServerAuthUser,
} from './supabase/server';
import { parseStaffOrgId } from './staffOrgScope';
import { getOrganisationForStaff } from './supabase/organisation';

/**
 * Start PortalShells opslag (bruger, org, staff-række) med det samme, så de kører parallelt
 * med sidens egne forespørgsler i stedet for efter dem. Resultaterne er request-cachede.
 */
export function preloadPortalShell(): void {
  getOrganisationForStaff().catch(() => {});
  getCurrentStaffRow().catch(() => {});
}

/**
 * Returns the current Supabase session from server-side cookies.
 * Returns null if no session exists or Supabase is not configured.
 */
export async function getPortalSession(): Promise<Session | null> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return null;
  try {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session;
  } catch {
    return null;
  }
}

/**
 * Extracts the staff member's org_id from the care_staff table.
 * Returns null if not authenticated or no care_staff row exists.
 */
export async function getPortalStaffOrgId(): Promise<string | null> {
  const staff = await getCurrentStaffRow();
  return parseStaffOrgId(staff?.org_id ?? null);
}

/** `care_staff.role` for the logged-in user (fx `leder`), or null. */
export async function getPortalStaffRole(): Promise<string | null> {
  const staff = await getCurrentStaffRow();
  const role = staff?.role;
  return typeof role === 'string' && role.trim() ? role.trim() : null;
}

/**
 * Asserts that a valid staff session exists. Redirects to /care-portal-login
 * if Supabase is unconfigured or the user is not authenticated.
 * Returns the authenticated User when the check passes.
 */
export async function requirePortalAuth(): Promise<User> {
  preloadPortalShell();
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    redirect('/care-portal-login?err=config');
  }
  const user = await getServerAuthUser();
  if (!user) {
    redirect('/care-portal-login');
  }
  return user;
}
