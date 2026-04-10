import React from 'react';
import PortalShell from '@/components/PortalShell';
import HandoverClient from './components/HandoverClient';

export default function HandoverWorkspacePage() {
  return (
    <PortalShell>
      <HandoverClient carePortalDark />
    </PortalShell>
  );
}
