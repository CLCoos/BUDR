'use client';

import React, { useState } from 'react';
import type { LysThemeTokens } from '../lib/lysTheme';

/*
 * Supabase (senere): INSERT INTO care_daily_wins (resident_id, note, created_at)
 */

const MOCK_PREVIOUS = [
  'Jeg fik ringet til min søster.',
  'Jeg gik ud og mærkede solen.',
  'Jeg hjalp med at dække bord.',
  'Jeg fik sovet lidt bedre.',
  'Jeg sagde pænt nej til noget der blev for meget.',
  'Jeg drak vand og spiste morgenmad.',
];

type Props = {
  tokens: LysThemeTokens;
  accent: string;
  firstName: string;
  onBack: () => void;
};

export default function LysDagligSejr({ tokens, accent, firstName, onBack }: Props) {
  const [text, setText] = useState('');
  const [saved, setSaved] = useState<string[]>(MOCK_PREVIOUS);
  const [showJournal, setShowJournal] = useState(false);

  const save = () => {
    const t = text.trim();
    if (!t) return;
    setSaved((s) => [...s, t]);
    setText('');
  };

  return (
    <div className="p-6" style={{ color: tokens.text }}>
      <button type="button" onClick={onBack} className="mb-6 min-h-[44px] text-lg opacity-80">
        ← Tilbage
      </button>

      <h1 className="mb-4 text-2xl font-bold">Dagens lille sejr</h1>
      <p className="mb-8 text-lg leading-relaxed opacity-90">
        Hvad gik godt i dag — stort eller småt, {firstName}? Selv det mindste tæller.
      </p>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={4}
        className="w-full rounded-2xl border p-4 text-lg outline-none focus:ring-2"
        style={{
          borderColor: tokens.cardBorder,
          backgroundColor: tokens.cardBg,
          color: tokens.text,
        }}
        placeholder="Skriv her, hvis du har lyst …"
      />

      <button
        type="button"
        onClick={save}
        className="mt-4 min-h-[52px] w-full rounded-full py-4 text-lg font-semibold text-white"
        style={{ backgroundColor: accent }}
      >
        Gem hos Lys
      </button>

      {saved.length >= 7 ? (
        <button
          type="button"
          onClick={() => setShowJournal((j) => !j)}
          className="mt-6 min-h-[48px] w-full rounded-2xl border-2 py-3 text-lg font-semibold transition-colors"
          style={{ borderColor: accent, color: accent }}
        >
          {showJournal ? 'Skjul' : 'Se'} din sejrsdagbog
        </button>
      ) : null}

      {showJournal ? (
        <ul
          className="mt-6 space-y-3 rounded-2xl border p-4"
          style={{ borderColor: tokens.cardBorder, backgroundColor: tokens.cardBg }}
        >
          {saved.map((line, i) => (
            <li key={`${i}-${line.slice(0, 12)}`} className="text-lg leading-snug opacity-90">
              · {line}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
