'use client';

import React, { useState } from 'react';
import { Menu } from 'lucide-react';
import AppLogo from '@/components/ui/AppLogo';
import PortalSidebar from '@/components/PortalSidebar';

type Props = {
  children: React.ReactNode;
  orgName: string | null;
  orgLogoUrl: string | null;
};

export default function PortalMobileNav({ children, orgName, orgLogoUrl }: Props) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  return (
    <>
      {/* Mobile-only top bar */}
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
          {orgLogoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={orgLogoUrl}
              alt={orgName ?? 'Organisation'}
              className="h-7 w-auto object-contain"
            />
          ) : (
            <>
              <AppLogo size={28} />
              <span className="text-sm font-bold tracking-tight text-gray-800">
                {orgName ?? 'BUDR'}
              </span>
            </>
          )}
        </div>
      </header>

      {/* Mobile overlay backdrop */}
      {mobileNavOpen && (
        <div
          role="presentation"
          className="fixed inset-0 top-24 z-[55] bg-black/40 md:hidden"
          onClick={() => setMobileNavOpen(false)}
        />
      )}

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <PortalSidebar
          mobileOpen={mobileNavOpen}
          onMobileClose={() => setMobileNavOpen(false)}
          orgName={orgName}
          orgLogoUrl={orgLogoUrl}
        />
        <main className="min-w-0 flex-1 overflow-y-auto">{children}</main>
      </div>
    </>
  );
}
