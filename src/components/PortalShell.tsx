import React from 'react';
import CarePortalTopNav from '@/components/CarePortalTopNav';
import PortalMobileNav from '@/components/PortalMobileNav';
import { getOrganisationForStaff } from '@/lib/supabase/organisation';

export default async function PortalShell({ children }: { children: React.ReactNode }) {
  const org = await getOrganisationForStaff();

  return (
    <div
      className="cp-demo-ambient flex h-screen flex-col overflow-hidden text-[15px] antialiased"
      style={{ backgroundColor: 'var(--cp-bg)' }}
    >
      <CarePortalTopNav />
      <div
        className="flex min-h-0 flex-1 flex-col overflow-hidden pt-[52px]"
        style={{ backgroundColor: 'var(--cp-bg)' }}
      >
        <PortalMobileNav orgName={org?.name ?? null} orgLogoUrl={org?.logo_url ?? null}>
          {children}
        </PortalMobileNav>
      </div>
    </div>
  );
}
