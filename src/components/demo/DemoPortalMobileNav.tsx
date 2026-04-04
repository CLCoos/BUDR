'use client';

import React, { useState } from 'react';
import { Menu } from 'lucide-react';
import DemoPortalSidebar from '@/components/demo/DemoPortalSidebar';
import DokumentSøgning from '@/components/DokumentSøgning';

type Props = {
  children: React.ReactNode;
};

export default function DemoPortalMobileNav({ children }: Props) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <>
      <header
        className="flex shrink-0 flex-col gap-2 border-b px-3 pb-3 pt-0 md:hidden"
        style={{
          backgroundColor: 'var(--cp-bg2)',
          borderColor: 'var(--cp-border)',
        }}
        aria-label="Care Portal demo mobilmenu"
      >
        <div className="flex h-12 items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileNavOpen(true)}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md transition-colors"
            style={{ color: 'var(--cp-text)' }}
            aria-expanded={mobileNavOpen}
            aria-label="Åbn sidemenu"
          >
            <Menu size={22} aria-hidden />
          </button>
          <span
            className="min-w-0 flex-1 truncate text-sm font-medium"
            style={{ color: 'var(--cp-text)' }}
          >
            Bosted Nordlys
          </span>
        </div>
        <div className="w-full min-w-0 sm:hidden" aria-label="Dokumentsøgning">
          <DokumentSøgning carePortalDark linkTarget="demo" />
        </div>
      </header>

      {mobileNavOpen && (
        <div
          role="presentation"
          className="fixed inset-0 top-[52px] z-[10050] bg-black/50 md:hidden"
          onClick={() => setMobileNavOpen(false)}
          aria-hidden
        />
      )}

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <DemoPortalSidebar
          mobileOpen={mobileNavOpen}
          onMobileClose={() => setMobileNavOpen(false)}
          orgName="Bosted Nordlys"
          orgLogoUrl={null}
        />
        <main className="cp-scroll min-w-0 flex-1 overflow-y-auto">{children}</main>
      </div>
    </>
  );
}
