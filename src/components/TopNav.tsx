'use client';
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import DokumentSøgning from '@/components/DokumentSøgning';
import { CARE_PORTAL_DEMO_FACILITY_NAME } from '@/lib/carePortalDemoBranding';

const borgerRoutes = ['/park-hub'];
const portalRoutes = ['/care-portal-dashboard', '/handover-workspace', '/resident-360-view'];

export default function TopNav() {
  const pathname = usePathname();

  const isBorger = borgerRoutes?.some((r) => pathname?.startsWith(r));
  const isPortal = portalRoutes?.some((r) => pathname?.startsWith(r));

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 flex h-12 items-center gap-2 px-4"
      style={{
        backgroundColor: 'var(--cp-bg2)',
        borderBottom: '1px solid var(--cp-border)',
        height: '52px',
      }}
    >
      <div className="mr-4 flex shrink-0 items-center gap-2">
        {/* Orb logo */}
        <div
          style={{
            width: 26,
            height: 26,
            borderRadius: '50%',
            background: 'radial-gradient(circle at 35% 35%, #6ee7b7, #059669)',
            boxShadow: '0 0 12px rgba(45,212,160,0.4)',
            flexShrink: 0,
          }}
        />
        <span
          style={{
            fontFamily: "'DM Serif Display', serif",
            fontSize: 15,
            color: 'var(--cp-text)',
            letterSpacing: '-0.01em',
          }}
        >
          BUDR
        </span>
      </div>
      <div className="flex shrink-0 gap-1">
        <Link href="/park-hub">
          <button
            className="px-3 py-1.5 rounded text-xs font-medium transition-all"
            style={
              isBorger
                ? { backgroundColor: '#7F77DD', color: '#fff' }
                : { color: 'var(--cp-muted)', backgroundColor: 'transparent' }
            }
          >
            Borger-app
          </button>
        </Link>
        <Link href="/care-portal-dashboard">
          <button
            className="px-3 py-1.5 rounded text-xs font-medium transition-all"
            style={
              isPortal
                ? {
                    backgroundColor: 'var(--cp-green-dim)',
                    color: 'var(--cp-green)',
                    border: '1px solid rgba(45,212,160,0.2)',
                  }
                : { color: 'var(--cp-muted)', backgroundColor: 'transparent' }
            }
          >
            Care Portal
          </button>
        </Link>
      </div>
      <div className="mx-1 flex min-w-0 flex-1 justify-center px-1 sm:mx-2">
        {isPortal ? <DokumentSøgning /> : null}
      </div>
      <div className="ml-auto flex shrink-0 items-center gap-3">
        <span className="text-xs" style={{ color: 'var(--cp-muted)' }}>
          DEMO · {CARE_PORTAL_DEMO_FACILITY_NAME}
        </span>
        <div
          className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-semibold"
          style={{ background: 'linear-gradient(135deg, #2dd4a0, #0694a2)' }}
        >
          SK
        </div>
      </div>
    </nav>
  );
}
