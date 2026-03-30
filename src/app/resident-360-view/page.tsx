import React, { Suspense } from 'react';
import PortalShell from '@/components/PortalShell';
import Resident360Client from './components/Resident360Client';

export default function Resident360ViewPage() {
  return (
    <PortalShell>
      <Suspense fallback={<div className="p-6 text-sm text-gray-500">Indlæser beboer…</div>}>
        <Resident360Client />
      </Suspense>
    </PortalShell>
  );
}
