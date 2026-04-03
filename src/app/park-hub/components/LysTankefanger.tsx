'use client';

import React, { useState } from 'react';
import { Volume2 } from 'lucide-react';
import type { LysThemeTokens } from '../lib/lysTheme';

const FEELINGS = ['Trist', 'Bange', 'Vred', 'Tom', 'Rastløs', 'Skam', 'Let', 'Håbefuld'];

/* Tankefanger logik findes i ThoughtCatcher.tsx — behold Supabase der; dette er nyt UI */

type Props = {
  tokens: LysThemeTokens;
  accent: string;
  firstName: string;
  reducedMotion: boolean;
  speak: (text: string) => void;
  sendCounterThought: (steps: {
    situation?: string;
    thought?: string;
    feeling?: string;
  }) => Promise<string | null>;
  onBack: () => void;
};

export default function LysTankefanger({
  tokens,
  accent,
  firstName,
  reducedMotion,
  speak,
  sendCounterThought,
  onBack,
}: Props) {
  const [step, setStep] = useState(0);
  const [situation, setSituation] = useState('');
  const [thought, setThought] = useState('');
  const [counter, setCounter] = useState<string | null>(null);
  const [closing, setClosing] = useState('');
  const [loading, setLoading] = useState(false);

  const dur = reducedMotion ? '0ms' : '280ms';

  const nextFromSituation = () => {
    if (!situation.trim()) return;
    setStep(1);
  };
  const nextFromThought = () => {
    if (!thought.trim()) return;
    setStep(2);
  };
  const onFeelingPick = async (f: string) => {
    setLoading(true);
    const text = await sendCounterThought({ situation, thought, feeling: f });
    setCounter(text);
    setLoading(false);
    setStep(3);
  };

  const finish = () => {
    if (!closing.trim()) return;
    setStep(5);
  };

  return (
    <div className="p-6" style={{ color: tokens.text }}>
      <button type="button" onClick={onBack} className="mb-6 min-h-[44px] text-lg opacity-80">
        ← Tilbage
      </button>

      <h1 className="mb-2 text-2xl font-bold">Hvad tænker du på?</h1>
      <p className="mb-8 text-lg opacity-80">
        Lys går roligt igennem nogle trin sammen med dig, {firstName}.
      </p>

      {step === 0 && (
        <div className="space-y-4 transition-opacity" style={{ transitionDuration: dur }}>
          <label className="block text-lg font-semibold" htmlFor="lys-tf-1">
            Hvad skete der?
          </label>
          <textarea
            id="lys-tf-1"
            value={situation}
            onChange={(e) => setSituation(e.target.value)}
            rows={4}
            className="w-full rounded-2xl border p-4 text-lg outline-none focus:ring-2"
            style={{
              borderColor: tokens.cardBorder,
              backgroundColor: tokens.cardBg,
              color: tokens.text,
            }}
          />
          <button
            type="button"
            onClick={nextFromSituation}
            className="min-h-[52px] w-full rounded-full py-4 text-lg font-semibold text-white"
            style={{ backgroundColor: accent }}
          >
            Videre
          </button>
        </div>
      )}

      {step === 1 && (
        <div className="space-y-4" style={{ transitionDuration: dur }}>
          <label className="block text-lg font-semibold" htmlFor="lys-tf-2">
            Hvad tænkte du?
          </label>
          <textarea
            id="lys-tf-2"
            value={thought}
            onChange={(e) => setThought(e.target.value)}
            rows={4}
            className="w-full rounded-2xl border p-4 text-lg outline-none focus:ring-2"
            style={{
              borderColor: tokens.cardBorder,
              backgroundColor: tokens.cardBg,
              color: tokens.text,
            }}
          />
          <button
            type="button"
            onClick={nextFromThought}
            className="min-h-[52px] w-full rounded-full py-4 text-lg font-semibold text-white"
            style={{ backgroundColor: accent }}
          >
            Videre
          </button>
        </div>
      )}

      {step === 2 && (
        <div>
          <p className="mb-4 text-lg font-semibold">Hvordan føltes det?</p>
          <div className="grid grid-cols-2 gap-2">
            {FEELINGS.map((f) => (
              <button
                key={f}
                type="button"
                disabled={loading}
                onClick={() => void onFeelingPick(f)}
                className="min-h-[48px] rounded-2xl py-3 text-base font-semibold transition-transform disabled:opacity-50"
                style={{
                  backgroundColor: tokens.accentSoft,
                  color: tokens.accentSoftText,
                }}
              >
                {f}
              </button>
            ))}
          </div>
          {loading ? (
            <p className="mt-6 text-center text-lg opacity-70">Lys tænker med dig …</p>
          ) : null}
        </div>
      )}

      {step === 3 && counter ? (
        <div className="space-y-6">
          <div
            className="rounded-2xl border-2 p-5 transition-all"
            style={{ borderColor: accent, backgroundColor: tokens.cardBg }}
          >
            <div className="mb-2 flex items-center justify-between gap-2">
              <p className="text-lg font-bold">Hvad hvis man også kunne se det sådan her...</p>
              <button
                type="button"
                onClick={() => speak(counter)}
                className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full"
                style={{ backgroundColor: tokens.accentSoft, color: accent }}
                aria-label="Læs højt"
              >
                <Volume2 className="h-5 w-5" />
              </button>
            </div>
            <p className="text-lg leading-relaxed">{counter}</p>
          </div>

          {!loading ? (
            <div className="space-y-3">
              <label className="block text-lg font-semibold" htmlFor="lys-tf-close">
                Hjælper det at tænke sådan? Hvordan føles det nu?
              </label>
              <textarea
                id="lys-tf-close"
                value={closing}
                onChange={(e) => setClosing(e.target.value)}
                rows={3}
                className="w-full rounded-2xl border p-4 text-lg outline-none focus:ring-2"
                style={{
                  borderColor: tokens.cardBorder,
                  backgroundColor: tokens.cardBg,
                  color: tokens.text,
                }}
              />
              <button
                type="button"
                onClick={finish}
                className="min-h-[52px] w-full rounded-full py-4 text-lg font-semibold text-white"
                style={{ backgroundColor: accent }}
              >
                Færdig for nu
              </button>
            </div>
          ) : null}
        </div>
      ) : null}

      {step === 5 && (
        <div className="rounded-2xl p-6 text-center" style={{ backgroundColor: tokens.accentSoft }}>
          <p className="text-xl font-semibold" style={{ color: tokens.accentSoftText }}>
            Tak for at du delte det, {firstName}. Lys er her, når du har brug for det.
          </p>
          <button
            type="button"
            onClick={onBack}
            className="mt-8 min-h-[52px] w-full rounded-full py-4 text-lg font-semibold text-white"
            style={{ backgroundColor: accent }}
          >
            Tilbage til Lys
          </button>
        </div>
      )}
    </div>
  );
}
