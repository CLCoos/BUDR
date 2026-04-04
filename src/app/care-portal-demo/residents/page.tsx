'use client';

import React, { Suspense } from 'react';
import ResidentsDemoGrid from '../components/ResidentsDemoGrid';

function ResidentsFallback() {
  return (
    <div className="p-6 text-sm" style={{ color: 'var(--cp-muted)' }}>
      Indlæser beboere…
    </div>
  );
}

export default function CarePortalDemoResidentsPage() {
  return (
    <Suspense fallback={<ResidentsFallback />}>
      <ResidentsDemoGrid />
    </Suspense>
  );
}
