import PortalShell from '@/components/PortalShell';
import IndsatsdokClient from './IndsatsdokClient';
import { requirePortalAuth } from '@/lib/portalAuth';

export default async function IndsatsdokPage() {
  await requirePortalAuth();
  return (
    <PortalShell>
      <div className="p-6">
        <IndsatsdokClient />
      </div>
    </PortalShell>
  );
}
