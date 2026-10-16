import React, { Suspense } from 'react';
import PortalShell from '@/components/PortalShell';
import { requirePortalAuth } from '@/lib/portalAuth';
import FagsystemClient from './components/FagsystemClient';

export const metadata = { title: 'Overfør til fagsystem · BUDR' };

export default async function CarePortalFagsystemPage() {
  await requirePortalAuth();
  return (
    <PortalShell>
      <div className="p-4 sm:p-6">
        <Suspense fallback={null}>
          <FagsystemClient />
        </Suspense>
      </div>
    </PortalShell>
  );
}
