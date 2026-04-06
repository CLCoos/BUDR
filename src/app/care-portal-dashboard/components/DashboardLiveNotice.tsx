import React from 'react';
import Link from 'next/link';
import { getOrganisationForStaff } from '@/lib/supabase/organisation';

export default async function DashboardLiveNotice() {
  const org = await getOrganisationForStaff();

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
