import { createServerSupabaseClient } from './server';

export interface OrgBranding {
  name: string;
  logo_url: string | null;
  primary_color: string;
  slug: string | null;
}

/**
 * Server-side helper — reads the logged-in staff user's org_id from their
 * JWT user_metadata, then fetches the matching organisations row.
 * Returns null if no user is authenticated or no org is linked.
 */
export async function getOrganisationForStaff(): Promise<OrgBranding | null> {
  const supabase = await createServerSupabaseClient();
  if (!supabase) return null;

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const orgId = user.user_metadata?.org_id as string | undefined;
  if (!orgId) return null;

  const { data, error } = await supabase
    .from('organisations')
    .select('name, logo_url, primary_color, slug')
    .eq('id', orgId)
    .single();

  if (error || !data) return null;

  return {
    name: data.name as string,
    logo_url: (data.logo_url as string | null) ?? null,
    primary_color: (data.primary_color as string) ?? '#1D9E75',
    slug: typeof data.slug === 'string' && data.slug.trim() ? data.slug.trim() : null,
  };
}
