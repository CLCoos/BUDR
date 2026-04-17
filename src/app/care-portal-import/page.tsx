import PortalShell from '@/components/PortalShell';
import ImportWizardClient from './ImportWizardClient';
import { requirePortalAuth } from '@/lib/portalAuth';

export default async function CarePortalImportPage() {
  await requirePortalAuth();
  return (
    <PortalShell>
      <ImportWizardClient />
    </PortalShell>
  );
}
