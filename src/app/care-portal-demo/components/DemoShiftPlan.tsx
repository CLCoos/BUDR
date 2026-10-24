'use client';

import ResidentInitials from '@/components/residents/ResidentInitials';
import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Check, ChevronDown, Phone } from 'lucide-react';
import MomentTabs from '@/components/vagt/MomentTabs';
import StatusTag, { type StatusTone } from '@/components/ui/StatusTag';
import { DEMO_ROLES, type DemoRole, type DemoRoleProfile } from './demoRoles';

/** Rollevælger, «Næste opgave» og «Din vagt» på demo-forsiden. Alt er lokalt. */

/** Rollen som én lille knap ved hilsenen («Medarbejder ▾»), så den næste opgave kommer højere op. */
export function DemoRoleSwitch({
  role,
  onChange,
}: {
  role: DemoRole;
  onChange: (r: DemoRole) => void;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = DEMO_ROLES.find((r) => r.id === role) ?? DEMO_ROLES[0]!;

  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    window.addEventListener('pointerdown', onDown);
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('pointerdown', onDown);
      window.removeEventListener('keydown', onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative shrink-0">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Se forsiden som ${current.label.toLowerCase()}. Skift rolle`}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex h-9 items-center gap-1.5 rounded-full border px-3 text-sm transition-colors hover:bg-[var(--cp-bg3)]"
        style={{
          borderColor: 'var(--cp-border2)',
          backgroundColor: 'var(--cp-card-bg)',
          color: 'var(--cp-text)',
        }}
      >
        {current.label}
        <ChevronDown size={15} style={{ color: 'var(--cp-muted)' }} aria-hidden />
      </button>
      {open && (
        <div
          role="menu"
          aria-label="Se forsiden som"
          className="absolute left-0 top-[calc(100%+6px)] z-30 w-60 overflow-hidden rounded-xl border py-1 shadow-lg sm:left-auto sm:right-0"
          style={{ backgroundColor: 'var(--cp-card-bg)', borderColor: 'var(--cp-border)' }}
        >
          <p className="m-0 px-3.5 pb-1 pt-2 text-[13px]" style={{ color: 'var(--cp-muted)' }}>
            Se forsiden som
          </p>
          {DEMO_ROLES.map((r) => {
            const on = r.id === role;
            return (
              <button
                key={r.id}
                type="button"
                role="menuitemradio"
                aria-checked={on}
                onClick={() => {
                  onChange(r.id);
                  setOpen(false);
                }}
                className="flex min-h-[44px] w-full items-center justify-between px-3.5 text-left text-[15px] transition-colors hover:bg-[var(--cp-bg3)]"
                style={{ color: 'var(--cp-text)', fontWeight: on ? 600 : 400 }}
              >
                {r.label}
                {on && <Check size={16} style={{ color: 'var(--cp-green)' }} aria-hidden />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

const TONE = {
  red: { bg: 'var(--cp-red-dim)', fg: 'var(--cp-red)' },
  amber: { bg: 'var(--cp-amber-dim)', fg: 'var(--cp-amber)' },
  blue: { bg: 'var(--cp-blue-dim)', fg: 'var(--cp-blue)' },
  green: { bg: 'var(--cp-green-dim)', fg: 'var(--cp-green)' },
} as const;

export function DemoNextTask({ profile }: { profile: DemoRoleProfile }) {
  const [done, setDone] = useState(false);
  useEffect(() => setDone(false), [profile.id]);
  const n = profile.next;
  const tone: StatusTone = n.tone === 'red' ? 'now' : n.tone === 'amber' ? 'today' : 'info';

  return (
    <section
      aria-labelledby="demo-next-title"
      className="rounded-2xl border p-5 sm:px-7 sm:py-6"
      style={{ backgroundColor: 'var(--cp-card-bg)', borderColor: 'var(--cp-border)' }}
    >
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between md:gap-8">
        <div className="flex min-w-0 flex-col gap-2">
          <StatusTag tone={tone}>{tone === 'now' ? `Nu · ${n.tag}` : n.tag}</StatusTag>
          <h2
            id="demo-next-title"
            className="m-0 text-xl font-semibold leading-snug sm:text-2xl"
            style={{ color: 'var(--cp-text)', letterSpacing: '-0.01em' }}
          >
            {n.title}
          </h2>
          <p
            className="m-0 max-w-[60ch] text-[15px] leading-relaxed sm:text-base"
            style={{ color: 'var(--cp-muted)' }}
          >
            {n.body}
          </p>
        </div>
        <div className="flex shrink-0 flex-col gap-2 sm:flex-row md:flex-col lg:flex-row">
          {done ? (
            <span
              role="status"
              className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl px-5 text-[15px] font-semibold"
              style={{ backgroundColor: 'var(--cp-green-dim)', color: 'var(--cp-green)' }}
            >
              <Check size={18} aria-hidden />
              Klaret (demo)
            </span>
          ) : n.action.href ? (
            <Link
              href={n.action.href}
              className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl px-5 text-[15px] font-semibold transition-opacity hover:opacity-90"
              style={{ backgroundColor: 'var(--cp-green)', color: 'var(--cp-on-green)' }}
            >
              {n.action.label}
              <ArrowRight size={18} aria-hidden />
            </Link>
          ) : (
            <button
              type="button"
              onClick={() => setDone(true)}
              className="inline-flex min-h-[48px] items-center justify-center gap-2 rounded-xl px-5 text-[15px] font-semibold transition-opacity hover:opacity-90"
              style={{ backgroundColor: 'var(--cp-green)', color: 'var(--cp-on-green)' }}
            >
              <Check size={18} aria-hidden />
              {n.action.label}
            </button>
          )}
          {n.secondary && !done && (
            <button
              type="button"
              className="inline-flex min-h-[44px] items-center justify-center gap-2 px-3 text-[15px] font-medium"
              style={{ color: 'var(--cp-green)' }}
            >
              <Phone size={16} aria-hidden />
              {n.secondary}
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

export function DemoShiftChecklist({ profile }: { profile: DemoRoleProfile }) {
  const initial = () =>
    Object.fromEntries(profile.tasks.map((t) => [t.id, Boolean(t.doneFromStart)]));
  const [done, setDone] = useState<Record<string, boolean>>(initial);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => setDone(initial()), [profile.id]);

  const count = profile.tasks.filter((t) => done[t.id]).length;
  const total = profile.tasks.length;
  const pct = Math.round((count / total) * 100);

  return (
    <section
      aria-labelledby="demo-shift-title"
      className="flex flex-col overflow-hidden rounded-2xl border"
      style={{ backgroundColor: 'var(--cp-card-bg)', borderColor: 'var(--cp-border)' }}
    >
      <div className="border-b px-5 py-4" style={{ borderColor: 'var(--cp-border)' }}>
        <div className="flex items-baseline justify-between gap-3">
          <h2
            id="demo-shift-title"
            className="m-0 text-base font-semibold"
            style={{ color: 'var(--cp-text)' }}
          >
            Din vagt
          </h2>
          <span className="cp-num text-xs" style={{ color: 'var(--cp-muted)' }}>
            {count} af {total} klaret
          </span>
        </div>
        <p className="mt-0.5 text-xs" style={{ color: 'var(--cp-muted)' }}>
          {profile.shift}
        </p>
        <div
          className="mt-3 h-1.5 overflow-hidden rounded-full"
          style={{ backgroundColor: 'var(--cp-bg3)' }}
          role="progressbar"
          aria-valuenow={pct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Klaret på vagten"
        >
          <div
            className="h-full rounded-full transition-[width] duration-300"
            style={{ width: `${pct}%`, backgroundColor: 'var(--cp-green)' }}
          />
        </div>
      </div>
      <ul>
        {profile.tasks.map((t) => {
          const isDone = done[t.id];
          return (
            <li
              key={t.id}
              className="flex items-center gap-3 border-b px-5 py-3 last:border-b-0"
              style={{ borderColor: 'var(--cp-border)' }}
            >
              <button
                type="button"
                role="checkbox"
                aria-checked={isDone}
                aria-label={`${t.title}: ${isDone ? 'klaret' : 'ikke klaret'}`}
                onClick={() => setDone((d) => ({ ...d, [t.id]: !d[t.id] }))}
                className="flex h-11 w-11 shrink-0 items-center justify-center -m-2"
              >
                <span
                  className="flex h-6 w-6 items-center justify-center rounded-full border-2 transition-colors"
                  style={{
                    borderColor: isDone ? 'var(--cp-green)' : 'var(--cp-border2)',
                    backgroundColor: isDone ? 'var(--cp-green)' : 'transparent',
                  }}
                >
                  {isDone && <Check size={14} strokeWidth={3} color="#fff" aria-hidden />}
                </span>
              </button>
              <span
                className="cp-num w-[64px] shrink-0 text-xs"
                style={{ color: 'var(--cp-muted)' }}
              >
                {t.time}
              </span>
              <div className="min-w-0 flex-1">
                <p
                  className="text-[15px] leading-snug"
                  style={{
                    color: isDone ? 'var(--cp-muted)' : 'var(--cp-text)',
                    textDecoration: isDone ? 'line-through' : 'none',
                  }}
                >
                  {t.title}
                </p>
                {t.detail && !isDone && (
                  <p className="text-xs" style={{ color: 'var(--cp-muted)' }}>
                    {t.detail}
                  </p>
                )}
              </div>
              {t.href && !isDone && (
                <Link
                  href={t.href}
                  aria-label={`Åbn: ${t.title}`}
                  className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg transition-colors hover:bg-[var(--cp-bg3)]"
                  style={{ color: 'var(--cp-green)' }}
                >
                  <ArrowRight size={18} aria-hidden />
                </Link>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

export type ShiftMoment = 'moed' | 'nu' | 'hjem';

export function DemoMomentSwitch({
  moment,
  onChange,
}: {
  moment: ShiftMoment;
  onChange: (m: ShiftMoment) => void;
}) {
  return <MomentTabs moment={moment} onChange={onChange} />;
}

const panel = { backgroundColor: 'var(--cp-card-bg)', borderColor: 'var(--cp-border)' } as const;

const NIGHT_NOTES = [
  'CB blev vækket af larm fra naboen og faldt først i søvn igen kl. 02. Hun fik en kop te.',
  'MT afslog aftenmedicin kl. 22. Det er noteret, lægen er ikke kontaktet.',
  'SK havde en rolig nat og glæder sig til at handle ind.',
];

const NEEDS_YOU = [
  {
    initials: 'CB',
    name: 'Camilla Birk',
    why: 'Gul i Lys tre dage i træk og sover dårligt.',
    tip: 'Hun har det bedst med ro. Spørg til søvnen.',
    tone: 'amber' as const,
    href: '/care-portal-demo/residents/res-camilla',
  },
  {
    initials: 'MT',
    name: 'Mikkel Thomsen',
    why: 'Afslog aftenmedicin i går. Morgendosis kl. 08.',
    tip: 'Giv dosis sammen med morgenmaden, det plejer at gå.',
    tone: 'red' as const,
    href: '/care-portal-demo/residents/res-mikkel',
  },
  {
    initials: 'SK',
    name: 'Sara Kristensen',
    why: 'God periode. Indkøb efter liste i dag (delmål 1).',
    tip: 'Lad hende selv betale ved kassen.',
    tone: 'green' as const,
    href: '/care-portal-demo/residents/res-sara',
  },
];

export function DemoMoedInd({ onReady }: { onReady: () => void }) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)]">
      <section className="rounded-2xl border p-5" style={panel} aria-labelledby="moed-nat">
        <p
          className="text-[11px] font-semibold uppercase tracking-[0.08em]"
          style={{ color: 'var(--cp-muted)' }}
        >
          Siden sidst
        </p>
        <h2
          id="moed-nat"
          className="mt-1 text-base font-semibold"
          style={{ color: 'var(--cp-text)' }}
        >
          Nattevagten skrev
        </h2>
        <ul className="mt-3 flex flex-col gap-2.5">
          {NIGHT_NOTES.map((n) => (
            <li
              key={n}
              className="flex gap-2.5 text-[15px] leading-snug"
              style={{ color: 'var(--cp-text)' }}
            >
              <span
                className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full"
                style={{ backgroundColor: 'var(--cp-green)' }}
                aria-hidden
              />
              {n}
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs" style={{ color: 'var(--cp-muted)' }}>
          Jonas N. · nattevagt · godkendt kl. 06.55
        </p>
      </section>

      <section className="rounded-2xl border" style={panel} aria-labelledby="moed-hvem">
        <div className="border-b px-5 py-4" style={{ borderColor: 'var(--cp-border)' }}>
          <h2
            id="moed-hvem"
            className="text-base font-semibold"
            style={{ color: 'var(--cp-text)' }}
          >
            Hvem har brug for dig i dag
          </h2>
        </div>
        <ul>
          {NEEDS_YOU.map((r) => {
            const tone = TONE[r.tone];
            return (
              <li
                key={r.name}
                className="border-b last:border-b-0"
                style={{ borderColor: 'var(--cp-border)' }}
              >
                <Link
                  href={r.href}
                  className="flex items-start gap-3 px-5 py-4 transition-colors hover:bg-[var(--cp-bg3)]"
                >
                  <span
                    className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[13px] font-semibold"
                    style={{ backgroundColor: tone.bg, color: tone.fg }}
                  >
                    {r.initials}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span
                      className="block text-[15px] font-semibold"
                      style={{ color: 'var(--cp-text)' }}
                    >
                      <ResidentInitials initials={r.initials} fullName={r.name} />
                    </span>
                    <span className="block text-sm" style={{ color: 'var(--cp-text)' }}>
                      {r.why}
                    </span>
                    <span className="block text-sm" style={{ color: 'var(--cp-muted)' }}>
                      {r.tip}
                    </span>
                  </span>
                  <ArrowRight
                    size={18}
                    className="mt-1 shrink-0"
                    style={{ color: 'var(--cp-muted)' }}
                    aria-hidden
                  />
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <div className="lg:col-span-2">
        <button
          type="button"
          onClick={onReady}
          className="inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl px-6 text-[15px] font-semibold sm:w-auto"
          style={{ backgroundColor: 'var(--cp-green)', color: 'var(--cp-on-green)' }}
        >
          Jeg er klar, vis min vagt
          <ArrowRight size={18} aria-hidden />
        </button>
      </div>
    </div>
  );
}

const HANDOVER =
  'Rolig dag i Hus B. SK handlede selv ind efter liste og var stolt bagefter; ny tur tirsdag kl. 10. CB er stadig træt, samtale om søvn holdt kl. 11, hun vil prøve at slukke skærmen kl. 22. MT fik morgendosis kl. 08.20 med morgenmaden. Middagsmedicin givet til alle 3. Aftenvagten: hold øje med CB’s søvn, og husk MT’s aftenmedicin kl. 22.';

export function DemoGaaHjem({ person, onFortael }: { person: string; onFortael: () => void }) {
  const [text, setText] = useState(HANDOVER);
  const [done, setDone] = useState(false);

  if (done) {
    return (
      <section
        className="flex flex-col items-center gap-3 rounded-2xl border px-6 py-12 text-center"
        style={panel}
        role="status"
      >
        <span
          className="flex h-16 w-16 items-center justify-center rounded-full"
          style={{ backgroundColor: 'var(--cp-green-dim)', color: 'var(--cp-green)' }}
        >
          <Check size={32} aria-hidden />
        </span>
        <h2 className="text-xl font-semibold" style={{ color: 'var(--cp-text)' }}>
          Tak for i dag, {person}.
        </h2>
        <p className="max-w-[48ch] text-[15px]" style={{ color: 'var(--cp-muted)' }}>
          Overleveringen er sendt til aftenvagten. Dine notater ligger klar til fagsystemet i
          morgen. (I demoen gemmes intet.)
        </p>
        <button
          type="button"
          onClick={() => setDone(false)}
          className="mt-2 text-sm font-medium underline"
          style={{ color: 'var(--cp-muted)' }}
        >
          Se det igen
        </button>
      </section>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
      <section className="rounded-2xl border" style={panel} aria-labelledby="hjem-over">
        <div className="border-b px-5 py-4" style={{ borderColor: 'var(--cp-border)' }}>
          <h2
            id="hjem-over"
            className="text-base font-semibold"
            style={{ color: 'var(--cp-text)' }}
          >
            Overlevering til aftenvagten
          </h2>
          <p className="text-xs" style={{ color: 'var(--cp-muted)' }}>
            Skrevet for dig ud fra dagens notater og tjekliste. Ret, hvis noget mangler.
          </p>
        </div>
        <div className="p-5">
          <label className="block">
            <span className="sr-only">Overlevering</span>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={7}
              className="w-full resize-y rounded-xl border px-4 py-3 text-[15px] leading-relaxed outline-none focus:ring-2"
              style={{
                borderColor: 'var(--cp-border2)',
                backgroundColor: 'var(--cp-bg)',
                color: 'var(--cp-text)',
              }}
            />
          </label>
          <p className="mt-2 text-xs" style={{ color: 'var(--cp-muted)' }}>
            Kilder: 3 notater, tjeklisten, medicinlisten og Lys-check-ins fra i dag.
          </p>
        </div>
      </section>

      <div className="flex flex-col gap-6">
        <section className="rounded-2xl border p-5" style={panel} aria-labelledby="hjem-tjek">
          <h2
            id="hjem-tjek"
            className="text-base font-semibold"
            style={{ color: 'var(--cp-text)' }}
          >
            Før du går
          </h2>
          <ul className="mt-3 flex flex-col gap-3 text-[15px]">
            <li className="flex items-start gap-2.5" style={{ color: 'var(--cp-text)' }}>
              <Check
                size={18}
                className="mt-0.5 shrink-0"
                style={{ color: 'var(--cp-green)' }}
                aria-hidden
              />
              3 notater godkendt i dag
            </li>
            <li className="flex items-start gap-2.5" style={{ color: 'var(--cp-text)' }}>
              <Check
                size={18}
                className="mt-0.5 shrink-0"
                style={{ color: 'var(--cp-green)' }}
                aria-hidden
              />
              Al medicin på din vagt er givet
            </li>
            <li className="flex items-start gap-2.5" style={{ color: 'var(--cp-text)' }}>
              <span
                className="mt-1 h-4 w-4 shrink-0 rounded-full border-2"
                style={{ borderColor: 'var(--cp-amber)' }}
                aria-hidden
              />
              <span>
                Du har ikke skrevet om AP i dag.{' '}
                <button
                  type="button"
                  onClick={onFortael}
                  className="font-semibold underline"
                  style={{ color: 'var(--cp-green)' }}
                >
                  Fortæl kort
                </button>
              </span>
            </li>
          </ul>
        </section>
        <button
          type="button"
          onClick={() => setDone(true)}
          className="inline-flex min-h-[56px] items-center justify-center gap-2 rounded-2xl px-6 text-base font-semibold"
          style={{ backgroundColor: 'var(--cp-green)', color: 'var(--cp-on-green)' }}
        >
          <Check size={20} aria-hidden />
          Godkend og gå hjem
        </button>
      </div>
    </div>
  );
}
