'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronRight, LogOut, Mic, Volume2 } from 'lucide-react';
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

  const checkInOptions = [
    { key: 'Godt 😊' as const,  emoji: '😊', label: 'Godt',   sub: 'Jeg har det godt' },
    { key: 'Okay 😐' as const,  emoji: '😐', label: 'Okay',   sub: 'Jeg klarer mig' },
    { key: 'Svært 😔' as const, emoji: '😔', label: 'Svært',  sub: 'Det er svært i dag' },
  ];

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

  const handleLogout = () => {
    document.cookie = 'budr_resident_id=; path=/; max-age=0';
    router.replace('/');
  };

  return (
    <div className="relative min-h-0 font-sans transition-colors duration-500" style={{ color: tokens.text }}>
      <header className="flex items-center justify-between px-5 py-4">
        <span
          className="text-2xl font-black tracking-tight"
          style={{ color: accent }}
        >
          Lys
        </span>
        <div className="flex items-center gap-2">
          <div
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-sm font-black text-white"
            style={{
              background: `linear-gradient(135deg, ${accent}, ${accent}99)`,
              boxShadow: `0 2px 8px ${accent}44`,
            }}
            aria-hidden
          >
            {initials}
          </div>
          <button
            type="button"
            onClick={handleLogout}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-full transition-colors duration-200"
            style={{ color: tokens.textMuted }}
            aria-label="Log ud"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-lg space-y-5 px-5">
        {isSundayEvening ? (
          <LysUgeTilbageblik tokens={tokens} accent={accent} firstName={firstName} phase={phase} reducedMotion={reducedMotion} />
        ) : (
          <section
            className="rounded-3xl px-7 py-8 transition-all duration-500"
            style={{
              background: `linear-gradient(155deg, ${tokens.gradientFrom} 0%, ${tokens.gradientTo} 100%)`,
              boxShadow: tokens.glowShadow,
            }}
          >
            <h1 className="text-3xl font-black leading-tight tracking-tight">{greetTitle}</h1>
            <p className="mt-2 text-base" style={{ color: tokens.textMuted }}>{greetQ}</p>

            <div className="mt-7 flex flex-col gap-3">
              {checkInOptions.map(opt => (
                <button
                  key={opt.key}
                  type="button"
                  onClick={() => void handlePill(opt.key)}
                  disabled={loading}
                  className="flex w-full items-center gap-4 rounded-2xl px-5 py-4 text-left transition-all duration-150 active:scale-[0.97] disabled:opacity-50"
                  style={{
                    backgroundColor: tokens.accentSoft,
                    color: tokens.accentSoftText,
                    boxShadow: `0 2px 14px ${accent}14`,
                  }}
                >
                  <span className="text-3xl leading-none" aria-hidden>{opt.emoji}</span>
                  <div className="flex-1 min-w-0">
                    <p className="text-base font-bold leading-tight">{opt.label}</p>
                    <p className="text-sm opacity-60 leading-tight mt-0.5">{opt.sub}</p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 opacity-35" aria-hidden />
                </button>
              ))}
            </div>
          </section>
        )}

        <LysDagensProgram tokens={tokens} accent={accent} now={now} firstName={firstName} residentId={residentId} />
        <LysVagtplan tokens={tokens} accent={accent} reducedMotion={reducedMotion} />

        <LysBeskedTilPersonale tokens={tokens} accent={accent} firstName={firstName} residentId={residentId} />

        {/* Mic */}
        <section className="flex flex-col items-center gap-3 py-2">
          <button
            type="button"
            onClick={handleMicToggle}
            className="relative flex h-16 w-16 items-center justify-center rounded-full text-white transition-all duration-200 active:scale-95"
            style={{
              background: isListening
                ? `linear-gradient(135deg, ${accent}, ${accent}bb)`
                : `linear-gradient(135deg, ${accent}cc, ${accent}88)`,
              boxShadow: isListening
                ? `0 0 0 8px ${accent}28, ${tokens.glowShadow}`
                : tokens.shadow,
            }}
            aria-pressed={isListening}
            aria-label={isListening ? 'Stop optagelse' : 'Tal med Lys'}
          >
            <Mic className="h-6 w-6" />
          </button>
          <span className="text-sm font-medium" style={{ color: tokens.textMuted }}>
            {isListening ? 'Tryk igen når du er færdig' : 'Tal med Lys'}
          </span>
          {liveTranscript ? (
            <p className="max-w-xs text-center text-base leading-relaxed">{liveTranscript}</p>
          ) : null}
        </section>

        {/* Lys AI response */}
        {showLysCard && (lastAssistant || loading) ? (
          <div
            className="rounded-3xl p-6 transition-all duration-300"
            style={{
              backgroundColor: tokens.cardBg,
              boxShadow: tokens.shadow,
              border: `1px solid ${accent}18`,
              opacity: loading ? 0.80 : 1,
            }}
          >
            <div className="flex items-start gap-4">
              <div
                className="mt-0.5 h-10 w-10 shrink-0 rounded-full flex items-center justify-center text-lg font-black text-white"
                style={{ background: `linear-gradient(135deg, ${accent}, ${accent}99)` }}
                aria-hidden
              >
                ✦
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <p className="text-sm font-bold tracking-wide uppercase" style={{ color: accent }}>
                    Lys
                  </p>
                  {lastAssistant && !loading ? (
                    <button
                      type="button"
                      onClick={() => speakSafe(lastAssistant)}
                      className="flex h-8 w-8 items-center justify-center rounded-full transition-all duration-200 active:scale-90"
                      style={{ backgroundColor: tokens.accentSoft, color: accent }}
                      aria-label="Læs højt"
                    >
                      <Volume2 className="h-4 w-4" />
                    </button>
                  ) : null}
                </div>
                <p className="text-base leading-relaxed" style={{ color: tokens.text }}>
                  {loading ? (
                    <span className="flex items-center gap-2" style={{ color: tokens.textMuted }}>
                      <span className="inline-flex gap-1">
                        <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ backgroundColor: accent, animationDelay: '0ms' }} />
                        <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ backgroundColor: accent, animationDelay: '120ms' }} />
                        <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ backgroundColor: accent, animationDelay: '240ms' }} />
                      </span>
                    </span>
                  ) : lastAssistant}
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
                className="mt-5 w-full rounded-2xl py-4 text-base font-bold text-white transition-all duration-200 active:scale-[0.97]"
                style={{
                  background: `linear-gradient(135deg, ${accent}, ${accent}cc)`,
                  boxShadow: `0 4px 16px ${accent}30`,
                }}
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
