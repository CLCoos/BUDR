'use client';

import React, { useState } from 'react';
import { Menu } from 'lucide-react';
import TopNav from '@/components/TopNav';
import PortalSidebar from '@/components/PortalSidebar';
import AppLogo from '@/components/ui/AppLogo';

export default function PortalShell({ children }: { children: React.ReactNode }) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-gray-50">
      <TopNav />
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden pt-12">
        <header
          className="flex h-12 shrink-0 items-center gap-3 border-b border-gray-200 bg-white px-3 md:hidden"
          aria-label="Care Portal mobil menu"
        >
          <button
            type="button"
            onClick={() => setMobileNavOpen(true)}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md text-gray-700 hover:bg-gray-100"
            aria-expanded={mobileNavOpen}
            aria-label="Åbn sidemenu"
          >
            <Menu size={22} aria-hidden />
          </button>
          <div className="flex items-center gap-2">
            <AppLogo size={28} />
            <span className="text-sm font-bold tracking-tight text-gray-800">BUDR</span>
          </div>
        </header>

        {mobileNavOpen ? (
          <div
            role="presentation"
            className="fixed inset-0 top-24 z-[55] bg-black/40 md:hidden"
            onClick={() => setMobileNavOpen(false)}
          />
        ) : null}

        <div className="flex min-h-0 flex-1 overflow-hidden">
          <PortalSidebar mobileOpen={mobileNavOpen} onMobileClose={() => setMobileNavOpen(false)} />
          <main className="min-w-0 flex-1 overflow-y-auto md:pl-64">{children}</main>
        </div>
      </div>
    </div>
  );
}
