import { redirect } from 'next/navigation';
import type { Session, User } from '@supabase/supabase-js';
import { createServerSupabaseClient } from './supabase/server';
import { parseStaffOrgId } from './staffOrgScope';

/**
 * Returns the current Supabase session from server-side cookies.
 * Returns null if no session exists or Supabase is not configured.
 */
export async function getPortalSession(): Promise<Session | null> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return null;
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session;
}

/**
 * Extracts the staff member's org_id (UUID) from their JWT user metadata.
 * Returns null if not authenticated or metadata is absent/invalid.
 */
export async function getPortalStaffOrgId(): Promise<string | null> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return null;
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;
  return parseStaffOrgId(user.user_metadata?.org_id);
}

/**
 * Asserts that a valid staff session exists. Redirects to /care-portal-login
 * if Supabase is unconfigured or the user is not authenticated.
 * Returns the authenticated User when the check passes.
 */
export async function requirePortalAuth(): Promise<User> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    redirect('/care-portal-login?err=config');
  }
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    redirect('/care-portal-login');
  }
  return user;
}
