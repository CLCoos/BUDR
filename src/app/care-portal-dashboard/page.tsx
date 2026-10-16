import React from 'react';
import PortalShell from '@/components/PortalShell';
import DashboardClient from './components/DashboardClient';
import DashboardLiveNotice from './components/DashboardLiveNotice';
import MedicationWidget from './components/MedicationWidget';
import { requirePortalAuth } from '@/lib/portalAuth';

export default async function CarePortalDashboardPage() {
  await requirePortalAuth();

  return (
    <PortalShell>
      <div className="mx-auto w-full max-w-[1320px] p-4 sm:p-6 lg:p-8">
        <DashboardLiveNotice />
        <DashboardClient medicationWidget={<MedicationWidget />} />
      </div>
    </PortalShell>
  );
}
