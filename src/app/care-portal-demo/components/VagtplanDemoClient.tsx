'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Clock,
  Clock3,
  MapPin,
  Users,
  Wallet,
} from 'lucide-react';
import { toast } from 'sonner';
import type { DemoShift, DemoShiftType } from '@/lib/demoShiftPlan';
import { estimateGrossPay, formatKr, loadShifts, saveShifts } from '@/lib/demoShiftPlan';
import { copenhagenYmd } from '@/lib/copenhagenDay';
import { createClient } from '@/lib/supabase/client';
import { resolveStaffOrgResidents } from '@/lib/staffOrgScope';
import {
  SHIFT_META,
  addDaysYmd,
  buildRosterSlots,
  buildStaffShiftInsertRow,
  canClaimRosterSlot,
  currentPayPeriodBounds,
  hoursInYmdRange,
  mondayOfCopenhagenWeek,
  myUpcomingShifts,
  openSlotsOnRoster,
  parseStaffShiftRow,
  shiftsInYmdRange,
  type RosterSlot,
  type ShiftType,
  type StaffShiftRow,
} from '@/lib/staffShifts';

type VagtplanDemoClientProps = {
  basePath?: string;
  /** Demo-ruter: localStorage + hashed kolleger. Live skal sende false. */
  demoMode?: boolean;
};

function labelType(t: DemoShiftType | ShiftType): string {
  if (t === 'dag') return 'Dag';
  if (t === 'aften') return 'Aften';
  if (t === 'nat') return 'Nat';
  if (t === 'uddannelse') return 'Uddannelse';
  return 'Vagt';
}

function vagtAccent(type: ShiftType): string {
  if (type === 'nat') return 'var(--cp-blue)';
  if (type === 'aften') return 'var(--cp-amber)';
  return 'var(--cp-green)';
}

function bemandingStatus(open: number): { color: string; bg: string } {
  if (open === 0) return { color: 'var(--cp-green)', bg: 'var(--cp-green-dim)' };
  if (open <= 2) return { color: 'var(--cp-amber)', bg: 'var(--cp-amber-dim)' };
  return { color: 'var(--cp-red)', bg: 'var(--cp-red-dim)' };
}

function demoShiftsToRows(shifts: DemoShift[]): StaffShiftRow[] {
  return shifts
    .filter(
      (s): s is DemoShift & { type: ShiftType } =>
        s.type === 'dag' || s.type === 'aften' || s.type === 'nat'
    )
    .map((s) => ({
      id: s.id,
      org_id: '00000000-0000-4000-8000-000000000000',
      staff_id: 'demo-self',
      shift_date: s.date,
      shift_type: s.type,
      start_time: s.start,
      end_time: s.end,
      hours: s.hours,
      location: SHIFT_META[s.type].location,
    }));
}

function liveRowsToDemoShifts(rows: StaffShiftRow[], myStaffId: string): DemoShift[] {
  return rows
    .filter((r) => r.staff_id === myStaffId)
    .map((r) => ({
      id: r.id,
      date: r.shift_date,
      type: r.shift_type,
      start: r.start_time,
      end: r.end_time,
      hours: Number(r.hours),
    }));
}

const miniStatCard: React.CSSProperties = {
  background: 'var(--cp-bg2)',
  border: '1px solid var(--cp-border)',
  borderRadius: '12px',
  padding: '14px 20px',
  display: 'flex',
  alignItems: 'center',
  gap: '14px',
  boxShadow: 'var(--cp-card-shadow)',
};

const statLabel: React.CSSProperties = {
  fontSize: '0.7rem',
  color: 'var(--cp-muted)',
  textTransform: 'uppercase',
  letterSpacing: '0.06em',
};

export default function VagtplanDemoClient({
  basePath = '/care-portal-demo/vagtplan',
  demoMode = true,
}: VagtplanDemoClientProps) {
  const today = copenhagenYmd();
  const [shifts, setShifts] = useState<DemoShift[]>([]);
  const [liveRows, setLiveRows] = useState<StaffShiftRow[]>([]);
  const [staffNameById, setStaffNameById] = useState<Map<string, string>>(new Map());
  const [staffId, setStaffId] = useState<string | null>(demoMode ? 'demo-self' : null);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [allowedStaffIds, setAllowedStaffIds] = useState<string[]>([]);
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(!demoMode);
  const [scopeError, setScopeError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState(today);
  const [selectedSlot, setSelectedSlot] = useState<RosterSlot | null>(null);
  const [requesting, setRequesting] = useState<string | null>(null);

  const loadLive = useCallback(async () => {
    const supabase = createClient();
    if (!supabase) {
      setScopeError('Kunne ikke oprette forbindelse');
      setLiveRows([]);
      setShifts([]);
      setOrgId(null);
      setStaffId(null);
      setLoading(false);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    const { orgId: resolvedOrg, error: orgErr } = await resolveStaffOrgResidents(supabase);
    if (!user || orgErr || !resolvedOrg) {
      setScopeError(
        orgErr === 'no_session' || !user
          ? 'Log ind for at se vagtplanen'
          : 'Ingen organisation tilknyttet din bruger'
      );
      setLiveRows([]);
      setShifts([]);
      setOrgId(null);
      setStaffId(null);
      setLoading(false);
      return;
    }

    const from = addDaysYmd(today, -14);
    const to = addDaysYmd(today, 28);
    const [{ data: staffRows, error: staffErr }, { data: shiftRows, error: shiftErr }] =
      await Promise.all([
        supabase
          .from('care_staff')
          .select('id, full_name')
          .eq('org_id', resolvedOrg)
          .order('full_name'),
        supabase
          .from('care_staff_shifts')
          .select(
            'id, org_id, staff_id, shift_date, shift_type, start_time, end_time, hours, location'
          )
          .eq('org_id', resolvedOrg)
          .gte('shift_date', from)
          .lte('shift_date', to),
      ]);

    if (staffErr || shiftErr) {
      setScopeError(staffErr?.message ?? shiftErr?.message ?? 'Kunne ikke hente vagtplan');
      setLiveRows([]);
      setShifts([]);
      setOrgId(resolvedOrg);
      setStaffId(user.id);
      setLoading(false);
      return;
    }

    const names = new Map<string, string>();
    const ids: string[] = [];
    for (const row of staffRows ?? []) {
      const r = row as { id: string; full_name: string | null };
      if (!r.id) continue;
      ids.push(r.id);
      names.set(r.id, (r.full_name ?? '').trim() || 'Medarbejder');
    }
    const parsed = (shiftRows ?? [])
      .map((r) => parseStaffShiftRow(r as Record<string, unknown>))
      .filter((r): r is StaffShiftRow => r !== null);

    setOrgId(resolvedOrg);
    setStaffId(user.id);
    setAllowedStaffIds(ids);
    setStaffNameById(names);
    setLiveRows(parsed);
    setShifts(liveRowsToDemoShifts(parsed, user.id));
    setScopeError(null);
    setLoading(false);
  }, [today]);

  useEffect(() => {
    if (demoMode) {
      setShifts(loadShifts());
      setStaffId('demo-self');
      setMounted(true);
      setLoading(false);
      return;
    }
    setMounted(true);
    void loadLive();
  }, [demoMode, loadLive]);

  const period = useMemo(() => currentPayPeriodBounds(), []);
  const inPeriod = useMemo(
    () => shiftsInYmdRange(shifts, period.startYmd, period.endYmd),
    [period, shifts]
  );
  const pay = useMemo(() => estimateGrossPay(inPeriod), [inPeriod]);

  const days = useMemo(
    () => Array.from({ length: 14 }, (_, i) => addDaysYmd(selectedDate, i - 6)),
    [selectedDate]
  );

  const rosterRows = useMemo(
    () => (demoMode ? demoShiftsToRows(shifts) : liveRows),
    [demoMode, shifts, liveRows]
  );

  const slotsByDate = useMemo(
    () =>
      buildRosterSlots({
        dates: days,
        rows: rosterRows,
        staffNameById,
        myStaffId: staffId,
        fillSimulatedTeam: demoMode,
      }),
    [days, rosterRows, staffNameById, staffId, demoMode]
  );

  const myUpcoming = useMemo(() => {
    if (demoMode) {
      return shifts
        .filter((s) => s.type === 'dag' || s.type === 'aften' || s.type === 'nat')
        .filter((s) => s.date >= today)
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(0, 6);
    }
    if (!staffId) return [];
    return myUpcomingShifts(liveRows, staffId, today)
      .slice(0, 6)
      .map((r) => ({
        id: r.id,
        date: r.shift_date,
        type: r.shift_type,
        start: r.start_time,
        end: r.end_time,
        hours: Number(r.hours),
      }));
  }, [demoMode, shifts, liveRows, staffId, today]);

  const weekHours = useMemo(() => {
    const weekStart = mondayOfCopenhagenWeek();
    const weekEnd = addDaysYmd(weekStart, 6);
    if (demoMode) {
      return shifts
        .filter((s) => s.date >= weekStart && s.date <= weekEnd)
        .reduce((acc, s) => acc + (s.hours ?? 0), 0);
    }
    if (!staffId) return 0;
    return hoursInYmdRange(liveRows, staffId, weekStart, weekEnd);
  }, [demoMode, shifts, liveRows, staffId]);

  const todayOpenSlots = useMemo(() => {
    const todaySlots = slotsByDate.get(today) ?? [];
    return todaySlots.reduce((acc, s) => acc + openSlotsOnRoster(s), 0);
  }, [slotsByDate, today]);

  const selectedSlots = slotsByDate.get(selectedDate) ?? [];

  const claimShift = async (slot: RosterSlot) => {
    if (demoMode) {
      setRequesting(slot.id);
      const next: DemoShift = {
        id: `s-${slot.date}-${slot.type}`,
        date: slot.date,
        type: slot.type,
        start: slot.start,
        end: slot.end,
        hours: slot.hours,
        supplement:
          slot.type === 'aften' ? 'Aftentillæg' : slot.type === 'nat' ? 'Nattillæg' : undefined,
      };
      const merged = [
        ...shifts.filter((s) => !(s.date === slot.date && s.type === slot.type)),
        next,
      ];
      saveShifts(merged);
      setShifts(merged);
      await new Promise((r) => setTimeout(r, 400));
      setRequesting(null);
      setSelectedSlot(null);
      toast.success('Gemt i demo (kun denne browser)');
      return;
    }

    if (!canClaimRosterSlot(slot)) {
      toast.error(slot.mine ? 'Du er allerede på denne vagt' : 'Vagten er fuld');
      return;
    }
    if (!orgId || !staffId) {
      toast.error('Ingen organisation');
      return;
    }
    const built = buildStaffShiftInsertRow({
      orgId,
      staffId,
      shiftDateYmd: slot.date,
      shiftType: slot.type,
      allowedStaffIds,
    });
    if ('error' in built) {
      toast.error(built.error);
      return;
    }
    const supabase = createClient();
    if (!supabase) {
      toast.error('Kunne ikke oprette forbindelse');
      return;
    }
    setRequesting(slot.id);
    const { error } = await supabase.from('care_staff_shifts').insert(built);
    setRequesting(null);
    if (error) {
      toast.error(error.message || 'Kunne ikke tilmelde vagt');
      return;
    }
    toast.success('Vagt gemt — synlig for kolleger i Care Portal');
    setSelectedSlot(null);
    await loadLive();
  };

  const dropShift = async (slot: RosterSlot) => {
    if (demoMode) {
      const next = shifts.filter((s) => !(s.date === slot.date && s.type === slot.type));
      saveShifts(next);
      setShifts(next);
      setSelectedSlot(null);
      toast.success('Frameldt i demo');
      return;
    }
    if (!slot.myAssignmentId) {
      toast.error('Ingen vagt at framelde');
      return;
    }
    const supabase = createClient();
    if (!supabase) {
      toast.error('Kunne ikke oprette forbindelse');
      return;
    }
    setRequesting(slot.id);
    const { error } = await supabase
      .from('care_staff_shifts')
      .delete()
      .eq('id', slot.myAssignmentId);
    setRequesting(null);
    if (error) {
      toast.error(error.message || 'Kunne ikke framelde vagt');
      return;
    }
    toast.success('Vagt frameldt');
    setSelectedSlot(null);
    await loadLive();
  };

  if (!mounted || loading) {
    return (
      <div className="p-6 text-sm" style={{ color: 'var(--cp-muted)' }}>
        Indlæser vagtplan…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl p-6">
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
            {demoMode
              ? 'Simuleret oversigt over egne vagter, bemanding og ledige vagter (kun denne browser). Lønoverblik findes på '
              : 'Org-vagtplan. Anmod om vagt gemmes i Care Portal og vises for kolleger. Lønoverblik på '}
            <Link
              href={`${basePath}/loen`}
              className="font-medium underline-offset-2 hover:underline"
              style={{ color: 'var(--cp-blue)' }}
            >
              Løn &amp; timer
            </Link>
            .
          </p>
          {scopeError && !demoMode ? (
            <p className="mt-2 text-sm" style={{ color: 'var(--cp-red)' }}>
              {scopeError}
            </p>
          ) : null}
        </div>
        <Link
          href={`${basePath}/loen`}
          className="inline-flex items-center gap-2 self-start rounded-xl border px-4 py-2.5 text-sm font-medium"
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

      <div style={{ display: 'flex', gap: '12px', margin: '24px 0', flexWrap: 'wrap' }}>
        <div style={miniStatCard}>
          <Clock size={20} strokeWidth={1.5} style={{ color: 'var(--cp-muted)' }} />
          <div>
            <div
              style={{
                fontSize: '1.6rem',
                fontWeight: 300,
                color: 'var(--cp-text)',
                lineHeight: 1,
              }}
            >
              {weekHours}
            </div>
            <div style={statLabel}>Timer denne uge</div>
          </div>
        </div>
        <div style={miniStatCard}>
          <Users size={20} strokeWidth={1.5} style={{ color: 'var(--cp-blue)' }} />
          <div>
            <div
              style={{
                fontSize: '1.6rem',
                fontWeight: 300,
                color: 'var(--cp-blue)',
                lineHeight: 1,
              }}
            >
              {myUpcoming.length}
            </div>
            <div style={statLabel}>Kommende vagter</div>
          </div>
        </div>
        <div style={miniStatCard}>
          <AlertTriangle size={20} strokeWidth={1.5} style={{ color: 'var(--cp-amber)' }} />
          <div>
            <div
              style={{
                fontSize: '1.6rem',
                fontWeight: 300,
                color: 'var(--cp-amber)',
                lineHeight: 1,
              }}
            >
              {todayOpenSlots}
            </div>
            <div style={statLabel}>Ledige vagter i dag</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.2fr_1fr]">
        <section
          className="rounded-xl border p-4"
          style={{ borderColor: 'var(--cp-border)', backgroundColor: 'var(--cp-bg2)' }}
        >
          <h2 className="text-sm font-semibold" style={{ color: 'var(--cp-text)' }}>
            Mine vagter (kommende)
          </h2>
          {myUpcoming.length === 0 ? (
            <p className="mt-3 text-sm" style={{ color: 'var(--cp-muted)' }}>
              {demoMode
                ? 'Ingen kommende vagter i demo.'
                : 'Ingen kommende vagter. Åbn en ledig vagt og vælg Anmod om vagt.'}
            </p>
          ) : (
            <ul className="mt-3 space-y-2">
              {myUpcoming.map((s) => {
                const accent = vagtAccent(s.type as ShiftType);
                return (
                  <li
                    key={s.id}
                    className="rounded-lg"
                    style={{
                      backgroundColor: 'var(--cp-bg3)',
                      border: '1px solid var(--cp-border)',
                      borderLeftWidth: '3px',
                      borderLeftColor: accent,
                      borderRadius: '8px',
                      padding: '12px 16px',
                    }}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold" style={{ color: 'var(--cp-text)' }}>
                        {new Date(`${s.date}T12:00:00`).toLocaleDateString('da-DK', {
                          weekday: 'short',
                          day: 'numeric',
                          month: 'short',
                        })}{' '}
                        · {labelType(s.type)}
                      </p>
                      <span className="text-xs" style={{ color: 'var(--cp-muted)' }}>
                        {s.hours} t
                      </span>
                    </div>
                    <p className="mt-0.5 text-xs" style={{ color: 'var(--cp-muted)' }}>
                      {s.start}–{s.end} · {SHIFT_META[s.type as ShiftType]?.location ?? 'Bosted'}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <section
          className="rounded-xl border p-4"
          style={{ borderColor: 'var(--cp-border)', backgroundColor: 'var(--cp-bg2)' }}
        >
          <h2 className="text-sm font-semibold" style={{ color: 'var(--cp-text)' }}>
            Dagens bemanding
          </h2>
          <div className="mt-3 space-y-2">
            {(slotsByDate.get(today) ?? []).map((slot) => {
              const open = openSlotsOnRoster(slot);
              const status = bemandingStatus(open);
              const statusTekst = open ? `${open} ledig(e) vagt(er)` : 'Fuld bemanding';
              const accent = vagtAccent(slot.type);
              return (
                <div
                  key={slot.id}
                  className="rounded-lg text-sm"
                  style={{
                    backgroundColor: 'var(--cp-bg3)',
                    border: '1px solid var(--cp-border)',
                    borderLeftWidth: '3px',
                    borderLeftColor: accent,
                    borderRadius: '8px',
                    padding: '12px 16px',
                  }}
                >
                  <p className="font-medium" style={{ color: 'var(--cp-text)' }}>
                    {labelType(slot.type)} · {slot.start}–{slot.end}
                  </p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-xs">
                    <span
                      style={{
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: status.color,
                        display: 'inline-block',
                        flexShrink: 0,
                      }}
                    />
                    <span style={{ color: status.color, fontWeight: 500, fontSize: '0.8rem' }}>
                      {statusTekst}
                    </span>
                  </p>
                </div>
              );
            })}
          </div>
        </section>
      </div>

      <div className="mt-8">
        <h2 className="text-sm font-semibold" style={{ color: 'var(--cp-text)' }}>
          Kalender (forrige/fremtidige vagter)
        </h2>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-7">
          {days.map((d) => {
            const slots = slotsByDate.get(d) ?? [];
            const open = slots.reduce((acc, s) => acc + openSlotsOnRoster(s), 0);
            const mine = slots.some((s) => s.mine);
            const active = d === selectedDate;
            const isToday = d === today;
            return (
              <button
                key={d}
                type="button"
                onClick={() => setSelectedDate(d)}
                className="text-left"
                style={{
                  background: active || isToday ? 'var(--cp-green-dim)' : 'var(--cp-bg2)',
                  border:
                    active || isToday ? '1px solid var(--cp-green)' : '1px solid var(--cp-border)',
                  borderRadius: '8px',
                  padding: '10px 12px',
                  cursor: 'pointer',
                  transition: 'border-color 0.15s',
                }}
              >
                <p
                  style={{
                    fontSize: '0.65rem',
                    fontWeight: 700,
                    letterSpacing: '0.08em',
                    color: 'var(--cp-muted)',
                    textTransform: 'uppercase',
                    marginBottom: '4px',
                  }}
                >
                  {new Date(`${d}T12:00:00`).toLocaleDateString('da-DK', { weekday: 'short' })}
                </p>
                <p
                  style={{
                    fontSize: '1.1rem',
                    fontWeight: 300,
                    color: 'var(--cp-text)',
                    lineHeight: 1,
                  }}
                >
                  {new Date(`${d}T12:00:00`).toLocaleDateString('da-DK', {
                    day: '2-digit',
                    month: '2-digit',
                  })}
                </p>
                <p
                  className="mt-1"
                  style={{
                    color: open ? 'var(--cp-amber)' : 'var(--cp-green)',
                    fontSize: '0.75rem',
                  }}
                >
                  {open ? `${open} ledig` : 'Fuld'}
                </p>
                {mine && <p style={{ color: 'var(--cp-blue)', fontSize: '0.75rem' }}>Min vagt</p>}
              </button>
            );
          })}
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
          <strong style={{ color: 'var(--cp-green)' }}>{formatKr(pay.estimatedGross)}</strong>
          {demoMode ? ' (demo-satser)' : ' (skøn ud fra registrerede vagter)'}
        </p>
      </div>

      <div
        className="mt-8 rounded-xl border p-4"
        style={{ borderColor: 'var(--cp-border)', backgroundColor: 'var(--cp-bg2)' }}
      >
        <h2 className="text-sm font-semibold" style={{ color: 'var(--cp-text)' }}>
          {new Date(`${selectedDate}T12:00:00`).toLocaleDateString('da-DK', {
            weekday: 'long',
            day: 'numeric',
            month: 'long',
          })}{' '}
          · vagter i tidsrum
        </h2>
        <p className="mt-1 text-xs" style={{ color: 'var(--cp-muted)' }}>
          Klik på en vagt for detaljer og evt. anmod om ledig vagt.
        </p>
        <ul className="mt-3 space-y-2">
          {selectedSlots.map((slot) => {
            const open = openSlotsOnRoster(slot);
            const accent = vagtAccent(slot.type);
            return (
              <li
                key={slot.id}
                className="text-sm"
                style={{
                  backgroundColor: 'var(--cp-bg3)',
                  border: '1px solid var(--cp-border)',
                  borderLeftWidth: '3px',
                  borderLeftColor: accent,
                  borderRadius: '8px',
                  padding: '12px 16px',
                }}
              >
                <button
                  type="button"
                  onClick={() => setSelectedSlot(slot)}
                  className="w-full text-left"
                >
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="font-medium" style={{ color: 'var(--cp-text)' }}>
                        {labelType(slot.type)} · {slot.start}–{slot.end}
                      </div>
                      <div className="text-xs" style={{ color: 'var(--cp-muted)' }}>
                        {slot.location} · {slot.hours} timer
                        {slot.mine ? ' · din vagt' : ''}
                      </div>
                    </div>
                    <div
                      className="text-xs"
                      style={{ color: open ? 'var(--cp-amber)' : 'var(--cp-green)' }}
                    >
                      {open ? `${open} ledig` : 'Fuld bemanding'}
                    </div>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      </div>

      {selectedSlot && (
        <div
          className="fixed inset-0 z-[120] flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={(e) => e.target === e.currentTarget && setSelectedSlot(null)}
        >
          <div
            className="w-full max-w-lg rounded-xl border p-5"
            style={{ borderColor: 'var(--cp-border)', backgroundColor: 'var(--cp-bg2)' }}
          >
            <div
              style={{
                borderLeft: `4px solid ${vagtAccent(selectedSlot.type)}`,
                paddingLeft: '12px',
                marginBottom: '16px',
              }}
            >
              <h3 className="text-base font-semibold" style={{ color: 'var(--cp-text)' }}>
                {labelType(selectedSlot.type)} · {selectedSlot.start}–{selectedSlot.end}
              </h3>
            </div>
            <div className="space-y-2 text-sm">
              <p className="flex items-center gap-2" style={{ color: 'var(--cp-muted)' }}>
                <MapPin size={14} /> {selectedSlot.location}
              </p>
              <p className="flex items-center gap-2" style={{ color: 'var(--cp-muted)' }}>
                <Clock3 size={14} /> {selectedSlot.hours} timer
              </p>
              <p className="flex items-center gap-2" style={{ color: 'var(--cp-muted)' }}>
                <Users size={14} /> {selectedSlot.assigned.length}/{selectedSlot.required} bemandet
              </p>
            </div>
            <div className="mt-4 rounded-lg border p-3" style={{ borderColor: 'var(--cp-border)' }}>
              <p
                className="text-xs font-semibold uppercase tracking-wide"
                style={{ color: 'var(--cp-muted)' }}
              >
                Personale på vagt i tidsrummet
              </p>
              {selectedSlot.assigned.length === 0 ? (
                <p className="mt-2 text-sm" style={{ color: 'var(--cp-muted)' }}>
                  {demoMode ? 'Ingen i demo på denne vagt.' : 'Ingen tilmeldt endnu.'}
                </p>
              ) : (
                <ul className="mt-2 space-y-1">
                  {selectedSlot.assigned.map((person) => (
                    <li
                      key={`${person.staffId}-${person.staffName}`}
                      className="flex items-center gap-2 text-sm"
                      style={{ color: 'var(--cp-text)' }}
                    >
                      <CheckCircle2 size={14} style={{ color: 'var(--cp-green)' }} />
                      {person.staffName}
                    </li>
                  ))}
                </ul>
              )}
            </div>
            <div className="mt-4 flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => setSelectedSlot(null)}
                className="rounded-lg border px-3 py-2 text-sm"
                style={{ borderColor: 'var(--cp-border)', color: 'var(--cp-muted)' }}
              >
                Luk
              </button>
              {selectedSlot.mine ? (
                <button
                  type="button"
                  onClick={() => void dropShift(selectedSlot)}
                  disabled={requesting === selectedSlot.id}
                  className="rounded-lg border px-3 py-2 text-sm font-semibold disabled:opacity-60"
                  style={{ borderColor: 'var(--cp-border)', color: 'var(--cp-text)' }}
                >
                  {requesting === selectedSlot.id ? 'Framelder…' : 'Frameld vagt'}
                </button>
              ) : canClaimRosterSlot(selectedSlot) ? (
                <button
                  type="button"
                  onClick={() => void claimShift(selectedSlot)}
                  disabled={requesting === selectedSlot.id}
                  className="rounded-lg px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
                  style={{ backgroundColor: 'var(--cp-green)' }}
                >
                  {requesting === selectedSlot.id ? 'Gemmer…' : 'Anmod om vagt'}
                </button>
              ) : null}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
