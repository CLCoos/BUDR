'use client';

import React, { useState } from 'react';
import type { LysThemeTokens } from '../lib/lysTheme';

export type Traffic = 'groen' | 'gul' | 'roed';

const MOODS = [
  { emoji: '☀️', label: 'Fantastisk', sub: 'Fuldt af energi', traffic: 'groen' as const },
  { emoji: '🌤', label: 'Godt', sub: 'En god dag', traffic: 'groen' as const },
  { emoji: '⛅', label: 'Okay', sub: 'Hverken eller', traffic: 'gul' as const },
  { emoji: '🌥', label: 'Lidt tungt', sub: 'Lidt svær start', traffic: 'gul' as const },
  { emoji: '🌧', label: 'Svært', sub: 'Har brug for støtte', traffic: 'roed' as const },
  { emoji: '⛈', label: 'Meget svært', sub: 'Rigtig hårdt', traffic: 'roed' as const },
];

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

  const handleSubmit = () => {
    if (selected === null) return;
    const m = MOODS[selected]!;
    onComplete({ label: m.label, traffic: m.traffic, note: note.trim() });
  };

  return (
    <div className="min-h-dvh px-5 py-6" style={{ color: tokens.text }}>
      <button
        type="button"
        onClick={onBack}
        className="mb-8 flex h-10 w-10 items-center justify-center rounded-full text-lg transition-all duration-200 active:scale-90"
        style={{ backgroundColor: tokens.cardBg, color: tokens.textMuted }}
        aria-label="Tilbage"
      >
        ←
      </button>

      <h1 className="text-3xl font-black leading-tight tracking-tight mb-1">Hvordan har du det?</h1>
      <p className="text-base mb-8" style={{ color: tokens.textMuted }}>
        Hej {firstName} — der er ikke nogen forkerte svar.
      </p>

      <div className="grid grid-cols-2 gap-3 max-w-md mx-auto">
        {MOODS.map((m, i) => {
          const active = selected === i;
          return (
            <button
              key={m.label}
              type="button"
              onClick={() => setSelected(i)}
              className="flex flex-col items-center justify-center gap-2 rounded-3xl px-3 py-5 text-center transition-all duration-200 active:scale-[0.93]"
              style={{
                background: active
                  ? `linear-gradient(155deg, ${accent}, ${accent}bb)`
                  : tokens.cardBg,
                border: active ? 'none' : `1px solid ${tokens.cardBorder}`,
                boxShadow: active ? tokens.glowShadow : tokens.shadow,
                color: active ? '#fff' : tokens.text,
                transform: active && !reducedMotion ? 'scale(1.04)' : 'scale(1)',
              }}
              aria-pressed={active}
            >
              <span className="text-4xl leading-none" aria-hidden>
                {m.emoji}
              </span>
              <div>
                <p className="text-sm font-bold leading-tight">{m.label}</p>
                <p
                  className="text-xs mt-0.5 leading-tight"
                  style={{ color: active ? 'rgba(255,255,255,0.70)' : tokens.textMuted }}
                >
                  {m.sub}
                </p>
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-8 max-w-md mx-auto">
        <label
          htmlFor="lys-mood-note"
          className="block text-sm font-semibold mb-2"
          style={{ color: tokens.textMuted }}
        >
          Vil du fortælle Lys mere? (valgfrit)
        </label>
        <textarea
          id="lys-mood-note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          rows={3}
          placeholder="Skriv gerne lidt…"
          className="w-full rounded-2xl px-4 py-3 text-base outline-none resize-none transition-all"
          style={{
            backgroundColor: tokens.cardBg,
            border: `1px solid ${tokens.cardBorder}`,
            color: tokens.text,
          }}
        />
      </div>

      <div className="max-w-md mx-auto mt-5">
        <button
          type="button"
          disabled={selected === null}
          onClick={handleSubmit}
          className="w-full rounded-2xl py-4 text-base font-bold text-white transition-all duration-200 active:scale-[0.97] disabled:opacity-35"
          style={{
            background: `linear-gradient(135deg, ${accent}, ${accent}cc)`,
            boxShadow: selected !== null ? `0 6px 24px ${accent}30` : 'none',
          }}
        >
          {selected !== null ? `Send "${MOODS[selected]!.label}" til Lys` : 'Vælg et humør først'}
        </button>
      </div>
    </div>
  );
}
