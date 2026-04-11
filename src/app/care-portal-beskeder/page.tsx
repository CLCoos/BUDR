import React from 'react';
import PortalShell from '@/components/PortalShell';
import BeskederClient from '@/components/BeskederClient';
import { requirePortalAuth } from '@/lib/portalAuth';

export default async function CarePortalBeskederPage() {
  await requirePortalAuth();

  return (
    <PortalShell>
      <BeskederClient />
    </PortalShell>
  );
}
