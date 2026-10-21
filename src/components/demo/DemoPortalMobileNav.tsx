'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { FileText, Menu, Mic, Search, Sun, Users, X } from 'lucide-react';
import { useDemoFortael } from '@/components/demo/DemoFortael';
import DemoPortalSidebar from '@/components/demo/DemoPortalSidebar';
import DokumentSøgning from '@/components/DokumentSøgning';
import DepartmentSelect from '@/components/DepartmentSelect';
import { useCarePortalDepartment } from '@/contexts/CarePortalDepartmentContext';
import { CARE_PORTAL_DEPARTMENT_OPTIONS } from '@/lib/careDemoResidents';
import { parseCarePortalDepartment } from '@/lib/carePortalHouse';
import { CARE_PORTAL_DEMO_FACILITY_NAME } from '@/lib/carePortalDemoBranding';

type Props = {
  children: React.ReactNode;
};

const TABS = [
  { href: '/care-portal-demo', label: 'Vagt', icon: Sun, exact: true },
  { href: '/care-portal-demo/residents', label: 'Borgere', icon: Users },
  { href: '/care-portal-demo/dokumenter', label: 'Frister', icon: FileText },
] as const;

export default function DemoPortalMobileNav({ children }: Props) {
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const pathname = usePathname();
  const { openFortael } = useDemoFortael();
  const { department, setDepartment } = useCarePortalDepartment();
  const deptSelectValue = department === 'alle' ? 'alle' : department;

  const renderTab = (t: (typeof TABS)[number]) => {
    const active = 'exact' in t && t.exact ? pathname === t.href : pathname?.startsWith(t.href);
    const Icon = t.icon;
    return (
      <Link
        key={t.href}
        href={t.href}
        aria-current={active ? 'page' : undefined}
        className="flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium"
        style={{ color: active ? 'var(--cp-green)' : 'var(--cp-muted)' }}
      >
        <Icon size={22} strokeWidth={active ? 2.25 : 1.75} aria-hidden />
        {t.label}
      </Link>
    );
  };

  return (
    <>
      <header
        className="flex shrink-0 flex-col gap-2 border-b px-3 pb-2 md:hidden"
        style={{
          backgroundColor: 'var(--cp-bg2)',
          borderColor: 'var(--cp-border)',
        }}
        aria-label="Care Portal demo mobilmenu"
      >
        <div className="flex h-12 items-center gap-2">
          <span
            className="min-w-0 shrink truncate text-sm font-semibold"
            style={{ color: 'var(--cp-text)' }}
          >
            {CARE_PORTAL_DEMO_FACILITY_NAME}
          </span>
          <div className="ml-auto w-[150px] shrink-0 [&_button]:!min-w-0">
            <DepartmentSelect
              value={deptSelectValue}
              onChange={(id) => setDepartment(parseCarePortalDepartment(id))}
              departments={CARE_PORTAL_DEPARTMENT_OPTIONS}
              aria-label="Vælg afdeling for demo-overblikket"
            />
          </div>
          <button
            type="button"
            onClick={() => setSearchOpen((o) => !o)}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-md"
            style={{ color: 'var(--cp-text)' }}
            aria-expanded={searchOpen}
            aria-label={searchOpen ? 'Luk søgning' : 'Søg'}
          >
            {searchOpen ? <X size={20} aria-hidden /> : <Search size={20} aria-hidden />}
          </button>
        </div>
        {searchOpen && (
          <div className="w-full min-w-0" aria-label="Dokumentsøgning">
            <DokumentSøgning carePortalDark linkTarget="demo" />
          </div>
        )}
      </header>

      {mobileNavOpen && (
        <div
          role="presentation"
          className="fixed inset-0 top-[var(--cp-demo-stack-top)] z-[10050] bg-black/50 md:hidden"
          onClick={() => setMobileNavOpen(false)}
          aria-hidden
        />
      )}

      <div className="flex min-h-0 flex-1 overflow-hidden">
        <DemoPortalSidebar
          mobileOpen={mobileNavOpen}
          onMobileClose={() => setMobileNavOpen(false)}
          orgName={CARE_PORTAL_DEMO_FACILITY_NAME}
          orgLogoUrl={null}
        />
        <main className="cp-scroll min-w-0 flex-1 overflow-y-auto pb-[72px] md:pb-0">
          {children}
        </main>
      </div>

      <nav
        aria-label="Hovedmenu"
        className="fixed inset-x-0 bottom-0 z-[10045] grid grid-cols-5 border-t md:hidden"
        style={{
          backgroundColor: 'var(--cp-bg2)',
          borderColor: 'var(--cp-border)',
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        {TABS.slice(0, 2).map(renderTab)}
        <button
          type="button"
          onClick={openFortael}
          className="flex h-16 flex-col items-center justify-end gap-1 pb-2 text-[11px] font-semibold"
          style={{ color: 'var(--cp-green)' }}
        >
          <span
            className="-mt-6 flex h-12 w-12 items-center justify-center rounded-full"
            style={{
              backgroundColor: 'var(--cp-green)',
              color: 'var(--cp-on-green)',
              boxShadow: '0 6px 16px color-mix(in srgb, var(--cp-green) 40%, transparent)',
            }}
          >
            <Mic size={22} aria-hidden />
          </span>
          Fortæl
        </button>
        {TABS.slice(2).map(renderTab)}
        <button
          type="button"
          onClick={() => setMobileNavOpen(true)}
          aria-expanded={mobileNavOpen}
          className="flex h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium"
          style={{ color: 'var(--cp-muted)' }}
        >
          <Menu size={22} strokeWidth={1.75} aria-hidden />
          Mere
        </button>
      </nav>
    </>
  );
}
