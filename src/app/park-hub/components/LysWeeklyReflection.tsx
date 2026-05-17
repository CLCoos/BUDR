'use client';

import React, { useState } from 'react';
import { toast } from 'sonner';
import { ArrowLeft, Heart, Users, Sun, User, Compass, Loader2 } from 'lucide-react';
import type { StorageMode } from '@/types/local';
import type { LysThemeTokens } from '../lib/lysTheme';

type ScoreKey =
  | 'connectedness_score'
  | 'hope_score'
  | 'identity_score'
  | 'meaning_score'
  | 'empowerment_score';

type LysWeeklyReflectionProps = {
  tokens: LysThemeTokens;
  accent?: string;
  firstName?: string;
  reducedMotion?: boolean;
  onBack?: () => void;
  onDone?: () => void;
  storageMode?: StorageMode;
};

const PRIMARY_COLOR = '#7F77DD';

const SECTIONS: {
  key: ScoreKey;
  icon: React.ReactNode;
  title: string;
  question: string;
}[] = [
  {
    key: 'connectedness_score',
    icon: <Users size={20} />,
    title: 'Forbundethed',
    question: 'Hvor meget har du følt dig forbundet med andre i denne uge?',
  },
  {
    key: 'hope_score',
    icon: <Sun size={20} />,
    title: 'Håb',
    question: 'Hvor meget håb har du følt for fremtiden?',
  },
  {
    key: 'identity_score',
    icon: <User size={20} />,
    title: 'Identitet',
    question: 'Hvor godt har du følt dig som dig selv?',
  },
  {
    key: 'meaning_score',
    icon: <Compass size={20} />,
    title: 'Mening',
    question: 'Hvor meningsfuld har ugen været?',
  },
  {
    key: 'empowerment_score',
    icon: <Heart size={20} />,
    title: 'Handlekraft',
    question: 'Hvor meget har du følt at du selv har styret din uge?',
  },
];

function ScoreSlider({
  value,
  onChange,
  accent,
  mutedBg,
  reducedMotion,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  accent: string;
  mutedBg: string;
  reducedMotion?: boolean;
}) {
  const transition = reducedMotion ? '' : 'transition-colors duration-150';
  return (
    <div className="space-y-2">
      <div className="flex justify-between text-xs opacity-60 px-0.5">
        <span>Lidt</span>
        <span>Meget</span>
      </div>
      <div className="flex gap-1.5 justify-between">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
          const active = value !== null && n <= value;
          return (
            <button
              key={n}
              type="button"
              onClick={() => onChange(n)}
              className={`flex-1 min-w-0 max-w-[28px] aspect-square rounded-full ${transition} active:scale-95`}
              style={{
                backgroundColor: active ? accent : mutedBg,
                minHeight: 28,
              }}
              aria-label={`${n} af 10`}
            />
          );
        })}
      </div>
    </div>
  );
}

export default function LysWeeklyReflection({
  tokens,
  accent = PRIMARY_COLOR,
  reducedMotion,
  onBack,
  onDone,
}: LysWeeklyReflectionProps) {
  const [scores, setScores] = useState<Record<ScoreKey, number | null>>({
    connectedness_score: null,
    hope_score: null,
    identity_score: null,
    meaning_score: null,
    empowerment_score: null,
  });
  const [freeText, setFreeText] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const mutedBg = tokens.textMuted ? `${tokens.textMuted}22` : 'rgba(0,0,0,0.08)';

  const hasAnyInput = Object.values(scores).some((v) => v !== null) || freeText.trim().length > 0;

  async function handleSubmit() {
    setSubmitting(true);
    try {
      const res = await fetch('/api/lys/weekly-reflection', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ ...scores, free_text: freeText.trim() || null }),
      });
      if (res.status === 404) {
        toast.error('Kunne ikke gemme — prøv igen om et øjeblik');
        return;
      }
      if (!res.ok) {
        toast.error('Noget gik galt. Prøv igen.');
        return;
      }
      toast.success('Tak — din refleksion er gemt');
      onDone?.();
    } catch {
      toast.error('Ingen forbindelse. Prøv igen.');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="flex flex-col min-h-[480px] pb-28"
      style={{ backgroundColor: tokens.bg, color: tokens.text }}
    >
      <div className="flex items-center gap-2 px-6 pt-6 pb-2">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="p-2 -ml-2 rounded-lg active:scale-95"
            aria-label="Tilbage"
          >
            <ArrowLeft size={20} />
          </button>
        ) : (
          <div className="w-9" />
        )}
        <div className="flex-1">
          <h1 className="text-lg font-semibold">Ugens refleksion</h1>
          <p className="text-sm opacity-70 mt-0.5 leading-relaxed">
            Tag et øjeblik til at tænke tilbage. Alt er frivilligt.
          </p>
        </div>
      </div>

      <div className="flex-1 px-6 overflow-y-auto space-y-5">
        {SECTIONS.map((section) => {
          const value = scores[section.key];
          return (
            <section
              key={section.key}
              className="rounded-2xl p-4"
              style={{
                backgroundColor: tokens.cardBg,
                borderWidth: 1,
                borderColor: tokens.cardBorder,
              }}
            >
              <div className="flex items-center gap-2 mb-2" style={{ color: accent }}>
                {section.icon}
                <h2 className="text-sm font-semibold" style={{ color: tokens.text }}>
                  {section.title}
                </h2>
              </div>
              <p className="text-sm opacity-80 leading-relaxed mb-3">{section.question}</p>
              <ScoreSlider
                value={value}
                onChange={(v) => setScores((prev) => ({ ...prev, [section.key]: v }))}
                accent={accent}
                mutedBg={mutedBg}
                reducedMotion={reducedMotion}
              />
              <div className="flex items-center justify-between mt-3">
                <span className="text-xs opacity-60">
                  {value === null ? 'Ingen vurdering' : `${value} / 10`}
                </span>
                <button
                  type="button"
                  onClick={() => setScores((prev) => ({ ...prev, [section.key]: null }))}
                  className="text-xs font-medium opacity-70 underline-offset-2 hover:underline"
                >
                  Spring over
                </button>
              </div>
            </section>
          );
        })}

        <section
          className="rounded-2xl p-4"
          style={{
            backgroundColor: tokens.cardBg,
            borderWidth: 1,
            borderColor: tokens.cardBorder,
          }}
        >
          <label className="text-sm font-medium block mb-2">Vil du tilføje noget om ugen?</label>
          <textarea
            value={freeText}
            onChange={(e) => setFreeText(e.target.value.slice(0, 2000))}
            maxLength={2000}
            rows={4}
            placeholder="Vil du tilføje noget om ugen?"
            className="w-full text-sm rounded-xl p-3 resize-none border focus:outline-none"
            style={{
              borderColor: tokens.cardBorder,
              backgroundColor: tokens.bg,
              color: tokens.text,
            }}
          />
          <p className="text-xs opacity-50 text-right mt-1">{freeText.length} / 2000</p>
        </section>
      </div>

      <div
        className="fixed bottom-0 left-0 right-0 px-6 py-4 border-t max-w-lg mx-auto"
        style={{ backgroundColor: tokens.bg, borderColor: tokens.cardBorder }}
      >
        <button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={!hasAnyInput || submitting}
          className={`w-full py-3.5 rounded-2xl text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-40 active:scale-[0.98] ${reducedMotion ? '' : 'transition-transform'}`}
          style={{ backgroundColor: accent }}
        >
          {submitting ? (
            <>
              <Loader2 size={18} className={reducedMotion ? '' : 'animate-spin'} />
              Gemmer...
            </>
          ) : (
            'Gem refleksion'
          )}
        </button>
      </div>
    </div>
  );
}
