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
  return d.toLocaleTimeString('da-DK', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

/** Half-hour slots for a calendar day (00:00 … 23:30). */
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
  const past = slots.filter(t => t.getTime() < now.getTime());
  const overdueSlots = past.slice(-2);
  const inTwoHours = slots.filter(
    t => t.getTime() > now.getTime() && t.getTime() <= now.getTime() + TWO_HOURS_MS,
  );
  const upcomingSlots = inTwoHours.slice(0, 2);
  const futureAll = slots.filter(t => t.getTime() > now.getTime());
  const afterWindow = slots.filter(t => t.getTime() > now.getTime() + TWO_HOURS_MS);

  const u0 = upcomingSlots[0] ?? inTwoHours[0] ?? futureAll[0];
  const u1 =
    upcomingSlots[1] ??
    inTwoHours[1] ??
    futureAll.find(t => u0 && t.getTime() > u0.getTime()) ??
    futureAll[1];

  const farSlots: [Date, Date] = [
    afterWindow[0] ?? futureAll[2] ?? u1!,
    afterWindow[1] ?? futureAll[3] ?? futureAll[2] ?? u1!,
  ];

  const templates: Omit<MedicationTask, 'scheduledAt' | 'givenAt'>[] = [
    { id: 'med-001', residentName: 'Anders M.', initials: 'AM', medicationName: 'Metformin', dose: '500 mg' },
    { id: 'med-002', residentName: 'Finn L.', initials: 'FL', medicationName: 'Sertralin', dose: '50 mg' },
    { id: 'med-003', residentName: 'Kirsten R.', initials: 'KR', medicationName: 'Risperidon', dose: '2 mg' },
    { id: 'med-004', residentName: 'Maja T.', initials: 'MT', medicationName: 'Lisinopril', dose: '10 mg' },
    { id: 'med-005', residentName: 'Thomas B.', initials: 'TB', medicationName: 'Quetiapin', dose: '25 mg' },
    { id: 'med-006', residentName: 'Lena P.', initials: 'LP', medicationName: 'Panodil', dose: '1 g' },
  ];

  const o0 = overdueSlots[0] ?? past[past.length - 1];
  const o1 = overdueSlots[1] ?? past[past.length - 2] ?? past[past.length - 1];

  const scheduled: Date[] = [o0!, o1!, u0!, u1!, farSlots[0], farSlots[1]];

  return templates.map((t, i) => ({
    ...t,
    scheduledAt: scheduled[i]!,
    givenAt: null,
  }));
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
    setEntries(prev => prev.map(e => (e.id === id ? { ...e, givenAt: at } : e)));
  }, []);

  const { overdue, upcoming, nextFuture, allClear, overduePrimary } = useMemo(() => {
    if (!hydrated) {
      return {
        overdue: [] as MedicationTask[],
        upcoming: [] as MedicationTask[],
        nextFuture: null as MedicationTask | null,
        allClear: false,
        overduePrimary: false,
      };
    }
    const now = Date.now();
    const pending = entries.filter(e => e.givenAt === null);
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
        return t > now && t <= now + TWO_HOURS_MS;
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
      overduePrimary: overdueList.length > 0,
    };
  }, [entries, hydrated]);

  if (!hydrated) {
    return (
      <div className="mb-6 w-full max-w-2xl animate-pulse rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="mb-4 flex justify-between">
          <div className="h-10 w-48 rounded-lg bg-gray-100" />
          <div className="h-6 w-28 rounded-full bg-gray-100" />
        </div>
        <div className="mb-3 h-24 rounded-xl bg-gray-100" />
        <div className="h-24 rounded-xl bg-gray-100" />
      </div>
    );
  }

  return (
    <section
      className="relative mb-6 w-full max-w-2xl rounded-xl border border-gray-100 bg-white p-5 shadow-sm"
      aria-label="Medicinudleveringer"
    >
      <div className="mb-5 flex items-start justify-between gap-3 border-b border-gray-100 pb-4">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-budr-lavender">
            <Pill className="h-4 w-4 text-budr-purple" aria-hidden />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-gray-900">Medicin i dag</h2>
            <p className="text-sm text-gray-500">Udleveringer på tværs af beboere</p>
          </div>
        </div>
        <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-600">
          <Shield className="h-3 w-3" aria-hidden />
          FMK integration
        </span>
      </div>

      <div className="flex flex-col gap-3">
        {overdue.length > 0 && (
          <div>
            <div className="mb-3 flex items-start gap-2">
              <div className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-red-600 animate-pulse" aria-hidden />
              <div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <AlertTriangle className="h-4 w-4 shrink-0 text-red-600" aria-hidden />
                  <span className="text-sm font-semibold text-red-600">Forfaldne udleveringer</span>
                </div>
                <p className="mt-0.5 text-sm text-gray-500">Skal udleveres omgående</p>
              </div>
            </div>
            <ul className="flex flex-col gap-3">
              {overdue.map(item => {
                const given = !!item.givenAt;
                return (
                  <li
                    key={item.id}
                    className={`rounded-xl p-4 shadow-sm transition-all duration-200 border-l-4 ${
                      given
                        ? 'border border-green-200 border-l-green-400 bg-green-50'
                        : 'border border-gray-100 border-l-[#EF4444] bg-red-50/40'
                    }`}
                  >
                    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between sm:gap-4">
                      <div className="flex min-w-0 flex-1 gap-3">
                        <div
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white transition-all duration-200"
                          style={{ backgroundColor: '#7F77DD' }}
                        >
                          {item.initials}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p
                            className={`text-base font-semibold transition-all duration-200 ${
                              given ? 'text-gray-400 line-through' : 'text-gray-900'
                            }`}
                          >
                            {item.medicationName}
                          </p>
                          <p className="text-sm text-gray-500">{item.dose}</p>
                          <div
                            className={`mt-2 flex items-center gap-1.5 text-sm font-mono font-medium transition-all duration-200 ${
                              given ? 'text-gray-400' : 'text-red-500'
                            }`}
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
                        className={`w-full shrink-0 rounded-lg px-5 py-2.5 text-sm font-semibold shadow-sm transition-all duration-200 sm:w-auto ${
                          given
                            ? 'cursor-default bg-green-600 text-white'
                            : 'bg-budr-teal text-white enabled:hover:bg-teal-700'
                        }`}
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
            className={`rounded-xl border border-gray-100 bg-white p-4 shadow-sm transition-all duration-200 ${
              !overduePrimary ? 'border-l-4 border-l-budr-teal' : ''
            }`}
          >
            <div className="mb-3 flex items-center gap-2">
              <Clock className="h-4 w-4 shrink-0 text-budr-teal" aria-hidden />
              <span className="text-sm font-semibold text-gray-900">Kommende udleveringer</span>
            </div>
            <ul className="flex flex-col gap-0.5">
              {upcoming.map(row => (
                <li
                  key={row.id}
                  className="flex items-center gap-3 rounded-lg px-2 py-2.5 text-sm text-gray-700 transition-all duration-200 hover:bg-gray-50"
                >
                  <span className="shrink-0 rounded-full bg-budr-teal-light px-2.5 py-0.5 font-mono text-sm font-semibold text-budr-teal">
                    {formatTimeMono(row.scheduledAt)}
                  </span>
                  <div
                    className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold text-white"
                    style={{ backgroundColor: '#7F77DD' }}
                  >
                    {row.initials}
                  </div>
                  <span className="min-w-0 truncate">
                    <span className="font-medium text-gray-800">{row.medicationName}</span>
                    <span className="text-gray-500"> · {row.dose}</span>
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}

        {allClear && overdue.length === 0 && upcoming.length === 0 && (
          <div className="w-full rounded-xl border border-green-200 bg-green-50 p-4 shadow-sm transition-all duration-200">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 shrink-0 text-green-500" aria-hidden />
              <div className="min-w-0">
                <p className="font-semibold text-green-800">Alt medicin udleveret</p>
                {nextFuture ? (
                  <p className="mt-1 text-sm text-green-600">
                    Næste udlevering:{' '}
                    <span className="font-mono font-medium">{formatTimeMono(nextFuture.scheduledAt)}</span> ·{' '}
                    {nextFuture.initials} — {nextFuture.medicationName}
                  </p>
                ) : (
                  <p className="mt-1 text-sm text-green-600">
                    Alle planlagte udleveringer i vinduet er registreret.
                  </p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/*
        Supabase — care_medication_logs (wire later):

        1) Fetch today’s rows for the active facility:
           const { data } = await supabase
             .from('care_medication_logs')
             .select(
               `id, resident_id, medication_name, dose, scheduled_at, given_at,
                resident:residents!inner(full_name, initials)`
             )
             .gte('scheduled_at', startOfDayIso)
             .lte('scheduled_at', endOfDayIso)
             .in('facility_id', care_visible_facility_ids());

        2) Map to MedicationTask: scheduled_at/given_at → Date, split or read dose column.

        3) markGiven(id):
           await supabase.from('care_medication_logs').update({
             given_at: new Date().toISOString(),
             given_by_staff_id: staffId,
           }).eq('id', id);

        4) Realtime: supabase.channel('med-logs').on('postgres_changes',
           { event: '*', schema: 'public', table: 'care_medication_logs', filter: `facility_id=eq.${fid}` },
           () => refetch());

        5) RLS: policies use care_visible_facility_ids() (or session facility set) so staff only
           see/update logs for residents in authorized facilities.
      */}
    </section>
  );
}
