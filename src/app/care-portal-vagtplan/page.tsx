import React from 'react';
import PortalShell from '@/components/PortalShell';
import VagtplanDemoClient from '@/app/care-portal-demo/components/VagtplanDemoClient';
import { requirePortalAuth } from '@/lib/portalAuth';

export default async function CarePortalVagtplanPage() {
  await requirePortalAuth();

  return (
    <PortalShell>
      <VagtplanDemoClient basePath="/care-portal-vagtplan" />
    </PortalShell>
  );
}
