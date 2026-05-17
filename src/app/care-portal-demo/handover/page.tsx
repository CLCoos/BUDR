'use client';

import React from 'react';
import HandoverClient from '@/app/handover-workspace/components/HandoverClient';
import DemoWhyBox from '@/components/demo/DemoWhyBox';

export default function CarePortalDemoHandoverPage() {
  return (
    <div className="mx-auto max-w-6xl space-y-4 px-4 py-6 sm:px-6">
      <DemoWhyBox title="Hvorfor AI i vagtoverlevering?" storageKey="budr_demo_why_handover">
        AI kan samle vagtens hændelser til et første udkast, så I ikke starter fra blank skærm. I
        BUDR er det altid <strong style={{ color: 'var(--cp-text)' }}>personalet</strong>, der
        retter, tilføjer og godkender — modellen erstatter ikke det faglige skifte.
      </DemoWhyBox>
      <HandoverClient carePortalDark useDemoData />
    </div>
  );
}
