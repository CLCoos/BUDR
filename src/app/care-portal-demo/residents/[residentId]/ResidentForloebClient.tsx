'use client';

import React from 'react';
import Link from 'next/link';
import {
  ArrowLeft,
  ArrowRight,
  CalendarClock,
  ChevronRight,
  HeartHandshake,
  Mic,
  Pill,
  Sparkles,
} from 'lucide-react';
import { useDemoFortael } from '@/components/demo/DemoFortael';
import {
  getForloeb,
  type ForloebData,
  type MedDose,
  type MoodPoint,
  type TimelineKind,
  type Traffic,
} from './forloebData';

/** «Borgerens forløb»: én levende side pr. borger. Demo, alt er fiktivt og lokalt. */

const TRAFFIC: Record<Traffic, { label: string; fg: string; bg: string }> = {
  groen: { label: 'Grøn i Lys i dag', fg: 'var(--cp-green)', bg: 'var(--cp-green-dim)' },
  gul: { label: 'Gul i Lys i dag', fg: 'var(--cp-amber)', bg: 'var(--cp-amber-dim)' },
  roed: { label: 'Rød i Lys i dag', fg: 'var(--cp-red)', bg: 'var(--cp-red-dim)' },
};

const KIND: Record<TimelineKind, { label: string; fg: string; bg: string }> = {
  notat: { label: 'Notat', fg: 'var(--cp-green)', bg: 'var(--cp-green-dim)' },
  lys: { label: 'Lys', fg: 'var(--cp-blue)', bg: 'var(--cp-blue-dim)' },
  laege: { label: 'Sundhed', fg: 'var(--cp-red)', bg: 'var(--cp-red-dim)' },
  haendelse: { label: 'Hændelse', fg: 'var(--cp-amber)', bg: 'var(--cp-amber-dim)' },
  aftale: { label: 'Samtale', fg: 'var(--cp-muted)', bg: 'var(--cp-bg3)' },
};

const MED: Record<MedDose['status'], { label: string; fg: string; bg: string }> = {
  givet: { label: 'Givet', fg: 'var(--cp-green)', bg: 'var(--cp-green-dim)' },
  mangler: { label: 'Ikke registreret', fg: 'var(--cp-red)', bg: 'var(--cp-red-dim)' },
  senere: { label: 'Senere', fg: 'var(--cp-muted)', bg: 'var(--cp-bg3)' },
  pn: { label: 'Ved behov', fg: 'var(--cp-muted)', bg: 'var(--cp-bg3)' },
};

const card = { backgroundColor: 'var(--cp-card-bg)', borderColor: 'var(--cp-border)' } as const;

function Section({
  id,
  title,
  aside,
  children,
}: {
  id: string;
  title: string;
  aside?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <section
      id={id}
      className="scroll-mt-24 rounded-2xl border"
      style={card}
      aria-labelledby={`${id}-h`}
    >
      <div
        className="flex items-baseline justify-between gap-3 border-b px-5 py-4"
        style={{ borderColor: 'var(--cp-border)' }}
      >
        <h2 id={`${id}-h`} className="text-base font-semibold" style={{ color: 'var(--cp-text)' }}>
          {title}
        </h2>
        {aside}
      </div>
      <div className="p-5">{children}</div>
    </section>
  );
}

function MoodChart({
  points,
  W = 560,
  H = 170,
  className = '',
}: {
  points: MoodPoint[];
  W?: number;
  H?: number;
  className?: string;
}) {
  const padL = 28;
  const padR = 12;
  const padT = 22;
  const padB = 26;
  const x = (i: number) => padL + (i * (W - padL - padR)) / (points.length - 1);
  const y = (m: number) => padT + ((10 - m) * (H - padT - padB)) / 9;
  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i)} ${y(p.mood)}`).join(' ');
  const area = `${line} L${x(points.length - 1)} ${H - padB} L${x(0)} ${H - padB} Z`;
  const dot: Record<Traffic, string> = {
    groen: 'var(--cp-green)',
    gul: 'var(--cp-amber)',
    roed: 'var(--cp-red)',
  };
  const last = points[points.length - 1]!;

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className={`h-auto w-full ${className}`}
      role="img"
      aria-label={`Humør de sidste 14 dage. I dag ${last.mood} ud af 10.`}
    >
      {[2, 5, 8].map((g) => (
        <g key={g}>
          <line
            x1={padL}
            x2={W - padR}
            y1={y(g)}
            y2={y(g)}
            style={{ stroke: 'var(--cp-border)' }}
            strokeDasharray="2 4"
          />
          <text
            x={padL - 8}
            y={y(g) + 4}
            textAnchor="end"
            fontSize="11"
            style={{ fill: 'var(--cp-muted)' }}
          >
            {g}
          </text>
        </g>
      ))}
      {points.map((p, i) =>
        p.marker ? (
          <g key={`m${i}`}>
            <line
              x1={x(i)}
              x2={x(i)}
              y1={padT - 6}
              y2={H - padB}
              style={{ stroke: 'var(--cp-blue)' }}
              strokeDasharray="3 3"
            />
            <text
              x={x(i) + 5}
              y={padT - 9}
              fontSize="11"
              fontWeight="600"
              style={{ fill: 'var(--cp-blue)' }}
            >
              {p.marker}
            </text>
          </g>
        ) : null
      )}
      <path d={area} style={{ fill: 'var(--cp-green)', opacity: 0.08 }} />
      <path
        d={line}
        fill="none"
        strokeWidth="2.25"
        strokeLinejoin="round"
        strokeLinecap="round"
        style={{ stroke: 'var(--cp-green)' }}
      />
      {points.map((p, i) => (
        <circle
          key={i}
          cx={x(i)}
          cy={y(p.mood)}
          r={i === points.length - 1 ? 5.5 : 3.5}
          strokeWidth="2"
          style={{ fill: dot[p.traffic], stroke: 'var(--cp-card-bg)' }}
        />
      ))}
      <text x={padL} y={H - 6} fontSize="11" style={{ fill: 'var(--cp-muted)' }}>
        14 dage siden
      </text>
      <text
        x={W - padR}
        y={H - 6}
        fontSize="11"
        textAnchor="end"
        style={{ fill: 'var(--cp-muted)' }}
      >
        I dag
      </text>
    </svg>
  );
}

function Chip({ label, fg, bg }: { label: string; fg: string; bg: string }) {
  return (
    <span
      className="inline-flex w-max items-center rounded-md px-2 py-0.5 text-[11px] font-semibold"
      style={{ color: fg, backgroundColor: bg }}
    >
      {label}
    </span>
  );
}

function Forloeb({ d }: { d: ForloebData }) {
  const { openFortael } = useDemoFortael();
  const t = TRAFFIC[d.today.traffic];

  return (
    <div className="mx-auto w-full max-w-[1240px] px-4 pb-28 pt-6 sm:px-6 sm:pt-8 lg:px-8">
      <Link
        href="/care-portal-demo/residents"
        className="mb-4 inline-flex min-h-[40px] items-center gap-1.5 text-sm font-medium"
        style={{ color: 'var(--cp-muted)' }}
      >
        <ArrowLeft size={16} aria-hidden />
        Borgere
      </Link>

      <header className="mb-6 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex items-center gap-4">
          <span
            className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-xl font-semibold"
            style={{ backgroundColor: 'var(--cp-ink-2)', color: 'var(--cp-ink-accent)' }}
            aria-hidden
          >
            {d.initials}
          </span>
          <div className="min-w-0">
            <h1
              className="m-0"
              style={{
                fontSize: 'clamp(26px, 3.2vw, 34px)',
                fontWeight: 600,
                letterSpacing: '-0.02em',
                lineHeight: 1.15,
                color: 'var(--cp-text)',
              }}
            >
              {d.name}
            </h1>
            <p className="mt-1 text-sm" style={{ color: 'var(--cp-muted)' }}>
              {d.paragraph} · {d.house}, værelse {d.room} · kontaktperson {d.contact}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={openFortael}
            className="inline-flex min-h-[48px] items-center gap-2 rounded-xl px-5 text-[15px] font-semibold"
            style={{ backgroundColor: 'var(--cp-green)', color: 'var(--cp-on-green)' }}
          >
            <Mic size={18} aria-hidden />
            Fortæl om {d.firstName}
          </button>
          <Link
            href={`/care-portal-demo/residents/${d.id}/detaljer`}
            className="inline-flex min-h-[48px] items-center gap-1.5 rounded-xl border px-4 text-sm font-medium"
            style={{
              borderColor: 'var(--cp-border2)',
              color: 'var(--cp-text)',
              backgroundColor: 'var(--cp-bg2)',
            }}
          >
            Alle detaljer
            <ChevronRight size={16} aria-hidden />
          </Link>
        </div>
      </header>

      <div
        className="mb-6 flex flex-col gap-2 rounded-2xl border p-5 sm:flex-row sm:items-start sm:gap-4"
        style={card}
      >
        <Chip label={t.label} fg={t.fg} bg={t.bg} />
        <p className="max-w-[80ch] text-[16px] leading-relaxed" style={{ color: 'var(--cp-text)' }}>
          {d.today.summary}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-6">
          <Section
            id="forloeb-humoer"
            title="Hvordan går det"
            aside={
              <span className="text-xs" style={{ color: 'var(--cp-muted)' }}>
                Humør fra Lys, 1–10
              </span>
            }
          >
            <MoodChart points={d.mood} W={340} H={190} className="sm:hidden" />
            <MoodChart points={d.mood} className="hidden sm:block" />
            {d.pattern && (
              <div
                className="mt-4 rounded-xl border-l-4 p-4"
                style={{ borderColor: 'var(--cp-blue)', backgroundColor: 'var(--cp-blue-dim)' }}
              >
                <p
                  className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-[0.08em]"
                  style={{ color: 'var(--cp-blue)' }}
                >
                  <Sparkles size={13} aria-hidden />
                  Mønster
                </p>
                <p className="mt-1 text-[15px] font-semibold" style={{ color: 'var(--cp-text)' }}>
                  {d.pattern.title}
                </p>
                <p className="mt-1 text-sm leading-relaxed" style={{ color: 'var(--cp-text)' }}>
                  {d.pattern.body}
                </p>
                <p className="mt-2 text-xs" style={{ color: 'var(--cp-muted)' }}>
                  {d.pattern.basis}
                </p>
              </div>
            )}
          </Section>

          <Section id="forloeb-maal" title="Hvad arbejder vi hen imod">
            <ul className="flex flex-col gap-5">
              {d.goals.map((g, i) => (
                <li key={g.title}>
                  <div className="flex items-baseline justify-between gap-3">
                    <p className="text-[15px] font-semibold" style={{ color: 'var(--cp-text)' }}>
                      <span className="cp-num mr-2 text-xs" style={{ color: 'var(--cp-muted)' }}>
                        Delmål {i + 1}
                      </span>
                      {g.title}
                    </p>
                    <span
                      className="cp-num shrink-0 whitespace-nowrap text-sm font-medium"
                      style={{ color: 'var(--cp-green)' }}
                    >
                      {g.progress} %
                    </span>
                  </div>
                  <div
                    className="mt-2 h-2 overflow-hidden rounded-full"
                    style={{ backgroundColor: 'var(--cp-bg3)' }}
                    role="progressbar"
                    aria-valuenow={g.progress}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={g.title}
                  >
                    <div
                      className="h-full rounded-full"
                      style={{ width: `${g.progress}%`, backgroundColor: 'var(--cp-green)' }}
                    />
                  </div>
                  <p className="mt-2 text-sm" style={{ color: 'var(--cp-text)' }}>
                    {g.lastStep}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--cp-muted)' }}>
                    {g.source}
                  </p>
                </li>
              ))}
            </ul>
          </Section>

          <Section id="forloeb-tidslinje" title="Hvad er der sket">
            <ol
              className="relative flex flex-col gap-5 border-l pl-5"
              style={{ borderColor: 'var(--cp-border2)' }}
            >
              {d.timeline.map((it) => {
                const k = KIND[it.kind];
                return (
                  <li key={it.id} id={it.id} className="relative scroll-mt-24">
                    <span
                      className="absolute -left-[27px] top-1.5 h-3 w-3 rounded-full border-2"
                      style={{ backgroundColor: k.fg, borderColor: 'var(--cp-card-bg)' }}
                      aria-hidden
                    />
                    <div className="flex flex-wrap items-center gap-2">
                      <Chip label={k.label} fg={k.fg} bg={k.bg} />
                      <span className="text-xs" style={{ color: 'var(--cp-muted)' }}>
                        {it.when}
                      </span>
                    </div>
                    <p
                      className="mt-1 text-[15px] font-semibold"
                      style={{ color: 'var(--cp-text)' }}
                    >
                      {it.title}
                    </p>
                    <p className="text-sm leading-relaxed" style={{ color: 'var(--cp-text)' }}>
                      {it.body}
                    </p>
                    {it.by && (
                      <p className="mt-0.5 text-xs" style={{ color: 'var(--cp-muted)' }}>
                        {it.by}
                      </p>
                    )}
                  </li>
                );
              })}
            </ol>
          </Section>
        </div>

        <div className="flex min-w-0 flex-col gap-6">
          <section
            id="forloeb-egne-ord"
            className="scroll-mt-24 rounded-2xl p-5"
            style={{ backgroundColor: 'var(--cp-ink)', color: '#e7edf3' }}
            aria-labelledby="forloeb-egne-ord-h"
          >
            <h2
              id="forloeb-egne-ord-h"
              className="text-[11px] font-semibold uppercase tracking-[0.1em]"
              style={{ color: 'var(--cp-ink-accent)' }}
            >
              {d.firstName}s egne ord
            </h2>
            <ul className="mt-3 flex flex-col gap-4">
              {d.ownWords.map((w) => (
                <li key={w.text}>
                  <p className="text-[17px] leading-snug">«{w.text}»</p>
                  <p className="mt-1 text-xs" style={{ color: '#93a2b1' }}>
                    {w.when} · fra Lys
                  </p>
                </li>
              ))}
            </ul>
          </section>

          <Section id="forloeb-naeste" title="Det næste">
            <ul className="flex flex-col gap-1">
              {d.next.map((n) => {
                const inner = (
                  <>
                    <CalendarClock
                      size={18}
                      className="mt-0.5 shrink-0"
                      style={{ color: n.deadline ? 'var(--cp-amber)' : 'var(--cp-muted)' }}
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1">
                      <span
                        className="block text-xs font-medium"
                        style={{ color: n.deadline ? 'var(--cp-amber)' : 'var(--cp-muted)' }}
                      >
                        {n.when}
                      </span>
                      <span className="block text-[15px]" style={{ color: 'var(--cp-text)' }}>
                        {n.what}
                      </span>
                    </span>
                    {n.href && (
                      <ArrowRight
                        size={16}
                        className="mt-1 shrink-0"
                        style={{ color: 'var(--cp-green)' }}
                        aria-hidden
                      />
                    )}
                  </>
                );
                return (
                  <li key={n.what}>
                    {n.href ? (
                      <Link
                        href={n.href}
                        className="-mx-2 flex items-start gap-3 rounded-lg px-2 py-2 transition-colors hover:bg-[var(--cp-bg3)]"
                      >
                        {inner}
                      </Link>
                    ) : (
                      <div className="flex items-start gap-3 py-2">{inner}</div>
                    )}
                  </li>
                );
              })}
            </ul>
          </Section>

          {d.meds.length > 0 && (
            <Section
              id="forloeb-medicin"
              title="Medicin i dag"
              aside={<Pill size={16} style={{ color: 'var(--cp-muted)' }} aria-hidden />}
            >
              <ul className="flex flex-col gap-3">
                {d.meds.map((m) => {
                  const s = MED[m.status];
                  return (
                    <li key={m.name + m.time} className="flex items-center gap-3">
                      <span
                        className="cp-num w-[72px] shrink-0 text-xs"
                        style={{ color: 'var(--cp-muted)' }}
                      >
                        {m.time}
                      </span>
                      <span
                        className="min-w-0 flex-1 text-[15px]"
                        style={{ color: 'var(--cp-text)' }}
                      >
                        {m.name}
                      </span>
                      <Chip label={s.label} fg={s.fg} bg={s.bg} />
                    </li>
                  );
                })}
              </ul>
              <p className="mt-3 text-xs" style={{ color: 'var(--cp-muted)' }}>
                Medicin ændres aldrig automatisk.
              </p>
            </Section>
          )}

          <Section
            id="forloeb-tryghed"
            title="Når det bliver svært"
            aside={<HeartHandshake size={16} style={{ color: 'var(--cp-muted)' }} aria-hidden />}
          >
            <ol className="flex flex-col gap-2">
              {d.safetyPlan.map((s, i) => (
                <li key={s} className="flex gap-3 text-[15px]" style={{ color: 'var(--cp-text)' }}>
                  <span
                    className="cp-num flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
                    style={{ backgroundColor: 'var(--cp-green-dim)', color: 'var(--cp-green)' }}
                  >
                    {i + 1}
                  </span>
                  {s}
                </li>
              ))}
            </ol>
            <p className="mt-4 text-xs" style={{ color: 'var(--cp-muted)' }}>
              {d.firstName}s egen tryghedsplan. Pårørende: {d.relatives}.
            </p>
          </Section>
        </div>
      </div>
    </div>
  );
}

export default function ResidentForloebClient({ residentId }: { residentId: string }) {
  const d = getForloeb(residentId);
  if (!d) return null;
  return <Forloeb d={d} />;
}
