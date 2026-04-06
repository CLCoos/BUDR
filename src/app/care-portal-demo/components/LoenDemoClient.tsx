'use client';

import React, { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Palmtree, PiggyBank, Clock } from 'lucide-react';
import type { DemoShift, DemoVacationDay } from '@/lib/demoShiftPlan';
import {
  loadShifts,
  loadVacation,
  currentPayPeriod,
  shiftsInPeriod,
  estimateGrossPay,
  formatKr,
} from '@/lib/demoShiftPlan';

export default function LoenDemoClient() {
  const [shifts, setShifts] = useState<DemoShift[]>([]);
  const [vacation, setVacation] = useState<DemoVacationDay[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setShifts(loadShifts());
    setVacation(loadVacation());
    setMounted(true);
    const t = window.setInterval(() => {
      setShifts(loadShifts());
      setVacation(loadVacation());
    }, 800);
    return () => window.clearInterval(t);
  }, []);

  const period = useMemo(() => currentPayPeriod(), []);
  const inPeriod = useMemo(
    () => shiftsInPeriod(shifts, period.start, period.end),
    [shifts, period]
  );
  const pay = useMemo(() => estimateGrossPay(inPeriod), [inPeriod]);

  if (!mounted) {
    return (
      <div className="p-6 text-sm" style={{ color: 'var(--cp-muted)' }}>
        Indlæser…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl p-6">
      <Link
        href="/care-portal-demo/vagtplan"
        className="text-xs font-medium hover:underline"
        style={{ color: 'var(--cp-blue)' }}
      >
        ← Tilbage til vagtplan
      </Link>
      <h1
        className="mt-4 text-xl font-semibold"
        style={{ fontFamily: "'DM Serif Display', serif", color: 'var(--cp-text)' }}
      >
        Løn &amp; timer
      </h1>
      <p className="mt-1 text-sm" style={{ color: 'var(--cp-muted)' }}>
        Overblik for <strong style={{ color: 'var(--cp-text)' }}>Sara K.</strong> · {period.label}
      </p>

      <div
        className="mt-8 grid gap-4"
        style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }}
      >
        <div
          className="rounded-xl border p-4"
          style={{ borderColor: 'var(--cp-border)', backgroundColor: 'var(--cp-bg2)' }}
        >
          <Clock className="mb-2 h-5 w-5" style={{ color: 'var(--cp-green)' }} />
          <div
            className="text-xs font-medium uppercase tracking-wide"
            style={{ color: 'var(--cp-muted)' }}
          >
            Timer (periode)
          </div>
          <div
            className="mt-1 text-2xl font-semibold tabular-nums"
            style={{ color: 'var(--cp-text)' }}
          >
            {pay.totalHours.toFixed(1)} t
          </div>
        </div>
        <div
          className="rounded-xl border p-4"
          style={{ borderColor: 'var(--cp-border)', backgroundColor: 'var(--cp-bg2)' }}
        >
          <PiggyBank className="mb-2 h-5 w-5" style={{ color: 'var(--cp-amber)' }} />
          <div
            className="text-xs font-medium uppercase tracking-wide"
            style={{ color: 'var(--cp-muted)' }}
          >
            Forventet brutto (næste løn)
          </div>
          <div
            className="mt-1 text-2xl font-semibold tabular-nums"
            style={{ color: 'var(--cp-green)' }}
          >
            {formatKr(pay.estimatedGross)}
          </div>
          <p className="mt-2 text-[11px] leading-snug" style={{ color: 'var(--cp-muted2)' }}>
            Grundløn + aft/nat-tillæg + weekendpulje (demo-satser). Ikke fradrag eller feriepenge.
          </p>
        </div>
        <div
          className="rounded-xl border p-4"
          style={{ borderColor: 'var(--cp-border)', backgroundColor: 'var(--cp-bg2)' }}
        >
          <Palmtree className="mb-2 h-5 w-5" style={{ color: 'var(--cp-blue)' }} />
          <div
            className="text-xs font-medium uppercase tracking-wide"
            style={{ color: 'var(--cp-muted)' }}
          >
            Ferie / fravær
          </div>
          <ul className="mt-2 space-y-1 text-sm" style={{ color: 'var(--cp-text)' }}>
            {vacation.map((v) => (
              <li key={v.id}>
                {new Date(v.date + 'T12:00:00').toLocaleDateString('da-DK')} · {v.label}{' '}
                <span className="text-xs" style={{ color: 'var(--cp-muted)' }}>
                  ({v.status})
                </span>
              </li>
            ))}
            {vacation.length === 0 && (
              <li style={{ color: 'var(--cp-muted)' }}>Ingen registreringer i demo.</li>
            )}
          </ul>
        </div>
      </div>

      <div
        className="mt-8 rounded-xl border p-4"
        style={{ borderColor: 'var(--cp-border)', backgroundColor: 'var(--cp-bg2)' }}
      >
        <h2 className="text-sm font-semibold" style={{ color: 'var(--cp-text)' }}>
          Fordeling (demo)
        </h2>
        <dl className="mt-3 space-y-2 text-sm">
          <div className="flex justify-between" style={{ color: 'var(--cp-muted)' }}>
            <dt>Grundlag (timer × sats)</dt>
            <dd className="tabular-nums" style={{ color: 'var(--cp-text)' }}>
              {formatKr(Math.round(pay.base))}
            </dd>
          </div>
          <div className="flex justify-between" style={{ color: 'var(--cp-muted)' }}>
            <dt>Tillæg (aften/nat)</dt>
            <dd className="tabular-nums" style={{ color: 'var(--cp-text)' }}>
              {formatKr(Math.round(pay.supplements))}
            </dd>
          </div>
          <div className="flex justify-between" style={{ color: 'var(--cp-muted)' }}>
            <dt>Weekendpulje (skøn)</dt>
            <dd className="tabular-nums" style={{ color: 'var(--cp-text)' }}>
              {formatKr(Math.round(pay.weekend))}
            </dd>
          </div>
        </dl>
      </div>
    </div>
  );
}
