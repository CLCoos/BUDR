import React, { Suspense } from 'react';
import { redirect } from 'next/navigation';
import PortalShell from '@/components/PortalShell';
import ResidentsDemoGrid from '@/app/care-portal-demo/components/ResidentsDemoGrid';
import { requirePortalAuth } from '@/lib/portalAuth';
import { carePortalPilotSimulatedData } from '@/lib/carePortalPilotSimulated';

function ResidentsFallback() {
  return (
    <div className="p-6 text-sm" style={{ color: 'var(--cp-muted)' }}>
      Indlæser beboere…
    </div>
  );
}

export default async function CarePortalResidentsSimPage() {
  await requirePortalAuth();
  if (!carePortalPilotSimulatedData()) {
    redirect('/resident-360-view');
  }

  return (
    <PortalShell>
      <Suspense fallback={<ResidentsFallback />}>
        <ResidentsDemoGrid
          residentsListPath="/care-portal-residents"
          residentPathBase="/care-portal-resident-preview"
        />
      </Suspense>
    </PortalShell>
  );
}
