'use client';

import React, { useMemo, useState } from 'react';
import type { LysThemeTokens } from '../lib/lysTheme';

const PETALS = [
  { id: 'familie', title: 'Familie', question: 'Hvordan har du det med familien lige nu?' },
  { id: 'venner', title: 'Venner', question: 'Hvordan er det med dine venner?' },
  { id: 'krop', title: 'Krop', question: 'Hvordan har din krop det?' },
  { id: 'sind', title: 'Sind', question: 'Hvordan har dit sind det?' },
  { id: 'bolig', title: 'Bolig', question: 'Hvordan trives du hvor du bor?' },
  { id: 'oekonomi', title: 'Økonomi', question: 'Hvordan føles økonomien?' },
  { id: 'aktivitet', title: 'Aktivitet', question: 'Hvordan med aktivitet og energi?' },
  { id: 'fremtid', title: 'Fremtid', question: 'Hvordan ser du på fremtiden lige nu?' },
] as const;

/* Bevar ResourceFlower datamodel i ResourceFlower.tsx — denne skærm er kun nyt UI */

type Props = {
  tokens: LysThemeTokens;
  accent: string;
  firstName: string;
  reducedMotion: boolean;
  onDone: () => void;
  onBack: () => void;
};

export default function LysBlomst({ tokens, accent, firstName, reducedMotion, onDone, onBack }: Props) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [complete, setComplete] = useState(false);

  const petal = PETALS[index]!;
  const progress = index + 1;
  const total = PETALS.length;

  const fillRatio = useMemo(() => (complete ? 1 : (index + Object.keys(answers).length * 0.02) / total), [complete, index, answers, total]);

  const pick = (v: string) => {
    setAnswers(a => ({ ...a, [petal.id]: v }));
    if (index < total - 1) setIndex(i => i + 1);
    else setComplete(true);
  };

  const dur = reducedMotion ? 0 : 500;

  if (complete) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center" style={{ color: tokens.text }}>
        <BloomSvg accent={accent} fill={fillRatio} reducedMotion={reducedMotion} />
        <h2 className="mt-8 text-2xl font-bold">Din blomst i dag</h2>
        <p className="mt-2 text-lg opacity-80">
          {new Intl.DateTimeFormat('da-DK', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())}
        </p>
        <p className="mx-auto mt-4 max-w-sm text-lg">
          Tak, {firstName}. Lys ser, at du har givet plads til mange dele af livet i dag.
        </p>
        <button
          type="button"
          onClick={onDone}
          className="mt-10 min-h-[52px] rounded-full px-8 py-4 text-lg font-semibold text-white"
          style={{ backgroundColor: accent }}
        >
          Tilbage til Lys
        </button>
      </div>
    );
  }

  return (
    <div className="p-6" style={{ color: tokens.text }}>
      <button
        type="button"
        onClick={onBack}
        className="mb-4 min-h-[44px] text-lg opacity-80"
        style={{ color: tokens.text }}
      >
        ← Tilbage
      </button>

      <div className="mb-6 flex justify-center gap-2">
        {PETALS.map((petal, i) => (
          <span
            key={petal.id}
            className="h-2.5 w-2.5 rounded-full transition-all"
            style={{
              backgroundColor: i <= index ? accent : `${tokens.text}22`,
              transform: i === index ? 'scale(1.25)' : undefined,
              transitionDuration: `${dur}ms`,
            }}
            aria-label={`Trin ${i + 1} af ${total}`}
          />
        ))}
      </div>

      <p className="mb-2 text-center text-base opacity-60">
        {progress}/{total}
      </p>
      <h1 className="mb-10 text-center text-2xl font-bold">{petal.title}</h1>
      <p className="mb-10 text-center text-xl font-medium leading-relaxed">{petal.question}</p>

      <div className="mx-auto flex max-w-md flex-col gap-3">
        {(['Godt', 'Okay', 'Svært'] as const).map(opt => (
          <button
            key={opt}
            type="button"
            onClick={() => pick(opt)}
            className="min-h-[52px] rounded-full py-4 text-lg font-semibold transition-transform"
            style={{
              backgroundColor: tokens.accentSoft,
              color: tokens.accentSoftText,
              transform: reducedMotion ? undefined : 'scale(1)',
            }}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
}

function BloomSvg({
  accent,
  fill,
  reducedMotion,
}: {
  accent: string;
  fill: number;
  reducedMotion: boolean;
}) {
  const petals = 8;
  const angle = 360 / petals;
  return (
    <svg width="200" height="200" viewBox="0 0 200 200" aria-hidden className="overflow-visible">
      <circle cx="100" cy="100" r="18" fill={accent} opacity={0.9} />
      {Array.from({ length: petals }).map((_, i) => {
        const rot = i * angle;
        const on = fill * petals >= i + 0.001;
        return (
          <ellipse
            key={i}
            cx="100"
            cy="52"
            rx="22"
            ry="40"
            fill={on ? accent : `${accent}33`}
            transform={`rotate(${rot} 100 100)`}
            style={{
              transition: reducedMotion ? undefined : 'fill 0.4s ease',
            }}
          />
        );
      })}
    </svg>
  );
}
