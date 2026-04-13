import React from 'react';
import Link from 'next/link';
import { BINGBONG_DEMO_ORG_SLUG } from '@/lib/bingbongOrg';
import { getOrganisationForStaff } from '@/lib/supabase/organisation';
import { carePortalPilotSimulatedData } from '@/lib/carePortalPilotSimulated';

export default async function DashboardLiveNotice() {
  const org = await getOrganisationForStaff();
  const pilotSim = carePortalPilotSimulatedData();

  if (!org) {
    return (
      <div
        className="mb-4 rounded-lg border px-4 py-3 text-sm"
        style={{
          borderColor: 'rgba(245,158,11,0.35)',
          backgroundColor: 'rgba(245,158,11,0.08)',
          color: 'var(--cp-amber)',
        }}
      >
        Din konto mangler tilknytning til et bosted. Sæt{' '}
        <code className="rounded bg-black/15 px-1 text-xs">org_id</code> i Supabase Auth (user
        metadata) for denne bruger, så kun jeres beboere vises. Se også{' '}
        <Link href="/privacy" className="underline font-medium">
          privatlivspolitikken
        </Link>
        .
      </div>
    );
  }

  if (pilotSim && org.slug !== BINGBONG_DEMO_ORG_SLUG) {
    return (
      <div
        className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border px-3 py-2 text-[11px] leading-snug"
        style={{
          borderColor: 'rgba(45,212,160,0.22)',
          backgroundColor: 'var(--cp-green-dim)',
          color: 'var(--cp-muted)',
        }}
      >
        <span>
          <span className="font-semibold text-[var(--cp-green)]">Pilot</span>
          {' · '}
          <span className="font-medium text-[var(--cp-text)]">{org.name}</span>
          {' — '}
          dele af overblikket bruger demo-data som i den åbne portal-demo.
        </span>
        <Link
          href="/care-portal-demo"
          className="shrink-0 font-medium underline"
          style={{ color: 'var(--cp-text)' }}
        >
          Åbn åben demo
        </Link>
      </div>
    );
  }

  return null;
}
