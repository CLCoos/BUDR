import React from 'react';
import { createClient } from '@supabase/supabase-js';
import LysShell from './components/LysShell';
import { getResidentId } from '@/lib/residentAuth';

function deriveInitials(displayName: string): string {
  return displayName
    .trim()
    .split(/\s+/)
    .map(w => w[0] ?? '')
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

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
    const name = data.display_name as string;
    const od = (data.onboarding_data as Record<string, string> | null) ?? {};
    return {
      name,
      initials: od.avatar_initials || deriveInitials(name),
    };
  } catch {
    return null;
  }
}

export default async function ParkHubPage() {
  const residentId = await getResidentId();

  const resident = residentId ? await getResident(residentId) : null;

  const displayName = resident?.name ?? '';
  const firstName = displayName.trim().split(/\s+/)[0] || '';
  const initials = resident?.initials || (displayName ? deriveInitials(displayName) : '');

  return (
    <LysShell
      firstName={firstName}
      initials={initials}
      residentId={residentId ?? ''}
    />
  );
}
