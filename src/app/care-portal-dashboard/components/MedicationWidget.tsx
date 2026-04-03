'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock, Pill, Shield } from 'lucide-react';

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

  useEffect(() => {
    setEntries(createMockEntries(Date.now()));
    setHydrated(true);
  }, []);

  const markGiven = useCallback((id: string) => {
    const at = new Date();
    setEntries((prev) => prev.map((e) => (e.id === id ? { ...e, givenAt: at } : e)));
  }, []);

  const { overdue, upcoming, nextFuture, allClear, overduePrimary } = useMemo(() => {
    if (!hydrated)
      return {
        overdue: [] as MedicationTask[],
        upcoming: [] as MedicationTask[],
        nextFuture: null as MedicationTask | null,
        allClear: false,
        overduePrimary: false,
      };
    const now = Date.now();
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
    const futurePending = pending
      .filter((e) => e.scheduledAt.getTime() > now)
      .sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());
    const next = futurePending[0] ?? null;
    const clear =
      overdueList.length === 0 &&
      upcomingList.length === 0 &&
      (next !== null || pending.length === 0);
    return {
      overdue: overdueList,
      upcoming: upcomingList,
      nextFuture: next,
      allClear: clear,
      overduePrimary: overdueList.length > 0,
    };
  }, [entries, hydrated]);

  if (!hydrated) {
    return (
      <div className="cp-card-elevated w-full animate-pulse p-5">
        <div className="mb-4 flex justify-between">
          <div className="h-10 w-48 rounded-lg" style={{ backgroundColor: 'var(--cp-bg3)' }} />
          <div className="h-6 w-28 rounded-full" style={{ backgroundColor: 'var(--cp-bg3)' }} />
        </div>
        <div className="mb-3 h-24 rounded-xl" style={{ backgroundColor: 'var(--cp-bg3)' }} />
        <div className="h-24 rounded-xl" style={{ backgroundColor: 'var(--cp-bg3)' }} />
      </div>
    );
  }

  return (
    <section className="cp-card-elevated relative w-full p-5" aria-label="Medicinudleveringer">
      <div
        className="mb-5 flex items-start justify-between gap-3 pb-4"
        style={{ borderBottom: '1px solid var(--cp-border)' }}
      >
        <div className="flex min-w-0 items-center gap-2.5">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg"
            style={{ backgroundColor: 'var(--cp-blue-dim)' }}
          >
            <Pill className="h-4 w-4" style={{ color: 'var(--cp-blue)' }} aria-hidden />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold" style={{ color: 'var(--cp-text)' }}>
              Medicin i dag
            </h2>
            <p className="text-xs" style={{ color: 'var(--cp-muted)' }}>
              Udleveringer på tværs af beboere
            </p>
          </div>
        </div>
        <span
          className="inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium"
          style={{ backgroundColor: 'var(--cp-blue-dim)', color: 'var(--cp-blue)' }}
        >
          <Shield className="h-3 w-3" aria-hidden />
          FMK integration
        </span>
      </div>

      <div className="flex flex-col gap-3">
        {overdue.length > 0 && (
          <div>
            <div className="mb-3 flex items-start gap-2">
              <div
                className="mt-1.5 h-2 w-2 shrink-0 rounded-full animate-pulse"
                style={{ backgroundColor: 'var(--cp-red)' }}
                aria-hidden
              />
              <div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <AlertTriangle
                    className="h-4 w-4 shrink-0"
                    style={{ color: 'var(--cp-red)' }}
                    aria-hidden
                  />
                  <span className="text-sm font-semibold" style={{ color: 'var(--cp-red)' }}>
                    Forfaldne udleveringer
                  </span>
                </div>
                <p className="mt-0.5 text-xs" style={{ color: 'var(--cp-muted)' }}>
                  Skal udleveres omgående
                </p>
              </div>
            </div>
            <ul className="flex flex-col gap-3">
              {overdue.map((item) => {
                const given = !!item.givenAt;
                return (
                  <li
                    key={item.id}
                    className="rounded-xl p-4 transition-all duration-200 border-l-4"
                    style={
                      given
                        ? {
                            backgroundColor: 'var(--cp-green-dim)',
                            border: '1px solid rgba(45,212,160,0.2)',
                            borderLeftColor: 'var(--cp-green)',
                          }
                        : {
                            backgroundColor: 'var(--cp-red-dim)',
                            border: '1px solid rgba(245,101,101,0.15)',
                            borderLeftColor: 'var(--cp-red)',
                          }
                    }
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                      <div className="flex min-w-0 flex-1 gap-3">
                        <div
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
                          style={{ backgroundColor: 'var(--cp-blue)' }}
                        >
                          {item.initials}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p
                            className="text-sm font-semibold transition-all duration-200"
                            style={{
                              color: given ? 'var(--cp-muted)' : 'var(--cp-text)',
                              textDecoration: given ? 'line-through' : 'none',
                            }}
                          >
                            {item.medicationName}
                          </p>
                          <p className="text-xs" style={{ color: 'var(--cp-muted)' }}>
                            {item.dose}
                          </p>
                          <div
                            className="mt-2 flex items-center gap-1.5 text-xs font-mono font-medium"
                            style={{ color: given ? 'var(--cp-muted)' : 'var(--cp-red)' }}
                          >
                            <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden />
                            Planlagt {formatTimeMono(item.scheduledAt)}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={given}
                        onClick={() => markGiven(item.id)}
                        className="w-full shrink-0 rounded-lg px-5 py-2.5 text-sm font-semibold transition-all duration-200 active:scale-95 sm:w-auto disabled:opacity-60"
                        style={
                          given
                            ? { backgroundColor: 'var(--cp-green)', color: '#fff' }
                            : { backgroundColor: 'var(--cp-green)', color: '#fff' }
                        }
                      >
                        {given ? '✓ Udleveret' : 'UDLEVER'}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {upcoming.length > 0 && (
          <div
            className="rounded-xl p-4 transition-all duration-200"
            style={
              !overduePrimary
                ? {
                    backgroundColor: 'var(--cp-bg3)',
                    border: '1px solid var(--cp-border)',
                    borderLeft: '3px solid var(--cp-green)',
                  }
                : { backgroundColor: 'var(--cp-bg3)', border: '1px solid var(--cp-border)' }
            }
          >
            <div className="mb-3 flex items-center gap-2">
              <Clock
                className="h-4 w-4 shrink-0"
                style={{ color: 'var(--cp-green)' }}
                aria-hidden
              />
              <span className="text-sm font-semibold" style={{ color: 'var(--cp-text)' }}>
                Kommende udleveringer
              </span>
            </div>
            <ul className="flex flex-col gap-0.5">
              {upcoming.map((row) => (
                <li
                  key={row.id}
                  className="flex items-center gap-3 rounded-lg px-2 py-2.5 text-sm transition-all duration-200"
                  style={{ color: 'var(--cp-text)' }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.backgroundColor =
                      'var(--cp-bg4, rgba(255,255,255,0.04))';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.backgroundColor = '';
                  }}
                >
                  <span
                    className="shrink-0 rounded-full px-2.5 py-0.5 font-mono text-xs font-semibold"
                    style={{ backgroundColor: 'var(--cp-green-dim)', color: 'var(--cp-green)' }}
                  >
                    {formatTimeMono(row.scheduledAt)}
                  </span>
                  <div
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
                    style={{ backgroundColor: 'var(--cp-blue)' }}
                  >
                    {row.initials}
                  </div>
                  <span className="min-w-0 truncate">
                    <span className="font-medium" style={{ color: 'var(--cp-text)' }}>
                      {row.medicationName}
                    </span>
                    <span style={{ color: 'var(--cp-muted)' }}> · {row.dose}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {allClear && overdue.length === 0 && upcoming.length === 0 && (
          <div
            className="w-full rounded-xl p-4 transition-all duration-200"
            style={{
              backgroundColor: 'var(--cp-green-dim)',
              border: '1px solid rgba(45,212,160,0.2)',
            }}
          >
            <div className="flex items-start gap-3">
              <CheckCircle2
                className="h-5 w-5 shrink-0"
                style={{ color: 'var(--cp-green)' }}
                aria-hidden
              />
              <div className="min-w-0">
                <p className="font-semibold text-sm" style={{ color: 'var(--cp-green)' }}>
                  Alt medicin udleveret
                </p>
                {nextFuture ? (
                  <p className="mt-1 text-xs" style={{ color: 'var(--cp-muted)' }}>
                    Næste udlevering:{' '}
                    <span className="font-mono font-medium" style={{ color: 'var(--cp-green)' }}>
                      {formatTimeMono(nextFuture.scheduledAt)}
                    </span>{' '}
                    · {nextFuture.initials} — {nextFuture.medicationName}
                  </p>
                ) : (
                  <p className="mt-1 text-xs" style={{ color: 'var(--cp-muted)' }}>
                    Alle planlagte udleveringer i vinduet er registreret.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
