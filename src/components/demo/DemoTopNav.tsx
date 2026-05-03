'use client';

import Link from 'next/link';
import { Sparkles } from 'lucide-react';
import DokumentSøgning from '@/components/DokumentSøgning';
import DepartmentSelect from '@/components/DepartmentSelect';
import { useCarePortalDepartment } from '@/contexts/CarePortalDepartmentContext';
import { CARE_PORTAL_DEPARTMENT_OPTIONS } from '@/lib/careDemoResidents';
import { parseCarePortalDepartment } from '@/lib/carePortalHouse';

export default function DemoTopNav() {
  const { department, setDepartment } = useCarePortalDepartment();
  const deptSelectValue = department === 'alle' ? 'alle' : department;

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
        className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[9px] font-semibold uppercase tracking-wider sm:px-2.5 sm:text-[10px]"
        style={{
          borderColor: 'rgba(246, 173, 85, 0.35)',
          backgroundColor: 'var(--cp-amber-dim)',
          color: 'var(--cp-amber)',
        }}
      >
        <Sparkles className="h-3 w-3 shrink-0" aria-hidden />
        Demo
      </span>

      <div className="hidden shrink-0 sm:block sm:w-[min(9.5rem,28vw)]">
        <DepartmentSelect
          value={deptSelectValue}
          onChange={(id) => setDepartment(parseCarePortalDepartment(id))}
          departments={CARE_PORTAL_DEPARTMENT_OPTIONS}
          aria-label="Vælg afdeling for demo-overblikket"
        />
      </div>

      <div className="mx-1 hidden min-w-0 flex-1 justify-center sm:flex sm:px-2">
        <DokumentSøgning carePortalDark linkTarget="demo" />
      </div>

      <div className="ml-auto flex min-w-0 shrink-0 items-center gap-1.5 sm:gap-2">
        <Link
          href="/resident-demo"
          className="truncate rounded-lg px-2 py-1.5 text-[11px] font-semibold transition-colors hover:opacity-90 sm:text-xs"
          style={{ color: 'var(--cp-blue)' }}
          title="Åbn Lys / borger-app i demo (lokal data)"
        >
          <span className="sm:hidden">Borger-app</span>
          <span className="hidden sm:inline">Prøv borger-app (Lys) →</span>
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
