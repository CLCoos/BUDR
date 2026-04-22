import PortalShell from '@/components/PortalShell';
import { PERMISSIONS } from '@/lib/permissions';
import { requirePortalPermission } from '@/lib/portalPermissions';
import RolesClient from './roles-client';

export default async function CarePortalRolesPage() {
  await requirePortalPermission(PERMISSIONS.MANAGE_ROLES);
  return (
    <PortalShell>
      <div className="p-6">
        <RolesClient />
      </div>
    </PortalShell>
  );
}
