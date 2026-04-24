import React from 'react';
import CarePortalTopNav from '@/components/CarePortalTopNav';
import PortalMobileNav from '@/components/PortalMobileNav';
import { CarePortalDepartmentProvider } from '@/contexts/CarePortalDepartmentContext';
import { getStaffPermissions } from '@/lib/auth/getStaffPermissions';
import { getPortalStaffRole } from '@/lib/portalAuth';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { getOrganisationForStaff } from '@/lib/supabase/organisation';
import { CurrentOrgProvider } from '@/contexts/CurrentOrgContext';
import { AuthenticatedUserProvider } from '@/contexts/AuthenticatedUserContext';

export default async function PortalShell({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabaseClient();
  const [org, staffRole, permissions] = await Promise.all([
    getOrganisationForStaff(),
    getPortalStaffRole(),
    supabase ? getStaffPermissions(supabase) : Promise.resolve([]),
  ]);

  return (
    <CurrentOrgProvider
      value={{
        id: org?.id ?? null,
        name: org?.name ?? null,
        resident_name_display_mode: org?.resident_name_display_mode ?? 'first_name_initial',
      }}
    >
      <CarePortalDepartmentProvider>
        <AuthenticatedUserProvider>
          <div
            id="care-portal-shell"
            data-theme="dark"
            className="cp-demo-ambient flex h-screen flex-col overflow-hidden text-[15px] antialiased"
            style={{ backgroundColor: 'var(--cp-bg)' }}
          >
            <CarePortalTopNav />
            <div
              className="flex min-h-0 flex-1 flex-col overflow-hidden pt-[var(--header-height)]"
              style={{ backgroundColor: 'var(--cp-bg)' }}
            >
              <PortalMobileNav
                orgId={org?.id ?? null}
                orgName={org?.name ?? null}
                orgLogoUrl={org?.logo_url ?? null}
                staffRole={staffRole}
                permissions={permissions}
              >
                <div className="cp-page-enter">{children}</div>
              </PortalMobileNav>
            </div>
          </div>
        </AuthenticatedUserProvider>
      </CarePortalDepartmentProvider>
    </CurrentOrgProvider>
  );
}
