import React from 'react';
import PortalShell from '@/components/PortalShell';
import DashboardClient from '@/app/care-portal-dashboard/components/DashboardClient';
import MedicationWidget from '@/app/care-portal-dashboard/components/MedicationWidget';
import { requirePortalAuth } from '@/lib/portalAuth';

export default async function CarePortalJournalPage() {
  await requirePortalAuth();
  return (
    <PortalShell>
      <div className="max-w-screen-2xl p-6">
        <DashboardClient
          medicationWidget={<MedicationWidget />}
          mode="single"
          singleWidget="journal"
        />
      </div>
    </PortalShell>
  );
}
