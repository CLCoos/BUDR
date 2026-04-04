'use client';

import React, { Suspense } from 'react';
import DashboardDemoMain from './components/DashboardDemoMain';

function DashboardFallback() {
  return (
    <div
      className="mx-auto min-h-[50vh] max-w-[1600px] px-4 py-16 sm:px-6"
      style={{ color: 'var(--cp-muted)' }}
      aria-busy
      aria-label="Indlæser demo"
    >
      Indlæser overblik…
    </div>
  );
}

export default function CarePortalDemoPage() {
  return (
    <Suspense fallback={<DashboardFallback />}>
      <DashboardDemoMain />
    </Suspense>
  );
}
