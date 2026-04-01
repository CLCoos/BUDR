import React from 'react';
import PortalShell from '@/components/PortalShell';
import FacilityContactsManager from './components/FacilityContactsManager';

export default function CarePortalSettingsPage() {
  return (
    <PortalShell>
      <div className="p-6 max-w-screen-md">
        <div className="mb-8">
          <h1 className="text-2xl font-black text-gray-900">Indstillinger</h1>
          <p className="text-sm text-gray-500 mt-1">Administrer bostedets krisekontakter og opsætning</p>
        </div>
        <FacilityContactsManager />
      </div>
    </PortalShell>
  );
}
