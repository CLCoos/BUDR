import { notFound } from 'next/navigation';
import PortalShell from '@/components/PortalShell';
import { DesignSystemShowcase } from '@/components/design-system/DesignSystemShowcase';
import { canAccessDesignSystemPage } from '@/lib/designSystemAccess';
import { requirePortalAuth } from '@/lib/portalAuth';

export default async function DesignSystemPage() {
  const user = await requirePortalAuth();
  if (!canAccessDesignSystemPage(user.email ?? undefined)) {
    notFound();
  }

  return (
    <PortalShell>
      <DesignSystemShowcase />
    </PortalShell>
  );
}
