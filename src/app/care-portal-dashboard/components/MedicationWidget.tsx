'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  AlertTriangle,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Pill,
  Shield,
  Timer,
} from 'lucide-react';

export interface MedicationTask {
  id: string;
  residentName: string;
  initials: string;
  medicationName: string;
  dose: string;
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

function slotsForDay(baseMidnight: Date): Date[] {
  const out: Date[] = [];
  for (let i = 0; i < 48; i++) {
    const t = new Date(baseMidnight);
    t.setMinutes(i * 30, 0, 0);
    out.push(t);
  }
  return out;
}

function enumerateSlotsAround(now: Date): Date[] {
  const out: Date[] = [];
  for (let dayOff = -1; dayOff <= 4; dayOff++) {
    const mid = new Date(now);
    mid.setHours(0, 0, 0, 0);
    mid.setDate(mid.getDate() + dayOff);
    out.push(...slotsForDay(mid));
  }
  return out.sort((a, b) => a.getTime() - b.getTime());
}

function createMockEntries(nowMs: number): MedicationTask[] {
  const now = new Date(nowMs);
  const slots = enumerateSlotsAround(now);
  const past = slots.filter((t) => t.getTime() < now.getTime());
  const overdueSlots = past.slice(-2);
  const inTwoHours = slots.filter(
    (t) => t.getTime() > now.getTime() && t.getTime() <= now.getTime() + TWO_HOURS_MS
  );
  const upcomingSlots = inTwoHours.slice(0, 2);
  const futureAll = slots.filter((t) => t.getTime() > now.getTime());
  const afterWindow = slots.filter((t) => t.getTime() > now.getTime() + TWO_HOURS_MS);

  const u0 = upcomingSlots[0] ?? inTwoHours[0] ?? futureAll[0];
  const u1 =
    upcomingSlots[1] ??
    inTwoHours[1] ??
    futureAll.find((t) => u0 && t.getTime() > u0.getTime()) ??
    futureAll[1];
  const farSlots: [Date, Date] = [
    afterWindow[0] ?? futureAll[2] ?? u1!,
    afterWindow[1] ?? futureAll[3] ?? futureAll[2] ?? u1!,
  ];

  const templates: Omit<MedicationTask, 'scheduledAt' | 'givenAt'>[] = [
    {
      id: 'med-001',
      residentName: 'Anders M.',
      initials: 'AM',
      medicationName: 'Metformin',
      dose: '500 mg',
    },
    {
      id: 'med-002',
      residentName: 'Finn L.',
      initials: 'FL',
      medicationName: 'Sertralin',
      dose: '50 mg',
    },
    {
      id: 'med-003',
      residentName: 'Kirsten R.',
      initials: 'KR',
      medicationName: 'Risperidon',
      dose: '2 mg',
    },
    {
      id: 'med-004',
      residentName: 'Maja T.',
      initials: 'MT',
      medicationName: 'Lisinopril',
      dose: '10 mg',
    },
    {
      id: 'med-005',
      residentName: 'Thomas B.',
      initials: 'TB',
      medicationName: 'Quetiapin',
      dose: '25 mg',
    },
    {
      id: 'med-006',
      residentName: 'Lena P.',
      initials: 'LP',
      medicationName: 'Panodil',
      dose: '1 g',
    },
  ];

  const o0 = overdueSlots[0] ?? past[past.length - 1];
  const o1 = overdueSlots[1] ?? past[past.length - 2] ?? past[past.length - 1];
  const scheduled: Date[] = [o0!, o1!, u0!, u1!, farSlots[0], farSlots[1]];
  return templates.map((t, i) => ({ ...t, scheduledAt: scheduled[i]!, givenAt: null }));
}

export default function MedicationWidget() {
  const [entries, setEntries] = useState<MedicationTask[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [laterExpanded, setLaterExpanded] = useState(true);
  const [nowTick, setNowTick] = useState(() => Date.now());

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

  const { overdue, upcoming, laterToday, overduePrimary, stats, pendingCount } = useMemo(() => {
    if (!hydrated) {
      return {
        overdue: [] as MedicationTask[],
        upcoming: [] as MedicationTask[],
        laterToday: [] as MedicationTask[],
        overduePrimary: false,
        stats: { pending: 0, overdueN: 0, upcomingN: 0, laterN: 0 },
        pendingCount: 0,
      };
    }
    const now = nowTick;
    const pending = entries.filter((e) => e.givenAt === null);
    const overdueWindow = entries
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
        const t = e.scheduledAt.getTime();
        return t > now && t <= now + TWO_HOURS_MS;
      })
      .sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());
    const laterList = pending
      .filter((e) => e.scheduledAt.getTime() > now + TWO_HOURS_MS)
      .sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());
    return {
      overdue: overdueList,
      upcoming: upcomingList,
      laterToday: laterList,
      overduePrimary: overdueList.length > 0,
      pendingCount: pending.length,
      stats: {
        pending: pending.length,
        overdueN: overdueList.filter((e) => !e.givenAt).length,
        upcomingN: upcomingList.length,
        laterN: laterList.length,
      },
    };
  }, [entries, hydrated, nowTick]);

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
      {/* Ambient top edge */}
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/12 to-transparent"
        aria-hidden
      />

      {/* Header */}
      <header className="relative mb-6 flex flex-col gap-4 sm:mb-8 sm:flex-row sm:items-start sm:justify-between">
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
              Overblik over dagens udleveringer · ét tryk for at registrere
            </p>
          </div>
        </div>
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
      </header>

      {/* Live status chips */}
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
        {/* Forfaldne — prioriteret bane */}
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
                                className="rounded-md px-2 py-0.5 text-xs font-medium"
                                style={{
                                  backgroundColor: 'var(--cp-bg3)',
                                  color: 'var(--cp-muted)',
                                }}
                              >
                                {item.dose}
                              </span>
                            </div>
                            <p className="mt-1 text-sm" style={{ color: 'var(--cp-muted)' }}>
                              {item.residentName}
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

        {/* Kommende — tidslinje */}
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
                    className="grid grid-cols-[3.25rem_40px_minmax(0,1fr)] items-center gap-3 border-t py-3.5 first:border-t-0 first:pt-0 sm:grid-cols-[3.5rem_44px_minmax(0,1fr)] sm:gap-4"
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
                    >
                      {row.initials}
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold leading-snug" style={{ color: 'var(--cp-text)' }}>
                        {row.medicationName}
                        <span className="font-normal" style={{ color: 'var(--cp-muted)' }}>
                          {' '}
                          · {row.dose}
                        </span>
                      </p>
                      <p className="text-xs" style={{ color: 'var(--cp-muted2)' }}>
                        {row.residentName}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}

        {/* Senere i dag */}
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
                    >
                      {row.initials}
                    </span>
                    <div className="min-w-0 truncate text-sm">
                      <span style={{ color: 'var(--cp-text)' }}>{row.medicationName}</span>
                      <span style={{ color: 'var(--cp-muted)' }}> · {row.dose}</span>
                      <span className="text-xs" style={{ color: 'var(--cp-muted2)' }}>
                        {' '}
                        · {row.residentName}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Intet mere at vise: alle registreret */}
        {pendingCount === 0 && entries.length > 0 && (
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
                </p>
                <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--cp-muted)' }}>
                  Godt gået — der er ingen åbne medicinopgaver på listen lige nu.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
