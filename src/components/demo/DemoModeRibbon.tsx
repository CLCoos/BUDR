'use client';

import Link from 'next/link';
import { Info } from 'lucide-react';
import {
  CARE_PORTAL_DEMO_DISCLAIMER_SHORT,
  CARE_PORTAL_DEMO_RIBBON_BELOW_NAV_PX,
} from '@/lib/carePortalDemoBranding';

export default function DemoModeRibbon() {
  return (
    <div
      className="fixed left-0 right-0 z-[10000] flex items-center justify-center gap-2 border-b px-3 py-2 text-center sm:px-4"
      style={{
        top: 52,
        height: CARE_PORTAL_DEMO_RIBBON_BELOW_NAV_PX,
        minHeight: CARE_PORTAL_DEMO_RIBBON_BELOW_NAV_PX,
        backgroundColor: 'rgba(246, 173, 85, 0.12)',
        borderColor: 'rgba(246, 173, 85, 0.35)',
        color: 'var(--cp-amber)',
      }}
      role="status"
      aria-live="polite"
    >
      <span className="text-[10px] font-bold uppercase tracking-[0.12em] sm:text-[11px]">Demo</span>
      <span
        className="hidden max-w-[min(52rem,92vw)] truncate text-[11px] font-medium sm:inline sm:text-xs"
        style={{ color: 'var(--cp-text)' }}
      >
        {CARE_PORTAL_DEMO_DISCLAIMER_SHORT}
      </span>
      <span className="max-w-[min(14rem,38vw)] truncate text-[10px] font-medium sm:hidden sm:max-w-none">
        Fiktive data — ikke prod.
      </span>
      <Link
        href="/care-portal-demo/om-demo"
        className="inline-flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold underline-offset-2 hover:underline sm:text-[11px]"
        style={{ color: 'var(--cp-amber)' }}
      >
        <Info className="h-3 w-3 opacity-90" aria-hidden />
        Om demoen
      </Link>
    </div>
  );
}
