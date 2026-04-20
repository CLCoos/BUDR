'use client';

import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import DokumentSøgning from '@/components/DokumentSøgning';
import { carePortalPilotSimulatedData } from '@/lib/carePortalPilotSimulated';

export default function CarePortalTopNav() {
  const pilot = carePortalPilotSimulatedData();

  return (
    <nav
      className="cp-glass-nav fixed left-0 right-0 top-0 z-[10001] flex h-[52px] items-center gap-2 px-3 sm:gap-3 sm:px-6"
      aria-label="Care Portal"
    >
      <div className="mr-0 flex shrink-0 items-center gap-2 sm:mr-1 sm:gap-2.5">
        <div
          className="shrink-0 rounded-full"
          style={{
            width: 28,
            height: 28,
            background: 'radial-gradient(circle at 35% 35%, #6ee7b7, #059669)',
            boxShadow: '0 0 14px rgba(45,212,160,0.45)',
          }}
          aria-hidden
        />
        <span
          className="text-[15px] font-normal tracking-tight"
          style={{ fontFamily: "'DM Serif Display', serif", color: 'var(--cp-text)' }}
        >
          BUDR
        </span>
      </div>

      {pilot ? (
        <span
          className="hidden items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider sm:inline-flex"
          style={{
            borderColor: 'rgba(45,212,160,0.35)',
            backgroundColor: 'var(--cp-green-dim)',
            color: 'var(--cp-green)',
          }}
        >
          <Sparkles className="h-3 w-3" aria-hidden />
          Pilot
        </span>
      ) : null}

      <div className="mx-1 hidden min-w-0 flex-1 justify-center sm:flex sm:px-2">
        <DokumentSøgning carePortalDark linkTarget={pilot ? 'pilot' : 'live'} />
      </div>

      <div className="ml-auto flex min-w-0 shrink-0 items-center gap-1.5 sm:gap-2">
        <Link
          href="/park-hub"
          className="truncate rounded-lg px-2 py-1.5 text-[11px] font-semibold transition-colors hover:opacity-90 sm:text-xs"
          style={{ color: 'var(--cp-green)' }}
          title="Åbn borger-app (Lys)"
        >
          <span className="sm:hidden">Borger-app</span>
          <span className="hidden sm:inline">Borger-app (Lys) →</span>
        </Link>
      </div>
    </nav>
  );
}
