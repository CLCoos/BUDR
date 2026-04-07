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
      <div className="p-6 max-w-screen-2xl">
        <DashboardLiveNotice />
        <DashboardClient medicationWidget={<MedicationWidget />} />
      </div>
    </PortalShell>
  );
}
