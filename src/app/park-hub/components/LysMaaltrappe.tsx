'use client';

import React, { useState } from 'react';
import { Check, Lock } from 'lucide-react';
import type { LysThemeTokens } from '../lib/lysTheme';

const MOCK_STEPS = [
  { id: '1', title: 'Gå en kort tur', done: true },
  { id: '2', title: 'Skriv tre linjer i dagbogen', done: false, active: true },
  { id: '3', title: 'Ring til en du savner', done: false },
  { id: '4', title: 'Deltag i fællesspisning', done: false },
];

/* Mål — se GoalLadder.tsx for datamodel; dette er nyt UI */

type Props = {
  tokens: LysThemeTokens;
  accent: string;
  firstName: string;
  reducedMotion: boolean;
  onBack: () => void;
};

export default function LysMaaltrappe({ tokens, accent, firstName, reducedMotion, onBack }: Props) {
  const [steps, setSteps] = useState(MOCK_STEPS);
  const [celebrate, setCelebrate] = useState(false);

  const activeIdx = steps.findIndex((s) => s.active);
  const canComplete = activeIdx >= 0 && !steps[activeIdx]!.done;

  const completeActive = () => {
    if (!canComplete) return;
    setSteps((prev) => {
      const next = prev.map((s, i) => {
        if (i === activeIdx) return { ...s, done: true, active: false };
        return s;
      });
      const nxt = next.findIndex((s, i) => i > activeIdx && !s.done);
      if (nxt >= 0) next[nxt] = { ...next[nxt]!, active: true };
      return next;
    });
    setCelebrate(true);
    window.setTimeout(() => setCelebrate(false), reducedMotion ? 800 : 3200);
  };

  return (
    <div className="relative min-h-[70vh] p-6" style={{ color: tokens.text }}>
      <button
        type="button"
        onClick={onBack}
        className="relative z-10 mb-6 min-h-[44px] text-lg opacity-80"
      >
        ← Tilbage
      </button>

      <h1 className="relative z-10 mb-2 text-2xl font-bold">Din måltrappe</h1>
      <p className="relative z-10 mb-10 text-lg opacity-80">
        Vil du arbejde på et af dine mål, {firstName}?
      </p>

      <ol className="relative z-10 mx-auto flex max-w-md flex-col gap-4">
        {steps.map((s, i) => {
          const locked = !s.done && !s.active;
          return (
            <li
              key={s.id}
              className="flex items-stretch gap-3 transition-all"
              style={{
                opacity: s.done ? 0.45 : 1,
                transitionDuration: reducedMotion ? '0ms' : '300ms',
              }}
            >
              <div
                className="flex w-10 shrink-0 flex-col items-center"
                style={{ color: locked ? tokens.textMuted : accent }}
              >
                <div
                  className="min-h-[24px] flex-1 border-s-2 border-dashed"
                  style={{ borderColor: `${accent}44` }}
                />
                <div
                  className="my-1 flex h-10 w-10 items-center justify-center rounded-full border-2"
                  style={{ borderColor: accent }}
                >
                  {s.done ? (
                    <Check className="h-5 w-5" aria-label="Klaret" />
                  ) : locked ? (
                    <Lock className="h-5 w-5" aria-hidden />
                  ) : (
                    <span className="font-bold">{i + 1}</span>
                  )}
                </div>
                <div
                  className="min-h-[24px] flex-1 border-s-2 border-dashed"
                  style={{ borderColor: `${accent}44` }}
                />
              </div>
              <div
                className="flex-1 rounded-2xl border p-4 transition-shadow"
                style={{
                  borderColor: s.active ? accent : tokens.cardBorder,
                  backgroundColor: tokens.cardBg,
                  boxShadow: s.active ? `0 0 24px ${accent}33` : undefined,
                }}
              >
                <p className="text-lg font-semibold">{s.title}</p>
                {s.active && !s.done ? (
                  <button
                    type="button"
                    onClick={completeActive}
                    className="mt-4 min-h-[48px] w-full rounded-full py-3 text-lg font-semibold text-white"
                    style={{ backgroundColor: accent }}
                  >
                    Marker som klaret
                  </button>
                ) : null}
              </div>
            </li>
          );
        })}
      </ol>

      {celebrate ? (
        <div
          className="pointer-events-none absolute inset-0 z-20 flex flex-col items-center justify-center p-6"
          style={{ backgroundColor: `${tokens.bg}ee` }}
          role="status"
        >
          <ConfettiBurst reducedMotion={reducedMotion} accent={accent} />
          <div
            className="mt-8 flex h-20 w-20 items-center justify-center rounded-full text-white"
            style={{ backgroundColor: accent }}
          >
            <Check className="h-10 w-10" strokeWidth={3} aria-hidden />
          </div>
          <p
            className="mt-8 max-w-sm text-center text-2xl font-bold leading-snug"
            style={{ color: tokens.text }}
          >
            Det her er stort, {firstName}. Du tog et skridt fremad i dag. 🎉
          </p>
        </div>
      ) : null}
    </div>
  );
}

function ConfettiBurst({ reducedMotion, accent }: { reducedMotion: boolean; accent: string }) {
  const pieces = Array.from({ length: 18 }).map((_, i) => ({
    id: i,
    left: `${(i * 37) % 100}%`,
    delay: reducedMotion ? 0 : (i % 5) * 0.08,
    rot: (i * 47) % 360,
  }));
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {pieces.map((p) => (
        <span
          key={p.id}
          className={`absolute top-1/2 h-3 w-3 rounded-sm ${reducedMotion ? 'opacity-40' : 'animate-lys-confetti'}`}
          style={{
            left: p.left,
            backgroundColor: p.id % 2 === 0 ? accent : '#F59E0B',
            animationDelay: reducedMotion ? undefined : `${p.delay}s`,
            transform: `rotate(${p.rot}deg)`,
          }}
        />
      ))}
    </div>
  );
}
