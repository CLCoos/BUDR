'use client';

import React, { useMemo } from 'react';
import { CalendarDays, Stethoscope } from 'lucide-react';
import type { LysThemeTokens } from '../lib/lysTheme';

export type ProgramItemType = 'struktur' | 'aftale' | 'aktivitet' | 'andet';

export type ProgramItem = {
  time: string;
  title: string;
  type: ProgramItemType;
  subtitle?: string;
  elevated?: boolean;
  nyIDag?: boolean;
};

const TYPE_DOT: Record<ProgramItemType, string> = {
  struktur: '🔵',
  aftale: '🟣',
  aktivitet: '🟢',
  andet: '🟡',
};

const TYPE_LABEL: Record<ProgramItemType, string> = {
  struktur: 'Fast struktur',
  aftale: 'Aftale',
  aktivitet: 'Aktivitet',
  andet: 'Andet',
};

function parseTime(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

function mockTodayItems(): ProgramItem[] {
  return [
    { time: '07:30', title: 'Morgenmad', type: 'struktur' },
    { time: '08:00', title: 'Morgenmedicin', type: 'struktur' },
    {
      time: '09:00',
      title: 'Lægebesøg',
      type: 'aftale',
      subtitle: 'Aalborg Universitetshospital',
      elevated: true,
      nyIDag: true,
    },
    { time: '12:00', title: 'Frokost', type: 'struktur' },
    { time: '14:00', title: 'Kreativ værksted', type: 'aktivitet' },
    { time: '17:30', title: 'Middagsmedicin', type: 'struktur' },
    { time: '18:00', title: 'Aftensmad', type: 'struktur' },
    { time: '21:00', title: 'Aftenmedicin', type: 'struktur' },
    { time: '22:00', title: 'Sengetid', type: 'struktur' },
  ];
}

/* Supabase (senere): hent fra care_schedule per beboer — JOIN lokation, ansvarlig */

type Props = {
  tokens: LysThemeTokens;
  accent: string;
  now?: Date;
};

export default function LysDagensProgram({ tokens, accent, now = new Date() }: Props) {
  const items = useMemo(() => mockTodayItems(), []);
  const nowMin = now.getHours() * 60 + now.getMinutes();

  const formatter = useMemo(
    () =>
      new Intl.DateTimeFormat('da-DK', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
      }),
    [],
  );
  const dateLine = formatter.format(now);
  const dateLineCap = dateLine.charAt(0).toUpperCase() + dateLine.slice(1);

  const allPast = items.every(i => parseTime(i.time) < nowMin);

  const nextIdx = items.findIndex(i => parseTime(i.time) >= nowMin);
  const placeholders = nextIdx >= 0 ? Math.min(2, items.length - nextIdx - 1) : 0;

  return (
    <section
      className="rounded-2xl border p-6 shadow-sm transition-colors duration-300"
      style={{
        backgroundColor: tokens.cardBg,
        borderColor: tokens.cardBorder,
        color: tokens.text,
      }}
      aria-labelledby="lys-dagens-program-heading"
    >
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-6 w-6 shrink-0" style={{ color: accent }} aria-hidden />
          <h2 id="lys-dagens-program-heading" className="text-xl font-bold">
            Din dag i dag
          </h2>
        </div>
        <p className="text-base opacity-60" style={{ color: tokens.text }}>
          {dateLineCap}
        </p>
      </div>

      <ol className="relative space-y-0 border-s-2 ps-6" style={{ borderColor: `${accent}40` }}>
        {items.map((item, idx) => {
          const past = parseTime(item.time) < nowMin;
          const isNext = idx === nextIdx && !past;

          if (item.elevated) {
            return (
              <li key={`${item.time}-${item.title}`} className="relative mb-4 ms-2 list-none">
                <span
                  className="absolute -start-[1.6rem] top-3 h-3 w-3 rounded-full border-2"
                  style={{ borderColor: accent, backgroundColor: tokens.cardBg }}
                  aria-hidden
                />
                <div
                  className="relative overflow-hidden rounded-2xl border-2 bg-white p-4 shadow-sm transition-transform duration-300"
                  style={{
                    borderColor: accent,
                    opacity: past ? 0.55 : 1,
                    transform: isNext && !past ? 'scale(1.01)' : undefined,
                  }}
                >
                  {item.nyIDag ? (
                    <span className="absolute end-3 top-3 rounded-full bg-amber-100 px-2 py-1 text-base font-semibold text-amber-700">
                      Ny i dag
                    </span>
                  ) : null}
                  <div className="flex gap-3 pe-16">
                    <div
                      className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
                      style={{ backgroundColor: tokens.accentSoft }}
                    >
                      <Stethoscope className="h-6 w-6" style={{ color: accent }} aria-hidden />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="mb-1 font-mono text-base font-semibold" style={{ color: accent }}>
                        {item.time}
                      </p>
                      <p className="text-lg font-bold" style={{ color: tokens.text }}>
                        {item.title}
                      </p>
                      {item.subtitle ? (
                        <p className="mt-1 text-base opacity-60" style={{ color: tokens.text }}>
                          {item.subtitle}
                        </p>
                      ) : null}
                      <p className="mt-2 text-base">
                        <span aria-hidden>{TYPE_DOT[item.type]}</span>{' '}
                        <span className="opacity-80">{TYPE_LABEL[item.type]}</span>
                      </p>
                    </div>
                  </div>
                </div>
              </li>
            );
          }

          return (
            <li
              key={`${item.time}-${item.title}`}
              className="relative mb-4 ms-2 list-none last:mb-0"
              style={{ opacity: past ? 0.5 : 1 }}
            >
              <span
                className="absolute -start-[1.45rem] top-2 h-2.5 w-2.5 rounded-full"
                style={{ backgroundColor: accent }}
                aria-hidden
              />
              <div className="flex flex-wrap items-baseline gap-2 gap-y-1">
                <span
                  className="inline-flex rounded-full px-3 py-1 font-mono text-base font-semibold"
                  style={{ backgroundColor: tokens.accentSoft, color: tokens.accentSoftText }}
                >
                  {item.time}
                </span>
                <span className="text-lg font-semibold" style={{ color: tokens.text }}>
                  {item.title}
                </span>
                <span className="text-base" aria-label={TYPE_LABEL[item.type]}>
                  <span aria-hidden>{TYPE_DOT[item.type]}</span>
                </span>
              </div>
            </li>
          );
        })}

        {!allPast &&
          Array.from({ length: placeholders }).map((_, i) => (
            <li
              key={`placeholder-${i}`}
              className="relative mb-3 ms-2 list-none rounded-xl border border-dashed ps-2"
              style={{ borderColor: `${accent}35`, minHeight: 48 }}
            >
              <span className="sr-only">Ledig tid senere på dagen</span>
            </li>
          ))}
      </ol>

      {allPast ? (
        <p className="mt-6 text-center text-lg opacity-80" style={{ color: tokens.text }}>
          Det er alt for i dag 🌙
        </p>
      ) : null}
    </section>
  );
}
