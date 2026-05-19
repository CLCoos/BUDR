'use client';

import React, { useState } from 'react';
import { ChevronRight, ChevronLeft, Sparkles, Check, Bookmark, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import type { ChimeDomain } from '@/types/lys';
import type { StorageMode } from '@/types/local';
import type { LysThemeTokens } from '../lib/lysTheme';

type LysReflectionProps = {
  tokens: LysThemeTokens;
  accent: string;
  firstName: string;
  reducedMotion: boolean;
  speak?: (text: string) => void;
  storageMode: StorageMode;
  activeId: string | null;
  onBack: () => void;
};

type ReflectionResponse = {
  reflection_id: string;
  acknowledgment: string;
  strength_observed: string;
  next_step_suggestion: string;
  primary_chime_domain: ChimeDomain;
};

type Step = 1 | 2 | 3;

const PRIMARY_COLOR = '#7F77DD';

export default function LysReflection({
  tokens,
  firstName,
  reducedMotion,
  speak,
  storageMode,
  onBack,
}: LysReflectionProps) {
  const [step, setStep] = useState<Step>(1);
  const [situation, setSituation] = useState('');
  const [whatWasHard, setWhatWasHard] = useState('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<ReflectionResponse | null>(null);
  const [savedNextStep, setSavedNextStep] = useState(false);
  const [done, setDone] = useState(false);

  async function fetchReflection() {
    if (!situation.trim()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/lys/reflection', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          situation: situation.trim(),
          what_was_hard: whatWasHard.trim() || undefined,
        }),
      });
      if (!res.ok) {
        toast.error('Lys kunne ikke svare lige nu. Prøv igen om lidt.');
        return;
      }
      const data = (await res.json()) as ReflectionResponse;
      setResponse(data);
      setStep(3);
      if (speak) {
        speak(`${data.acknowledgment} ${data.strength_observed}`);
      }
    } catch {
      toast.error('Der var en fejl. Tjek dit net og prøv igen.');
    } finally {
      setLoading(false);
    }
  }

  async function saveAsNextStep() {
    if (!response) return;
    setSavedNextStep(true);
    try {
      const res = await fetch('/api/lys/next-step', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          title: response.next_step_suggestion,
          related_chime_domain: response.primary_chime_domain,
          related_reflection_id: response.reflection_id,
        }),
      });
      if (!res.ok) {
        // Hvis route ikke findes endnu (bygges i #4e), så gem mildt og fortsæt
        if (res.status === 404) {
          toast.success('Skridtet er noteret hos Lys 🌱');
        } else {
          toast.error('Kunne ikke gemme lige nu. Prøv igen senere.');
          setSavedNextStep(false);
          return;
        }
      } else {
        toast.success('Gemt som dit næste skridt 🌱');
      }
    } catch {
      toast.success('Skridtet er noteret hos Lys 🌱');
    }
  }

  function handleFinish() {
    setDone(true);
  }

  function handleReset() {
    setStep(1);
    setSituation('');
    setWhatWasHard('');
    setResponse(null);
    setSavedNextStep(false);
    setDone(false);
  }

  // ─── Skærm: Afsluttet ──────────────────────────────
  if (done) {
    return (
      <div
        className="flex flex-col items-center justify-center min-h-[480px] p-8 text-center"
        style={{ color: tokens.text }}
      >
        <div className="text-5xl mb-4" aria-hidden>
          🌱
        </div>
        <div className="text-lg font-semibold mb-2">Tak fordi du delte det her med mig.</div>
        <div className="text-sm opacity-70 mb-8 max-w-xs leading-relaxed">
          Når du er klar, kan du gå tilbage til Lys eller starte en ny refleksion.
        </div>
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <button
            onClick={onBack}
            className="py-3 px-5 rounded-2xl text-sm font-semibold text-white active:scale-[0.98] transition-transform"
            style={{ backgroundColor: PRIMARY_COLOR }}
          >
            Tilbage til Lys
          </button>
          <button
            onClick={handleReset}
            className="py-3 px-5 rounded-2xl text-sm font-medium border"
            style={{
              color: tokens.text,
              borderColor: 'rgba(0,0,0,0.08)',
            }}
          >
            Start ny refleksion
          </button>
        </div>
      </div>
    );
  }

  // ─── Hovedskærm ────────────────────────────────────
  return (
    <div
      className="flex flex-col min-h-[480px] p-6"
      style={{ color: tokens.text, backgroundColor: tokens.bg }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={onBack}
          className="p-2 -ml-2 rounded-lg active:scale-95"
          aria-label="Tilbage"
        >
          <ChevronLeft size={20} />
        </button>
        <div className="text-xs opacity-60 tracking-wider uppercase">Refleksion med Lys</div>
        <div className="w-9" />
      </div>

      {/* Progress dots — kun trin 1 og 2 */}
      {step < 3 && (
        <div className="flex items-center justify-center gap-2 mb-8">
          {[1, 2].map((n) => (
            <div
              key={n}
              className="h-1.5 rounded-full transition-all"
              style={{
                width: step === n ? '32px' : '8px',
                backgroundColor: step >= n ? PRIMARY_COLOR : 'rgba(0,0,0,0.12)',
              }}
            />
          ))}
        </div>
      )}

      {/* ─── Trin 1: Hvad er der sket? ─── */}
      {step === 1 && (
        <div className="flex-1 flex flex-col">
          <div className="text-xl font-semibold mb-2 leading-snug">Hvad er der sket?</div>
          <div className="text-sm opacity-70 mb-5 leading-relaxed">
            Fortæl Lys hvad du har oplevet. Brug dine egne ord — der er ingen rigtige svar.
          </div>
          <textarea
            value={situation}
            onChange={(e) => setSituation(e.target.value)}
            placeholder="Skriv her..."
            className="w-full text-base rounded-2xl p-4 resize-none border focus:outline-none transition-colors"
            style={{
              borderColor: situation ? PRIMARY_COLOR : 'rgba(0,0,0,0.08)',
              backgroundColor: tokens.cardBg,
              color: tokens.text,
              minHeight: '160px',
            }}
            rows={6}
            autoFocus
          />
          <div className="mt-auto pt-6">
            <button
              onClick={() => setStep(2)}
              disabled={!situation.trim()}
              className="w-full py-3.5 rounded-2xl text-sm font-semibold text-white active:scale-[0.98] transition-transform disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-1"
              style={{ backgroundColor: PRIMARY_COLOR }}
            >
              Næste <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ─── Trin 2: Hvad var svært? ─── */}
      {step === 2 && (
        <div className="flex-1 flex flex-col">
          <div className="text-xl font-semibold mb-2 leading-snug">Hvad var svært ved det?</div>
          <div className="text-sm opacity-70 mb-5 leading-relaxed">
            Hvis du har lyst til at sætte ord på det svære. Du må også gerne springe over.
          </div>
          <textarea
            value={whatWasHard}
            onChange={(e) => setWhatWasHard(e.target.value)}
            placeholder="Skriv her hvis du vil..."
            className="w-full text-base rounded-2xl p-4 resize-none border focus:outline-none transition-colors"
            style={{
              borderColor: whatWasHard ? PRIMARY_COLOR : 'rgba(0,0,0,0.08)',
              backgroundColor: tokens.cardBg,
              color: tokens.text,
              minHeight: '140px',
            }}
            rows={5}
          />
          <div className="mt-auto pt-6 flex gap-3">
            <button
              onClick={() => setStep(1)}
              className="py-3.5 px-5 rounded-2xl text-sm font-medium border"
              style={{
                color: tokens.text,
                borderColor: 'rgba(0,0,0,0.08)',
              }}
            >
              Tilbage
            </button>
            <button
              onClick={fetchReflection}
              disabled={loading}
              className="flex-1 py-3.5 rounded-2xl text-sm font-semibold text-white active:scale-[0.98] transition-transform disabled:opacity-50 flex items-center justify-center gap-2"
              style={{ backgroundColor: PRIMARY_COLOR }}
            >
              {loading ? (
                <>
                  <Loader2 size={16} className={reducedMotion ? '' : 'animate-spin'} />
                  Lys tænker...
                </>
              ) : (
                <>
                  <Sparkles size={16} />
                  Vis mig Lys' svar
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ─── Trin 3: Lys' svar ─── */}
      {step === 3 && response && (
        <div className="flex-1 flex flex-col">
          <div className="text-xs opacity-60 uppercase tracking-wider mb-3">
            Lys siger til {firstName}
          </div>

          {/* Card 1: Anerkendelse */}
          <div className="rounded-2xl p-4 mb-3" style={{ backgroundColor: tokens.cardBg }}>
            <div className="text-xs opacity-60 mb-1.5">Det jeg hører</div>
            <div className="text-sm leading-relaxed">{response.acknowledgment}</div>
          </div>

          {/* Card 2: Styrke set */}
          <div className="rounded-2xl p-4 mb-3" style={{ backgroundColor: tokens.cardBg }}>
            <div className="text-xs opacity-60 mb-1.5">Det jeg ser hos dig</div>
            <div className="text-sm leading-relaxed">{response.strength_observed}</div>
          </div>

          {/* Card 3: Næste skridt */}
          <div
            className="rounded-2xl p-4 mb-4 border-2"
            style={{
              backgroundColor: tokens.cardBg,
              borderColor: `${PRIMARY_COLOR}30`,
            }}
          >
            <div className="flex items-center gap-1.5 mb-1.5">
              <Sparkles size={12} style={{ color: PRIMARY_COLOR }} />
              <div className="text-xs opacity-70">Et lille næste skridt</div>
            </div>
            <div className="text-sm leading-relaxed font-medium mb-3">
              {response.next_step_suggestion}
            </div>

            {savedNextStep ? (
              <div
                className="flex items-center gap-1.5 text-xs font-medium py-2"
                style={{ color: PRIMARY_COLOR }}
              >
                <Check size={14} />
                Gemt som dit næste skridt
              </div>
            ) : (
              <button
                onClick={saveAsNextStep}
                className="w-full py-2.5 rounded-xl text-sm font-semibold border-2 active:scale-[0.98] transition-transform flex items-center justify-center gap-1.5"
                style={{
                  borderColor: PRIMARY_COLOR,
                  color: PRIMARY_COLOR,
                }}
              >
                <Bookmark size={14} />
                Gem som mit næste skridt
              </button>
            )}
          </div>

          <div className="mt-auto pt-2">
            <button
              onClick={handleFinish}
              className="w-full py-3.5 rounded-2xl text-sm font-semibold text-white active:scale-[0.98] transition-transform"
              style={{ backgroundColor: PRIMARY_COLOR }}
            >
              Tak, jeg har set det
            </button>
            <div className="text-xs opacity-40 text-center mt-3">
              {storageMode === 'supabase' ? 'Refleksionen er gemt' : 'Refleksionen er gemt lokalt'}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
