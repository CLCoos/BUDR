'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { CalendarClock, Plus, Trash2, Wallet } from 'lucide-react';
import type { DemoShift, DemoShiftType } from '@/lib/demoShiftPlan';
import {
  loadShifts,
  saveShifts,
  currentPayPeriod,
  shiftsInPeriod,
  formatKr,
  estimateGrossPay,
  DEMO_OPEN_SHIFTS,
} from '@/lib/demoShiftPlan';

function uid() {
  return `s-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function labelType(t: DemoShiftType): string {
  switch (t) {
    case 'dag':
      return 'Dag';
    case 'aften':
      return 'Aften';
    case 'nat':
      return 'Nat';
    case 'uddannelse':
      return 'Uddannelse';
    default:
      return 'Vagt';
  }
}

type VagtplanDemoClientProps = {
  /** Rodsti uden trailing slash, fx `/care-portal-demo/vagtplan` eller `/care-portal-vagtplan` */
  basePath?: string;
};

export default function VagtplanDemoClient({
  basePath = '/care-portal-demo/vagtplan',
}: VagtplanDemoClientProps) {
  const [shifts, setShifts] = useState<DemoShift[]>([]);
  const [mounted, setMounted] = useState(false);
  const [addDate, setAddDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [addType, setAddType] = useState<DemoShiftType>('dag');

  useEffect(() => {
    setShifts(loadShifts());
    setMounted(true);
  }, []);

  const period = useMemo(() => currentPayPeriod(), []);
  const inPeriod = useMemo(
    () => shiftsInPeriod(shifts, period.start, period.end),
    [shifts, period]
  );
  const pay = useMemo(() => estimateGrossPay(inPeriod), [inPeriod]);

  const update = useCallback((next: DemoShift[]) => {
    setShifts(next);
    saveShifts(next);
  }, []);

  const addShift = () => {
    const hours = addType === 'nat' ? 8 : addType === 'aften' ? 8 : 7.5;
    const row: DemoShift = {
      id: uid(),
      date: addDate,
      type: addType,
      start: addType === 'nat' ? '23:00' : addType === 'aften' ? '15:00' : '07:30',
      end: addType === 'nat' ? '07:00' : addType === 'aften' ? '23:00' : '15:00',
      hours,
      supplement: addType === 'aften' ? 'Aftentillæg' : addType === 'nat' ? 'Nattillæg' : undefined,
    };
    update([...shifts, row].sort((a, b) => a.date.localeCompare(b.date)));
  };

  const remove = (id: string) => update(shifts.filter((s) => s.id !== id));

  const nextOpenNight = useMemo(() => {
    const d = new Date();
    const add = (5 - d.getDay() + 7) % 7;
    d.setDate(d.getDate() + (add === 0 ? 7 : add));
    return d.toLocaleDateString('da-DK', { weekday: 'long', day: 'numeric', month: 'long' });
  }, []);

  const grouped = useMemo(() => {
    const m = new Map<string, DemoShift[]>();
    for (const s of shifts) {
      const arr = m.get(s.date) ?? [];
      arr.push(s);
      m.set(s.date, arr);
    }
    return [...m.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  }, [shifts]);

  if (!mounted) {
    return (
      <div className="p-6 text-sm" style={{ color: 'var(--cp-muted)' }}>
        Indlæser vagtplan…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-4xl p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p
            className="text-[11px] font-semibold uppercase tracking-wider"
            style={{ color: 'var(--cp-muted)' }}
          >
            Planlægning
          </p>
          <h1
            className="mt-1 flex items-center gap-2 text-xl font-semibold"
            style={{ fontFamily: "'DM Serif Display', serif", color: 'var(--cp-text)' }}
          >
            <CalendarClock size={22} style={{ color: 'var(--cp-green)' }} aria-hidden />
            Vagtplan
          </h1>
          <p className="mt-1 text-sm" style={{ color: 'var(--cp-muted)' }}>
            Demo-data gemmes i denne browser. Tilføj eller fjern vagter — lønberegningen opdateres
            på siden{' '}
            <Link
              href={`${basePath}/loen`}
              className="font-medium underline-offset-2 hover:underline"
              style={{ color: 'var(--cp-blue)' }}
            >
              Løn &amp; timer
            </Link>
            .
          </p>
        </div>
        <Link
          href={`${basePath}/loen`}
          className="inline-flex items-center gap-2 self-start rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors"
          style={{
            borderColor: 'var(--cp-border)',
            backgroundColor: 'var(--cp-bg2)',
            color: 'var(--cp-text)',
          }}
        >
          <Wallet size={16} style={{ color: 'var(--cp-green)' }} />
          Løn &amp; timer
        </Link>
      </div>

      <div
        className="mt-8 rounded-xl border p-4"
        style={{ borderColor: 'var(--cp-border)', backgroundColor: 'var(--cp-bg2)' }}
      >
        <h2 className="text-sm font-semibold" style={{ color: 'var(--cp-text)' }}>
          Tilføj vagt (demo)
        </h2>
        <div className="mt-3 flex flex-wrap items-end gap-3">
          <label className="flex flex-col gap-1 text-xs" style={{ color: 'var(--cp-muted)' }}>
            Dato
            <input
              type="date"
              value={addDate}
              onChange={(e) => setAddDate(e.target.value)}
              className="rounded-lg border px-3 py-2 text-sm"
              style={{
                borderColor: 'var(--cp-border)',
                backgroundColor: 'var(--cp-bg3)',
                color: 'var(--cp-text)',
              }}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs" style={{ color: 'var(--cp-muted)' }}>
            Type
            <select
              value={addType}
              onChange={(e) => setAddType(e.target.value as DemoShiftType)}
              className="rounded-lg border px-3 py-2 text-sm"
              style={{
                borderColor: 'var(--cp-border)',
                backgroundColor: 'var(--cp-bg3)',
                color: 'var(--cp-text)',
              }}
            >
              <option value="dag">Dag</option>
              <option value="aften">Aften</option>
              <option value="nat">Nat</option>
              <option value="uddannelse">Uddannelse</option>
            </select>
          </label>
          <button
            type="button"
            onClick={addShift}
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-white"
            style={{ background: 'linear-gradient(135deg, #2dd4a0, #0d9488)' }}
          >
            <Plus size={16} />
            Tilføj
          </button>
        </div>
      </div>

      <div
        className="mt-6 rounded-xl border p-4"
        style={{ borderColor: 'var(--cp-border)', backgroundColor: 'var(--cp-bg2)' }}
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold" style={{ color: 'var(--cp-text)' }}>
            Aktuel lønperiode
          </h2>
          <span className="text-xs" style={{ color: 'var(--cp-muted)' }}>
            {period.label}
          </span>
        </div>
        <p className="mt-2 text-sm" style={{ color: 'var(--cp-muted)' }}>
          Registrerede timer i perioden:{' '}
          <strong style={{ color: 'var(--cp-text)' }}>{pay.totalHours.toFixed(1)} t</strong> ·
          Brutto ca.{' '}
          <strong style={{ color: 'var(--cp-green)' }}>{formatKr(pay.estimatedGross)}</strong> (før
          skat, demo-beregning)
        </p>
      </div>

      <div
        className="mt-8 rounded-xl border p-4"
        style={{ borderColor: 'var(--cp-border)', backgroundColor: 'var(--cp-bg2)' }}
      >
        <h2 className="text-sm font-semibold" style={{ color: 'var(--cp-text)' }}>
          Ledige vagter (pool)
        </h2>
        <p className="mt-1 text-xs" style={{ color: 'var(--cp-muted)' }}>
          Eksempel på vagter der søges dækket — i live kan de matches med tilgængelighed.
        </p>
        <ul className="mt-3 space-y-2">
          {DEMO_OPEN_SHIFTS.map((o) => (
            <li
              key={o.id}
              className="rounded-lg border px-3 py-2.5 text-sm"
              style={{ borderColor: 'var(--cp-border)', backgroundColor: 'var(--cp-bg3)' }}
            >
              <div className="font-medium" style={{ color: 'var(--cp-text)' }}>
                {o.label} · {o.hours} t
              </div>
              <div className="text-xs" style={{ color: 'var(--cp-muted)' }}>
                {o.note}
              </div>
              {o.id === 'open-1' && (
                <div className="mt-1 text-xs" style={{ color: 'var(--cp-amber)' }}>
                  Foreslået dato: {nextOpenNight}
                </div>
              )}
            </li>
          ))}
        </ul>
      </div>

      <div className="mt-8">
        <h2 className="text-sm font-semibold" style={{ color: 'var(--cp-text)' }}>
          Kalenderoversigt
        </h2>
        <div className="mt-3 space-y-2">
          {grouped.length === 0 && (
            <p className="text-sm" style={{ color: 'var(--cp-muted)' }}>
              Ingen vagter — tilføj ovenfor.
            </p>
          )}
          {grouped.map(([date, list]) => (
            <div
              key={date}
              className="rounded-lg border"
              style={{ borderColor: 'var(--cp-border)', backgroundColor: 'var(--cp-bg2)' }}
            >
              <div
                className="border-b px-3 py-2 text-xs font-semibold uppercase tracking-wide"
                style={{ borderColor: 'var(--cp-border)', color: 'var(--cp-muted)' }}
              >
                {new Date(date + 'T12:00:00').toLocaleDateString('da-DK', {
                  weekday: 'long',
                  day: 'numeric',
                  month: 'long',
                })}
              </div>
              <ul className="divide-y" style={{ borderColor: 'var(--cp-border)' }}>
                {list.map((s) => (
                  <li key={s.id} className="flex items-center gap-3 px-3 py-2.5">
                    <div className="min-w-0 flex-1">
                      <div className="text-sm font-medium" style={{ color: 'var(--cp-text)' }}>
                        {labelType(s.type)} · {s.start}–{s.end}
                      </div>
                      <div className="text-xs" style={{ color: 'var(--cp-muted)' }}>
                        {s.hours} t{s.supplement ? ` · ${s.supplement}` : ''}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => remove(s.id)}
                      className="rounded-lg p-2 transition-colors"
                      style={{ color: 'var(--cp-red)' }}
                      aria-label="Fjern vagt"
                    >
                      <Trash2 size={16} />
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
