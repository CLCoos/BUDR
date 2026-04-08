import React, { Suspense } from 'react';
import { notFound, redirect } from 'next/navigation';
import PortalShell from '@/components/PortalShell';
import ResidentDemo360Client, {
  type ResidentDemo360NavLinks,
} from '@/app/care-portal-demo/residents/[residentId]/ResidentDemo360Client';
import { careDemoProfileById } from '@/lib/careDemoResidents';
import { requirePortalAuth } from '@/lib/portalAuth';
import { carePortalPilotSimulatedData } from '@/lib/carePortalPilotSimulated';

const LIVE_PREVIEW_NAV: ResidentDemo360NavLinks = {
  residentsList: '/care-portal-residents',
  assistant: '/care-portal-assistant',
  handover: '/handover-workspace',
};

function Loading() {
  return (
    <div className="p-6 text-sm" style={{ color: 'var(--cp-muted)' }}>
      Indlæser beboer…
    </div>
  );
}

export default async function CarePortalResidentPreviewPage({
  params,
}: {
  params: Promise<{ residentId: string }>;
}) {
  await requirePortalAuth();
  const { residentId } = await params;

  if (!carePortalPilotSimulatedData()) {
    redirect(`/resident-360-view/${encodeURIComponent(residentId)}`);
  }

  if (!careDemoProfileById(residentId)) notFound();

  return (
    <PortalShell>
      <Suspense fallback={<Loading />}>
        <ResidentDemo360Client residentId={residentId} navLinks={LIVE_PREVIEW_NAV} />
      </Suspense>
    </PortalShell>
  );
}
