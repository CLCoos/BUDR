import React from 'react';
import PortalShell from '@/components/PortalShell';
import BeskederDemoClient from '@/app/care-portal-demo/components/BeskederDemoClient';
import { requirePortalAuth } from '@/lib/portalAuth';

export default async function CarePortalBeskederPage() {
  await requirePortalAuth();

  return (
    <PortalShell>
      <BeskederDemoClient />
    </PortalShell>
  );
}
