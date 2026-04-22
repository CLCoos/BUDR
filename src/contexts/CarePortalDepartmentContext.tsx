'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { usePathname } from 'next/navigation';
import { carePortalHouseChipLabel } from '@/lib/careDemoResidents';
import {
  parseCarePortalDepartment,
  parseStaffWorkHouseMetadata,
  type CarePortalDepartment,
} from '@/lib/carePortalHouse';
import { carePortalPilotSimulatedData } from '@/lib/carePortalPilotSimulated';
import { createClient } from '@/lib/supabase/client';
import { DEMO_SHIFTS_KEY, DEMO_SHIFTS_UPDATED_EVENT, loadShifts } from '@/lib/demoShiftPlan';
import { inferDepartmentFromDemoShifts } from '@/lib/vagtplanInferDepartment';

const STORAGE_KEY = 'budr-care-portal-department';
const MODE_KEY = 'budr-care-portal-department-mode';

type Ctx = {
  department: CarePortalDepartment;
  setDepartment: (v: CarePortalDepartment) => void;
  /** Valgt afdeling er aktiv (ikke "Alle") */
  isScoped: boolean;
  label: string;
};

const CarePortalDepartmentContext = createContext<Ctx | null>(null);

async function fetchStaffDepartmentFromAuth(): Promise<CarePortalDepartment | null> {
  try {
    const supabase = createClient();
    if (!supabase) return null;
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.user_metadata) return null;
    const meta = user.user_metadata as Record<string, unknown>;
    const keys = ['work_house', 'default_care_house', 'care_house', 'afdeling'] as const;
    for (const k of keys) {
      const v = parseStaffWorkHouseMetadata(meta[k]);
      if (v != null) return v;
    }
    return null;
  } catch {
    return null;
  }
}

function shouldInferFromDemoShifts(pathname: string | null, pilot: boolean): boolean {
  if (pilot) return true;
  if (pathname?.startsWith('/care-portal-demo')) return true;
  if (process.env.NEXT_PUBLIC_CARE_PORTAL_SIMULATED_DATA === 'true') return true;
  return false;
}

export type { CarePortalDepartment } from '@/lib/carePortalHouse';

export function CarePortalDepartmentProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const pilot = carePortalPilotSimulatedData();
  const [department, setDepartmentState] = useState<CarePortalDepartment>('alle');
  const fixedModeRef = useRef(false);

  const applyAutoDepartment = useCallback(async () => {
    const fromAuth = await fetchStaffDepartmentFromAuth();
    if (fromAuth != null) {
      setDepartmentState(fromAuth);
      return;
    }
    if (shouldInferFromDemoShifts(pathname, pilot)) {
      const inferred = inferDepartmentFromDemoShifts(loadShifts(), new Date());
      if (inferred != null) setDepartmentState(inferred);
    }
  }, [pathname, pilot]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      let mode = localStorage.getItem(MODE_KEY);
      if (raw != null && mode !== 'fixed') {
        localStorage.setItem(MODE_KEY, 'fixed');
        mode = 'fixed';
      }
      if (mode === 'fixed' && raw != null) {
        fixedModeRef.current = true;
        setDepartmentState(parseCarePortalDepartment(raw));
        return;
      }
      fixedModeRef.current = false;
      void applyAutoDepartment();
    } catch {
      fixedModeRef.current = false;
      void applyAutoDepartment();
    }
  }, [applyAutoDepartment]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const refresh = () => {
      if (fixedModeRef.current) return;
      void applyAutoDepartment();
    };
    const onStorage = (e: StorageEvent) => {
      if (e.key !== DEMO_SHIFTS_KEY) return;
      refresh();
    };
    window.addEventListener('storage', onStorage);
    window.addEventListener(DEMO_SHIFTS_UPDATED_EVENT, refresh);
    return () => {
      window.removeEventListener('storage', onStorage);
      window.removeEventListener(DEMO_SHIFTS_UPDATED_EVENT, refresh);
    };
  }, [applyAutoDepartment]);

  useEffect(() => {
    if (fixedModeRef.current) return;
    const t = window.setInterval(() => void applyAutoDepartment(), 60_000);
    return () => window.clearInterval(t);
  }, [applyAutoDepartment]);

  const setDepartment = useCallback((v: CarePortalDepartment) => {
    setDepartmentState(v);
    fixedModeRef.current = true;
    try {
      localStorage.setItem(MODE_KEY, 'fixed');
      localStorage.setItem(STORAGE_KEY, v === 'alle' ? 'alle' : v);
    } catch {
      /* ignore */
    }
  }, []);

  const label = useMemo(
    () => (department === 'alle' ? 'Alle afdelinger' : carePortalHouseChipLabel(department)),
    [department]
  );

  const value = useMemo<Ctx>(
    () => ({
      department,
      setDepartment,
      isScoped: department !== 'alle',
      label,
    }),
    [department, setDepartment, label]
  );

  return (
    <CarePortalDepartmentContext.Provider value={value}>
      {children}
    </CarePortalDepartmentContext.Provider>
  );
}

export function useCarePortalDepartment(): Ctx {
  const ctx = useContext(CarePortalDepartmentContext);
  if (!ctx) {
    return {
      department: 'alle',
      setDepartment: () => {},
      isScoped: false,
      label: 'Alle afdelinger',
    };
  }
  return ctx;
}
