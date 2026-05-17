import React from 'react';
import CarePortalDemoShell from '@/components/demo/CarePortalDemoShell';

export default function CarePortalDemoLayout({ children }: { children: React.ReactNode }) {
  return <CarePortalDemoShell>{children}</CarePortalDemoShell>;
}
