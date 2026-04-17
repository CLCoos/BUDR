'use server';

import { redirect } from 'next/navigation';
import { createClient } from '@supabase/supabase-js';

export type RegisterResult = { error: string } | null;

export async function registerInvitedStaff(
  orgId: string,
  formData: FormData
): Promise<RegisterResult> {
  const fullName = (formData.get('full_name') as string | null)?.trim() ?? '';
  const email = (formData.get('email') as string | null)?.trim().toLowerCase() ?? '';
  const password = (formData.get('password') as string | null) ?? '';
  const role = formData.get('role') as string | null;

  if (!fullName) return { error: 'Navn er påkrævet' };
  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
    return { error: 'Ugyldig e-mailadresse' };
  if (password.length < 8) return { error: 'Adgangskoden skal være mindst 8 tegn' };
  if (role !== 'leder' && role !== 'medarbejder') return { error: 'Vælg en gyldig rolle' };

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return { error: 'Server ikke konfigureret' };

  const admin = createClient(url, serviceKey);

  const { data: createData, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: fullName },
  });

  if (createErr) {
    if (
      createErr.message.toLowerCase().includes('already registered') ||
      createErr.message.toLowerCase().includes('already exists')
    ) {
      return { error: 'Denne e-mail er allerede registreret' };
    }
    return { error: createErr.message };
  }

  const userId = createData.user?.id;
  if (!userId) return { error: 'Bruger blev ikke oprettet — prøv igen' };

  const { error: staffErr } = await admin.from('care_staff').insert({
    id: userId,
    org_id: orgId,
    full_name: fullName,
    role,
  });

  if (staffErr) {
    // Roll back the auth user so we don't leave an orphaned account.
    await admin.auth.admin.deleteUser(userId);
    return { error: 'Kunne ikke oprette medarbejderprofil — prøv igen' };
  }

  redirect('/care-portal-login?registered=1');
}
