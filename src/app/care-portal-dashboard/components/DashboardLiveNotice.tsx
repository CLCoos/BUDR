import React from 'react';
import Link from 'next/link';
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

  if (pilotSim) {
    return (
      <div
        className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border px-4 py-2.5 text-xs"
        style={{
          borderColor: 'rgba(45,212,160,0.25)',
          backgroundColor: 'var(--cp-green-dim)',
          color: 'var(--cp-muted)',
        }}
      >
        <span>
          <span className="font-semibold text-[var(--cp-green)]">Pilot</span>
          {' · '}
          Du er logget ind som personale for{' '}
          <span className="font-medium text-[var(--cp-text)]">{org.name}</span>. Dashboard,
          beboer-grid og 360°-forhåndsvisning bruger{' '}
          <span className="font-medium text-[var(--cp-text)]">demo-data</span>
          som i den åbne portal-demo; vagtoverlevering og mange bagvedliggende data er stadig{' '}
          <span className="font-medium text-[var(--cp-text)]">live</span> for jeres organisation.
        </span>
        <Link
          href="/care-portal-demo"
          className="shrink-0 font-medium underline"
          style={{ color: 'var(--cp-text)' }}
        >
          Åbn også den åbne demo
        </Link>
      </div>
    );
  }

  return (
    <div
      className="mb-4 flex flex-wrap items-center justify-between gap-2 rounded-lg border px-4 py-2.5 text-xs"
      style={{
        borderColor: 'var(--cp-border)',
        backgroundColor: 'var(--cp-bg2)',
        color: 'var(--cp-muted)',
      }}
    >
      <span>
        <span className="font-semibold text-[var(--cp-green)]">Live</span>
        {' · '}
        Data for <span className="font-medium text-[var(--cp-text)]">{org.name}</span>. Kun beboere
        med samme <code className="rounded bg-[var(--cp-bg3)] px-1">org_id</code> vises.
      </span>
      <Link
        href="/care-portal-demo"
        className="shrink-0 font-medium underline"
        style={{ color: 'var(--cp-text)' }}
      >
        Åbn interaktiv demo (simuleret)
      </Link>
    </div>
  );
}
