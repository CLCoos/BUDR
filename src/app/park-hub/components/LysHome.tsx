'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { LogOut, Mic, Volume2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import type { LysChatMessage } from '@/app/api/lys-chat/route';
import type { LysFlowOverlay } from '../lib/lysOverlay';
import type { LysPhase, LysThemeTokens } from '../lib/lysTheme';
import LysDagensProgram from './LysDagensProgram';
import LysVagtplan from './LysVagtplan';
import LysUgeTilbageblik from './LysUgeTilbageblik';
import LysBeskedTilPersonale from './LysBeskedTilPersonale';

type Props = {
  firstName: string;
  initials: string;
  residentId: string;
  tokens: LysThemeTokens;
  accent: string;
  phase: LysPhase;
  now: Date;
  reducedMotion: boolean;
  messages: LysChatMessage[];
  loading: boolean;
  sendToLys: (
    text: string,
    extra?: { messagesOverride?: LysChatMessage[]; historyLimit?: number },
  ) => Promise<string | null>;
  speakSafe: (text: string) => void;
  onOpenFlow: (flow: LysFlowOverlay) => void;
  moodLabel: string | null;
  moodTraffic: 'groen' | 'gul' | 'roed' | null;
  /** Incremented after stemning gemt (ikke-krise) så hjem kan foreslå næste skridt */
  moodTick: number;
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

export default function LysHome({
  firstName,
  initials,
  residentId,
  tokens,
  accent,
  phase,
  now,
  reducedMotion,
  messages,
  loading,
  sendToLys,
  speakSafe,
  onOpenFlow,
  moodLabel,
  moodTraffic,
  moodTick,
}: Props) {
  const router = useRouter();
  const [showLysCard, setShowLysCard] = useState(false);
  const [nextStep, setNextStep] = useState<{ label: string; target: LysFlowOverlay } | null>(null);

  const [isListening, setIsListening] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const recRef = React.useRef<{
    lang: string;
    continuous: boolean;
    interimResults: boolean;
    start: () => void;
    stop: () => void;
    abort: () => void;
    onresult: ((ev: Event) => void) | null;
    onend: (() => void) | null;
  } | null>(null);
  const accRef = React.useRef('');

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
      const pool: { label: string; target: LysFlowOverlay }[] = [
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

  const stopMic = useCallback(() => {
    try {
      recRef.current?.stop();
    } catch {
      /* ignore */
    }
    recRef.current = null;
    setIsListening(false);
  }, []);

  const clearTranscript = useCallback(() => {
    accRef.current = '';
    setLiveTranscript('');
  }, []);

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

  const startMic = useCallback(() => {
    const w = window as unknown as {
      SpeechRecognition?: new () => NonNullable<typeof recRef.current>;
      webkitSpeechRecognition?: new () => NonNullable<typeof recRef.current>;
    };
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Ctor) return;
    stopMic();
    clearTranscript();
    const rec = new Ctor();
    rec.lang = 'da-DK';
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (event: Event) => {
      const ev = event as unknown as {
        resultIndex: number;
        results: { length: number; [i: number]: { isFinal: boolean; 0: { transcript: string } } };
      };
      let interim = '';
      let add = '';
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const r = ev.results[i];
        const t = r[0]?.transcript ?? '';
        if (r.isFinal) add += t;
        else interim += t;
      }
      accRef.current += add;
      setLiveTranscript((accRef.current + interim).trimStart());
    };
    rec.onend = () => {
      setIsListening(false);
      recRef.current = null;
    };
    recRef.current = rec;
    try {
      rec.start();
      setIsListening(true);
    } catch {
      setIsListening(false);
    }
  }, [stopMic, clearTranscript]);

  const handleMicToggle = () => {
    if (isListening) {
      const t = liveTranscript.trim();
      stopMic();
      if (t) void handleVoiceSend(t);
      clearTranscript();
      return;
    }
    startMic();
  };

  useEffect(() => () => stopMic(), [stopMic]);

  useEffect(() => {
    if (moodTick > 0) {
      setShowLysCard(true);
      suggestNextStep({ moodJustCaptured: true, traffic: moodTraffic });
    }
  }, [moodTick, moodTraffic, suggestNextStep]);

  const handleLogout = async () => {
    await fetch('/api/resident-session', { method: 'DELETE' });
    router.replace(`/login/${residentId || 'unknown'}`);
  };

  return (
    <div className="relative min-h-0 font-sans transition-colors duration-500" style={{ color: tokens.text }}>
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
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full transition-colors duration-200"
            style={{ color: tokens.textMuted }}
            aria-label="Log ud"
          >
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-lg space-y-6 px-6">
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
                  className="w-full rounded-full py-4 text-lg font-semibold transition-all duration-200 disabled:opacity-50"
                  style={{
                    backgroundColor: tokens.accentSoft,
                    color: tokens.accentSoftText,
                  }}
                >
                  {pill}
                </button>
              ))}
            </div>
          </section>
        )}

        <LysDagensProgram tokens={tokens} accent={accent} now={now} firstName={firstName} residentId={residentId} />
        <LysVagtplan tokens={tokens} accent={accent} reducedMotion={reducedMotion} />

        <LysBeskedTilPersonale tokens={tokens} accent={accent} firstName={firstName} />

        <section className="flex flex-col items-center gap-2 py-2">
          <button
            type="button"
            onClick={handleMicToggle}
            className={`relative flex h-16 w-16 items-center justify-center rounded-full text-white shadow-lg transition-all duration-200 ${
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
            className="rounded-2xl border p-6 shadow-md transition-all duration-200"
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
                      className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full transition-all duration-200"
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
                  onOpenFlow(nextStep.target);
                  setNextStep(null);
                }}
                className="mt-6 w-full rounded-full py-4 text-lg font-semibold text-white transition-all duration-200"
                style={{ backgroundColor: accent }}
              >
                {nextStep.label}
              </button>
            ) : null}
          </div>
        ) : null}
      </main>
    </div>
  );
}
