'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Palmtree, PiggyBank, Clock } from 'lucide-react';
import type { DemoShift, DemoVacationDay } from '@/lib/demoShiftPlan';
import {
  DEMO_SHIFTS_UPDATED_EVENT,
  loadShifts,
  loadVacation,
  estimateGrossPay,
  formatKr,
} from '@/lib/demoShiftPlan';
import { createClient } from '@/lib/supabase/client';
import { resolveStaffOrgResidents } from '@/lib/staffOrgScope';
import {
  addDaysYmd,
  currentPayPeriodBounds,
  parseStaffShiftRow,
  shiftsInYmdRange,
  type StaffShiftRow,
} from '@/lib/staffShifts';
import { copenhagenYmd } from '@/lib/copenhagenDay';

type LoenDemoClientProps = {
  basePath?: string;
  /** Demo-ruter: localStorage + «Lars N.». Live skal sende false. */
  demoMode?: boolean;
};

function liveRowsToDemoShifts(rows: StaffShiftRow[]): DemoShift[] {
  return rows.map((r) => ({
    id: r.id,
    date: r.shift_date,
    type: r.shift_type,
    start: r.start_time,
    end: r.end_time,
    hours: Number(r.hours),
  }));
}

export default function LoenDemoClient({
  basePath = '/care-portal-demo/vagtplan',
  demoMode = true,
}: LoenDemoClientProps) {
  const [shifts, setShifts] = useState<DemoShift[]>([]);
  const [vacation, setVacation] = useState<DemoVacationDay[]>([]);
  const [staffName, setStaffName] = useState(demoMode ? 'Lars N.' : '');
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(!demoMode);
  const [scopeError, setScopeError] = useState<string | null>(null);

  const loadLive = useCallback(async () => {
    const supabase = createClient();
    if (!supabase) {
      setScopeError('Kunne ikke oprette forbindelse');
      setShifts([]);
      setStaffName('');
      setLoading(false);
      return;
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { orgId, error: orgErr } = await resolveStaffOrgResidents(supabase);
    if (!user || orgErr || !orgId) {
      setScopeError(
        orgErr === 'no_session' || !user
          ? 'Log ind for at se løn og timer'
          : 'Ingen organisation tilknyttet din bruger'
      );
      setShifts([]);
      setStaffName('');
      setLoading(false);
      return;
    }

    const today = copenhagenYmd();
    const from = addDaysYmd(today, -62);
    const to = addDaysYmd(today, 31);
    const [{ data: staffRow, error: staffErr }, { data: shiftRows, error: shiftErr }] =
      await Promise.all([
        supabase.from('care_staff').select('full_name').eq('id', user.id).maybeSingle(),
        supabase
          .from('care_staff_shifts')
          .select(
            'id, org_id, staff_id, shift_date, shift_type, start_time, end_time, hours, location'
          )
          .eq('org_id', orgId)
          .eq('staff_id', user.id)
          .gte('shift_date', from)
          .lte('shift_date', to),
      ]);

    if (staffErr || shiftErr) {
      setScopeError(staffErr?.message ?? shiftErr?.message ?? 'Kunne ikke hente vagter');
      setShifts([]);
      setLoading(false);
      return;
    }

    const parsed = (shiftRows ?? [])
      .map((r) => parseStaffShiftRow(r as Record<string, unknown>))
      .filter((r): r is StaffShiftRow => r !== null);
    const name = ((staffRow as { full_name?: string | null } | null)?.full_name ?? '').trim();
    setStaffName(name || 'Medarbejder');
    setShifts(liveRowsToDemoShifts(parsed));
    setVacation([]);
    setScopeError(null);
    setLoading(false);
  }, []);

  useEffect(() => {
    if (demoMode) {
      const refresh = () => {
        setShifts(loadShifts());
        setVacation(loadVacation());
        setStaffName('Lars N.');
      };
      refresh();
      setMounted(true);
      setLoading(false);
      window.addEventListener(DEMO_SHIFTS_UPDATED_EVENT, refresh);
      return () => window.removeEventListener(DEMO_SHIFTS_UPDATED_EVENT, refresh);
    }
    setMounted(true);
    void loadLive();
    return undefined;
  }, [demoMode, loadLive]);

  const period = useMemo(() => currentPayPeriodBounds(), []);
  const inPeriod = useMemo(
    () => shiftsInYmdRange(shifts, period.startYmd, period.endYmd),
    [shifts, period]
  );
  const pay = useMemo(() => estimateGrossPay(inPeriod), [inPeriod]);

  if (!mounted || loading) {
    return (
      <div className="p-6 text-sm" style={{ color: 'var(--cp-muted)' }}>
        Indlæser…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl p-6">
      <Link
        href={basePath}
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
        Overblik for{' '}
        <strong style={{ color: 'var(--cp-text)' }}>
          {demoMode ? 'Lars N.' : staffName || 'dig'}
        </strong>{' '}
        · {period.label}
        {demoMode ? ' (demo)' : ''}
      </p>
      {scopeError && !demoMode ? (
        <p className="mt-2 text-sm" style={{ color: 'var(--cp-red)' }}>
          {scopeError}
        </p>
      ) : null}

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
            {demoMode
              ? 'Grundløn + aft/nat-tillæg + weekendpulje (demo-satser). Ikke fradrag eller feriepenge.'
              : 'Skøn ud fra registrerede vagter (samme tillægssatser som i overblikket). Ikke fradrag eller feriepenge.'}
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
              <li style={{ color: 'var(--cp-muted)' }}>
                {demoMode ? 'Ingen registreringer i demo.' : 'Ingen ferie registreret.'}
              </li>
            )}
          </ul>
        </div>
      </div>

      <div
        className="mt-8 rounded-xl border p-4"
        style={{ borderColor: 'var(--cp-border)', backgroundColor: 'var(--cp-bg2)' }}
      >
        <h2 className="text-sm font-semibold" style={{ color: 'var(--cp-text)' }}>
          Fordeling {demoMode ? '(demo)' : '(skøn)'}
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
