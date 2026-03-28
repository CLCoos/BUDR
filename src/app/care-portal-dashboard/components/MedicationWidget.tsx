'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CheckCircle2, Clock, Pill } from 'lucide-react';

export interface MedicationTask {
  id: string;
  residentName: string;
  initials: string;
  medicationName: string;
  scheduledAt: Date;
  givenAt: Date | null;
}

const TWO_HOURS_MS = 2 * 60 * 60 * 1000;

function formatTime(d: Date): string {
  return d.toLocaleTimeString('da-DK', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

/** Display-only: split `medicationName` into title line + dose line (data unchanged). */
function splitMedicationDisplay(full: string): { title: string; dose: string | null } {
  const m = full.match(/^(.+?)\s+([\d.,]+\s*(?:mg|g))$/i);
  if (m) return { title: m[1].trim(), dose: m[2].trim() };
  return { title: full, dose: null };
}

function createMockEntries(now: number): MedicationTask[] {
  return [
    {
      id: 'med-001',
      residentName: 'Anders M.',
      initials: 'AM',
      medicationName: 'Metformin 500 mg',
      scheduledAt: new Date(now - 45 * 60 * 1000),
      givenAt: null,
    },
    {
      id: 'med-002',
      residentName: 'Kirsten R.',
      initials: 'KR',
      medicationName: 'Risperidon 2 mg',
      scheduledAt: new Date(now - 20 * 60 * 1000),
      givenAt: null,
    },
    {
      id: 'med-003',
      residentName: 'Finn L.',
      initials: 'FL',
      medicationName: 'Sertralin 50 mg',
      scheduledAt: new Date(now + 25 * 60 * 1000),
      givenAt: null,
    },
    {
      id: 'med-004',
      residentName: 'Maja T.',
      initials: 'MT',
      medicationName: 'Lisinopril 10 mg',
      scheduledAt: new Date(now + 75 * 60 * 1000),
      givenAt: null,
    },
    {
      id: 'med-005',
      residentName: 'Lena P.',
      initials: 'LP',
      medicationName: 'Panodil 1 g',
      scheduledAt: new Date(now + 5 * 60 * 60 * 1000),
      givenAt: null,
    },
  ];
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
    setEntries(prev =>
      prev.map(e => (e.id === id ? { ...e, givenAt: at } : e)),
    );
  }, []);

  const { overdue, upcoming, nextFuture, allClear } = useMemo(() => {
    if (!hydrated) {
      return {
        overdue: [] as MedicationTask[],
        upcoming: [] as MedicationTask[],
        nextFuture: null as MedicationTask | null,
        allClear: false,
      };
    }
    const now = Date.now();
    const pending = entries.filter(e => e.givenAt === null);
    /* Overdue window: scheduled in the past; include given rows so UI can show strike + check */
    const overdueWindow = entries
      .filter(e => e.scheduledAt.getTime() < now)
      .sort((a, b) => {
        const aDone = a.givenAt !== null ? 1 : 0;
        const bDone = b.givenAt !== null ? 1 : 0;
        if (aDone !== bDone) return aDone - bDone;
        return a.scheduledAt.getTime() - b.scheduledAt.getTime();
      });
    const hasOpenOverdue = overdueWindow.some(e => e.givenAt === null);
    const overdueList = hasOpenOverdue ? overdueWindow : [];

    const upcomingList = pending
      .filter(e => {
        const t = e.scheduledAt.getTime();
        return t >= now && t <= now + TWO_HOURS_MS;
      })
      .sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());

    const futurePending = pending
      .filter(e => e.scheduledAt.getTime() > now)
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
    };
  }, [entries, hydrated]);

  if (!hydrated) {
    return (
      <div className="mb-5 w-full max-w-2xl rounded-xl border border-gray-100 bg-white p-5 shadow-sm animate-pulse">
        <div className="h-4 w-44 rounded bg-gray-100" />
        <div className="mt-4 h-24 rounded-lg bg-gray-50" />
      </div>
    );
  }

  const overduePrimary = overdue.length > 0;

  return (
    <section
      className="mb-5 w-full max-w-2xl rounded-xl border border-gray-100 bg-white p-5 shadow-sm"
      aria-label="Medicinudleveringer"
    >
      <div className="flex items-center gap-2 border-b border-gray-100 pb-4 mb-4">
        <div
          className="flex h-9 w-9 items-center justify-center rounded-lg flex-shrink-0"
          style={{ backgroundColor: '#F5F4FF' }}
        >
          <Pill className="h-4 w-4 text-budr-purple" aria-hidden />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Medicin i dag</h2>
          <p className="text-xs text-gray-500">Udleveringer på tværs af beboere</p>
        </div>
      </div>

      <div className="flex flex-col gap-3">
        {overdue.length > 0 && (
          <div>
            <div className="mb-3 flex items-center gap-2">
              <div className="h-2 w-2 shrink-0 rounded-full bg-budr-roed animate-pulse" aria-hidden />
              <span className="text-sm font-bold text-budr-roed">⚠ Forfaldne udleveringer</span>
            </div>
            <ul className="flex flex-col gap-3">
              {overdue.map(item => {
                const { title, dose } = splitMedicationDisplay(item.medicationName);
                const given = !!item.givenAt;
                return (
                  <li
                    key={item.id}
                    className={`rounded-lg border border-gray-100 p-4 shadow-sm transition-colors border-l-4 ${
                      given ? 'border-l-budr-groen bg-green-50' : 'border-l-budr-roed bg-red-50'
                    }`}
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                      <div className="flex min-w-0 flex-1 gap-3">
                        <div
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
                          style={{ backgroundColor: '#7F77DD' }}
                        >
                          {item.initials}
                        </div>
                        <div className="min-w-0 flex-1">
                          {given ? (
                            <p className="text-base font-bold text-gray-500 line-through decoration-gray-400">
                              {item.medicationName}
                            </p>
                          ) : (
                            <>
                              <p className="text-base font-bold text-gray-900">{title}</p>
                              {dose ? <p className="mt-0.5 text-sm text-gray-500">{dose}</p> : null}
                            </>
                          )}
                          <div
                            className={`mt-2 flex items-center gap-1.5 text-xs font-medium ${
                              given ? 'text-gray-400' : 'text-budr-roed'
                            }`}
                          >
                            <Clock className="h-3.5 w-3.5 shrink-0" aria-hidden />
                            Planlagt {formatTime(item.scheduledAt)}
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={given}
                        onClick={() => markGiven(item.id)}
                        className={`w-full shrink-0 rounded-lg px-5 py-2.5 text-sm font-semibold sm:w-auto sm:self-center ${
                          given
                            ? 'cursor-default bg-budr-groen text-white disabled:opacity-100'
                            : 'bg-budr-teal text-white hover:opacity-90 disabled:opacity-100'
                        }`}
                      >
                        {given ? '✓ Givet' : 'Marker som givet'}
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
            className={`rounded-lg border border-gray-100 bg-white p-4 shadow-sm ${
              !overduePrimary ? 'border-l-4 border-l-budr-teal' : ''
            }`}
          >
            <div className="mb-3 flex items-center gap-2">
              <Clock className="h-4 w-4 shrink-0 text-budr-teal" aria-hidden />
              <span className="text-sm font-semibold text-gray-800">Kommende udleveringer</span>
            </div>
            <ul className="flex flex-col gap-1">
              {upcoming.map(row => (
                <li
                  key={row.id}
                  className="flex items-center gap-3 rounded-lg px-2 py-2.5 transition-colors hover:bg-gray-50"
                >
                  <span className="shrink-0 rounded-full bg-budr-teal-light px-2.5 py-1 text-xs font-semibold tabular-nums text-budr-teal">
                    {formatTime(row.scheduledAt)}
                  </span>
                  <div
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold text-white"
                    style={{ backgroundColor: '#7F77DD' }}
                  >
                    {row.initials}
                  </div>
                  <span className="min-w-0 truncate text-sm font-medium text-gray-800">{row.medicationName}</span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {allClear && overdue.length === 0 && upcoming.length === 0 && (
          <div className="w-full rounded-lg border border-budr-groen/25 bg-gradient-to-br from-emerald-50 to-budr-teal-light p-4 shadow-sm">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-7 w-7 shrink-0 text-budr-groen" aria-hidden />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-emerald-900">Alt medicin udleveret</p>
                {nextFuture ? (
                  <p className="mt-1.5 text-sm text-emerald-800/90">
                    Næste udlevering: {formatTime(nextFuture.scheduledAt)} · {nextFuture.initials} —{' '}
                    {nextFuture.medicationName}
                  </p>
                ) : (
                  <p className="mt-1.5 text-sm text-emerald-800/90">
                    Alle planlagte udleveringer i vinduet er registreret.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/*
        Supabase (care_medication_logs) — wire later:

        1) Fetch: supabase.from('care_medication_logs').select(`
            id, scheduled_at, given_at, medication_name,
            resident:residents(id, full_name, initials)
          `).eq('facility_id', facilityId).gte('scheduled_at', startOfDay).lte('scheduled_at', endOfDay)

        2) Map rows to MedicationTask (scheduledAt/givenAt as Date, initials from join).

        3) markGiven(id): optimistic update + supabase.from('care_medication_logs').update({
             given_at: new Date().toISOString(),
             given_by_staff_id: staffId,
           }).eq('id', id)

        4) Subscribe or revalidate: channel on care_medication_logs for INSERT/UPDATE, or router.refresh() / React Query invalidation after mutation.

        5) RLS: staff can only update logs for residents in their assigned facility; given_by_staff_id from auth.uid() mapping.
      */}
    </section>
  );
}
