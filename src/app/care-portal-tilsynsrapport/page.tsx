import PortalShell from '@/components/PortalShell';
import TilsynsrapportClient from './TilsynsrapportClient';

export default function TilsynsrapportPage() {
  return (
    <PortalShell>
      <div className="p-6">
        <TilsynsrapportClient />
      </div>
    </PortalShell>
  );
}
