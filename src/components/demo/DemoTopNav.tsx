'use client';

import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import DokumentSøgning from '@/components/DokumentSøgning';

export default function DemoTopNav() {
  return (
    <nav
      className="cp-glass-nav fixed left-0 right-0 top-0 z-[10001] flex h-[52px] items-center gap-2 px-3 sm:gap-3 sm:px-6"
      aria-label="Care Portal demo"
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

      <span
        className="hidden items-center gap-1 rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider sm:inline-flex"
        style={{
          borderColor: 'rgba(246, 173, 85, 0.35)',
          backgroundColor: 'var(--cp-amber-dim)',
          color: 'var(--cp-amber)',
        }}
      >
        <Sparkles className="h-3 w-3" aria-hidden />
        Demo
      </span>

      <div className="mx-1 hidden min-w-0 flex-1 justify-center sm:flex sm:px-2">
        <DokumentSøgning carePortalDark linkTarget="demo" />
      </div>

      <div className="ml-auto flex shrink-0 items-center gap-2">
        <Link
          href="/resident-demo"
          className="hidden rounded-lg px-2 py-1.5 text-xs font-medium transition-colors sm:block"
          style={{ color: 'var(--cp-blue)' }}
        >
          Prøv borger-app →
        </Link>
        <Link
          href="/care-portal-login"
          className="rounded-[10px] px-3 py-2 text-xs font-semibold text-white transition-all hover:brightness-110"
          style={{
            background: 'linear-gradient(135deg, #2dd4a0 0%, #0d9488 100%)',
            boxShadow: '0 2px 14px rgba(45,212,160,0.35)',
          }}
        >
          Log ind
        </Link>
      </div>
    </nav>
  );
}
