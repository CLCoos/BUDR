import React from 'react';
import PortalShell from '@/components/PortalShell';
import { requirePortalAuth } from '@/lib/portalAuth';
import { PERMISSIONS } from '@/lib/permissions';
import { getOrgRolesForCurrentStaff, hasPortalPermission } from '@/lib/portalPermissions';
import { parseStaffOrgId } from '@/lib/staffOrgScope';
import SettingsClient from './components/SettingsClient';
import type { NameDisplayMode } from '@/lib/residents/formatName';
import { createServerSupabaseClient } from '@/lib/supabase/server';

export default async function CarePortalDashboardSettingsPage() {
  const user = await requirePortalAuth();
  const orgId = parseStaffOrgId(user.user_metadata?.org_id);
  const [roles, canManageRoles, canInviteStaff] = await Promise.all([
    getOrgRolesForCurrentStaff(),
    hasPortalPermission(PERMISSIONS.MANAGE_ROLES),
    hasPortalPermission(PERMISSIONS.INVITE_STAFF),
  ]);
  const supabase = await createServerSupabaseClient();
  let initialResidentNameDisplayMode: NameDisplayMode = 'first_name_initial';
  if (supabase && orgId) {
    const { data } = await supabase
      .from('organisations')
      .select('resident_name_display_mode')
      .eq('id', orgId)
      .maybeSingle();
    if (
      data?.resident_name_display_mode === 'full_name' ||
      data?.resident_name_display_mode === 'initials_only'
    ) {
      initialResidentNameDisplayMode = data.resident_name_display_mode;
    }
  }

  return (
    <PortalShell>
      <div className="p-6 max-w-screen-sm">
        <SettingsClient
          staffEmail={user.email ?? ''}
          orgId={orgId}
          initialRoles={roles}
          canManageRoles={canManageRoles}
          canInviteStaff={canInviteStaff}
          initialResidentNameDisplayMode={initialResidentNameDisplayMode}
        />
      </div>
    </PortalShell>
  );
}
