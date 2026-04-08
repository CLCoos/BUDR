import React from 'react';
import PortalShell from '@/components/PortalShell';
import LoenDemoClient from '@/app/care-portal-demo/components/LoenDemoClient';
import { requirePortalAuth } from '@/lib/portalAuth';

export default async function CarePortalVagtplanLoenPage() {
  await requirePortalAuth();

  return (
    <PortalShell>
      <LoenDemoClient basePath="/care-portal-vagtplan" />
    </PortalShell>
  );
}
