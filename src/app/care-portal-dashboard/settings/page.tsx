import React from 'react';
import PortalShell from '@/components/PortalShell';
import { requirePortalAuth } from '@/lib/portalAuth';
import { parseStaffOrgId } from '@/lib/staffOrgScope';
import SettingsClient from './components/SettingsClient';

export default async function CarePortalDashboardSettingsPage() {
  const user = await requirePortalAuth();
  const orgId = parseStaffOrgId(user.user_metadata?.org_id);

  return (
    <PortalShell>
      <div className="p-6 max-w-screen-sm">
        <SettingsClient staffEmail={user.email ?? ''} orgId={orgId} />
      </div>
    </PortalShell>
  );
}
