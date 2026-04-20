'use client';

import React, { useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, Heart, Users } from 'lucide-react';
import type { LysThemeTokens } from '../lib/lysTheme';

export type ShiftStaff = {
  id: string;
  first: string;
  lastInitial: string;
  avatarBg: string;
  initials: string;
  kontaktperson?: boolean;
};

export type ShiftBlock = {
  label: string;
  hours: string;
  staff: ShiftStaff[];
  current?: boolean;
};

/* Supabase (senere): care_staff_shifts — filtrer på bosted + dato */

const MOCK_DAY: ShiftBlock[] = [
  {
    label: 'Dagvagt',
    hours: '07:00–15:00',
    current: true,
    staff: [
      {
        id: '1',
        first: 'Sara',
        lastInitial: 'K.',
        initials: 'SK',
        avatarBg: '#C4B5FD',
        kontaktperson: true,
      },
      {
        id: '2',
        first: 'Michael',
        lastInitial: 'T.',
        initials: 'MT',
        avatarBg: '#93C5FD',
      },
    ],
  },
  {
    label: 'Aftenvagt',
    hours: '15:00–23:00',
    staff: [
      { id: '3', first: 'Louise', lastInitial: 'B.', initials: 'LB', avatarBg: '#FCA5A5' },
      { id: '4', first: 'Jonas', lastInitial: 'M.', initials: 'JM', avatarBg: '#86EFAC' },
    ],
  },
  {
    label: 'Nattevagt',
    hours: '22:00–07:00',
    staff: [{ id: '5', first: 'Pernille', lastInitial: 'A.', initials: 'PA', avatarBg: '#FCD34D' }],
  },
];

const MOCK_WEEK = [
  { key: 'man', label: 'Man 24/3', pills: ['SK', 'MT', 'LB'] },
  { key: 'tir', label: 'Tir 25/3', pills: ['JM', 'PA'] },
  { key: 'ons', label: 'Ons 26/3', pills: ['SK', 'LB'] },
  { key: 'tor', label: 'Tor 27/3', pills: ['MT', 'JM'] },
  { key: 'fre', label: 'Fre 28/3', pills: ['SK', 'MT'] },
  { key: 'lør', label: 'Lør 29/3', pills: ['LB', 'PA'] },
  { key: 'søn', label: 'Søn 30/3', pills: ['SK', 'JM'] },
];

type Props = {
  tokens: LysThemeTokens;
  accent: string;
  reducedMotion: boolean;
};

export default function LysVagtplan({ tokens, accent, reducedMotion }: Props) {
  const dur = reducedMotion ? 0 : 300;
  const [expanded, setExpanded] = useState(false);
  const blocks = useMemo(() => MOCK_DAY, []);

  return (
    <section
      className="rounded-2xl border p-6 shadow-sm transition-all"
      style={{
        transitionDuration: `${dur}ms`,
        backgroundColor: tokens.cardBg,
        borderColor: tokens.cardBorder,
        color: tokens.text,
      }}
      aria-labelledby="lys-vagtplan-heading"
    >
      <div className="mb-4 flex items-center gap-2">
        <Users className="h-5 w-5 shrink-0" style={{ color: accent }} aria-hidden />
        <h2 id="lys-vagtplan-heading" className="text-lg font-semibold">
          Personale i dag
        </h2>
      </div>

      <div className="space-y-5">
        {blocks.map((block) => (
          <div key={block.label}>
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <p className="text-base font-semibold" style={{ color: tokens.text }}>
                {block.label}
              </p>
              <span className="text-base opacity-60">({block.hours})</span>
              {block.current ? (
                <span className="rounded-full bg-green-100 px-2 py-1 text-base font-medium text-green-700">
                  På vagt nu
                </span>
              ) : null}
            </div>
            <ul className="flex flex-wrap gap-4">
              {block.staff.map((s) => (
                <li key={s.id} className="flex min-w-[44px] items-center gap-2">
                  <div
                    className="flex shrink-0 items-center justify-center rounded-full font-semibold text-white transition-transform"
                    style={{
                      width: s.kontaktperson ? 40 : 32,
                      height: s.kontaktperson ? 40 : 32,
                      backgroundColor: s.avatarBg,
                      fontSize: s.kontaktperson ? 14 : 12,
                      boxShadow: block.current ? `0 0 0 3px ${accent}55` : undefined,
                    }}
                    aria-hidden
                  >
                    {s.initials}
                  </div>
                  <div className="min-w-0">
                    <p
                      className="flex items-center gap-1 text-base font-semibold"
                      style={{ color: tokens.text }}
                    >
                      {s.first} {s.lastInitial}
                      {s.kontaktperson ? (
                        <span className="inline-flex" title="Din kontaktperson">
                          <Heart
                            className="h-4 w-4 shrink-0 text-rose-400"
                            aria-label="Din kontaktperson"
                          />
                        </span>
                      ) : null}
                    </p>
                    {s.kontaktperson ? (
                      <p className="text-base opacity-70" style={{ color: tokens.text }}>
                        Din kontaktperson
                      </p>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        className="mt-5 flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl py-3 text-base font-semibold transition-colors"
        style={{ color: accent, backgroundColor: tokens.accentSoft }}
        aria-expanded={expanded}
      >
        {expanded ? (
          <>
            Skjul ugens plan <ChevronUp className="h-5 w-5" aria-hidden />
          </>
        ) : (
          <>
            Se hele ugens vagtplan <ChevronDown className="h-5 w-5" aria-hidden />
          </>
        )}
      </button>

      <div
        className="grid transition-[grid-template-rows] duration-300 ease-out"
        style={{
          gridTemplateRows: expanded ? '1fr' : '0fr',
        }}
      >
        <div className="overflow-hidden">
          <ul
            className="mt-4 space-y-2 border-t pt-4 text-base"
            style={{ borderColor: tokens.cardBorder }}
          >
            {MOCK_WEEK.map((row) => (
              <li key={row.key} className="flex flex-wrap items-center gap-2">
                <span className="w-24 shrink-0 font-medium opacity-80">{row.label}</span>
                <div className="flex flex-wrap gap-1">
                  {row.pills.map((p) => (
                    <span
                      key={p}
                      className="rounded-full px-2 py-1 font-mono text-base font-semibold text-white"
                      style={{ backgroundColor: accent }}
                    >
                      {p}
                    </span>
                  ))}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
