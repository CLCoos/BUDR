'use client';

import dynamic from 'next/dynamic';

// Datoer regnes ud fra «i dag» i browseren, så siden vises kun i klienten.
const DemoFagsystemClient = dynamic(() => import('./DemoFagsystemClient'), { ssr: false });

export default function CarePortalDemoFagsystemPage() {
  return <DemoFagsystemClient />;
}
