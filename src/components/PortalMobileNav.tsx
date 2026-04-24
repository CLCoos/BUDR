'use client';

import React, { useState } from 'react';
import { Menu } from 'lucide-react';
import PortalSidebar from '@/components/PortalSidebar';
import type { Permission } from '@/lib/permissions';
import DokumentSøgning from '@/components/DokumentSøgning';
import { ThemeToggle } from '@/components/ui/ThemeToggle';
import { carePortalPilotSimulatedData } from '@/lib/carePortalPilotSimulated';

type Props = {
  children: React.ReactNode;
  orgName: string | null;
  orgLogoUrl: string | null;
  /** Fra server (`care_staff.role`); bruges til rolle-baseret nav. */
  staffRole: string | null;
  permissions: Permission[];
};

export default function PortalMobileNav({
  children,
  orgName,
  orgLogoUrl,
  staffRole,
  permissions,
}: Props) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const pilot = carePortalPilotSimulatedData();

  const mobileTitle = orgName?.trim() || 'Care Portal';

  return (
    <>
      <header
        className="flex shrink-0 flex-col gap-2 border-b px-3 pb-3 pt-0 md:hidden"
        style={{
          backgroundColor: 'var(--cp-bg2)',
          borderColor: 'var(--cp-border)',
        }}
        aria-label="Care Portal mobilmenu"
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
            {orgLogoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={orgLogoUrl}
                alt={mobileTitle}
                className="h-7 w-auto max-w-[140px] object-contain"
              />
            ) : (
              mobileTitle
            )}
          </span>
          <ThemeToggle />
        </div>
        <div className="w-full min-w-0 sm:hidden" aria-label="Dokumentsøgning">
          <DokumentSøgning carePortalDark linkTarget={pilot ? 'pilot' : 'live'} />
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
        <PortalSidebar
          mobileOpen={mobileNavOpen}
          onMobileClose={() => setMobileNavOpen(false)}
          orgName={orgName}
          orgLogoUrl={orgLogoUrl}
          staffRole={staffRole}
          permissions={permissions}
        />
        <main className="cp-scroll min-w-0 flex-1 overflow-y-auto">{children}</main>
      </div>
    </>
  );
}
