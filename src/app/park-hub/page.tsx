import React from 'react';
import { createClient } from '@supabase/supabase-js';
import LysShell from './components/LysShell';
import { getResidentId } from '@/lib/residentAuth';

async function getResident(residentId: string) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    );
    const { data } = await supabase
      .from('care_residents')
      .select('display_name, onboarding_data')
      .eq('user_id', residentId)
      .single();
    if (!data) return null;
    return {
      name: data.display_name as string,
      initials: (data.onboarding_data as Record<string, string>)?.avatar_initials ?? '?',
    };
  } catch {
    return null;
  }
}

export default async function ParkHubPage() {
  const residentId = await getResidentId();

  const resident = residentId ? await getResident(residentId) : null;

  const displayName = resident?.name ?? 'Beboer';
  const firstName = displayName.trim().split(/\s+/)[0] || displayName;

  return (
    <LysShell
      firstName={firstName}
      initials={resident?.initials ?? '?'}
      residentId={residentId ?? ''}
    />
  );
}
