import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { careDemoProfileById } from '@/lib/careDemoResidents';
import ResidentDemo360Client from './ResidentDemo360Client';

function Loading() {
  return (
    <div className="p-6 text-sm" style={{ color: 'var(--cp-muted)' }}>
      Indlæser beboer…
    </div>
  );
}

export default async function CarePortalDemoResidentPage({
  params,
}: {
  params: Promise<{ residentId: string }>;
}) {
  const { residentId } = await params;
  if (!careDemoProfileById(residentId)) notFound();

  return (
    <Suspense fallback={<Loading />}>
      <ResidentDemo360Client residentId={residentId} />
    </Suspense>
  );
}
