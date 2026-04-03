'use server';

import { headers } from 'next/headers';
import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { logStaffLoginAudit } from '@/lib/staffAuditLog';
import { parseStaffOrgId } from '@/lib/staffOrgScope';

export type SignInState = { error: string } | null;

export async function signInAction(_prev: SignInState, formData: FormData): Promise<SignInState> {
  const email = (formData.get('email') as string | null)?.trim() ?? '';
  const password = (formData.get('password') as string | null) ?? '';

  if (!email || !password) {
    return { error: 'Udfyld email og adgangskode' };
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) return { error: 'Database utilgængelig — prøv igen' };

  const { data, error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: 'Forkert email eller adgangskode' };
  }

  if (data.user) {
    const h = await headers();
    const clientIp = h.get('x-forwarded-for')?.split(',')[0]?.trim() ?? h.get('x-real-ip') ?? null;
    const orgId = parseStaffOrgId(data.user.user_metadata?.org_id);
    void logStaffLoginAudit({
      staffUserId: data.user.id,
      orgId,
      clientIp,
    });
  }

  redirect('/care-portal-dashboard');
}
