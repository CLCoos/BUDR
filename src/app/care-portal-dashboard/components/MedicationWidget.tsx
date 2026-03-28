'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, Clock, Pill } from 'lucide-react';

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
      <div className="w-full max-w-2xl rounded-lg border border-gray-100 bg-white p-4 animate-pulse">
        <div className="h-4 w-40 rounded bg-gray-100" />
        <div className="mt-3 h-20 rounded-lg bg-gray-50" />
      </div>
    );
  }

  const overduePrimary = overdue.length > 0;

  return (
    <section className="mb-5 w-full max-w-2xl space-y-4" aria-label="Medicinudleveringer">
      <div className="flex items-center gap-2">
        <div
          className="flex h-9 w-9 items-center justify-center rounded-lg"
          style={{ backgroundColor: '#F5F4FF' }}
        >
          <Pill className="h-4 w-4 text-budr-purple" aria-hidden />
        </div>
        <div>
          <h2 className="text-sm font-semibold text-gray-900">Medicin i dag</h2>
          <p className="text-xs text-gray-500">Udleveringer på tværs af beboere</p>
        </div>
      </div>

      {overdue.length > 0 && (
        <div className="rounded-lg border border-budr-roed/25 bg-red-50/80 p-3 shadow-sm">
          <div className="mb-2 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 shrink-0 text-budr-roed" aria-hidden />
            <span className="text-sm font-semibold text-budr-roed">Forfaldne udleveringer</span>
          </div>
          <ul className="space-y-3">
            {overdue.map(item => (
              <li
                key={item.id}
                className={`rounded-lg border p-3 transition-all ${
                  item.givenAt
                    ? 'border-budr-groen/30 bg-emerald-50/50'
                    : 'border-budr-roed/20 bg-white/90'
                }`}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div
                    className={`min-w-0 flex-1 ${item.givenAt ? 'line-through decoration-budr-groen decoration-2' : ''}`}
                  >
                    <div className="flex flex-wrap items-baseline gap-2">
                      <span className="text-base font-bold text-gray-900">{item.initials}</span>
                      <span className="text-sm font-medium text-gray-800">{item.medicationName}</span>
                    </div>
                    <div className="mt-1 flex items-center gap-1.5 text-xs text-gray-500">
                      <Clock className="h-3.5 w-3.5 text-budr-gul" aria-hidden />
                      Planlagt {formatTime(item.scheduledAt)}
                    </div>
                  </div>
                  <button
                    type="button"
                    disabled={!!item.givenAt}
                    onClick={() => markGiven(item.id)}
                    className="flex w-full shrink-0 items-center justify-center gap-2 rounded-lg border-2 border-budr-teal bg-budr-teal-light px-4 py-3 text-sm font-semibold text-budr-teal shadow-sm transition hover:bg-budr-teal/10 disabled:cursor-default disabled:border-budr-groen/40 disabled:bg-emerald-50 sm:w-auto sm:min-w-[11rem]"
                  >
                    {item.givenAt ? (
                      <>
                        <CheckCircle2 className="h-5 w-5 text-budr-groen" aria-hidden />
                        <span className="text-budr-groen">Givet</span>
                      </>
                    ) : (
                      'Marker som givet'
                    )}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}

      {upcoming.length > 0 && (
        <div
          className={`rounded-lg border border-gray-100 bg-white p-3 shadow-sm ${
            !overduePrimary ? 'ring-1 ring-budr-teal/30' : ''
          }`}
        >
          <div className="mb-2 flex items-center gap-2">
            <Clock className="h-4 w-4 shrink-0 text-budr-purple" aria-hidden />
            <span
              className={`text-sm font-semibold ${!overduePrimary ? 'text-budr-teal' : 'text-gray-800'}`}
            >
              Kommende udleveringer (næste 2 timer)
            </span>
          </div>
          <ul className="space-y-1.5 text-sm text-gray-700">
            {upcoming.map(row => (
              <li key={row.id} className="font-mono text-xs sm:text-sm">
                <span className="text-budr-navy tabular-nums">{formatTime(row.scheduledAt)}</span>{' '}
                <span className="font-bold text-gray-900">{row.initials}</span>
                <span className="text-gray-400"> — </span>
                <span>{row.medicationName}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {allClear && overdue.length === 0 && upcoming.length === 0 && (
        <div className="rounded-lg border border-budr-groen/30 bg-gradient-to-br from-emerald-50 to-budr-teal-light p-4 shadow-sm">
          <div className="flex items-start gap-3">
            <CheckCircle2 className="h-6 w-6 shrink-0 text-budr-groen" aria-hidden />
            <div>
              <p className="text-sm font-semibold text-emerald-900">Ingen medicin forfaldne</p>
              {nextFuture ? (
                <p className="mt-1 text-sm text-emerald-800/90">
                  Næste udlevering:{' '}
                  <span className="font-semibold tabular-nums">{formatTime(nextFuture.scheduledAt)}</span>
                  <span className="text-emerald-800/80">
                    {' '}
                    (<span className="font-bold">{nextFuture.initials}</span>)
                  </span>
                </p>
              ) : (
                <p className="mt-1 text-sm text-emerald-800/90">
                  Alle planlagte udleveringer i vinduet er registreret.
                </p>
              )}
            </div>
          </div>
        </div>
      )}

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
