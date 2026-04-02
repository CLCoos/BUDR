import PortalShell from '@/components/PortalShell';
import IndsatsdokClient from './IndsatsdokClient';

export default function IndsatsdokPage() {
  return (
    <PortalShell>
      <div className="p-6">
        <IndsatsdokClient />
      </div>
    </PortalShell>
  );
}
