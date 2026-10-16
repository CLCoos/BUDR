'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Check, ChevronRight, Sparkles } from 'lucide-react';

/**
 * Demo af «Assistentens forslag»: samme udseende som i portalen, men med faste eksempler.
 * Knapperne virker lokalt (Godkend / Nej tak), intet gemmes.
 */

type Tone = 'frist' | 'medicin' | 'trafiklys' | 'opfoelgning' | 'fagsystem';

type DemoSuggestion = {
  id: string;
  tone: Tone;
  context: string;
  title: string;
  body: string;
  primary: { label: string; href?: string };
  secondary?: string;
  checklist?: string[];
};

const TONE: Record<Tone, { label: string; bg: string; fg: string }> = {
  frist: { label: 'Frist', bg: 'var(--cp-amber-dim)', fg: 'var(--cp-amber)' },
  medicin: { label: 'Medicin', bg: 'var(--cp-red)', fg: 'var(--cp-bg2)' },
  trafiklys: { label: 'Trafiklys', bg: 'var(--cp-red-dim)', fg: 'var(--cp-red)' },
  opfoelgning: { label: 'Opfølgning', bg: 'var(--cp-blue-dim)', fg: 'var(--cp-blue)' },
  fagsystem: { label: 'Fagsystem', bg: 'var(--cp-bg3)', fg: 'var(--cp-muted)' },
};

const SUGGESTIONS: DemoSuggestion[] = [
  {
    id: 'frist',
    tone: 'frist',
    context: 'Statusudtalelse · Sara Kristensen',
    title: 'Kommunen skal have statusudtalelsen for Sara senest om 6 dage.',
    body: 'Jeg har lavet et udkast ud fra 41 godkendte notater, handleplanen og de seneste trafiklys. Læs det igennem, og send det til godkendelse.',
    primary: { label: 'Åbn udkastet', href: '/care-portal-demo/dokumenter' },
  },
  {
    id: 'medicin',
    tone: 'medicin',
    context: 'Mikkel Thomsen · Quetiapin 08.00',
    title: 'Morgendosis er ikke registreret.',
    body: 'Alarmen gik til vagten kl. 08.15. Ring til den ansvarlige, hvis dosis ikke er givet inden kl. 09.00. Medicin ændres aldrig automatisk.',
    primary: { label: 'Se medicin i dag', href: '/care-portal-demo#demo-tour-dashboard' },
  },
  {
    id: 'trafiklys',
    tone: 'trafiklys',
    context: 'Camilla Birk · gul tre dage i træk',
    title: 'Skal jeg sætte en samtale med kontaktpersonen på i morgen kl. 10?',
    body: 'Camilla har meldt sig gul i Lys tre dage i træk og skriver, at hun sover dårligt.',
    primary: { label: 'Godkend' },
    secondary: 'Nej tak',
    checklist: [
      'Kalenderaftale i morgen kl. 10 med kontaktperson',
      'Kladde til journalnotat om søvn',
    ],
  },
  {
    id: 'opfoelgning',
    tone: 'opfoelgning',
    context: 'Anders Pedersen · lægeaftale i går',
    title: 'Anders var hos egen læge i går. Hvordan gik det?',
    body: 'Fortæl det med dine egne ord, så foreslår jeg et sundhedsnotat og eventuelle opgaver. Du godkender, før noget gemmes.',
    primary: { label: 'Godkend forslaget' },
    secondary: 'Nej tak',
    checklist: ['Sundhedsnotat: ny creme til såret, kontrol om 14 dage', 'Opgave: bestil tid'],
  },
  {
    id: 'fagsystem',
    tone: 'fagsystem',
    context: 'Dine notater fra i går',
    title: '2 godkendte notater mangler at blive overført til fagsystemet.',
    body: 'Kopiér dem med ét tryk, og sæt dem ind i jeres officielle journal.',
    primary: { label: 'Åbn listen', href: '/care-portal-demo/fagsystem' },
    secondary: 'Skjul',
  },
];

const btnBase =
  'inline-flex min-h-[40px] items-center gap-1.5 rounded-[10px] px-4 text-[13px] font-semibold transition-opacity hover:opacity-90';

export default function DemoAssistant() {
  const [done, setDone] = useState<Record<string, boolean>>({});
  const [hidden, setHidden] = useState<Record<string, boolean>>({});
  const visible = SUGGESTIONS.filter((s) => !hidden[s.id]);

  return (
    <section
      id="demo-tour-assistent"
      className="mb-6 overflow-hidden rounded-2xl border"
      style={{ backgroundColor: 'var(--cp-card-bg)', borderColor: 'var(--cp-border)' }}
      aria-labelledby="demo-assistant-title"
    >
      <div
        className="flex items-center gap-3 border-b px-4 py-4 sm:px-5"
        style={{ borderColor: 'var(--cp-border)' }}
      >
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px]"
          style={{ backgroundColor: 'var(--cp-green-dim)' }}
        >
          <Sparkles size={18} style={{ color: 'var(--cp-green)' }} aria-hidden />
        </span>
        <div className="min-w-0">
          <h2
            id="demo-assistant-title"
            className="text-base font-semibold"
            style={{ color: 'var(--cp-text)' }}
          >
            Assistenten har forberedt
          </h2>
          <p className="text-xs" style={{ color: 'var(--cp-muted)' }}>
            Intet gemmes, før du siger ja
          </p>
        </div>
        <span className="cp-num ml-auto text-xs" style={{ color: 'var(--cp-muted)' }}>
          {visible.length} forslag
        </span>
      </div>

      <ul>
        {visible.map((s) => {
          const tone = TONE[s.tone];
          const isDone = done[s.id];
          return (
            <li
              key={s.id}
              className="flex flex-col gap-2.5 border-b px-4 py-4 last:border-b-0 sm:px-5"
              style={{ borderColor: 'var(--cp-border)' }}
            >
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className="rounded-md px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.06em]"
                  style={{ backgroundColor: tone.bg, color: tone.fg }}
                >
                  {tone.label}
                </span>
                <span className="text-xs" style={{ color: 'var(--cp-muted)' }}>
                  {s.context}
                </span>
              </div>
              <p
                className="text-[15px] font-medium leading-snug"
                style={{ color: 'var(--cp-text)' }}
              >
                {s.title}
              </p>
              <p
                className="max-w-[68ch] text-sm leading-relaxed"
                style={{ color: 'var(--cp-muted)' }}
              >
                {s.body}
              </p>
              {s.checklist && (
                <ul className="flex flex-col gap-1 text-sm" style={{ color: 'var(--cp-text)' }}>
                  {s.checklist.map((c) => (
                    <li key={c} className="flex items-start gap-2">
                      <Check
                        size={15}
                        className="mt-0.5 shrink-0"
                        style={{ color: 'var(--cp-green)' }}
                        aria-hidden
                      />
                      {c}
                    </li>
                  ))}
                </ul>
              )}
              <div className="flex flex-wrap gap-2">
                {s.primary.href ? (
                  <Link
                    href={s.primary.href}
                    className={btnBase}
                    style={{ backgroundColor: 'var(--cp-text)', color: 'var(--cp-bg)' }}
                  >
                    {s.primary.label}
                    <ChevronRight size={15} aria-hidden />
                  </Link>
                ) : isDone ? (
                  <span
                    className={btnBase}
                    style={{ backgroundColor: 'var(--cp-green-dim)', color: 'var(--cp-green)' }}
                    role="status"
                  >
                    <Check size={15} aria-hidden />
                    Gemt (i demoen gemmes intet)
                  </span>
                ) : (
                  <button
                    type="button"
                    className={btnBase}
                    style={{ backgroundColor: 'var(--cp-green)', color: 'var(--cp-on-green)' }}
                    onClick={() => setDone((d) => ({ ...d, [s.id]: true }))}
                  >
                    {s.primary.label}
                  </button>
                )}
                {s.secondary && !isDone && (
                  <button
                    type="button"
                    className={btnBase}
                    style={{ backgroundColor: 'transparent', color: 'var(--cp-muted)' }}
                    onClick={() => setHidden((h) => ({ ...h, [s.id]: true }))}
                  >
                    {s.secondary}
                  </button>
                )}
              </div>
            </li>
          );
        })}
        {visible.length === 0 && (
          <li className="px-5 py-6 text-sm" style={{ color: 'var(--cp-muted)' }}>
            Ingen forslag lige nu. Assistenten melder sig, når der er noget.
          </li>
        )}
      </ul>
    </section>
  );
}
