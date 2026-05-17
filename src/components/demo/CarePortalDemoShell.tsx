'use client';

import React from 'react';
import DemoTopNav from '@/components/demo/DemoTopNav';
import DemoPortalMobileNav from '@/components/demo/DemoPortalMobileNav';
import DemoWelcomeOverlay from '@/app/care-portal-demo/components/DemoWelcomeOverlay';
import DemoModeRibbon from '@/components/demo/DemoModeRibbon';
import { CarePortalDepartmentProvider } from '@/contexts/CarePortalDepartmentContext';
import { CARE_PORTAL_DEMO_STACK_TOP_PX } from '@/lib/carePortalDemoBranding';

export default function CarePortalDemoShell({ children }: { children: React.ReactNode }) {
  return (
    <CarePortalDepartmentProvider>
      <div
        className="cp-demo-ambient flex h-screen flex-col overflow-hidden text-[15px] antialiased"
        style={{
          backgroundColor: 'var(--cp-bg)',
          ['--cp-demo-stack-top' as string]: `${CARE_PORTAL_DEMO_STACK_TOP_PX}px`,
        }}
      >
        <DemoWelcomeOverlay />
        <DemoTopNav />
        <DemoModeRibbon />
        <div
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
          style={{
            backgroundColor: 'var(--cp-bg)',
            paddingTop: CARE_PORTAL_DEMO_STACK_TOP_PX,
          }}
        >
          <DemoPortalMobileNav>{children}</DemoPortalMobileNav>
        </div>
      </div>
    </CarePortalDepartmentProvider>
  );
}
