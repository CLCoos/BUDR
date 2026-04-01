'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Mic, Volume2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import type { LysChatMessage } from '@/app/api/lys-chat/route';
import type { LysFlowOverlay } from '../lib/lysOverlay';
import type { LysPhase, LysThemeTokens } from '../lib/lysTheme';
import type { LysNavTab } from './LysBottomNav';
import LysBeskedTilPersonale from './LysBeskedTilPersonale';

const COMPANION_MESSAGES = [
  'Hvad bærer du på i dag?',
  'Du er ikke alene. Lys er her for dig.',
  'Hvert lille skridt tæller.',
  'Det er OK ikke at have det godt.',
  'Du gør det godt — bare det at du er her.',
  'Hvad har du brug for lige nu?',
  'Tage et åndedræt. Vi tager det stille.',
];

const ENERGY_OPTIONS = [
  { level: 1, emoji: '😴', label: 'Meget træt', color: '#EF4444' },
  { level: 2, emoji: '😔', label: 'Lidt træt',  color: '#F97316' },
  { level: 3, emoji: '😐', label: 'OK',          color: '#EAB308' },
  { level: 4, emoji: '🙂', label: 'God energi', color: '#84CC16' },
  { level: 5, emoji: '😄', label: 'Fuld energi', color: '#22C55E' },
];

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
  onSwitchTab: (tab: LysNavTab) => void;
  moodLabel: string | null;
  moodTraffic: 'groen' | 'gul' | 'roed' | null;
  moodTick: number;
};

function greetingLine(phase: LysPhase, name: string): string {
  switch (phase) {
    case 'morning':   return `Godmorgen, ${name} ☀️`;
    case 'afternoon': return `Hej igen, ${name} 🌤`;
    case 'evening':   return `God aften, ${name} 🌙`;
    default:          return `Hej ${name} 💙`;
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
  onSwitchTab,
  moodLabel,
  moodTraffic,
  moodTick,
}: Props) {
  const router = useRouter();
  const chatRef = useRef<HTMLDivElement>(null);

  const [companionIdx, setCompanionIdx] = useState(0);
  const [checkInDone, setCheckInDone] = useState(false);
  const [checkInLabel, setCheckInLabel] = useState<string | null>(null);
  const [planStats, setPlanStats] = useState<{ total: number } | null>(null);
  const [showLysCard, setShowLysCard] = useState(false);

  const [isListening, setIsListening] = useState(false);
  const [liveTranscript, setLiveTranscript] = useState('');
  const recRef = useRef<{
    lang: string;
    continuous: boolean;
    interimResults: boolean;
    start: () => void;
    stop: () => void;
    abort: () => void;
    onresult: ((ev: Event) => void) | null;
    onend: (() => void) | null;
  } | null>(null);
  const accRef = useRef('');

  const lastAssistant = [...messages].reverse().find(m => m.role === 'assistant')?.content ?? null;

  // Rotate companion messages
  useEffect(() => {
    const t = window.setInterval(() => {
      setCompanionIdx(i => (i + 1) % COMPANION_MESSAGES.length);
    }, 7000);
    return () => window.clearInterval(t);
  }, []);

  // Load today's check-in from localStorage
  useEffect(() => {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const raw = localStorage.getItem(`budr_checkin_${today}`);
      if (raw) {
        const d = JSON.parse(raw) as { label?: string };
        setCheckInDone(true);
        setCheckInLabel(d.label ?? null);
      }
    } catch { /* ignore */ }
  }, []);

  // Fetch plan item count
  useEffect(() => {
    if (!residentId) return;
    const supabase = createClient();
    if (!supabase) return;
    const today = new Date().toISOString().slice(0, 10);
    supabase
      .from('daily_plans')
      .select('plan_items')
      .eq('resident_id', residentId)
      .eq('plan_date', today)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.plan_items && Array.isArray(data.plan_items)) {
          setPlanStats({ total: (data.plan_items as unknown[]).length });
        } else {
          setPlanStats({ total: 0 });
        }
      })
      .catch(() => setPlanStats({ total: 0 }));
  }, [residentId]);

  // moodTick effect: show Lys card
  useEffect(() => {
    if (moodTick > 0) setShowLysCard(true);
  }, [moodTick]);

  const handleCheckIn = async (level: number, label: string) => {
    const today = new Date().toISOString().slice(0, 10);
    // Optimistic UI
    setCheckInDone(true);
    setCheckInLabel(label);
    // Persist to localStorage
    try {
      localStorage.setItem(`budr_checkin_${today}`, JSON.stringify({ level, label, ts: Date.now() }));
      // Award XP
      const raw = localStorage.getItem('budr_xp_v1');
      const xpData = raw ? (JSON.parse(raw) as { total: number }) : { total: 0 };
      localStorage.setItem('budr_xp_v1', JSON.stringify({ total: xpData.total + 10 }));
    } catch { /* ignore */ }
    // Save to Supabase
    const supabase = createClient();
    if (supabase && residentId) {
      await supabase.from('park_daily_checkin').upsert(
        { resident_id: residentId, check_in_date: today, energy_level: level, label },
        { onConflict: 'resident_id,check_in_date' },
      );
    }
    // Background AI response
    void sendToLys(`Jeg har det sådan her: ${label}.`).then(() => setShowLysCard(true));
  };

  const stopMic = useCallback(() => {
    try { recRef.current?.stop(); } catch { /* ignore */ }
    recRef.current = null;
    setIsListening(false);
  }, []);

  const clearTranscript = useCallback(() => {
    accRef.current = '';
    setLiveTranscript('');
  }, []);

  const handleVoiceSend = useCallback(async (text: string) => {
    setShowLysCard(true);
    await sendToLys(text);
  }, [sendToLys]);

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

  const handleLogout = () => {
    document.cookie = 'budr_resident_id=; path=/; max-age=0';
    router.replace('/');
  };

  const todayStr = now.toLocaleDateString('da-DK', { weekday: 'long', day: 'numeric', month: 'long' });
  const greeting = greetingLine(phase, firstName);

  return (
    <div className="relative font-sans" style={{ color: tokens.text }}>
      {/* Header */}
      <header className="flex items-center justify-between px-5 pt-5 pb-3">
        <div>
          <h1 className="text-2xl font-black leading-tight tracking-tight">{greeting}</h1>
          <p className="text-sm capitalize mt-0.5" style={{ color: tokens.textMuted }}>{todayStr}</p>
        </div>
        <div className="flex items-center gap-2">
          <div
            className="h-10 w-10 shrink-0 rounded-full flex items-center justify-center text-sm font-black text-white"
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
            className="flex h-10 w-10 items-center justify-center rounded-full text-xs font-medium transition-opacity hover:opacity-70"
            style={{ color: tokens.textMuted }}
            aria-label="Log ud"
          >
            ×
          </button>
        </div>
      </header>

      <main className="space-y-4 px-5 pb-4">

        {/* Lys companion card */}
        <section
          className="rounded-3xl px-6 py-5 transition-all duration-500"
          style={{
            background: `linear-gradient(150deg, ${tokens.gradientFrom} 0%, ${tokens.gradientTo} 100%)`,
            boxShadow: tokens.glowShadow,
          }}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold tracking-widest uppercase mb-2" style={{ color: `${accent}` }}>
                Lys
              </p>
              <p
                key={companionIdx}
                className="text-base font-semibold leading-snug"
                style={{
                  animation: reducedMotion ? undefined : 'lysTabIn 0.4s ease-out',
                }}
              >
                {COMPANION_MESSAGES[companionIdx]}
              </p>
            </div>
            <div
              className="h-12 w-12 shrink-0 rounded-full flex items-center justify-center text-xl font-black text-white"
              style={{
                background: `linear-gradient(135deg, ${accent}, ${accent}99)`,
                boxShadow: `0 4px 16px ${accent}44`,
              }}
              aria-hidden
            >
              ✦
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              chatRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
              if (!isListening) startMic();
            }}
            className="mt-4 inline-flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-bold text-white transition-all duration-150 active:scale-95"
            style={{
              background: `linear-gradient(135deg, ${accent}, ${accent}cc)`,
              boxShadow: `0 4px 12px ${accent}33`,
            }}
          >
            Skriv til Lys →
          </button>
        </section>

        {/* Morning check-in */}
        {!checkInDone ? (
          <section
            className="rounded-3xl px-6 py-5 transition-all duration-300"
            style={{
              backgroundColor: tokens.cardBg,
              boxShadow: tokens.shadow,
            }}
          >
            <p className="text-sm font-bold mb-1">Morgentjek ☀️</p>
            <p className="text-sm mb-4" style={{ color: tokens.textMuted }}>
              Hvad er dit energiniveau lige nu?
            </p>
            <div className="flex gap-2">
              {ENERGY_OPTIONS.map(opt => (
                <button
                  key={opt.level}
                  type="button"
                  onClick={() => void handleCheckIn(opt.level, opt.label)}
                  disabled={loading}
                  className="flex flex-1 flex-col items-center gap-1.5 rounded-2xl py-3.5 transition-all duration-150 active:scale-[0.94] disabled:opacity-40"
                  style={{
                    backgroundColor: `${opt.color}18`,
                    border: `1.5px solid ${opt.color}30`,
                  }}
                  title={opt.label}
                >
                  <span className="text-2xl leading-none">{opt.emoji}</span>
                  <span className="text-[9px] font-bold uppercase tracking-wide" style={{ color: opt.color }}>
                    {opt.level}
                  </span>
                </button>
              ))}
            </div>
          </section>
        ) : (
          <div
            className="rounded-2xl px-5 py-3.5 flex items-center gap-3 transition-all duration-300"
            style={{ backgroundColor: `${accent}14`, border: `1px solid ${accent}30` }}
          >
            <span className="text-xl">✓</span>
            <p className="text-sm font-semibold" style={{ color: accent }}>
              Tjekket ind — {checkInLabel}
            </p>
          </div>
        )}

        {/* Today summary */}
        {planStats !== null && (
          <button
            type="button"
            onClick={() => onSwitchTab('dag')}
            className="w-full rounded-2xl px-5 py-4 text-left flex items-center justify-between gap-4 transition-all duration-150 active:scale-[0.98]"
            style={{ backgroundColor: tokens.cardBg, boxShadow: tokens.shadow }}
          >
            <div className="flex-1 min-w-0">
              <p className="text-sm font-bold mb-1">Din dag</p>
              {planStats.total > 0 ? (
                <>
                  <p className="text-sm" style={{ color: tokens.textMuted }}>
                    {planStats.total} aktiviteter i din plan
                  </p>
                  <div
                    className="mt-2 h-1.5 w-full rounded-full overflow-hidden"
                    style={{ backgroundColor: `${accent}22` }}
                  >
                    <div className="h-full w-0 rounded-full" style={{ backgroundColor: accent }} />
                  </div>
                </>
              ) : (
                <p className="text-sm" style={{ color: tokens.textMuted }}>
                  🌿 Din dag er fri
                </p>
              )}
            </div>
            <span className="text-lg" style={{ color: accent }}>→</span>
          </button>
        )}

        {/* Besked til personale */}
        <LysBeskedTilPersonale tokens={tokens} accent={accent} firstName={firstName} residentId={residentId} />

        {/* Mic section */}
        <section ref={chatRef} className="flex flex-col items-center gap-3 py-2">
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
                  <p className="text-xs font-bold tracking-widest uppercase" style={{ color: accent }}>
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
          </div>
        ) : null}

      </main>
    </div>
  );
}
