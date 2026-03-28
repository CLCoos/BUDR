'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { LogOut, Mic, Volume2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { getLysPhase, lysTheme, type LysPhase } from '../lib/lysTheme';
import { useLysConversation } from '../hooks/useLysConversation';
import { useSpeech } from '../hooks/useSpeech';
import LysDagensProgram from './LysDagensProgram';
import LysVagtplan from './LysVagtplan';
import LysStemningskort from './LysStemningskort';
import LysBlomst from './LysBlomst';
import LysTankefanger from './LysTankefanger';
import LysMaaltrappe from './LysMaaltrappe';
import LysKrisekort from './LysKrisekort';
import LysDagligSejr from './LysDagligSejr';
import LysUgeTilbageblik from './LysUgeTilbageblik';

type View =
  | 'home'
  | 'mood'
  | 'flower'
  | 'thought'
  | 'goals'
  | 'dailyWin'
  | 'crisis';

type Props = {
  firstName: string;
  initials: string;
  residentId: string;
};

function greetingCopy(phase: LysPhase, name: string): { title: string; question: string } {
  switch (phase) {
    case 'morning':
      return {
        title: `Godmorgen, ${name} ☀️`,
        question: 'Hvordan startede dagen?',
      };
    case 'afternoon':
      return {
        title: `Hej igen, ${name} 🌤`,
        question: 'Hvad har fyldt mest siden i morges?',
      };
    case 'evening':
      return {
        title: `God aften, ${name} 🌙`,
        question: 'Hvordan har du haft det i dag?',
      };
    default:
      return {
        title: `Hej ${name}.`,
        question: 'Kan du ikke sove? Lys er her. 💙',
      };
  }
}

export default function LysHome({ firstName, initials, residentId }: Props) {
  const router = useRouter();
  const [now, setNow] = useState(() => new Date());
  const [reducedMotion, setReducedMotion] = useState(false);
  const [view, setView] = useState<View>('home');
  const [moodLabel, setMoodLabel] = useState<string | null>(null);
  const [moodTraffic, setMoodTraffic] = useState<'groen' | 'gul' | 'roed' | null>(null);
  const [showLysCard, setShowLysCard] = useState(false);
  const [nextStep, setNextStep] = useState<{ label: string; target: View } | null>(null);

  const phase = useMemo(() => getLysPhase(now), [now]);
  const tokens = useMemo(() => lysTheme(phase), [phase]);
  const accent = tokens.accent;

  const { messages, loading, sendToLys, sendCounterThought } = useLysConversation({
    firstName,
    phase,
    moodLabel,
  });

  const { isListening, liveTranscript, startListening, stopListening, clearTranscript, speak } = useSpeech();

  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const fn = () => setReducedMotion(mq.matches);
    fn();
    mq.addEventListener('change', fn);
    return () => mq.removeEventListener('change', fn);
  }, []);

  const isSundayEvening = now.getDay() === 0 && now.getHours() >= 17;
  const { title: greetTitle, question: greetQ } = greetingCopy(phase, firstName);

  const lastAssistant = useMemo(
    () => [...messages].reverse().find(m => m.role === 'assistant')?.content ?? null,
    [messages],
  );

  const suggestNextStep = useCallback(
    (opts: { moodJustCaptured?: boolean; traffic?: 'groen' | 'gul' | 'roed' | null }) => {
      const traffic = opts.traffic ?? moodTraffic;
      const hasMood = opts.moodJustCaptured || moodLabel !== null;
      if (!hasMood) {
        setNextStep({ label: 'Hvordan har du det?', target: 'mood' });
        return;
      }
      if (phase === 'evening' && traffic !== 'roed') {
        setNextStep({ label: 'Hvad gik godt i dag?', target: 'dailyWin' });
        return;
      }
      const pool: { label: string; target: View }[] = [
        { label: 'Lad os se på din blomst.', target: 'flower' },
        { label: 'Skal vi tage en tanke roligt sammen?', target: 'thought' },
        { label: 'Vil du arbejde på et af dine mål?', target: 'goals' },
      ];
      setNextStep(pool[Math.floor(Math.random() * pool.length)]!);
    },
    [moodLabel, moodTraffic, phase],
  );

  const pillToMessage: Record<string, string> = {
    'Godt 😊': 'Jeg har det godt.',
    'Okay 😐': 'Jeg har det okay.',
    'Svært 😔': 'Jeg har det svært.',
  };

  const handlePill = async (pill: string) => {
    setShowLysCard(true);
    setNextStep(null);
    await sendToLys(pillToMessage[pill] ?? pill);
    suggestNextStep({});
  };

  const handleVoiceSend = async (text: string) => {
    setShowLysCard(true);
    setNextStep(null);
    await sendToLys(text);
    suggestNextStep({});
  };

  const handleMicToggle = () => {
    if (isListening) {
      const t = liveTranscript.trim();
      stopListening();
      if (t) void handleVoiceSend(t);
      clearTranscript();
      return;
    }
    clearTranscript();
    startListening();
  };

  const handleMoodComplete = async (payload: { label: string; traffic: 'groen' | 'gul' | 'roed'; note: string }) => {
    setMoodLabel(payload.label);
    setMoodTraffic(payload.traffic);
    if (payload.label === 'Meget svært' || payload.traffic === 'roed') {
      setView('crisis');
      return;
    }
    setView('home');
    setShowLysCard(true);
    setNextStep(null);
    const note = payload.note ? ` Jeg skrev også: ${payload.note}` : '';
    await sendToLys(`Jeg har det sådan her: ${payload.label}.${note}`);
    suggestNextStep({ moodJustCaptured: true, traffic: payload.traffic });
  };

  const handleLogout = async () => {
    await fetch('/api/resident-session', { method: 'DELETE' });
    router.replace(`/login/${residentId || 'unknown'}`);
  };

  const goHome = () => {
    window.scrollTo({ top: 0, behavior: reducedMotion ? 'auto' : 'smooth' });
    setView('home');
  };

  const speakSafe = (t: string) => speak(t, reducedMotion);

  if (view !== 'home') {
    return (
      <div
        className="relative min-h-screen font-sans transition-colors duration-500"
        style={{ backgroundColor: tokens.bg, color: tokens.text }}
      >
        <div className="mx-auto max-w-lg pb-28">
          {view === 'mood' ? (
            <LysStemningskort
              tokens={tokens}
              accent={accent}
              firstName={firstName}
              reducedMotion={reducedMotion}
              onBack={() => setView('home')}
              onComplete={handleMoodComplete}
            />
          ) : null}
          {view === 'flower' ? (
            <LysBlomst
              tokens={tokens}
              accent={accent}
              firstName={firstName}
              reducedMotion={reducedMotion}
              onBack={() => setView('home')}
              onDone={() => setView('home')}
            />
          ) : null}
          {view === 'thought' ? (
            <LysTankefanger
              tokens={tokens}
              accent={accent}
              firstName={firstName}
              reducedMotion={reducedMotion}
              speak={speakSafe}
              sendCounterThought={sendCounterThought}
              onBack={() => setView('home')}
            />
          ) : null}
          {view === 'goals' ? (
            <LysMaaltrappe
              tokens={tokens}
              accent={accent}
              firstName={firstName}
              reducedMotion={reducedMotion}
              onBack={() => setView('home')}
            />
          ) : null}
          {view === 'dailyWin' ? (
            <LysDagligSejr tokens={tokens} accent={accent} firstName={firstName} onBack={() => setView('home')} />
          ) : null}
          {view === 'crisis' ? (
            <div className="p-6 pt-12">
              <LysKrisekort firstName={firstName} onClose={() => setView('home')} />
            </div>
          ) : null}
        </div>
        <FloatingLys accent={accent} reducedMotion={reducedMotion} onClick={goHome} />
      </div>
    );
  }

  return (
    <div
      className="relative min-h-screen font-sans transition-colors duration-500"
      style={{ backgroundColor: tokens.bg, color: tokens.text }}
    >
      <header className="flex items-center justify-between p-6">
        <span className="text-xl font-bold" style={{ color: accent }}>
          Lys
        </span>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white"
              style={{ backgroundColor: 'var(--budr-purple, #7F77DD)' }}
              aria-hidden
            >
              {initials}
            </div>
            <span className="text-base font-medium opacity-90">{firstName}</span>
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full transition-colors"
            style={{ color: tokens.textMuted }}
            aria-label="Log ud"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-lg space-y-6 px-6 pb-32">
        {isSundayEvening ? (
          <LysUgeTilbageblik tokens={tokens} accent={accent} firstName={firstName} phase={phase} reducedMotion={reducedMotion} />
        ) : (
          <section
            className="rounded-2xl border p-6 shadow-sm transition-all duration-500"
            style={{
              borderColor: tokens.cardBorder,
              background: `linear-gradient(160deg, ${tokens.gradientFrom}, ${tokens.gradientTo})`,
              color: tokens.text,
            }}
          >
            <h1 className="text-center text-2xl font-bold leading-snug">{greetTitle}</h1>
            <p className="mt-3 text-center text-lg opacity-80">{greetQ}</p>

            <div className="mt-8 flex flex-col gap-3">
              {(['Godt 😊', 'Okay 😐', 'Svært 😔'] as const).map(pill => (
                <button
                  key={pill}
                  type="button"
                  onClick={() => void handlePill(pill)}
                  disabled={loading}
                  className="w-full rounded-full py-4 text-lg font-semibold transition-transform disabled:opacity-50"
                  style={{
                    backgroundColor: tokens.accentSoft,
                    color: tokens.accentSoftText,
                    transform: reducedMotion ? undefined : undefined,
                  }}
                >
                  {pill}
                </button>
              ))}
            </div>
          </section>
        )}

        <LysDagensProgram tokens={tokens} accent={accent} now={now} />
        <LysVagtplan tokens={tokens} accent={accent} reducedMotion={reducedMotion} />

        <section className="flex flex-col items-center gap-2 py-2">
          <button
            type="button"
            onClick={handleMicToggle}
            className={`relative flex h-16 w-16 items-center justify-center rounded-full text-white shadow-lg transition-transform ${
              isListening && !reducedMotion ? 'animate-pulse' : ''
            }`}
            style={{
              backgroundColor: accent,
              boxShadow: isListening ? `0 0 0 6px ${accent}44` : undefined,
            }}
            aria-pressed={isListening}
            aria-label={isListening ? 'Stop optagelse' : 'Tal med Lys'}
          >
            <Mic className="h-7 w-7" />
          </button>
          <span className="text-base opacity-60">Tal med Lys</span>
          {liveTranscript ? (
            <p className="max-w-full text-center text-lg opacity-90">{liveTranscript}</p>
          ) : null}
          {isListening ? (
            <p className="text-base opacity-70">{reducedMotion ? 'Lytter …' : 'Lytter … Tryk igen når du er færdig'}</p>
          ) : null}
        </section>

        {showLysCard && (lastAssistant || loading) ? (
          <div
            className="rounded-2xl border p-6 shadow-md transition-opacity duration-500"
            style={{
              borderColor: tokens.cardBorder,
              backgroundColor: tokens.cardBg,
              opacity: loading ? 0.85 : 1,
            }}
          >
            <div className="flex items-start gap-3">
              <div
                className={`mt-1 h-10 w-10 shrink-0 rounded-full ${reducedMotion ? '' : 'animate-pulse-soft'}`}
                style={{ backgroundColor: `${accent}55` }}
                aria-hidden
              />
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-lg font-semibold" style={{ color: accent }}>
                    Lys
                  </p>
                  {lastAssistant && !loading ? (
                    <button
                      type="button"
                      onClick={() => speakSafe(lastAssistant)}
                      className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full"
                      style={{ backgroundColor: tokens.accentSoft, color: accent }}
                      aria-label="Læs højt"
                    >
                      <Volume2 className="h-5 w-5" />
                    </button>
                  ) : null}
                </div>
                <p className="mt-2 text-lg leading-relaxed opacity-95">
                  {loading ? 'Lys lytter …' : lastAssistant}
                </p>
              </div>
            </div>

            {nextStep && !loading ? (
              <button
                type="button"
                onClick={() => {
                  setView(nextStep.target);
                  setNextStep(null);
                }}
                className="mt-6 w-full rounded-full py-4 text-lg font-semibold text-white transition-opacity"
                style={{ backgroundColor: accent }}
              >
                {nextStep.label}
              </button>
            ) : null}
          </div>
        ) : null}
      </main>

      <FloatingLys accent={accent} reducedMotion={reducedMotion} onClick={goHome} />
    </div>
  );
}

function FloatingLys({
  accent,
  reducedMotion,
  onClick,
}: {
  accent: string;
  reducedMotion: boolean;
  onClick: () => void;
}) {
  return (
    <div className="pointer-events-none fixed bottom-0 left-0 right-0 z-30 flex justify-center pb-6 pt-4">
      <button
        type="button"
        onClick={onClick}
        style={{ backgroundColor: accent }}
        className={`pointer-events-auto rounded-full px-6 py-3 text-lg font-semibold text-white shadow-lg transition-transform ${
          reducedMotion ? '' : 'hover:scale-[1.02] active:scale-[0.98]'
        }`}
      >
        💬 Tal med Lys
      </button>
    </div>
  );
}
