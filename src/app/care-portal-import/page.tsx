import PortalShell from '@/components/PortalShell';
import ImportWizard from './ImportWizard';
import { requirePortalAuth } from '@/lib/portalAuth';

export default async function CarePortalImportPage() {
  await requirePortalAuth();
  return (
    <PortalShell>
      <ImportWizard />
    </PortalShell>
  );
}
