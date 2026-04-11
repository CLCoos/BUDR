import PortalShell from '@/components/PortalShell';
import TilsynsrapportClient from './TilsynsrapportClient';
import { requirePortalAuth } from '@/lib/portalAuth';

export default async function TilsynsrapportPage() {
  await requirePortalAuth();
  return (
    <PortalShell>
      <div className="p-6">
        <TilsynsrapportClient />
      </div>
    </PortalShell>
  );
}
