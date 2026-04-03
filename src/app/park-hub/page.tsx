import React from 'react';
import { createClient } from '@supabase/supabase-js';
import LysShell from './components/LysShell';
import DemoSeeder, { DEMO_RESIDENT_ID } from './components/DemoSeeder';
import { getResidentId } from '@/lib/residentAuth';

function deriveInitials(displayName: string): string {
  return displayName
    .trim()
    .split(/\s+/)
    .map((w) => w[0] ?? '')
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

async function getResident(residentId: string) {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data } = await supabase
      .from('care_residents')
      .select('display_name, onboarding_data, org_id')
      .eq('user_id', residentId)
      .single();
    if (!data) return null;
    const name = data.display_name as string;
    const od = (data.onboarding_data as Record<string, string> | null) ?? {};
    return {
      name,
      initials: od.avatar_initials || deriveInitials(name),
      facilityId: (data.org_id as string | null) ?? null,
    };
  } catch {
    return null;
  }
}

export default async function ParkHubPage() {
  const residentId = await getResidentId();

  // Demo mode — auto-set by middleware when no real cookie exists
  if (!residentId || residentId === DEMO_RESIDENT_ID) {
    return (
      <>
        <DemoSeeder />
        <div className="pt-8">
          <LysShell
            firstName="Anders"
            initials="AM"
            residentId={DEMO_RESIDENT_ID}
            facilityId={null}
          />
        </div>
      </>
    );
  }

  const resident = await getResident(residentId);

  const displayName = resident?.name ?? '';
  const firstName = displayName.trim().split(/\s+/)[0] || '';
  const initials = resident?.initials || (displayName ? deriveInitials(displayName) : '');

  return (
    <LysShell
      firstName={firstName}
      initials={initials}
      residentId={residentId}
      facilityId={resident?.facilityId ?? null}
    />
  );
}
