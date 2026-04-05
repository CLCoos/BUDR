'use client';

import React from 'react';
import TilsynsrapportClient from '@/app/care-portal-tilsynsrapport/TilsynsrapportClient';

export default function CarePortalDemoTilsynsrapportPage() {
  return <TilsynsrapportClient returnHref="/care-portal-demo" preferDemoWhenNoResidents />;
}
