'use client';

import React from 'react';
import DemoTopNav from '@/components/demo/DemoTopNav';
import DemoPortalMobileNav from '@/components/demo/DemoPortalMobileNav';

export default function CarePortalDemoShell({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="cp-demo-ambient flex h-screen flex-col overflow-hidden text-[15px] antialiased"
      style={{ backgroundColor: 'var(--cp-bg)' }}
    >
      <DemoTopNav />
      <div
        className="flex min-h-0 flex-1 flex-col overflow-hidden pt-[52px]"
        style={{ backgroundColor: 'var(--cp-bg)' }}
      >
        <DemoPortalMobileNav>{children}</DemoPortalMobileNav>
      </div>
    </div>
  );
}
