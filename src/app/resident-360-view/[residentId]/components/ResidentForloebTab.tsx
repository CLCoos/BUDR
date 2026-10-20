'use client';

import React from 'react';
import Link from 'next/link';
import { ArrowRight, CalendarClock, ChevronRight, HeartHandshake, Mic } from 'lucide-react';
import { useFortael } from '@/components/fortael/Fortael';
import type {
  MedTodayStatus,
  MoodDay,
  NextItem,
  TimelineItem,
  TimelineKind,
  Traffic,
} from '@/lib/forloeb';

/**
 * «Borgerens forløb»: forsiden for én borger. Kun rigtige data; tomme afsnit siger ærligt,
 * hvad der mangler, og hvor det udfyldes.
 */

export type ForloebGoal = {
  id: string;
  title: string;
  description: string | null;
  targetDate: string | null;
  byResident: boolean;
  residentNote: string | null;
};

export type ForloebProps = {
  residentId: string;
  firstName: string;
  today: { traffic: Traffic | null; mood: number | null; when: string | null; note: string | null };
  mood: MoodDay[];
  moodSummary: string | null;
  goals: ForloebGoal[];
  timeline: TimelineItem[];
  ownWords: { label: string; text: string }[];
  latestLysWords: { text: string; when: string } | null;
  next: NextItem[];
  meds: { id: string; time: string; name: string; status: MedTodayStatus }[];
  crisis: { warningSigns: string[]; helps: string[]; steps: string[] } | null;
};

const TRAFFIC: Record<Traffic, { label: string; fg: string; bg: string }> = {
  groen: { label: 'Grøn i Lys', fg: 'var(--cp-green)', bg: 'var(--cp-green-dim)' },
  gul: { label: 'Gul i Lys', fg: 'var(--cp-amber)', bg: 'var(--cp-amber-dim)' },
  roed: { label: 'Rød i Lys', fg: 'var(--cp-red)', bg: 'var(--cp-red-dim)' },
};

const KIND: Record<TimelineKind, { label: string; fg: string; bg: string }> = {
  notat: { label: 'Notat', fg: 'var(--cp-green)', bg: 'var(--cp-green-dim)' },
  lys: { label: 'Lys', fg: 'var(--cp-blue)', bg: 'var(--cp-blue-dim)' },
  sundhed: { label: 'Sundhed', fg: 'var(--cp-red)', bg: 'var(--cp-red-dim)' },
  haendelse: { label: 'Hændelse', fg: 'var(--cp-amber)', bg: 'var(--cp-amber-dim)' },
  bekymring: { label: 'Bekymring', fg: 'var(--cp-amber)', bg: 'var(--cp-amber-dim)' },
};

const MED: Record<MedTodayStatus, { label: string; fg: string; bg: string }> = {
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

function Chip({ label, fg, bg }: { label: string; fg: string; bg: string }) {
  return (
    <span
      className="inline-flex w-max shrink-0 items-center rounded-md px-2 py-0.5 text-[11px] font-semibold"
      style={{ color: fg, backgroundColor: bg }}
    >
      {label}
    </span>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-sm leading-relaxed" style={{ color: 'var(--cp-muted)' }}>
      {children}
    </p>
  );
}

/** Skifter fane i browseren som ResidentTabs gør (pushState), uden ny serveranmodning. */
function goToTab(tab: string) {
  const params = new URLSearchParams(window.location.search);
  params.set('tab', tab);
  window.history.pushState(null, '', `?${params.toString()}`);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function TabLink({ tab, children }: { tab: string; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={() => goToTab(tab)}
      className="inline-flex items-center gap-1 text-sm font-medium"
      style={{ color: 'var(--cp-green)' }}
    >
      {children}
      <ArrowRight size={14} aria-hidden />
    </button>
  );
}

const DOT: Record<Traffic, string> = {
  groen: 'var(--cp-green)',
  gul: 'var(--cp-amber)',
  roed: 'var(--cp-red)',
};

/** Humørkurve med huller: dage uden tjek-ind bryder linjen i stedet for at blive gættet. */
function MoodChart({
  days,
  W = 560,
  H = 170,
  className = '',
}: {
  days: MoodDay[];
  W?: number;
  H?: number;
  className?: string;
}) {
  const padL = 28;
  const padR = 12;
  const padT = 14;
  const padB = 26;
  const x = (i: number) => padL + (i * (W - padL - padR)) / Math.max(1, days.length - 1);
  const y = (m: number) => padT + ((10 - m) * (H - padT - padB)) / 9;

  const segments: string[] = [];
  let current = '';
  days.forEach((d, i) => {
    if (d.mood === null) {
      if (current) segments.push(current);
      current = '';
      return;
    }
    current += `${current ? 'L' : 'M'}${x(i)} ${y(d.mood)} `;
  });
  if (current) segments.push(current);

  const lastWithValue = [...days].reverse().find((d) => d.mood !== null);

  return (
    <svg
      viewBox={`0 0 ${W} ${H}`}
      className={`h-auto w-full ${className}`}
      role="img"
      aria-label={`Humør de sidste ${days.length} dage${
        lastWithValue ? `. Senest ${lastWithValue.mood} ud af 10` : ''
      }.`}
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
      {segments.map((d, i) => (
        <path
          key={i}
          d={d}
          fill="none"
          strokeWidth="2.25"
          strokeLinejoin="round"
          strokeLinecap="round"
          style={{ stroke: 'var(--cp-green)' }}
        />
      ))}
      {days.map((d, i) =>
        d.mood === null ? (
          <circle key={i} cx={x(i)} cy={H - padB} r={1.5} style={{ fill: 'var(--cp-border2)' }} />
        ) : (
          <circle
            key={i}
            cx={x(i)}
            cy={y(d.mood)}
            r={i === days.length - 1 ? 5.5 : 3.5}
            strokeWidth="2"
            style={{
              fill: d.traffic ? DOT[d.traffic] : 'var(--cp-green)',
              stroke: 'var(--cp-card-bg)',
            }}
          >
            <title>{`${d.day}: ${d.mood}/10`}</title>
          </circle>
        )
      )}
      <text x={padL} y={H - 6} fontSize="11" style={{ fill: 'var(--cp-muted)' }}>
        {days.length} dage siden
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

/** Dansk ejefald: «Lars'», «Mias». */
function possessive(name: string): string {
  return /[sxz]$/i.test(name) ? `${name}'` : `${name}s`;
}

function formatWhen(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('da-DK', {
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Copenhagen',
  });
}

function formatDay(ymd: string): string {
  return new Date(`${ymd}T12:00:00Z`).toLocaleDateString('da-DK', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export default function ResidentForloebTab(p: ForloebProps) {
  const { openFortael, enabled: fortaelEnabled } = useFortael();
  const t = p.today.traffic ? TRAFFIC[p.today.traffic] : null;
  const hasMood = p.mood.some((d) => d.mood !== null);

  return (
    <div className="flex flex-col gap-6">
      <div
        className="flex flex-col gap-4 rounded-2xl border p-5 sm:flex-row sm:items-center sm:justify-between"
        style={card}
      >
        <div className="flex min-w-0 flex-col gap-2 sm:flex-row sm:items-start sm:gap-4">
          {t ? (
            <Chip label={t.label} fg={t.fg} bg={t.bg} />
          ) : (
            <Chip label="Intet tjek-ind i dag" fg="var(--cp-muted)" bg="var(--cp-bg3)" />
          )}
          <p
            className="max-w-[70ch] text-[15px] leading-relaxed"
            style={{ color: 'var(--cp-text)' }}
          >
            {p.today.note?.trim()
              ? `«${p.today.note.trim()}»`
              : p.today.mood !== null
                ? `${p.firstName} har givet humøret ${p.today.mood}/10${p.today.when ? ` (${p.today.when.toLowerCase()})` : ''}.`
                : `${p.firstName} har ikke tjekket ind i Lys i dag.`}
          </p>
        </div>
        {fortaelEnabled && (
          <button
            type="button"
            onClick={openFortael}
            className="inline-flex min-h-[48px] shrink-0 items-center justify-center gap-2 rounded-xl px-5 text-[15px] font-semibold"
            style={{ backgroundColor: 'var(--cp-green)', color: 'var(--cp-on-green)' }}
          >
            <Mic size={18} aria-hidden />
            Fortæl om {p.firstName}
          </button>
        )}
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
            {hasMood ? (
              <>
                <MoodChart days={p.mood} W={340} H={190} className="sm:hidden" />
                <MoodChart days={p.mood} className="hidden sm:block" />
                {p.moodSummary && (
                  <p className="mt-3 text-sm" style={{ color: 'var(--cp-text)' }}>
                    {p.moodSummary}
                  </p>
                )}
              </>
            ) : (
              <Empty>
                {p.firstName} har ikke tjekket ind i Lys de seneste {p.mood.length} dage. Kurven
                fyldes ud, når {p.firstName} bruger Lys.
              </Empty>
            )}
          </Section>

          <Section
            id="forloeb-maal"
            title="Hvad arbejder vi hen imod"
            aside={<TabLink tab="recovery">Recovery</TabLink>}
          >
            {p.goals.length === 0 ? (
              <Empty>
                Der er ingen aktive delmål endnu. Lav det første sammen med {p.firstName} under
                Recovery, eller lad {p.firstName} sætte et i Lys.
              </Empty>
            ) : (
              <ul className="flex flex-col gap-5">
                {p.goals.map((g, i) => (
                  <li key={g.id}>
                    <p className="text-[15px] font-semibold" style={{ color: 'var(--cp-text)' }}>
                      <span
                        className="mr-2 text-xs font-medium"
                        style={{ color: 'var(--cp-muted)' }}
                      >
                        Delmål {i + 1}
                      </span>
                      {g.title}
                    </p>
                    {g.description && (
                      <p className="mt-1 text-sm" style={{ color: 'var(--cp-text)' }}>
                        {g.description}
                      </p>
                    )}
                    {g.residentNote && (
                      <p className="mt-1 text-sm italic" style={{ color: 'var(--cp-text)' }}>
                        {p.firstName}: «{g.residentNote}»
                      </p>
                    )}
                    <p className="mt-1 text-xs" style={{ color: 'var(--cp-muted)' }}>
                      {g.byResident ? `Sat af ${p.firstName} i Lys` : 'Sat af personalet'}
                      {g.targetDate ? ` · mål ${formatDay(g.targetDate)}` : ''}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </Section>

          <Section id="forloeb-tidslinje" title="Hvad er der sket">
            {p.timeline.length === 0 ? (
              <Empty>Ingen notater, bekymringer eller tjek-ind de seneste 30 dage.</Empty>
            ) : (
              <ol
                className="relative flex flex-col gap-5 border-l pl-5"
                style={{ borderColor: 'var(--cp-border2)' }}
              >
                {p.timeline.map((it) => {
                  const k = KIND[it.kind];
                  return (
                    <li key={it.id} className="relative">
                      <span
                        className="absolute -left-[27px] top-1.5 h-3 w-3 rounded-full border-2"
                        style={{ backgroundColor: k.fg, borderColor: 'var(--cp-card-bg)' }}
                        aria-hidden
                      />
                      <div className="flex flex-wrap items-center gap-2">
                        <Chip label={k.label} fg={k.fg} bg={k.bg} />
                        {it.draft && (
                          <Chip label="Kladde" fg="var(--cp-muted)" bg="var(--cp-bg3)" />
                        )}
                        <span className="text-xs" style={{ color: 'var(--cp-muted)' }}>
                          {formatWhen(it.at)}
                        </span>
                      </div>
                      {it.title !== k.label && (
                        <p
                          className="mt-1 text-[15px] font-semibold"
                          style={{ color: 'var(--cp-text)' }}
                        >
                          {it.title}
                        </p>
                      )}
                      <p
                        className="line-clamp-4 whitespace-pre-line text-sm leading-relaxed"
                        style={{ color: 'var(--cp-text)' }}
                      >
                        {it.text}
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
            )}
          </Section>
        </div>

        <div className="flex min-w-0 flex-col gap-6">
          <section
            id="forloeb-egne-ord"
            className="rounded-2xl p-5"
            style={{ backgroundColor: 'var(--cp-ink)', color: '#e7edf3' }}
            aria-labelledby="forloeb-egne-ord-h"
          >
            <h2
              id="forloeb-egne-ord-h"
              className="text-[11px] font-semibold uppercase tracking-[0.1em]"
              style={{ color: 'var(--cp-ink-accent)' }}
            >
              {possessive(p.firstName)} egne ord
            </h2>
            {p.ownWords.length === 0 && !p.latestLysWords ? (
              <p className="mt-3 text-sm leading-relaxed" style={{ color: '#93a2b1' }}>
                {p.firstName} har ikke skrevet noget om sig selv i Lys endnu. Det kan I udfylde
                sammen under Recovery.
              </p>
            ) : (
              <ul className="mt-3 flex flex-col gap-4">
                {p.latestLysWords && (
                  <li>
                    <p className="text-[17px] leading-snug">«{p.latestLysWords.text}»</p>
                    <p className="mt-1 text-xs" style={{ color: '#93a2b1' }}>
                      {p.latestLysWords.when} · fra Lys
                    </p>
                  </li>
                )}
                {p.ownWords.map((w) => (
                  <li key={w.label}>
                    <p className="text-xs" style={{ color: '#93a2b1' }}>
                      {w.label}
                    </p>
                    <p className="mt-0.5 text-[16px] leading-snug">«{w.text}»</p>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <Section id="forloeb-naeste" title="Det næste">
            {p.next.length === 0 ? (
              <Empty>Ingen aftaler eller dokumentfrister de næste 14 dage.</Empty>
            ) : (
              <ul className="flex flex-col gap-1">
                {p.next.map((n) => {
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
                          className="block text-xs font-medium first-letter:uppercase"
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
                    <li key={n.id}>
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
            )}
          </Section>

          {p.meds.length > 0 && (
            <Section
              id="forloeb-medicin"
              title="Medicin i dag"
              aside={<TabLink tab="medicin">Medicin</TabLink>}
            >
              <ul className="flex flex-col gap-3">
                {p.meds.map((m) => {
                  const s = MED[m.status];
                  return (
                    <li key={m.id} className="flex items-center gap-3">
                      <span
                        className="cp-num w-12 shrink-0 text-xs"
                        style={{ color: 'var(--cp-muted)' }}
                      >
                        {m.status === 'pn' ? '' : m.time}
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
            </Section>
          )}

          <Section
            id="forloeb-tryghed"
            title="Når det bliver svært"
            aside={<HeartHandshake size={16} style={{ color: 'var(--cp-muted)' }} aria-hidden />}
          >
            {!p.crisis ? (
              <Empty>
                Der er ingen kriseplan endnu. Lav den sammen med {p.firstName} under Plan, så alle
                på vagt ved, hvad der hjælper.
              </Empty>
            ) : (
              <div className="flex flex-col gap-4">
                {p.crisis.warningSigns.length > 0 && (
                  <div>
                    <p className="text-xs font-semibold" style={{ color: 'var(--cp-muted)' }}>
                      Tegn på at det går den forkerte vej
                    </p>
                    <ul
                      className="mt-1 list-disc pl-5 text-[15px]"
                      style={{ color: 'var(--cp-text)' }}
                    >
                      {p.crisis.warningSigns.map((s) => (
                        <li key={s}>{s}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {(p.crisis.steps.length > 0 || p.crisis.helps.length > 0) && (
                  <div>
                    <p className="text-xs font-semibold" style={{ color: 'var(--cp-muted)' }}>
                      Det hjælper
                    </p>
                    <ol className="mt-2 flex flex-col gap-2">
                      {[...p.crisis.steps, ...p.crisis.helps].map((s, i) => (
                        <li
                          key={`${i}-${s}`}
                          className="flex gap-3 text-[15px]"
                          style={{ color: 'var(--cp-text)' }}
                        >
                          <span
                            className="cp-num flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold"
                            style={{
                              backgroundColor: 'var(--cp-green-dim)',
                              color: 'var(--cp-green)',
                            }}
                          >
                            {i + 1}
                          </span>
                          {s}
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
              </div>
            )}
            <div className="mt-4">
              <TabLink tab="plan">{p.crisis ? 'Ret kriseplanen' : 'Lav kriseplan'}</TabLink>
            </div>
          </Section>

          <button
            type="button"
            onClick={() => goToTab('overblik')}
            className="inline-flex min-h-[44px] items-center justify-between rounded-xl border px-4 text-sm font-medium"
            style={{
              borderColor: 'var(--cp-border2)',
              color: 'var(--cp-text)',
              backgroundColor: 'var(--cp-bg2)',
            }}
          >
            Alle detaljer om {p.firstName}
            <ChevronRight size={16} aria-hidden />
          </button>
        </div>
      </div>
    </div>
  );
}
