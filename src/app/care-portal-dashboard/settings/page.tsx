import React from 'react';
import PortalShell from '@/components/PortalShell';
import { requirePortalAuth } from '@/lib/portalAuth';
import { PERMISSIONS } from '@/lib/permissions';
import { getOrgRolesForCurrentStaff, hasPortalPermission } from '@/lib/portalPermissions';
import { parseStaffOrgId } from '@/lib/staffOrgScope';
import SettingsClient from './components/SettingsClient';
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
  let initialLysDefaultVoiceId: string | null = null;
  if (supabase && orgId) {
    const { data } = await supabase
      .from('organisations')
      .select('lys_default_voice_id')
      .eq('id', orgId)
      .maybeSingle();
    if (typeof data?.lys_default_voice_id === 'string' && data.lys_default_voice_id.trim()) {
      initialLysDefaultVoiceId = data.lys_default_voice_id.trim();
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
          initialLysDefaultVoiceId={initialLysDefaultVoiceId}
        />
      </div>
    </PortalShell>
  );
}
