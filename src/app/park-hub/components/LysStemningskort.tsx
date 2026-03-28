'use client';

import React, { useState } from 'react';
import type { LysThemeTokens } from '../lib/lysTheme';

export type Traffic = 'groen' | 'gul' | 'roed';

const MOODS = [
  { emoji: '☀️', label: 'Fantastisk', traffic: 'groen' as const },
  { emoji: '🌤', label: 'Godt', traffic: 'groen' as const },
  { emoji: '⛅', label: 'Okay', traffic: 'gul' as const },
  { emoji: '🌥', label: 'Lidt tungt', traffic: 'gul' as const },
  { emoji: '🌧', label: 'Svært', traffic: 'roed' as const },
  { emoji: '⛈', label: 'Meget svært', traffic: 'roed' as const },
];

/* Data: trafiklys gemmes stille — senere INSERT park_daily_checkin el.lign. */

type Props = {
  tokens: LysThemeTokens;
  accent: string;
  firstName: string;
  reducedMotion: boolean;
  onComplete: (payload: { label: string; traffic: Traffic; note: string }) => void;
  onBack: () => void;
};

export default function LysStemningskort({
  tokens,
  accent,
  firstName,
  reducedMotion,
  onComplete,
  onBack,
}: Props) {
  const [selected, setSelected] = useState<number | null>(null);
  const [note, setNote] = useState('');

  const dur = reducedMotion ? '0ms' : '200ms';

  const handleSubmit = () => {
    if (selected === null) return;
    const m = MOODS[selected]!;
    onComplete({ label: m.label, traffic: m.traffic, note: note.trim() });
  };

  return (
    <div className="min-h-0 p-6" style={{ color: tokens.text }}>
      <button
        type="button"
        onClick={onBack}
        className="mb-6 min-h-[44px] rounded-xl px-2 text-lg opacity-80 transition-opacity hover:opacity-100"
        style={{ color: tokens.text }}
      >
        ← Tilbage
      </button>

      <h1 className="mb-2 text-center text-2xl font-bold">Hvordan har du det?</h1>
      <p className="mb-8 text-center text-lg opacity-80">
        Hej {firstName}. Vælg det der passer bedst — der er ikke nogen forkerte svar.
      </p>

      <div className="mx-auto grid max-w-md grid-cols-2 gap-3">
        {MOODS.map((m, i) => {
          const active = selected === i;
          return (
            <button
              key={m.label}
              type="button"
              onClick={() => setSelected(i)}
              className="flex h-[100px] flex-col items-center justify-center gap-1 rounded-2xl border-4 text-center transition-all"
              style={{
                borderColor: active ? accent : 'transparent',
                backgroundColor: tokens.cardBg,
                boxShadow: active ? '0 10px 25px rgba(0,0,0,0.12)' : undefined,
                transform: active ? 'scale(1.06)' : 'scale(1)',
                transitionDuration: dur,
              }}
              aria-pressed={active}
            >
              <span className="text-3xl" aria-hidden>
                {m.emoji}
              </span>
              <span className="text-base font-semibold">{m.label}</span>
            </button>
          );
        })}
      </div>

      <label className="mx-auto mt-8 block max-w-md text-lg" htmlFor="lys-mood-note">
        Vil du fortælle Lys mere? (valgfrit)
      </label>
      <textarea
        id="lys-mood-note"
        value={note}
        onChange={e => setNote(e.target.value)}
        rows={3}
        className="mx-auto mt-2 block w-full max-w-md rounded-2xl border p-4 text-lg outline-none transition-shadow focus:ring-2"
        style={{
          borderColor: tokens.cardBorder,
          backgroundColor: tokens.cardBg,
          color: tokens.text,
          boxShadow: `0 0 0 0 ${accent}`,
        }}
      />

      <button
        type="button"
        disabled={selected === null}
        onClick={handleSubmit}
        className="mx-auto mt-8 flex min-h-[52px] w-full max-w-md items-center justify-center rounded-full py-4 text-lg font-semibold text-white transition-opacity disabled:opacity-40"
        style={{ backgroundColor: accent }}
      >
        Send til Lys
      </button>
    </div>
  );
}
