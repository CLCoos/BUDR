import { createServerSupabaseClient } from './server';
import type { NameDisplayMode } from '@/lib/residents/formatName';

export interface OrgBranding {
  id: string;
  name: string;
  logo_url: string | null;
  primary_color: string;
  slug: string | null;
  resident_name_display_mode: NameDisplayMode;
}

/**
 * Server-side helper — reads the logged-in staff user's org_id from their
 * JWT user_metadata, then fetches the matching organisations row.
 * Returns null if no user is authenticated or no org is linked.
 */
export async function getOrganisationForStaff(): Promise<OrgBranding | null> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) {
    console.log('[BUDR-DIAGNOSE] no_server_client');
    return null;
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    console.log('[BUDR-DIAGNOSE] no_user_in_session');
    return null;
  }

  const orgId = user.user_metadata?.org_id as string | undefined;
  if (!orgId) {
    console.log(`[BUDR-DIAGNOSE] user_id: ${user.id}, missing_org_id_in_metadata`);
    return null;
  }

  const selectWithResidentMode =
    'id, name, logo_url, primary_color, slug, resident_name_display_mode';
  const baseSelect = 'id, name, logo_url, primary_color, slug';

  let { data, error } = await supabase
    .from('organisations')
    .select(selectWithResidentMode)
    .eq('id', orgId)
    .single();

  // Backward compatibility: some environments may miss this column until migrations are applied.
  if (error?.code === '42703') {
    const fallbackRes = await supabase
      .from('organisations')
      .select(baseSelect)
      .eq('id', orgId)
      .single();
    data = fallbackRes.data as typeof data;
    error = fallbackRes.error;
  }

  if (error) {
    if (error.code === 'PGRST116') {
      console.log(
        `[BUDR-DIAGNOSE] user_id: ${user.id}, org_id: ${orgId}, organisations_query_returned_zero_rows`
      );
    } else {
      console.log(
        `[BUDR-DIAGNOSE] user_id: ${user.id}, org_id: ${orgId}, organisations_query_failed: ${error.message}`
      );
      console.log('[BUDR-DIAGNOSE] organisations_query_error_payload', {
        code: error.code,
        message: error.message,
        details: error.details,
        hint: error.hint,
      });
    }
    return null;
  }
  if (!data) {
    console.log(
      `[BUDR-DIAGNOSE] user_id: ${user.id}, org_id: ${orgId}, organisations_query_returned_zero_rows`
    );
    return null;
  }

  return {
    id: data.id as string,
    name: data.name as string,
    logo_url: (data.logo_url as string | null) ?? null,
    primary_color: (data.primary_color as string) ?? '#1D9E75',
    slug: typeof data.slug === 'string' && data.slug.trim() ? data.slug.trim() : null,
    resident_name_display_mode:
      data.resident_name_display_mode === 'full_name' ||
      data.resident_name_display_mode === 'initials_only'
        ? data.resident_name_display_mode
        : 'first_name_initial',
  };
}
