import { createClient } from '@/lib/supabase/client';

export interface CompressProfileResult {
  payload: Record<string, unknown>;
}

/**
 * Runs the `compress_profile` RPC for the signed-in user.
 * Returns the compressed payload that is also stored in `user_profiles.memory_payload`.
 */
export async function compressProfileForCurrentUser(): Promise<CompressProfileResult> {
  const supabase = createClient();
  if (!supabase) {
    throw new Error('Supabase client is not configured');
  }

  const { data, error } = await supabase.rpc('compress_profile');

  if (error) {
    throw new Error(error.message || 'Failed to compress profile');
  }

  return {
    payload: (data ?? {}) as Record<string, unknown>,
  };
}

/**
 * Optional admin/staff helper: compress a specific user profile by id.
 */
export async function compressProfileByUserId(userId: string): Promise<CompressProfileResult> {
  const supabase = createClient();
  if (!supabase) {
    throw new Error('Supabase client is not configured');
  }

  const { data, error } = await supabase.rpc('compress_profile', {
    p_user_id: userId,
  });

  if (error) {
    throw new Error(error.message || 'Failed to compress profile');
  }

  return {
    payload: (data ?? {}) as Record<string, unknown>,
  };
}
