'use client';

import React, { useEffect, useMemo, useState } from 'react';
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
import type { DemoShift, DemoShiftType } from '@/lib/demoShiftPlan';
import {
  currentPayPeriod,
  estimateGrossPay,
  formatKr,
  loadShifts,
  shiftsInPeriod,
} from '@/lib/demoShiftPlan';
import { VAGTPLAN_CORE_SHIFT_LOCATIONS } from '@/lib/vagtplanInferDepartment';

type VagtplanDemoClientProps = { basePath?: string };
type CoreShift = 'dag' | 'aften' | 'nat';

type ShiftSlot = {
  id: string;
  date: string;
  type: CoreShift;
  start: string;
  end: string;
  hours: number;
  location: string;
  assigned: string[];
  required: number;
  mine: boolean;
};

const TEAM = ['Christian C.', 'Mette R.', 'Anders K.', 'Louise N.', 'Helle T.', 'Nicolai S.'];

const SHIFT_META: Record<
  CoreShift,
  { start: string; end: string; hours: number; location: string; weekday: number; weekend: number }
> = {
  dag: {
    start: '07:30',
    end: '15:30',
    hours: 8,
    location: VAGTPLAN_CORE_SHIFT_LOCATIONS.dag,
    weekday: 4,
    weekend: 3,
  },
  aften: {
    start: '15:00',
    end: '23:00',
    hours: 8,
    location: VAGTPLAN_CORE_SHIFT_LOCATIONS.aften,
    weekday: 3,
    weekend: 3,
  },
  nat: {
    start: '23:00',
    end: '07:00',
    hours: 8,
    location: VAGTPLAN_CORE_SHIFT_LOCATIONS.nat,
    weekday: 2,
    weekend: 2,
  },
};

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function plusDays(dateIso: string, delta: number): string {
  const d = new Date(`${dateIso}T12:00:00`);
  d.setDate(d.getDate() + delta);
  return ymd(d);
}

function hash(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i += 1) h = (h * 33 + s.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function labelType(t: DemoShiftType): string {
  if (t === 'dag') return 'Dag';
  if (t === 'aften') return 'Aften';
  if (t === 'nat') return 'Nat';
  if (t === 'uddannelse') return 'Uddannelse';
  return 'Vagt';
}

function vagtAccent(type: CoreShift): string {
  if (type === 'nat') return 'var(--cp-blue)';
  if (type === 'aften') return 'var(--cp-amber)';
  return 'var(--cp-green)';
}

function bemandingStatus(open: number): { color: string; bg: string } {
  if (open === 0) return { color: 'var(--cp-green)', bg: 'var(--cp-green-dim)' };
  if (open <= 2) return { color: 'var(--cp-amber)', bg: 'var(--cp-amber-dim)' };
  return { color: 'var(--cp-red)', bg: 'var(--cp-red-dim)' };
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
}: VagtplanDemoClientProps) {
  const [shifts, setShifts] = useState<DemoShift[]>([]);
  const [mounted, setMounted] = useState(false);
  const [selectedDate, setSelectedDate] = useState(() => ymd(new Date()));
  const [selectedSlot, setSelectedSlot] = useState<ShiftSlot | null>(null);
  const [requesting, setRequesting] = useState<string | null>(null);

  useEffect(() => {
    setShifts(loadShifts());
    setMounted(true);
  }, []);

  const period = useMemo(() => currentPayPeriod(), []);
  const inPeriod = useMemo(
    () => shiftsInPeriod(shifts, period.start, period.end),
    [period, shifts]
  );
  const pay = useMemo(() => estimateGrossPay(inPeriod), [inPeriod]);

  const myShiftMap = useMemo(() => {
    const m = new Map<string, DemoShift>();
    for (const s of shifts) {
      if (s.type === 'dag' || s.type === 'aften' || s.type === 'nat')
        m.set(`${s.date}:${s.type}`, s);
    }
    return m;
  }, [shifts]);

  const days = useMemo(
    () => Array.from({ length: 14 }, (_, i) => plusDays(selectedDate, i - 6)),
    [selectedDate]
  );

  const slotsByDate = useMemo(() => {
    const m = new Map<string, ShiftSlot[]>();
    for (const d of days) {
      const weekend = [0, 6].includes(new Date(`${d}T12:00:00`).getDay());
      const slots: ShiftSlot[] = (['dag', 'aften', 'nat'] as CoreShift[]).map((type) => {
        const meta = SHIFT_META[type];
        const mine = myShiftMap.has(`${d}:${type}`);
        const mineShift = myShiftMap.get(`${d}:${type}`);
        const required = weekend ? meta.weekend : meta.weekday;
        const seed = hash(`${d}:${type}`);
        const assignedCount = mine ? required : Math.max(0, required - (seed % 2));
        const assigned: string[] = mine ? ['Dig'] : [];
        let i = 0;
        while (assigned.length < assignedCount) {
          const name = TEAM[(seed + i) % TEAM.length]!;
          if (!assigned.includes(name)) assigned.push(name);
          i += 1;
        }
        return {
          id: `${d}-${type}`,
          date: d,
          type,
          start: mineShift?.start ?? meta.start,
          end: mineShift?.end ?? meta.end,
          hours: mineShift?.hours ?? meta.hours,
          location: meta.location,
          assigned,
          required,
          mine,
        };
      });
      m.set(d, slots);
    }
    return m;
  }, [days, myShiftMap]);

  const myUpcoming = useMemo(() => {
    const now = ymd(new Date());
    return shifts
      .filter((s) => s.type === 'dag' || s.type === 'aften' || s.type === 'nat')
      .filter((s) => s.date >= now)
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(0, 6);
  }, [shifts]);

  // Stat-bar beregninger
  const weekHours = useMemo(() => {
    const now = new Date();
    const dow = now.getDay();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - (dow === 0 ? 6 : dow - 1));
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    const ws = ymd(weekStart);
    const we = ymd(weekEnd);
    return shifts
      .filter((s) => s.date >= ws && s.date <= we)
      .reduce((acc, s) => acc + (s.hours ?? 0), 0);
  }, [shifts]);

  const todayOpenSlots = useMemo(() => {
    const todaySlots = slotsByDate.get(ymd(new Date())) ?? [];
    return todaySlots.reduce((acc, s) => acc + Math.max(0, s.required - s.assigned.length), 0);
  }, [slotsByDate]);

  const selectedSlots = slotsByDate.get(selectedDate) ?? [];
  const appointments = useMemo(
    () => [
      {
        date: plusDays(selectedDate, 1),
        title: 'Teammøde',
        time: '10:30',
        owner: 'Afdelingsleder',
      },
      {
        date: plusDays(selectedDate, 2),
        title: 'Borgerplan: NOP',
        time: '13:00',
        owner: 'Kollega: Mette',
      },
      { date: plusDays(selectedDate, 5), title: 'Supervision', time: '09:00', owner: 'Psykolog' },
    ],
    [selectedDate]
  );

  const requestShift = async (slotId: string) => {
    setRequesting(slotId);
    await new Promise((r) => setTimeout(r, 700));
    setRequesting(null);
  };

  if (!mounted) {
    return (
      <div className="p-6 text-sm" style={{ color: 'var(--cp-muted)' }}>
        Indlæser vagtplan…
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl p-6">
      {/* ── Side-header ─────────────────────────────────────── */}
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
            Realistisk oversigt over egne vagter, bemanding og ledige vagter. Lønoverblik findes på{' '}
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

      {/* ── Stat-bar ─────────────────────────────────────────── */}
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

      {/* ── Mine vagter + Dagens bemanding ────────────────────── */}
      <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.2fr_1fr]">
        <section
          className="rounded-xl border p-4"
          style={{ borderColor: 'var(--cp-border)', backgroundColor: 'var(--cp-bg2)' }}
        >
          <h2 className="text-sm font-semibold" style={{ color: 'var(--cp-text)' }}>
            Mine vagter (kommende)
          </h2>
          <ul className="mt-3 space-y-2">
            {myUpcoming.map((s) => {
              const accent = vagtAccent(s.type as CoreShift);
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
                    {s.start}–{s.end} · {SHIFT_META[s.type as CoreShift]?.location ?? 'Bosted'}
                  </p>
                </li>
              );
            })}
          </ul>
        </section>

        <section
          className="rounded-xl border p-4"
          style={{ borderColor: 'var(--cp-border)', backgroundColor: 'var(--cp-bg2)' }}
        >
          <h2 className="text-sm font-semibold" style={{ color: 'var(--cp-text)' }}>
            Dagens bemanding
          </h2>
          <div className="mt-3 space-y-2">
            {(slotsByDate.get(ymd(new Date())) ?? []).map((slot) => {
              const open = Math.max(0, slot.required - slot.assigned.length);
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

      {/* ── Kalender-grid ────────────────────────────────────── */}
      <div className="mt-8">
        <h2 className="text-sm font-semibold" style={{ color: 'var(--cp-text)' }}>
          Kalender (forrige/fremtidige vagter og aftaler)
        </h2>
        <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 xl:grid-cols-7">
          {days.map((d) => {
            const slots = slotsByDate.get(d) ?? [];
            const open = slots.reduce(
              (acc, s) => acc + Math.max(0, s.required - s.assigned.length),
              0
            );
            const mine = slots.some((s) => s.mine);
            const active = d === selectedDate;
            const isToday = d === ymd(new Date());
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

      {/* ── Aktuel lønperiode ────────────────────────────────── */}
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
        </p>
      </div>

      {/* ── Valgt dato · vagter i tidsrum ────────────────────── */}
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
            const open = Math.max(0, slot.required - slot.assigned.length);
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

      {/* ── Mine allokerede aftaler ──────────────────────────── */}
      <div
        className="mt-6 rounded-xl border p-4"
        style={{ borderColor: 'var(--cp-border)', backgroundColor: 'var(--cp-bg2)' }}
      >
        <h2 className="text-sm font-semibold" style={{ color: 'var(--cp-text)' }}>
          Mine allokerede aftaler
        </h2>
        <ul className="mt-3 space-y-2">
          {appointments.map((a) => (
            <li
              key={`${a.date}-${a.title}`}
              className="rounded-lg border px-3 py-2.5 text-sm"
              style={{ borderColor: 'var(--cp-border)', backgroundColor: 'var(--cp-bg3)' }}
            >
              <p className="font-medium" style={{ color: 'var(--cp-text)' }}>
                {a.title}
              </p>
              <p className="mt-0.5 text-xs" style={{ color: 'var(--cp-muted)' }}>
                {new Date(`${a.date}T12:00:00`).toLocaleDateString('da-DK', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                })}{' '}
                · {a.time} · {a.owner}
              </p>
            </li>
          ))}
        </ul>
      </div>

      {/* ── Vagt-detalje modal ───────────────────────────────── */}
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
              <ul className="mt-2 space-y-1">
                {selectedSlot.assigned.map((name) => (
                  <li
                    key={name}
                    className="flex items-center gap-2 text-sm"
                    style={{ color: 'var(--cp-text)' }}
                  >
                    <CheckCircle2 size={14} style={{ color: 'var(--cp-green)' }} />
                    {name}
                  </li>
                ))}
              </ul>
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
              {!selectedSlot.mine && selectedSlot.assigned.length < selectedSlot.required && (
                <button
                  type="button"
                  onClick={() => void requestShift(selectedSlot.id)}
                  disabled={requesting === selectedSlot.id}
                  className="rounded-lg px-3 py-2 text-sm font-semibold text-white disabled:opacity-60"
                  style={{ backgroundColor: 'var(--cp-green)' }}
                >
                  {requesting === selectedSlot.id ? 'Sender anmodning…' : 'Anmod om vagt'}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
