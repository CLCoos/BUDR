'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { trackEvent } from '@/lib/analytics';
import type { LysThemeTokens } from '../lib/lysTheme';

const STORAGE_KEY = 'budr_lys_onboarding_v1';

type Step = {
  title: string;
  body: string;
};

const STEPS: Step[] = [
  {
    title: 'Velkommen til Lys',
    body: 'Her får du overblik over dagen, kan skrive med Lys og sige til personalet, hvordan du har det — i dit eget tempo.',
  },
  {
    title: 'Fanerne nedenfor',
    body: 'Hjem er dit overblik. Dag viser din plan. Journal og Mig er til dig og dine ting. Tryk dig rundt, når du er klar.',
  },
  {
    title: 'Det du sender videre',
    body: 'Stemning, beskeder og forslag til personalet vises i deres portal, så de kan hjælpe dig. Det er meningen — dit bosted følger med.',
  },
];

type Props = {
  residentId: string;
  tokens: LysThemeTokens;
  accent: string;
  reducedMotion: boolean;
  hidden: boolean;
  /** Demo: ingen intro, så preview forbliver hurtigt */
  skip?: boolean;
};

function storageKeyFor(residentId: string) {
  return `${STORAGE_KEY}:${residentId}`;
}

export default function LysOnboarding({
  residentId,
  tokens,
  accent,
  reducedMotion,
  hidden,
  skip = false,
}: Props) {
  const [visible, setVisible] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (skip || hidden || !residentId) return;
    try {
      const done = localStorage.getItem(storageKeyFor(residentId));
      if (!done) setVisible(true);
    } catch {
      setVisible(true);
    }
  }, [skip, hidden, residentId]);

  const markDoneAndClose = useCallback(() => {
    try {
      localStorage.setItem(storageKeyFor(residentId), '1');
    } catch {
      /* ignore */
    }
    setVisible(false);
  }, [residentId]);

  const onSkip = useCallback(() => {
    trackEvent('lys_onboarding_skip', { step: step + 1 });
    markDoneAndClose();
  }, [markDoneAndClose, step]);

  const onComplete = useCallback(() => {
    trackEvent('lys_onboarding_complete');
    markDoneAndClose();
  }, [markDoneAndClose]);

  if (skip || !visible || hidden) return null;

  const s = STEPS[step] ?? STEPS[0];
  const isLast = step >= STEPS.length - 1;

  return (
    <div
      className="fixed inset-0 z-[60] flex flex-col justify-end sm:justify-center p-4 sm:p-6"
      style={{ backgroundColor: 'rgba(8,12,18,0.72)' }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="lys-onb-title"
      aria-describedby="lys-onb-desc"
    >
      <div
        className="mx-auto w-full max-w-lg rounded-3xl p-6 shadow-2xl"
        style={{
          backgroundColor: tokens.cardBg,
          border: `1px solid ${tokens.cardBorder}`,
          animation: reducedMotion ? undefined : 'lysOnbIn 0.35s ease-out',
        }}
      >
        <p
          className="text-[10px] font-bold tracking-[0.2em] uppercase mb-2"
          style={{ color: accent }}
        >
          Kort intro ({step + 1}/{STEPS.length})
        </p>
        <h2
          id="lys-onb-title"
          className="text-xl font-bold leading-tight mb-3"
          style={{ color: tokens.text }}
        >
          {s.title}
        </h2>
        <p
          id="lys-onb-desc"
          className="text-sm leading-relaxed mb-6"
          style={{ color: tokens.textMuted }}
        >
          {s.body}
        </p>

        <div className="flex gap-2 mb-3">
          {STEPS.map((_, i) => (
            <span
              key={i}
              className="h-1 flex-1 rounded-full transition-all duration-200"
              style={{
                backgroundColor: i === step ? accent : tokens.cardBorder,
                opacity: i === step ? 1 : 0.45,
              }}
            />
          ))}
        </div>

        <div className="flex flex-col-reverse sm:flex-row gap-2 sm:justify-between sm:items-center">
          <button
            type="button"
            onClick={onSkip}
            className="text-sm font-medium py-2.5 sm:py-0"
            style={{ color: tokens.textMuted }}
          >
            Spring over
          </button>
          <div className="flex gap-2">
            {step > 0 && (
              <button
                type="button"
                onClick={() => setStep((x) => Math.max(0, x - 1))}
                className="flex-1 sm:flex-none rounded-2xl px-5 py-3.5 text-sm font-semibold"
                style={{
                  backgroundColor: tokens.bg,
                  border: `1px solid ${tokens.cardBorder}`,
                  color: tokens.textMuted,
                }}
              >
                Tilbage
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                if (isLast) onComplete();
                else setStep((x) => x + 1);
              }}
              className="flex-1 sm:flex-none rounded-2xl px-6 py-3.5 text-sm font-bold text-white min-h-[48px]"
              style={{ backgroundColor: accent }}
            >
              {isLast ? 'Kom i gang' : 'Næste'}
            </button>
          </div>
        </div>
      </div>
      <style>{`
        @keyframes lysOnbIn {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
