'use server';

import { redirect } from 'next/navigation';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export type SignInState = { error: string } | null;

export async function signInAction(_prev: SignInState, formData: FormData): Promise<SignInState> {
  const email = (formData.get('email') as string | null)?.trim() ?? '';
  const password = (formData.get('password') as string | null) ?? '';

  if (!email || !password) {
    return { error: 'Udfyld email og adgangskode' };
  }

  const supabase = await createServerSupabaseClient();
  if (!supabase) return { error: 'Database utilgængelig — prøv igen' };

  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: 'Forkert email eller adgangskode' };
  }

  redirect('/care-portal-dashboard');
}
