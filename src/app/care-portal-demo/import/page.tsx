'use client';

import React from 'react';
import ImportWizardDemo from '../components/ImportWizardDemo';
import DemoWhyBox from '@/components/demo/DemoWhyBox';

export default function CarePortalDemoImportPage() {
  return (
    <div className="mx-auto max-w-2xl space-y-4 px-4 py-6 sm:px-6">
      <DemoWhyBox title="Hvad viser import-demoen?" storageKey="budr_demo_why_import">
        Wizarden viser <strong style={{ color: 'var(--cp-text)' }}>kun flow og knapper</strong> —
        ingen filer sendes til server, og ingen beboere oprettes. I pilot kobles import på jeres
        organisation, roller og godkendelseskæde i den rigtige Care Portal.
      </DemoWhyBox>
      <ImportWizardDemo />
    </div>
  );
}
