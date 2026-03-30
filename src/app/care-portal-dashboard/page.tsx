import React from 'react';
import PortalShell from '@/components/PortalShell';
import DashboardClient from './components/DashboardClient';
import MedicationWidget from './components/MedicationWidget';

export default function CarePortalDashboardPage() {
  return (
    <PortalShell>
      <div className="p-6 max-w-screen-2xl">
        <DashboardClient medicationWidget={<MedicationWidget />} />
      </div>
    </PortalShell>
  );
}
