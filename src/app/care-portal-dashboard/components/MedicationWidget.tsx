'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Pill,
  Shield,
  Timer,
} from 'lucide-react';
import { CARE_HOUSES, careDemoProfileById, type CareHouse } from '@/lib/careDemoResidents';
import { enumerateCivilMedicationSlotDates } from '@/lib/medicationScheduleSlots';

export interface MedicationTask {
  id: string;
  residentId: string;
  residentName: string;
  initials: string;
  house: CareHouse;
  room: string;
  medicationName: string;
  strengthLabel: string;
  quantity: number;
  unit: 'tabletter' | 'kapsler' | 'ml' | 'dråber' | 'inhalationer';
  routeLabel: string;
  scheduledAt: Date;
  givenAt: Date | null;
}

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

function formatTimeMono(d: Date): string {
  return d.toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function minutesLate(scheduledAt: Date, nowMs: number): number {
  return Math.max(0, Math.floor((nowMs - scheduledAt.getTime()) / 60000));
}

function formatLateDanish(minutes: number): string {
  if (minutes < 1) return 'Netop forfalden';
  if (minutes < 60) return `${minutes} min. forsinket`;
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  if (m === 0) return `${h} t. forsinket`;
  return `${h} t. ${m} min. forsinket`;
}

function qtyLabel(q: number, unit: MedicationTask['unit']): string {
  if (unit === 'tabletter') return q === 1 ? '1 tablet' : `${q} tabletter`;
  if (unit === 'kapsler') return q === 1 ? '1 kapsel' : `${q} kapsler`;
  if (unit === 'ml') return `${q} ml`;
  if (unit === 'dråber') return q === 1 ? '1 dråbe' : `${q} dråber`;
  return q === 1 ? '1 inhalation' : `${q} inhalationer`;
}

function taskForResident(
  partial: Omit<
    MedicationTask,
    'residentId' | 'residentName' | 'initials' | 'house' | 'room' | 'scheduledAt' | 'givenAt'
  > & { residentId: string }
): Omit<MedicationTask, 'scheduledAt' | 'givenAt'> {
  const p = careDemoProfileById(partial.residentId);
  if (!p) throw new Error(`Unknown resident ${partial.residentId}`);
  return {
    ...partial,
    residentName: p.displayName,
    initials: p.initials,
    house: p.house,
    room: p.room,
  };
}

function createMockEntries(nowMs: number): MedicationTask[] {
  const now = new Date(nowMs);
  const slots = enumerateCivilMedicationSlotDates(now);
  const past = slots.filter((t) => t.getTime() < now.getTime());
  const future = slots.filter((t) => t.getTime() > now.getTime());
  const inTwoHours = future.filter((t) => t.getTime() <= now.getTime() + TWO_HOURS_MS);
  const afterTwo = future.filter((t) => t.getTime() > now.getTime() + TWO_HOURS_MS);

  const overdueSlots = past.slice(-4);
  const upcomingSlots = inTwoHours.slice(0, 6);
  const laterSlots = afterTwo.slice(0, 14);

  const templates: Omit<MedicationTask, 'scheduledAt' | 'givenAt'>[] = [
    taskForResident({
      id: 'mw-001',
      residentId: 'res-001',
      medicationName: 'Metformin',
      strengthLabel: '500 mg',
      quantity: 2,
      unit: 'tabletter',
      routeLabel: 'Oralt',
    }),
    taskForResident({
      id: 'mw-002',
      residentId: 'res-002',
      medicationName: 'Sertralin',
      strengthLabel: '50 mg',
      quantity: 1,
      unit: 'tabletter',
      routeLabel: 'Oralt',
    }),
    taskForResident({
      id: 'mw-003',
      residentId: 'res-003',
      medicationName: 'Risperidon',
      strengthLabel: '2 mg',
      quantity: 1,
      unit: 'tabletter',
      routeLabel: 'Oralt',
    }),
    taskForResident({
      id: 'mw-004',
      residentId: 'res-004',
      medicationName: 'Lisinopril',
      strengthLabel: '10 mg',
      quantity: 1,
      unit: 'tabletter',
      routeLabel: 'Oralt',
    }),
    taskForResident({
      id: 'mw-005',
      residentId: 'res-005',
      medicationName: 'Quetiapin',
      strengthLabel: '25 mg',
      quantity: 2,
      unit: 'tabletter',
      routeLabel: 'Oralt',
    }),
    taskForResident({
      id: 'mw-006',
      residentId: 'res-006',
      medicationName: 'Panodil',
      strengthLabel: '1 g',
      quantity: 1,
      unit: 'tabletter',
      routeLabel: 'Oralt',
    }),
    taskForResident({
      id: 'mw-007',
      residentId: 'res-007',
      medicationName: 'Abilify',
      strengthLabel: '10 mg',
      quantity: 1,
      unit: 'tabletter',
      routeLabel: 'Oralt',
    }),
    taskForResident({
      id: 'mw-008',
      residentId: 'res-008',
      medicationName: 'Omeprazol',
      strengthLabel: '20 mg',
      quantity: 1,
      unit: 'kapsler',
      routeLabel: 'Oralt',
    }),
    taskForResident({
      id: 'mw-009',
      residentId: 'res-009',
      medicationName: 'Metformin',
      strengthLabel: '850 mg',
      quantity: 1,
      unit: 'tabletter',
      routeLabel: 'Oralt',
    }),
    taskForResident({
      id: 'mw-010',
      residentId: 'res-010',
      medicationName: 'Melatonin',
      strengthLabel: '3 mg',
      quantity: 1,
      unit: 'tabletter',
      routeLabel: 'Oralt',
    }),
    taskForResident({
      id: 'mw-011',
      residentId: 'res-011',
      medicationName: 'Warfarin',
      strengthLabel: '2,5 mg',
      quantity: 1,
      unit: 'tabletter',
      routeLabel: 'Oralt',
    }),
    taskForResident({
      id: 'mw-012',
      residentId: 'res-012',
      medicationName: 'Salbutamol',
      strengthLabel: '100 mcg',
      quantity: 2,
      unit: 'inhalationer',
      routeLabel: 'Inhalation',
    }),
    taskForResident({
      id: 'mw-013',
      residentId: 'res-001',
      medicationName: 'Quetiapin',
      strengthLabel: '100 mg',
      quantity: 1,
      unit: 'tabletter',
      routeLabel: 'Oralt',
    }),
    taskForResident({
      id: 'mw-014',
      residentId: 'res-004',
      medicationName: 'Sertralin',
      strengthLabel: '100 mg',
      quantity: 1,
      unit: 'tabletter',
      routeLabel: 'Oralt',
    }),
    taskForResident({
      id: 'mw-015',
      residentId: 'res-002',
      medicationName: 'Lithium',
      strengthLabel: '12,2 mmol',
      quantity: 2,
      unit: 'tabletter',
      routeLabel: 'Oralt',
    }),
    taskForResident({
      id: 'mw-016',
      residentId: 'res-008',
      medicationName: 'Prednisolon',
      strengthLabel: '5 mg',
      quantity: 1,
      unit: 'tabletter',
      routeLabel: 'Oralt',
    }),
    taskForResident({
      id: 'mw-017',
      residentId: 'res-003',
      medicationName: 'Lorazepam',
      strengthLabel: '1 mg',
      quantity: 1,
      unit: 'tabletter',
      routeLabel: 'Oralt',
    }),
    taskForResident({
      id: 'mw-018',
      residentId: 'res-005',
      medicationName: 'Metformin',
      strengthLabel: '500 mg',
      quantity: 2,
      unit: 'tabletter',
      routeLabel: 'Oralt',
    }),
    taskForResident({
      id: 'mw-019',
      residentId: 'res-006',
      medicationName: 'Vitamin D',
      strengthLabel: '20 µg',
      quantity: 1,
      unit: 'tabletter',
      routeLabel: 'Oralt',
    }),
    taskForResident({
      id: 'mw-020',
      residentId: 'res-007',
      medicationName: 'Mirtazapin',
      strengthLabel: '15 mg',
      quantity: 1,
      unit: 'tabletter',
      routeLabel: 'Oralt',
    }),
    taskForResident({
      id: 'mw-021',
      residentId: 'res-009',
      medicationName: 'Citalopram',
      strengthLabel: '20 mg',
      quantity: 1,
      unit: 'tabletter',
      routeLabel: 'Oralt',
    }),
    taskForResident({
      id: 'mw-022',
      residentId: 'res-010',
      medicationName: 'B12-vitamin',
      strengthLabel: '1 mg',
      quantity: 1,
      unit: 'tabletter',
      routeLabel: 'SL',
    }),
    taskForResident({
      id: 'mw-023',
      residentId: 'res-011',
      medicationName: 'Zopiclon',
      strengthLabel: '7,5 mg',
      quantity: 1,
      unit: 'tabletter',
      routeLabel: 'Oralt',
    }),
    taskForResident({
      id: 'mw-024',
      residentId: 'res-012',
      medicationName: 'Natriumvalproat',
      strengthLabel: '300 mg',
      quantity: 2,
      unit: 'tabletter',
      routeLabel: 'Oralt',
    }),
  ];

  const scheduledTimes = [...overdueSlots, ...upcomingSlots, ...laterSlots];
  const n = Math.min(templates.length, scheduledTimes.length);
  return templates.slice(0, n).map((t, i) => ({
    ...t,
    scheduledAt: scheduledTimes[i]!,
    givenAt: null,
  }));
}

function ResidentAbbr({
  fullName,
  initials,
  className,
}: {
  fullName: string;
  initials: string;
  className?: string;
}) {
  return (
    <abbr
      title={fullName}
      className={className}
      style={{
        cursor: 'help',
        textDecoration: 'none',
        borderBottom: '1px dotted rgba(148,163,184,0.45)',
      }}
    >
      {initials}
    </abbr>
  );
}

export default function MedicationWidget() {
  const [entries, setEntries] = useState<MedicationTask[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [laterExpanded, setLaterExpanded] = useState(true);
  const [nowTick, setNowTick] = useState(() => Date.now());
  const [houseFilter, setHouseFilter] = useState<'alle' | CareHouse>('alle');

  useEffect(() => {
    setEntries(createMockEntries(Date.now()));
    setHydrated(true);
  }, []);

  useEffect(() => {
    const t = window.setInterval(() => setNowTick(Date.now()), 60_000);
    return () => window.clearInterval(t);
  }, []);

  const markGiven = useCallback((id: string) => {
    const at = new Date();
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, givenAt: at } : e)));
  }, []);

  const scopedEntries = useMemo(() => {
    if (houseFilter === 'alle') return entries;
    return entries.filter((e) => e.house === houseFilter);
  }, [entries, houseFilter]);

  const {
    overdue,
    upcoming,
    laterToday,
    overduePrimary,
    stats,
    pendingCount,
    prepOverview,
    doseTotals,
  } = useMemo(() => {
    if (!hydrated) {
      return {
        overdue: [] as MedicationTask[],
        upcoming: [] as MedicationTask[],
        laterToday: [] as MedicationTask[],
        overduePrimary: false,
        stats: { pending: 0, overdueN: 0, upcomingN: 0, laterN: 0 },
        pendingCount: 0,
        prepOverview: [] as { name: string; administrations: number; units: number }[],
        doseTotals: { tabletter: 0, ovrige: 0 },
      };
    }
    const now = nowTick;
    const pending = scopedEntries.filter((e) => e.givenAt === null);
    const overdueWindow = scopedEntries
      .filter((e) => e.scheduledAt.getTime() < now)
      .sort((a, b) => {
        const aDone = a.givenAt !== null ? 1 : 0;
        const bDone = b.givenAt !== null ? 1 : 0;
        if (aDone !== bDone) return aDone - bDone;
        return a.scheduledAt.getTime() - b.scheduledAt.getTime();
      });
    const hasOpenOverdue = overdueWindow.some((e) => e.givenAt === null);
    const overdueList = hasOpenOverdue ? overdueWindow : [];
    const upcomingList = pending
      .filter((e) => {
        const t0 = e.scheduledAt.getTime();
        return t0 > now && t0 <= now + TWO_HOURS_MS;
      })
      .sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());
    const laterList = pending
      .filter((e) => e.scheduledAt.getTime() > now + TWO_HOURS_MS)
      .sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());

    const byPrep = new Map<string, { administrations: number; units: number }>();
    let tabletter = 0;
    let ovrige = 0;
    for (const e of pending) {
      const prev = byPrep.get(e.medicationName) ?? { administrations: 0, units: 0 };
      prev.administrations += 1;
      prev.units += e.quantity;
      byPrep.set(e.medicationName, prev);
      if (e.unit === 'tabletter' || e.unit === 'kapsler') tabletter += e.quantity;
      else ovrige += e.quantity;
    }
    const prepOverview = [...byPrep.entries()]
      .map(([name, v]) => ({ name, ...v }))
      .sort((a, b) => b.units - a.units || b.administrations - a.administrations);

    return {
      overdue: overdueList,
      upcoming: upcomingList,
      laterToday: laterList,
      overduePrimary: overdueList.length > 0,
      pendingCount: pending.length,
      prepOverview,
      doseTotals: { tabletter, ovrige },
      stats: {
        pending: pending.length,
        overdueN: overdueList.filter((e) => !e.givenAt).length,
        upcomingN: upcomingList.length,
        laterN: laterList.length,
      },
    };
  }, [scopedEntries, hydrated, nowTick]);

  const uniqueResidentsPending = useMemo(() => {
    const ids = new Set(scopedEntries.filter((e) => e.givenAt === null).map((e) => e.residentId));
    return ids.size;
  }, [scopedEntries]);

  if (!hydrated) {
    return (
      <div className="cp-card-elevated w-full animate-pulse overflow-hidden p-6">
        <div className="mb-6 flex justify-between">
          <div className="h-12 w-52 rounded-2xl" style={{ backgroundColor: 'var(--cp-bg3)' }} />
          <div className="h-8 w-24 rounded-full" style={{ backgroundColor: 'var(--cp-bg3)' }} />
        </div>
        <div className="mb-4 h-32 rounded-2xl" style={{ backgroundColor: 'var(--cp-bg3)' }} />
        <div className="h-28 rounded-2xl" style={{ backgroundColor: 'var(--cp-bg3)' }} />
      </div>
    );
  }

  return (
    <section
      className="cp-card-elevated relative w-full overflow-hidden p-6 sm:p-7"
      aria-label="Medicinudleveringer"
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/12 to-transparent"
        aria-hidden
      />

      <header className="relative mb-5 flex flex-col gap-4 sm:mb-6 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-4">
          <div
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl shadow-lg shadow-black/20"
            style={{
              background:
                'linear-gradient(145deg, rgba(99,179,237,0.25) 0%, rgba(99,179,237,0.08) 100%)',
              border: '1px solid rgba(99,179,237,0.25)',
            }}
          >
            <Pill className="h-5 w-5" style={{ color: 'var(--cp-blue)' }} aria-hidden />
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2
                className="text-lg font-semibold tracking-tight sm:text-xl"
                style={{ color: 'var(--cp-text)' }}
              >
                Medicin i dag
              </h2>
              {stats.pending > 0 && (
                <span
                  className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold tabular-nums"
                  style={{
                    backgroundColor: 'var(--cp-bg3)',
                    color: 'var(--cp-muted)',
                    border: '1px solid var(--cp-border)',
                  }}
                >
                  {stats.pending} ventende
                </span>
              )}
            </div>
            <p className="mt-1 text-sm leading-relaxed" style={{ color: 'var(--cp-muted)' }}>
              Samlet overblik pr. præparat og beboer · hold musepeker over initialer for fulde navn
            </p>
          </div>
        </div>
        <div className="flex flex-col items-stretch gap-2 sm:items-end">
          <span
            className="inline-flex w-fit shrink-0 items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11px] font-medium"
            style={{
              borderColor: 'rgba(99,179,237,0.25)',
              backgroundColor: 'rgba(99,179,237,0.08)',
              color: 'var(--cp-blue)',
            }}
          >
            <Shield className="h-3.5 w-3.5" aria-hidden />
            FMK-integration
          </span>
          <div className="flex flex-wrap justify-start gap-1.5 sm:justify-end">
            {(['alle', ...CARE_HOUSES] as const).map((key) => {
              const label = key === 'alle' ? 'Alle' : `Hus ${key}`;
              const selected = houseFilter === key;
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => setHouseFilter(key)}
                  className="rounded-full px-2.5 py-1 text-xs font-medium transition-all duration-200"
                  style={
                    selected
                      ? { backgroundColor: 'var(--cp-green)', color: '#fff' }
                      : {
                          backgroundColor: 'var(--cp-bg3)',
                          color: 'var(--cp-muted)',
                          border: '1px solid var(--cp-border)',
                        }
                  }
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </header>

      {stats.pending > 0 && (
        <div
          className="mb-5 rounded-2xl p-4 sm:p-5"
          style={{
            background: 'linear-gradient(135deg, rgba(99,179,237,0.1) 0%, var(--cp-bg3) 100%)',
            border: '1px solid rgba(99,179,237,0.2)',
          }}
        >
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <BarChart3
              className="h-4 w-4 shrink-0"
              style={{ color: 'var(--cp-blue)' }}
              aria-hidden
            />
            <p className="text-sm font-semibold" style={{ color: 'var(--cp-text)' }}>
              Mængde &amp; præparater{' '}
              {houseFilter === 'alle' ? '(alle huse)' : `(Hus ${houseFilter})`}
            </p>
          </div>
          <div
            className="mb-3 flex flex-wrap gap-3 text-xs sm:text-sm"
            style={{ color: 'var(--cp-muted)' }}
          >
            <span className="tabular-nums">
              <strong style={{ color: 'var(--cp-text)' }}>{stats.pending}</strong> udleveringer
              tilbage
            </span>
            <span className="opacity-40" aria-hidden>
              ·
            </span>
            <span>
              <strong style={{ color: 'var(--cp-text)' }}>{uniqueResidentsPending}</strong> beboere
            </span>
            <span className="opacity-40" aria-hidden>
              ·
            </span>
            <span>
              <strong style={{ color: 'var(--cp-text)' }}>{prepOverview.length}</strong> forskellige
              præparater
            </span>
            <span className="opacity-40" aria-hidden>
              ·
            </span>
            <span>
              Tabletter/kapsler i alt:{' '}
              <strong style={{ color: 'var(--cp-text)' }} className="tabular-nums">
                {doseTotals.tabletter}
              </strong>
            </span>
          </div>
          <div className="flex flex-wrap gap-2" aria-label="Fordeling pr. præparat">
            {prepOverview.slice(0, 8).map((row) => (
              <span
                key={row.name}
                className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium"
                style={{
                  backgroundColor: 'var(--cp-bg2)',
                  color: 'var(--cp-text)',
                  border: '1px solid var(--cp-border)',
                }}
                title={`${row.name}: ${row.administrations} administrationer, ${row.units} enheder i alt (tabletter/kapsler/ml m.v.)`}
              >
                <span className="max-w-[140px] truncate">{row.name}</span>
                <span className="tabular-nums opacity-80">{row.units}</span>
              </span>
            ))}
          </div>
        </div>
      )}

      {(stats.overdueN > 0 || stats.upcomingN > 0 || stats.laterN > 0) && (
        <div className="mb-6 flex flex-wrap gap-2" role="status" aria-live="polite">
          {stats.overdueN > 0 && (
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold"
              style={{
                backgroundColor: 'var(--cp-red-dim)',
                color: 'var(--cp-red)',
                border: '1px solid rgba(245,101,101,0.25)',
              }}
            >
              <span className="relative flex h-2 w-2">
                <span
                  className="absolute inline-flex h-full w-full animate-ping rounded-full opacity-60"
                  style={{ backgroundColor: 'var(--cp-red)' }}
                />
                <span
                  className="relative inline-flex h-2 w-2 rounded-full"
                  style={{ backgroundColor: 'var(--cp-red)' }}
                />
              </span>
              {stats.overdueN} forfalden{stats.overdueN === 1 ? '' : 'e'}
            </span>
          )}
          {stats.upcomingN > 0 && (
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium"
              style={{
                backgroundColor: 'var(--cp-green-dim)',
                color: 'var(--cp-green)',
                border: '1px solid rgba(45,212,160,0.2)',
              }}
            >
              <Timer className="h-3 w-3" aria-hidden />
              {stats.upcomingN} inden for 2 timer
            </span>
          )}
          {stats.laterN > 0 && (
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium"
              style={{
                backgroundColor: 'var(--cp-bg3)',
                color: 'var(--cp-muted)',
                border: '1px solid var(--cp-border)',
              }}
            >
              <Clock className="h-3 w-3 opacity-70" aria-hidden />
              {stats.laterN} senere i dag
            </span>
          )}
        </div>
      )}

      <div className="flex flex-col gap-6">
        {overdue.length > 0 && (
          <div>
            <div className="mb-4 flex items-end justify-between gap-3">
              <div>
                <p
                  className="text-[11px] font-semibold uppercase tracking-[0.14em]"
                  style={{ color: 'var(--cp-red)' }}
                >
                  Kræver handling
                </p>
                <p className="mt-1 text-base font-semibold" style={{ color: 'var(--cp-text)' }}>
                  Forfaldne udleveringer
                </p>
              </div>
            </div>
            <ul className="flex flex-col gap-3">
              {overdue.map((item) => {
                const given = !!item.givenAt;
                const late = minutesLate(item.scheduledAt, nowTick);
                return (
                  <li
                    key={item.id}
                    className="group relative overflow-hidden rounded-2xl transition-all duration-300"
                    style={
                      given
                        ? {
                            background:
                              'linear-gradient(135deg, rgba(45,212,160,0.12) 0%, var(--cp-bg3) 100%)',
                            border: '1px solid rgba(45,212,160,0.22)',
                          }
                        : {
                            background:
                              'linear-gradient(135deg, rgba(245,101,101,0.14) 0%, var(--cp-bg2) 55%)',
                            border: '1px solid rgba(245,101,101,0.22)',
                            boxShadow:
                              '0 0 0 1px rgba(245,101,101,0.06), 0 12px 40px -12px rgba(0,0,0,0.45)',
                          }
                    }
                  >
                    {!given && (
                      <div
                        className="absolute left-0 top-0 h-full w-1 rounded-l-2xl"
                        style={{ backgroundColor: 'var(--cp-red)' }}
                        aria-hidden
                      />
                    )}
                    <div className="relative p-4 pl-5 sm:p-5 sm:pl-6">
                      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between lg:gap-6">
                        <div className="flex min-w-0 flex-1 gap-4">
                          <div
                            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-sm font-semibold text-white shadow-md"
                            style={{
                              background: 'linear-gradient(145deg, #63b3ed 0%, #3182ce 100%)',
                            }}
                            title={item.residentName}
                          >
                            {item.initials}
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-2">
                              <p
                                className="text-base font-semibold tracking-tight transition-all duration-200"
                                style={{
                                  color: given ? 'var(--cp-muted)' : 'var(--cp-text)',
                                  textDecoration: given ? 'line-through' : 'none',
                                }}
                              >
                                {item.medicationName}
                              </p>
                              <span
                                className="rounded-md px-2 py-0.5 text-xs font-semibold tabular-nums"
                                style={{
                                  backgroundColor: 'var(--cp-blue-dim, rgba(99,179,237,0.15))',
                                  color: 'var(--cp-blue)',
                                  border: '1px solid rgba(99,179,237,0.25)',
                                }}
                              >
                                {qtyLabel(item.quantity, item.unit)}
                              </span>
                              <span
                                className="rounded-md px-2 py-0.5 text-xs font-medium"
                                style={{
                                  backgroundColor: 'var(--cp-bg3)',
                                  color: 'var(--cp-muted)',
                                }}
                              >
                                {item.strengthLabel}
                              </span>
                            </div>
                            <p className="mt-1 text-sm" style={{ color: 'var(--cp-muted)' }}>
                              <ResidentAbbr fullName={item.residentName} initials={item.initials} />{' '}
                              · Hus {item.house} · værelse {item.room} · {item.routeLabel}
                            </p>
                            <div
                              className="mt-2 flex flex-wrap items-center gap-2 text-xs font-medium"
                              style={{ color: given ? 'var(--cp-muted)' : 'var(--cp-red)' }}
                            >
                              {!given && (
                                <span
                                  className="inline-flex items-center gap-1 rounded-md px-2 py-1"
                                  style={{ backgroundColor: 'rgba(245,101,101,0.12)' }}
                                >
                                  <AlertTriangle className="h-3.5 w-3.5 shrink-0" aria-hidden />
                                  {formatLateDanish(late)}
                                </span>
                              )}
                              <span
                                className="inline-flex items-center gap-1 font-mono tabular-nums opacity-90"
                                style={{ color: 'var(--cp-muted)' }}
                              >
                                <Clock className="h-3.5 w-3.5" aria-hidden />
                                Planlagt {formatTimeMono(item.scheduledAt)}
                              </span>
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          disabled={given}
                          onClick={() => markGiven(item.id)}
                          className="flex h-12 w-full shrink-0 items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-all duration-200 hover:brightness-110 active:scale-[0.98] disabled:cursor-default disabled:hover:brightness-100 lg:h-11 lg:w-auto lg:min-w-[200px] lg:px-8"
                          style={
                            given
                              ? {
                                  backgroundColor: 'var(--cp-green-dim)',
                                  color: 'var(--cp-green)',
                                  border: '1px solid rgba(45,212,160,0.3)',
                                }
                              : {
                                  background: 'linear-gradient(180deg, #2dd4a0 0%, #1D9E75 100%)',
                                  color: '#fff',
                                  boxShadow: '0 4px 14px rgba(45,212,160,0.35)',
                                }
                          }
                        >
                          {given ? (
                            <>
                              <CheckCircle2 className="h-5 w-5" aria-hidden />
                              Udleveret
                            </>
                          ) : (
                            <>
                              <Check className="h-5 w-5" strokeWidth={2.5} aria-hidden />
                              Registrér udlevering
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {upcoming.length > 0 && (
          <div
            className="rounded-2xl p-1"
            style={{
              background:
                overduePrimary || !overdue.length
                  ? 'linear-gradient(135deg, rgba(45,212,160,0.08) 0%, transparent 40%)'
                  : 'transparent',
              border:
                overduePrimary || !overdue.length
                  ? '1px solid rgba(45,212,160,0.15)'
                  : '1px solid var(--cp-border)',
            }}
          >
            <div className="rounded-xl p-4 sm:p-5" style={{ backgroundColor: 'var(--cp-bg2)' }}>
              <div className="mb-4 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div
                    className="flex h-9 w-9 items-center justify-center rounded-xl"
                    style={{ backgroundColor: 'var(--cp-green-dim)' }}
                  >
                    <Clock className="h-4 w-4" style={{ color: 'var(--cp-green)' }} aria-hidden />
                  </div>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: 'var(--cp-text)' }}>
                      Næste i køen
                    </p>
                    <p className="text-xs" style={{ color: 'var(--cp-muted)' }}>
                      Inden for de næste 2 timer
                    </p>
                  </div>
                </div>
              </div>
              <ul className="space-y-0" style={{ borderColor: 'var(--cp-border)' }}>
                {upcoming.map((row) => (
                  <li
                    key={row.id}
                    className="grid grid-cols-[3.25rem_40px_minmax(0,1fr)_auto] items-center gap-3 border-t py-3.5 first:border-t-0 first:pt-0 sm:grid-cols-[3.5rem_44px_minmax(0,1fr)_auto] sm:gap-4"
                    style={{ borderColor: 'var(--cp-border)' }}
                  >
                    <div className="flex justify-end">
                      <time
                        dateTime={row.scheduledAt.toISOString()}
                        className="font-mono text-xs font-semibold tabular-nums sm:text-sm"
                        style={{ color: 'var(--cp-green)' }}
                      >
                        {formatTimeMono(row.scheduledAt)}
                      </time>
                    </div>
                    <div
                      className="flex h-9 w-9 items-center justify-center rounded-xl text-xs font-semibold text-white"
                      style={{
                        background: 'linear-gradient(145deg, #63b3ed 0%, #3182ce 100%)',
                      }}
                      title={row.residentName}
                    >
                      {row.initials}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold leading-snug" style={{ color: 'var(--cp-text)' }}>
                        {row.medicationName}
                        <span className="font-normal" style={{ color: 'var(--cp-muted)' }}>
                          {' '}
                          · {qtyLabel(row.quantity, row.unit)} · {row.strengthLabel}
                        </span>
                      </p>
                      <p className="text-xs" style={{ color: 'var(--cp-muted2)' }}>
                        <ResidentAbbr fullName={row.residentName} initials={row.initials} /> · Hus{' '}
                        {row.house} · {row.room}
                      </p>
                    </div>
                    <span
                      className="hidden shrink-0 rounded-lg px-2 py-1 text-[10px] font-semibold tabular-nums sm:inline-block"
                      style={{
                        backgroundColor: 'var(--cp-bg3)',
                        color: 'var(--cp-muted)',
                        border: '1px solid var(--cp-border)',
                      }}
                    >
                      {row.routeLabel}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {laterToday.length > 0 && (
          <div className="rounded-2xl" style={{ border: '1px solid var(--cp-border)' }}>
            <button
              type="button"
              onClick={() => setLaterExpanded((e) => !e)}
              className="flex w-full items-center justify-between gap-3 rounded-2xl px-4 py-3.5 text-left transition-colors sm:px-5"
              style={{
                backgroundColor: 'var(--cp-bg3)',
                color: 'var(--cp-text)',
              }}
              aria-expanded={laterExpanded}
            >
              <span className="flex items-center gap-2 text-sm font-semibold">
                <Clock className="h-4 w-4" style={{ color: 'var(--cp-muted)' }} aria-hidden />
                Senere i dag
                <span
                  className="rounded-full px-2 py-0.5 text-[11px] font-medium tabular-nums"
                  style={{
                    backgroundColor: 'var(--cp-bg2)',
                    color: 'var(--cp-muted)',
                  }}
                >
                  {laterToday.length}
                </span>
              </span>
              {laterExpanded ? (
                <ChevronUp className="h-4 w-4 shrink-0 opacity-50" aria-hidden />
              ) : (
                <ChevronDown className="h-4 w-4 shrink-0 opacity-50" aria-hidden />
              )}
            </button>
            {laterExpanded && (
              <ul className="px-2 pb-2 sm:px-3">
                {laterToday.map((row, i) => (
                  <li
                    key={row.id}
                    className={`grid grid-cols-[3.25rem_36px_minmax(0,1fr)] items-center gap-3 py-3 sm:grid-cols-[3.5rem_40px_minmax(0,1fr)] ${i > 0 ? 'border-t' : ''}`}
                    style={{ borderColor: 'var(--cp-border)' }}
                  >
                    <span
                      className="text-right font-mono text-[11px] font-medium tabular-nums sm:text-xs"
                      style={{ color: 'var(--cp-muted2)' }}
                    >
                      {formatTimeMono(row.scheduledAt)}
                    </span>
                    <span
                      className="flex h-8 w-8 items-center justify-center rounded-lg text-[10px] font-semibold text-white"
                      style={{ backgroundColor: 'var(--cp-muted2)' }}
                      title={row.residentName}
                    >
                      {row.initials}
                    </span>
                    <div className="min-w-0 truncate text-sm">
                      <span style={{ color: 'var(--cp-text)' }}>{row.medicationName}</span>
                      <span style={{ color: 'var(--cp-muted)' }}>
                        {' '}
                        · {qtyLabel(row.quantity, row.unit)} · {row.strengthLabel}
                      </span>
                      <span className="text-xs" style={{ color: 'var(--cp-muted2)' }}>
                        {' '}
                        · <ResidentAbbr fullName={row.residentName} initials={row.initials} /> · H
                        {row.house}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {pendingCount === 0 && scopedEntries.length > 0 && (
          <div
            className="relative overflow-hidden rounded-2xl p-6 sm:p-8"
            style={{
              background: 'linear-gradient(145deg, rgba(45,212,160,0.12) 0%, var(--cp-bg3) 100%)',
              border: '1px solid rgba(45,212,160,0.2)',
            }}
          >
            <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
              <div
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl"
                style={{
                  backgroundColor: 'var(--cp-green-dim)',
                  border: '1px solid rgba(45,212,160,0.25)',
                }}
              >
                <CheckCircle2
                  className="h-7 w-7"
                  style={{ color: 'var(--cp-green)' }}
                  aria-hidden
                />
              </div>
              <div className="min-w-0 flex-1">
                <p
                  className="text-lg font-semibold tracking-tight"
                  style={{ color: 'var(--cp-text)' }}
                >
                  Alle udleveringer registreret
                  {houseFilter !== 'alle' ? ` for Hus ${houseFilter}` : ''}
                </p>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--cp-muted)' }}>
                  Godt gået — der er ingen åbne medicinopgaver på listen lige nu.
                </p>
              </div>
            </div>
          </div>
        )}

        {scopedEntries.length === 0 && houseFilter !== 'alle' && (
          <p className="text-center text-sm" style={{ color: 'var(--cp-muted)' }}>
            Ingen planlagte udleveringer for Hus {houseFilter} i dette vindue.
          </p>
        )}
      </div>
    </section>
  );
}
