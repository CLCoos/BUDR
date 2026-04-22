import PortalShell from '@/components/PortalShell';
import ImportWizard from './ImportWizard';
import { requirePortalAuth } from '@/lib/portalAuth';
import { PERMISSIONS } from '@/lib/permissions';
import { requirePortalPermission } from '@/lib/portalPermissions';

export default async function CarePortalImportPage() {
  await requirePortalAuth();
  await requirePortalPermission(PERMISSIONS.IMPORT_RESIDENTS);
  return (
    <PortalShell>
      <ImportWizard />
    </PortalShell>
  );
}
