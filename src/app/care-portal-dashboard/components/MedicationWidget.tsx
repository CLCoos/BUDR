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
  LayoutGrid,
  List,
  Pill,
  Shield,
  Timer,
  Undo2,
} from 'lucide-react';
import { toast } from 'sonner';
import {
  careDemoProfileById,
  carePortalHouseChipLabel,
  type CareHouse,
} from '@/lib/careDemoResidents';
import { useStaffOrgIsBingbong } from '@/hooks/useStaffOrgIsBingbong';
import { carePortalPilotSimulatedData } from '@/lib/carePortalPilotSimulated';
import { enumerateCivilMedicationSlotDates } from '@/lib/medicationScheduleSlots';
import { createClient } from '@/lib/supabase/client';
import { resolveStaffOrgResidents } from '@/lib/staffOrgScope';
import { useCarePortalDepartment } from '@/contexts/CarePortalDepartmentContext';
import { getWidgetStatus, widgetStatusVar } from '@/lib/widgetStatus';

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

const TIME_GROUP_DEFAULT_HHMM: Record<string, string> = {
  morgen: '08:00',
  middag: '12:30',
  aften: '20:00',
  behoev: '12:30',
};

function parseHhMmFromTimeLabel(label: string): string | null {
  const compact = label.replace(/\s/g, '');
  const m = /(\d{1,2})[.:](\d{2})/.exec(compact);
  if (!m) return null;
  const h = Math.min(23, Math.max(0, parseInt(m[1]!, 10)));
  const min = Math.min(59, Math.max(0, parseInt(m[2]!, 10)));
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

function careHouseFromOnboarding(od: Record<string, unknown>): CareHouse {
  const h = String(od.house ?? '').trim();
  const husLetter = /^Hus\s+([ABCD])\b/i.exec(h);
  if (husLetter) return husLetter[1]!.toUpperCase() as CareHouse;
  if (/^tls$/i.test(h)) return 'TLS';
  const single = /^([ABCD])$/i.exec(h);
  if (single) return single[1]!.toUpperCase() as CareHouse;
  return 'D';
}

function scheduledTodayFromMed(timeGroup: string, timeLabel: string, anchor: Date): Date {
  const fromLabel = parseHhMmFromTimeLabel(timeLabel);
  const key = String(timeGroup ?? '').toLowerCase();
  const hhmm = fromLabel ?? TIME_GROUP_DEFAULT_HHMM[key] ?? '12:30';
  const parts = hhmm.split(':');
  const hs = parseInt(parts[0] ?? '12', 10);
  const ms = parseInt(parts[1] ?? '0', 10);
  const d = new Date(anchor);
  d.setHours(hs, ms, 0, 0);
  return d;
}

type DbResidentMedRow = {
  id: string;
  resident_id: string;
  name: string;
  dose: string;
  frequency: string;
  time_label: string;
  time_group: string;
  status: string;
  notes: string | null;
};

async function fetchLiveMedicationTasksForOrg(): Promise<MedicationTask[]> {
  const supabase = createClient();
  if (!supabase) return [];

  const { orgId, residentIds, error } = await resolveStaffOrgResidents(supabase);
  if (error || !orgId || residentIds.length === 0) return [];

  const { data: resRows } = await supabase
    .from('care_residents')
    .select('user_id, display_name, onboarding_data')
    .eq('org_id', orgId)
    .in('user_id', residentIds);

  const resMeta = new Map<
    string,
    { name: string; initials: string; house: CareHouse; room: string }
  >();

  for (const row of resRows ?? []) {
    const r = row as {
      user_id: string;
      display_name: string;
      onboarding_data: unknown;
    };
    const od = (r.onboarding_data ?? {}) as Record<string, unknown>;
    const initialsRaw = od.avatar_initials;
    const initials =
      typeof initialsRaw === 'string' && initialsRaw.trim().length > 0
        ? initialsRaw.trim().slice(0, 3).toUpperCase()
        : r.display_name
            .split(/\s+/)
            .filter(Boolean)
            .map((w) => w[0]!)
            .join('')
            .slice(0, 3)
            .toUpperCase();
    resMeta.set(r.user_id, {
      name: r.display_name,
      initials,
      house: careHouseFromOnboarding(od),
      room: String(od.room ?? '—'),
    });
  }

  const { data: medRows, error: medErr } = await supabase
    .from('resident_medications')
    .select('id, resident_id, name, dose, frequency, time_label, time_group, status, notes')
    .in('resident_id', residentIds)
    .eq('status', 'aktiv');

  if (medErr || !medRows?.length) return [];

  const now = new Date();
  const ymd = now.toISOString().slice(0, 10);
  const tasks: MedicationTask[] = [];

  for (const raw of medRows as DbResidentMedRow[]) {
    const meta = resMeta.get(raw.resident_id);
    if (!meta) continue;
    const scheduledAt = scheduledTodayFromMed(raw.time_group, raw.time_label, now);
    tasks.push({
      id: `live-${raw.id}-${ymd}`,
      residentId: raw.resident_id,
      residentName: meta.name,
      initials: meta.initials,
      house: meta.house,
      room: meta.room,
      medicationName: raw.name,
      strengthLabel: raw.dose?.trim() ? raw.dose : '—',
      quantity: 1,
      unit: 'tabletter',
      routeLabel: 'Oralt',
      scheduledAt,
      givenAt: null,
    });
  }

  return tasks.sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());
}

/** Primær knap + synlig fortryd når registreret */
function DeliveryControls({
  given,
  givenAt,
  variant,
  onDeliver,
  onUndo,
}: {
  given: boolean;
  givenAt: Date | null;
  variant: 'panel' | 'inline';
  onDeliver: () => void;
  onUndo: () => void;
}) {
  const givenAtLabel =
    given && givenAt ? `Registreret ${formatTimeMono(givenAt)}` : given ? 'Registreret' : null;

  if (variant === 'panel') {
    return (
      <div className="flex w-full flex-col gap-2 lg:w-auto lg:min-w-[220px] lg:items-end">
        {!given ? (
          <button
            type="button"
            onClick={onDeliver}
            className="flex h-12 w-full shrink-0 items-center justify-center gap-2 rounded-xl text-sm font-semibold transition-all duration-200 hover:brightness-110 active:scale-[0.98] lg:h-11 lg:px-8"
            style={{
              background: 'linear-gradient(180deg, #2dd4a0 0%, #1D9E75 100%)',
              color: '#fff',
              boxShadow: '0 4px 14px rgba(45,212,160,0.35)',
            }}
          >
            <Check className="h-5 w-5" strokeWidth={2.5} aria-hidden />
            Registrér udlevering
          </button>
        ) : (
          <div
            className="flex w-full flex-col items-stretch gap-2 rounded-xl px-1 lg:items-end"
            style={{ color: 'var(--cp-green)' }}
          >
            <div
              className="flex h-12 w-full items-center justify-center gap-2 rounded-xl text-sm font-semibold lg:h-11 lg:min-w-[200px] lg:px-6"
              style={{
                backgroundColor: 'var(--cp-green-dim)',
                border: '1px solid rgba(45,212,160,0.3)',
                color: 'var(--cp-green)',
              }}
            >
              <CheckCircle2 className="h-5 w-5 shrink-0" aria-hidden />
              Udleveret
            </div>
            {givenAtLabel && (
              <p
                className="text-center text-[11px] font-medium lg:text-right"
                style={{ color: 'var(--cp-muted)' }}
              >
                {givenAtLabel}
              </p>
            )}
            <button
              type="button"
              onClick={onUndo}
              className="inline-flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold transition-all hover:opacity-90"
              style={{ color: 'var(--cp-muted)' }}
            >
              <Undo2 className="h-3.5 w-3.5" aria-hidden />
              Fortryd registrering
            </button>
          </div>
        )}
      </div>
    );
  }

  /* inline — til kø og kompakte rækker */
  return !given ? (
    <button
      type="button"
      onClick={onDeliver}
      title="Registrér udlevering"
      aria-label={`Registrér udlevering`}
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-all hover:brightness-110 active:scale-[0.97] sm:h-11 sm:w-11"
      style={{
        background: 'linear-gradient(180deg, #2dd4a0 0%, #1D9E75 100%)',
        color: '#fff',
        boxShadow: '0 2px 10px rgba(45,212,160,0.3)',
      }}
    >
      <Check className="h-5 w-5" strokeWidth={2.5} aria-hidden />
    </button>
  ) : (
    <div className="flex shrink-0 flex-col items-end gap-1">
      <span
        className="flex items-center gap-1 text-[11px] font-semibold"
        style={{ color: 'var(--cp-green)' }}
      >
        <CheckCircle2 className="h-4 w-4" aria-hidden />
        OK
      </span>
      <button
        type="button"
        onClick={onUndo}
        className="inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-semibold transition-colors hover:bg-white/5"
        style={{ color: 'var(--cp-muted)' }}
      >
        <Undo2 className="h-3 w-3" aria-hidden />
        Fortryd
      </button>
    </div>
  );
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

type MedicationViewModel = {
  pastDue: MedicationTask[];
  upcoming: MedicationTask[];
  laterToday: MedicationTask[];
  stats: {
    pending: number;
    overdueN: number;
    upcomingN: number;
    laterN: number;
    doneN: number;
    totalN: number;
  };
  pendingCount: number;
  prepOverview: { name: string; administrations: number; units: number }[];
  doseTotals: { tabletter: number; ovrige: number };
};

function buildMedicationView(entries: MedicationTask[], nowMs: number): MedicationViewModel {
  const now = nowMs;
  const pending = entries.filter((e) => e.givenAt === null);
  const doneN = entries.filter((e) => e.givenAt !== null).length;
  const totalN = entries.length;

  const pastDueList = entries
    .filter((e) => e.scheduledAt.getTime() < now)
    .sort((a, b) => {
      const aDone = a.givenAt !== null ? 1 : 0;
      const bDone = b.givenAt !== null ? 1 : 0;
      if (aDone !== bDone) return aDone - bDone;
      return a.scheduledAt.getTime() - b.scheduledAt.getTime();
    });

  const upcomingList = pending
    .filter((e) => {
      const t0 = e.scheduledAt.getTime();
      return t0 > now && t0 <= now + TWO_HOURS_MS;
    })
    .sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());

  const laterList = entries
    .filter((e) => e.scheduledAt.getTime() > now + TWO_HOURS_MS)
    .sort((a, b) => {
      const aDone = a.givenAt !== null ? 1 : 0;
      const bDone = b.givenAt !== null ? 1 : 0;
      if (aDone !== bDone) return aDone - bDone;
      return a.scheduledAt.getTime() - b.scheduledAt.getTime();
    });

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
  const prepOverviewLocal = [...byPrep.entries()]
    .map(([name, v]) => ({ name, ...v }))
    .sort((a, b) => b.units - a.units || b.administrations - a.administrations);

  const overdueOpen = pastDueList.filter((e) => !e.givenAt).length;

  return {
    pastDue: pastDueList,
    upcoming: upcomingList,
    laterToday: laterList,
    pendingCount: pending.length,
    prepOverview: prepOverviewLocal,
    doseTotals: { tabletter, ovrige },
    stats: {
      pending: pending.length,
      overdueN: overdueOpen,
      upcomingN: upcomingList.length,
      laterN: laterList.filter((e) => !e.givenAt).length,
      doneN,
      totalN,
    },
  };
}

function slotKeyForTask(t: MedicationTask): string {
  const d = t.scheduledAt;
  const y = d.getFullYear();
  const mo = String(d.getMonth() + 1).padStart(2, '0');
  const da = String(d.getDate()).padStart(2, '0');
  const h = String(d.getHours()).padStart(2, '0');
  const m = String(d.getMinutes()).padStart(2, '0');
  return `${y}-${mo}-${da}_${h}:${m}`;
}

function formatSlotHeading(d: Date, now: Date): string {
  const t = formatTimeMono(d).replace(':', '.');
  const sameDay = d.toDateString() === now.toDateString();
  if (sameDay) return `Kl. ${t}`;
  const dayPart = d.toLocaleDateString('da-DK', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
  return `${dayPart} · kl. ${t}`;
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

type TaskFilter = 'alle' | 'ventende' | 'forsinkede';

export default function MedicationWidget() {
  const { department: houseFilter } = useCarePortalDepartment();
  const simulatedMedicin = carePortalPilotSimulatedData();
  const { isBingbong, ready: bingbongReady } = useStaffOrgIsBingbong();
  const pilotMedicinMock = simulatedMedicin && (!bingbongReady || !isBingbong);
  const [entries, setEntries] = useState<MedicationTask[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [laterExpanded, setLaterExpanded] = useState(false);
  const [prepExpanded, setPrepExpanded] = useState(false);
  const [nowTick, setNowTick] = useState(() => Date.now());
  const [taskFilter, setTaskFilter] = useState<TaskFilter>('alle');
  const [viewMode, setViewMode] = useState<'koe' | 'liste'>('koe');

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      if (simulatedMedicin && !bingbongReady) {
        return;
      }
      if (pilotMedicinMock) {
        if (!cancelled) {
          setEntries(createMockEntries(Date.now()));
          setHydrated(true);
        }
        return;
      }
      const live = await fetchLiveMedicationTasksForOrg();
      if (!cancelled) {
        setEntries(live);
        setHydrated(true);
      }
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [simulatedMedicin, bingbongReady, pilotMedicinMock]);

  useEffect(() => {
    const t = window.setInterval(() => setNowTick(Date.now()), 60_000);
    return () => window.clearInterval(t);
  }, []);

  const markDelivered = useCallback((id: string) => {
    const at = new Date();
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, givenAt: at } : e)));
    toast.success('Udlevering registreret');
  }, []);

  const unmarkDelivered = useCallback((id: string) => {
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, givenAt: null } : e)));
    toast.message('Registrering fortrudt');
  }, []);

  const markBatchDelivered = useCallback((ids: string[]) => {
    const open = ids.filter(Boolean);
    if (open.length === 0) return;
    const at = new Date();
    setEntries((prev) =>
      prev.map((e) => (open.includes(e.id) && !e.givenAt ? { ...e, givenAt: at } : e))
    );
    toast.success(
      open.length === 1 ? 'Udlevering registreret' : `${open.length} udleveringer registreret`
    );
  }, []);

  const unmarkBatchDelivered = useCallback((ids: string[]) => {
    const xs = ids.filter(Boolean);
    if (xs.length === 0) return;
    setEntries((prev) => prev.map((e) => (xs.includes(e.id) ? { ...e, givenAt: null } : e)));
    toast.message(
      xs.length === 1 ? 'Registrering fortrudt' : `${xs.length} registreringer fortrudt`
    );
  }, []);

  const scopedEntries = useMemo(() => {
    if (houseFilter === 'alle') return entries;
    return entries.filter((e) => e.house === houseFilter);
  }, [entries, houseFilter]);

  const filteredEntries = useMemo(() => {
    const now = nowTick;
    if (taskFilter === 'ventende') return scopedEntries.filter((e) => !e.givenAt);
    if (taskFilter === 'forsinkede')
      return scopedEntries.filter((e) => !e.givenAt && e.scheduledAt.getTime() < now);
    return scopedEntries;
  }, [scopedEntries, taskFilter, nowTick]);

  const scopedView = useMemo(
    () => buildMedicationView(scopedEntries, nowTick),
    [scopedEntries, nowTick]
  );

  const listView = useMemo(
    () => buildMedicationView(filteredEntries, nowTick),
    [filteredEntries, nowTick]
  );

  const { pastDue, upcoming, laterToday, stats: listStats } = listView;
  const { stats, pendingCount, prepOverview, doseTotals } = scopedView;

  const medicStatusView = useMemo(() => buildMedicationView(entries, nowTick), [entries, nowTick]);
  const medicBorderStatus = getWidgetStatus('widget_medicin_today', {
    delayedMedicationCount: medicStatusView.stats.overdueN,
  });

  const groupedTimeline = useMemo(() => {
    const now = new Date(nowTick);
    const sorted = [...filteredEntries].sort(
      (a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime()
    );
    const map = new Map<string, MedicationTask[]>();
    for (const t of sorted) {
      const k = slotKeyForTask(t);
      const arr = map.get(k) ?? [];
      arr.push(t);
      map.set(k, arr);
    }
    return [...map.entries()].map(([key, items]) => ({
      key,
      timeLabel: formatSlotHeading(items[0]!.scheduledAt, now),
      items: [...items].sort((a, b) => {
        const ad = a.givenAt ? 1 : 0;
        const bd = b.givenAt ? 1 : 0;
        if (ad !== bd) return ad - bd;
        return a.residentName.localeCompare(b.residentName, 'da');
      }),
    }));
  }, [filteredEntries, nowTick]);

  const uniqueResidentsPending = useMemo(() => {
    const ids = new Set(scopedEntries.filter((e) => e.givenAt === null).map((e) => e.residentId));
    return ids.size;
  }, [scopedEntries]);

  if (!hydrated) {
    return (
      <div className="cp-card-elevated w-full min-w-[min(100%,280px)] max-w-full animate-pulse overflow-hidden p-6">
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
      className="cp-card-elevated relative w-full min-w-[min(100%,280px)] max-w-full overflow-hidden p-6 sm:p-7"
      aria-label="Medicinudleveringer"
      style={{
        border: '1px solid var(--cp-border)',
        borderTop: `2px solid ${widgetStatusVar(medicBorderStatus)}`,
        boxShadow: '0 4px 28px rgba(0, 0, 0, 0.35)',
      }}
    >
      <header className="relative mb-5 flex flex-col gap-4 sm:mb-6 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between">
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
              {stats.totalN > 0 && (
                <span
                  className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold tabular-nums"
                  style={{
                    backgroundColor: 'var(--cp-bg3)',
                    color: 'var(--cp-muted)',
                    border: '1px solid var(--cp-border)',
                  }}
                >
                  {stats.doneN}/{stats.totalN} registreret
                </span>
              )}
              {stats.pending > 0 && (
                <span
                  className="rounded-full px-2.5 py-0.5 text-[11px] font-semibold tabular-nums"
                  style={{
                    backgroundColor: 'var(--cp-bg3)',
                    color: 'var(--cp-muted)',
                    border: '1px solid var(--cp-border)',
                  }}
                >
                  {stats.pending} tilbage
                </span>
              )}
            </div>
            <p
              className="mt-1 break-words text-sm leading-relaxed"
              style={{ color: 'var(--cp-muted)' }}
            >
              Et tryk for at registrere udlevering · fortryd når som helst. Initialer viser fuldt
              navn ved hover.
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
            {pilotMedicinMock ? (
              <>
                <Shield className="h-3.5 w-3.5" aria-hidden />
                FMK-integration
              </>
            ) : (
              <>
                <Pill className="h-3.5 w-3.5" aria-hidden />
                Jeres medicindata
              </>
            )}
          </span>
        </div>
      </header>

      {stats.totalN > 0 && (
        <div className="mb-5">
          <div
            className="mb-1.5 flex flex-wrap items-center justify-between gap-2 text-xs"
            style={{ color: 'var(--cp-muted)' }}
          >
            <span>Fremdrift</span>
            <span className="tabular-nums font-semibold" style={{ color: 'var(--cp-text)' }}>
              {stats.doneN} af {stats.totalN} planlagt
            </span>
          </div>
          <div
            className="h-2.5 w-full overflow-hidden rounded-full"
            style={{ backgroundColor: 'var(--cp-bg3)' }}
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={stats.totalN}
            aria-valuenow={stats.doneN}
          >
            <div
              className="h-full rounded-full transition-all duration-500 ease-out"
              style={{
                width: `${stats.totalN ? Math.round((stats.doneN / stats.totalN) * 100) : 0}%`,
                background: 'linear-gradient(90deg, var(--cp-green), #2dd4a0)',
              }}
            />
          </div>
        </div>
      )}

      {stats.pending > 0 && (
        <div
          className="mb-5 rounded-2xl p-4 sm:p-5"
          style={{
            background: 'linear-gradient(135deg, rgba(99,179,237,0.1) 0%, var(--cp-bg3) 100%)',
            border: '1px solid rgba(99,179,237,0.2)',
          }}
        >
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              <BarChart3
                className="h-4 w-4 shrink-0"
                style={{ color: 'var(--cp-blue)' }}
                aria-hidden
              />
              <p className="text-sm font-semibold" style={{ color: 'var(--cp-text)' }}>
                Mængde &amp; præparater{' '}
                {houseFilter === 'alle'
                  ? '(alle huse)'
                  : `(${carePortalHouseChipLabel(houseFilter)})`}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setPrepExpanded((v) => !v)}
              className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-semibold transition-colors hover:opacity-90"
              style={{
                backgroundColor: 'var(--cp-bg2)',
                color: 'var(--cp-muted)',
                border: '1px solid var(--cp-border)',
              }}
              aria-expanded={prepExpanded}
            >
              {prepExpanded ? 'Skjul detaljer' : 'Vis fordeling'}
              <ChevronDown
                className={`h-3.5 w-3.5 transition-transform ${prepExpanded ? 'rotate-180' : ''}`}
                aria-hidden
              />
            </button>
          </div>
          <div
            className="flex flex-wrap gap-3 text-xs sm:text-sm"
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
              <strong style={{ color: 'var(--cp-text)' }}>{prepOverview.length}</strong> præparater
            </span>
            <span className="opacity-40" aria-hidden>
              ·
            </span>
            <span>
              Tabletter/kapsler:{' '}
              <strong style={{ color: 'var(--cp-text)' }} className="tabular-nums">
                {doseTotals.tabletter}
              </strong>
            </span>
          </div>
          {prepExpanded && (
            <div
              className="mt-3 flex flex-wrap gap-2 border-t border-white/5 pt-3"
              aria-label="Fordeling pr. præparat"
            >
              {prepOverview.slice(0, 12).map((row) => (
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
          )}
        </div>
      )}

      <div
        className="mb-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between"
        aria-label="Visning og filter"
      >
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Visning">
          {(
            [
              { mode: 'koe' as const, label: 'Kø', Icon: LayoutGrid },
              { mode: 'liste' as const, label: 'Liste', Icon: List },
            ] as const
          ).map(({ mode, label, Icon }) => {
            const selected = viewMode === mode;
            return (
              <button
                key={mode}
                type="button"
                onClick={() => setViewMode(mode)}
                className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium transition-all duration-200"
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
                <Icon className="h-3.5 w-3.5" aria-hidden />
                {label}
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter opgaver">
          {(
            [
              { key: 'alle' as const, label: 'Alle' },
              { key: 'ventende' as const, label: 'Kun ventende' },
              { key: 'forsinkede' as const, label: 'Kun forsinkede' },
            ] as const
          ).map(({ key, label }) => {
            const selected = taskFilter === key;
            return (
              <button
                key={key}
                type="button"
                onClick={() => setTaskFilter(key)}
                className="rounded-full px-2.5 py-1 text-xs font-medium transition-all duration-200"
                style={
                  selected
                    ? { backgroundColor: 'var(--cp-blue)', color: '#fff' }
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
      {taskFilter !== 'alle' && scopedEntries.length > 0 && (
        <p className="mb-4 text-xs" style={{ color: 'var(--cp-muted)' }}>
          Viser {filteredEntries.length} af {scopedEntries.length} opgaver
        </p>
      )}

      {(listStats.overdueN > 0 || listStats.upcomingN > 0 || listStats.laterN > 0) && (
        <div className="mb-6 flex flex-wrap gap-2" role="status" aria-live="polite">
          {listStats.overdueN > 0 && (
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
              {listStats.overdueN} forfalden{listStats.overdueN === 1 ? '' : 'e'}
            </span>
          )}
          {listStats.upcomingN > 0 && (
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium"
              style={{
                backgroundColor: 'var(--cp-green-dim)',
                color: 'var(--cp-green)',
                border: '1px solid rgba(45,212,160,0.2)',
              }}
            >
              <Timer className="h-3 w-3" aria-hidden />
              {listStats.upcomingN} inden for 2 timer
            </span>
          )}
          {listStats.laterN > 0 && (
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-medium"
              style={{
                backgroundColor: 'var(--cp-bg3)',
                color: 'var(--cp-muted)',
                border: '1px solid var(--cp-border)',
              }}
            >
              <Clock className="h-3 w-3 opacity-70" aria-hidden />
              {listStats.laterN} senere i dag
            </span>
          )}
        </div>
      )}

      <div className="flex flex-col gap-6">
        {hydrated && !pilotMedicinMock && entries.length === 0 && (
          <div
            className="rounded-2xl p-5 sm:p-6"
            style={{
              backgroundColor: 'var(--cp-bg3)',
              border: '1px solid var(--cp-border)',
            }}
          >
            <p className="text-sm font-medium" style={{ color: 'var(--cp-text)' }}>
              Ingen aktive mediciner at vise i dag
            </p>
            <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--cp-muted)' }}>
              Overblikket bygger på aktive præparater fra beboernes Medicin-fane. Når medicin er
              tilføjet dér, vises planlagte udleveringer her.
            </p>
          </div>
        )}
        {viewMode === 'koe' && pastDue.length > 0 && (
          <div>
            <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
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
                <p className="mt-0.5 text-xs" style={{ color: 'var(--cp-muted)' }}>
                  Afsluttede flyttes til bunden — du kan stadig fortryde.
                </p>
              </div>
            </div>
            <ul className="flex flex-col gap-3">
              {pastDue.map((item) => {
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
                              'linear-gradient(135deg, rgba(45,212,160,0.08) 0%, var(--cp-bg3) 100%)',
                            border: '1px solid rgba(45,212,160,0.18)',
                            opacity: 0.92,
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
                              · {carePortalHouseChipLabel(item.house)} · værelse {item.room} ·{' '}
                              {item.routeLabel}
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
                        <DeliveryControls
                          given={given}
                          givenAt={item.givenAt}
                          variant="panel"
                          onDeliver={() => markDelivered(item.id)}
                          onUndo={() => unmarkDelivered(item.id)}
                        />
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {viewMode === 'koe' && upcoming.length > 0 && (
          <div
            className="rounded-2xl p-1"
            style={{
              background:
                listStats.overdueN > 0 || pastDue.length === 0
                  ? 'linear-gradient(135deg, rgba(45,212,160,0.08) 0%, transparent 40%)'
                  : 'transparent',
              border:
                listStats.overdueN > 0 || pastDue.length === 0
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
                      Inden for 2 timer — registrér gerne på forhånd
                    </p>
                  </div>
                </div>
              </div>
              <ul className="space-y-0" style={{ borderColor: 'var(--cp-border)' }}>
                {upcoming.map((row) => (
                  <li
                    key={row.id}
                    className="grid grid-cols-[3rem_36px_minmax(0,1fr)_auto] items-center gap-2 border-t py-3 first:border-t-0 first:pt-0 sm:grid-cols-[3.5rem_40px_minmax(0,1fr)_auto_auto] sm:gap-3"
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
                        <ResidentAbbr fullName={row.residentName} initials={row.initials} /> ·{' '}
                        {carePortalHouseChipLabel(row.house)} · {row.room}
                      </p>
                    </div>
                    <span
                      className="hidden max-w-[4.5rem] truncate rounded-lg px-2 py-1 text-center text-[10px] font-semibold tabular-nums sm:inline-block"
                      style={{
                        backgroundColor: 'var(--cp-bg3)',
                        color: 'var(--cp-muted)',
                        border: '1px solid var(--cp-border)',
                      }}
                    >
                      {row.routeLabel}
                    </span>
                    <DeliveryControls
                      given={!!row.givenAt}
                      givenAt={row.givenAt}
                      variant="inline"
                      onDeliver={() => markDelivered(row.id)}
                      onUndo={() => unmarkDelivered(row.id)}
                    />
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {viewMode === 'koe' && laterToday.length > 0 && (
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
                  {listStats.laterN} åbne
                  {laterToday.length !== listStats.laterN ? ` · ${laterToday.length} i alt` : ''}
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
                {laterToday.map((row, i) => {
                  const done = !!row.givenAt;
                  return (
                    <li
                      key={row.id}
                      className={`grid grid-cols-[2.75rem_32px_minmax(0,1fr)_auto] items-center gap-2 py-3 sm:grid-cols-[3.25rem_36px_minmax(0,1fr)_auto] sm:gap-3 ${i > 0 ? 'border-t' : ''}`}
                      style={{
                        borderColor: 'var(--cp-border)',
                        opacity: done ? 0.85 : 1,
                      }}
                    >
                      <span
                        className="text-right font-mono text-[11px] font-medium tabular-nums sm:text-xs"
                        style={{ color: 'var(--cp-muted2)' }}
                      >
                        {formatTimeMono(row.scheduledAt)}
                      </span>
                      <span
                        className="flex h-8 w-8 items-center justify-center rounded-lg text-[10px] font-semibold text-white"
                        style={{
                          backgroundColor: done ? 'var(--cp-green)' : 'var(--cp-muted2)',
                        }}
                        title={row.residentName}
                      >
                        {row.initials}
                      </span>
                      <div className="min-w-0 text-sm leading-snug">
                        <span
                          style={{
                            color: 'var(--cp-text)',
                            textDecoration: done ? 'line-through' : 'none',
                          }}
                        >
                          {row.medicationName}
                        </span>
                        <span style={{ color: 'var(--cp-muted)' }}>
                          {' '}
                          · {qtyLabel(row.quantity, row.unit)} · {row.strengthLabel}
                        </span>
                        <p
                          className="mt-0.5 truncate text-xs"
                          style={{ color: 'var(--cp-muted2)' }}
                        >
                          <ResidentAbbr fullName={row.residentName} initials={row.initials} /> ·{' '}
                          {carePortalHouseChipLabel(row.house)}
                        </p>
                      </div>
                      <DeliveryControls
                        given={done}
                        givenAt={row.givenAt}
                        variant="inline"
                        onDeliver={() => markDelivered(row.id)}
                        onUndo={() => unmarkDelivered(row.id)}
                      />
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        )}

        {viewMode === 'liste' && (
          <div className="flex flex-col gap-4">
            {groupedTimeline.length === 0 ? (
              <p
                className="rounded-2xl px-4 py-8 text-center text-sm"
                style={{ color: 'var(--cp-muted)' }}
              >
                Ingen opgaver matcher filteret.
              </p>
            ) : (
              groupedTimeline.map((group) => {
                const pendingIds = group.items.filter((e) => !e.givenAt).map((e) => e.id);
                const givenIds = group.items.filter((e) => e.givenAt).map((e) => e.id);
                return (
                  <div
                    key={group.key}
                    className="overflow-hidden rounded-2xl"
                    style={{ border: '1px solid var(--cp-border)' }}
                  >
                    <div
                      className="flex flex-col gap-3 border-b px-4 py-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between sm:py-3.5"
                      style={{
                        backgroundColor: 'var(--cp-bg3)',
                        borderColor: 'var(--cp-border)',
                      }}
                    >
                      <p className="text-sm font-semibold" style={{ color: 'var(--cp-text)' }}>
                        {group.timeLabel}
                        <span
                          className="ml-2 text-xs font-normal tabular-nums"
                          style={{ color: 'var(--cp-muted)' }}
                        >
                          {group.items.length} opgave{group.items.length === 1 ? '' : 'r'}
                        </span>
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {pendingIds.length > 0 && (
                          <button
                            type="button"
                            onClick={() => markBatchDelivered(pendingIds)}
                            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all hover:brightness-110 active:scale-[0.98]"
                            style={{
                              background: 'linear-gradient(180deg, #2dd4a0 0%, #1D9E75 100%)',
                              color: '#fff',
                              boxShadow: '0 2px 10px rgba(45,212,160,0.25)',
                            }}
                          >
                            <Check className="h-3.5 w-3.5" strokeWidth={2.5} aria-hidden />
                            Registrér alle ({pendingIds.length})
                          </button>
                        )}
                        {givenIds.length > 0 && (
                          <button
                            type="button"
                            onClick={() => unmarkBatchDelivered(givenIds)}
                            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors hover:opacity-90"
                            style={{
                              backgroundColor: 'var(--cp-bg2)',
                              color: 'var(--cp-muted)',
                              border: '1px solid var(--cp-border)',
                            }}
                          >
                            <Undo2 className="h-3.5 w-3.5" aria-hidden />
                            Fortryd gruppe ({givenIds.length})
                          </button>
                        )}
                      </div>
                    </div>
                    <ul className="px-2 py-1 sm:px-3" style={{ backgroundColor: 'var(--cp-bg2)' }}>
                      {group.items.map((row) => {
                        const given = !!row.givenAt;
                        const late =
                          !given && row.scheduledAt.getTime() < nowTick
                            ? minutesLate(row.scheduledAt, nowTick)
                            : null;
                        return (
                          <li
                            key={row.id}
                            className="grid grid-cols-[3rem_36px_minmax(0,1fr)_auto] items-center gap-2 border-t py-3 first:border-t-0 first:pt-2 sm:grid-cols-[3.5rem_40px_minmax(0,1fr)_auto_auto] sm:gap-3"
                            style={{ borderColor: 'var(--cp-border)' }}
                          >
                            <div className="flex flex-col items-end gap-0.5">
                              <time
                                dateTime={row.scheduledAt.toISOString()}
                                className="font-mono text-xs font-semibold tabular-nums sm:text-sm"
                                style={{
                                  color: late != null ? 'var(--cp-red)' : 'var(--cp-green)',
                                }}
                              >
                                {formatTimeMono(row.scheduledAt)}
                              </time>
                              {late != null && (
                                <span
                                  className="inline-flex max-w-[5rem] items-center gap-0.5 truncate text-[10px] font-semibold sm:max-w-none"
                                  style={{ color: 'var(--cp-red)' }}
                                >
                                  <AlertTriangle className="h-3 w-3 shrink-0" aria-hidden />
                                  {formatLateDanish(late)}
                                </span>
                              )}
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
                              <p
                                className="font-semibold leading-snug"
                                style={{
                                  color: 'var(--cp-text)',
                                  textDecoration: given ? 'line-through' : 'none',
                                }}
                              >
                                {row.medicationName}
                                <span className="font-normal" style={{ color: 'var(--cp-muted)' }}>
                                  {' '}
                                  · {qtyLabel(row.quantity, row.unit)} · {row.strengthLabel}
                                </span>
                              </p>
                              <p className="text-xs" style={{ color: 'var(--cp-muted2)' }}>
                                <ResidentAbbr fullName={row.residentName} initials={row.initials} />{' '}
                                · {carePortalHouseChipLabel(row.house)} · {row.room}
                              </p>
                            </div>
                            <span
                              className="hidden max-w-[4.5rem] truncate rounded-lg px-2 py-1 text-center text-[10px] font-semibold tabular-nums sm:inline-block"
                              style={{
                                backgroundColor: 'var(--cp-bg3)',
                                color: 'var(--cp-muted)',
                                border: '1px solid var(--cp-border)',
                              }}
                            >
                              {row.routeLabel}
                            </span>
                            <DeliveryControls
                              given={given}
                              givenAt={row.givenAt}
                              variant="inline"
                              onDeliver={() => markDelivered(row.id)}
                              onUndo={() => unmarkDelivered(row.id)}
                            />
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                );
              })
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
                  {houseFilter !== 'alle' ? ` for ${carePortalHouseChipLabel(houseFilter)}` : ''}
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
            Ingen planlagte udleveringer for {carePortalHouseChipLabel(houseFilter)} i dette vindue.
          </p>
        )}
      </div>
    </section>
  );
}
