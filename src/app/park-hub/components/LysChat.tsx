'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ArrowUp, Mic, Volume2 } from 'lucide-react';
import type { LysChatMessage } from '@/app/api/lys-chat/route';
import type { LysThemeTokens } from '../lib/lysTheme';

/** Match LysBottomNav: 64px row + safe padding */
const NAV_SAFE_BOTTOM = 'calc(4rem + max(1rem, env(safe-area-inset-bottom, 0px)))';
const SCROLL_EXTRA = 'calc(5.5rem + max(1rem, env(safe-area-inset-bottom, 0px)))';

const STARTERS = [
  'Hvordan har jeg det i dag? 🤔',
  'Jeg vil arbejde på et mål 🎯',
  'Noget fylder for mig 💭',
  'Hvad er godt ved mig? 🌟',
];

type Props = {
  tokens: LysThemeTokens;
  accent: string;
  firstName: string;
  initials: string;
  reducedMotion: boolean;
  messages: LysChatMessage[];
  loading: boolean;
  sendToLys: (text: string, extra?: { historyLimit?: number }) => Promise<string | null>;
  speak: (text: string) => void;
};

export default function LysChat({
  tokens,
  accent,
  firstName,
  initials,
  reducedMotion,
  messages,
  loading,
  sendToLys,
  speak,
}: Props) {
  const [input, setInput] = useState('');
  const [recording, setRecording] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);
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

  const isDarkish = tokens.colorScheme === 'dark';

  const bubbleUser = isDarkish ? 'rgba(255,255,255,0.12)' : `${accent}33`;
  const bubbleLys = isDarkish ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.85)';
  const textPrimary = tokens.text;

  useEffect(() => {
    listRef.current?.scrollTo({
      top: listRef.current.scrollHeight,
      behavior: reducedMotion ? 'auto' : 'smooth',
    });
  }, [messages, loading, reducedMotion]);

  useEffect(() => {
    return () => {
      try {
        recRef.current?.stop();
      } catch {
        /* ignore */
      }
    };
  }, []);

  const empty = messages.length === 0;

  const stopRec = () => {
    try {
      recRef.current?.stop();
    } catch {
      /* ignore */
    }
    recRef.current = null;
    setRecording(false);
  };

  const startRec = () => {
    const w = window as unknown as {
      SpeechRecognition?: new () => NonNullable<typeof recRef.current>;
      webkitSpeechRecognition?: new () => NonNullable<typeof recRef.current>;
    };
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Ctor) return;
    stopRec();
    accRef.current = '';
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
      setInput((accRef.current + interim).trimStart());
    };
    rec.onend = () => {
      setRecording(false);
      recRef.current = null;
    };
    recRef.current = rec;
    try {
      rec.start();
      setRecording(true);
    } catch {
      setRecording(false);
    }
  };

  const toggleMic = () => {
    if (recording) {
      stopRec();
      return;
    }
    startRec();
  };

  const submit = async (text: string) => {
    const t = text.trim();
    if (!t || loading) return;
    setInput('');
    await sendToLys(t, { historyLimit: 8 });
  };

  const typing = useMemo(
    () => (
      <div className="flex gap-1 px-2 py-1" aria-hidden>
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className="h-2 w-2 rounded-full bg-white/50"
            style={{
              animation: reducedMotion
                ? undefined
                : `lys-bounce 0.9s ease-in-out ${i * 0.15}s infinite`,
            }}
          />
        ))}
        <style>{`
          @keyframes lys-bounce {
            0%, 80%, 100% { opacity: 0.35; transform: translateY(0); }
            40% { opacity: 1; transform: translateY(-4px); }
          }
        `}</style>
      </div>
    ),
    [reducedMotion]
  );

  return (
    <div
      className="flex min-h-[calc(100dvh-5rem)] flex-col font-sans transition-all duration-200"
      style={{ color: textPrimary }}
    >
      <div
        ref={listRef}
        className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 pt-4"
        style={{ paddingBottom: `calc(${SCROLL_EXTRA} + 4rem)` }}
      >
        {empty ? (
          <div className="space-y-3 pt-2">
            <p className="text-center text-lg opacity-80">
              Hej {firstName}. Hvad vil du tale med Lys om?
            </p>
            {STARTERS.map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => void submit(s)}
                disabled={loading}
                className="w-full rounded-full border px-4 py-4 text-left text-base font-semibold transition-all duration-200 disabled:opacity-50"
                style={{ borderColor: tokens.cardBorder, backgroundColor: tokens.cardBg }}
              >
                {s}
              </button>
            ))}
          </div>
        ) : null}

        {messages.map((m, idx) => (
          <div
            key={`${idx}-${m.content.slice(0, 12)}`}
            className={`flex gap-2 transition-all duration-200 ${m.role === 'assistant' ? 'justify-start' : 'justify-end'}`}
          >
            {m.role === 'assistant' ? (
              <>
                <div
                  className={`mt-0.5 h-6 w-6 shrink-0 rounded-full ${reducedMotion ? '' : 'animate-pulse-soft'}`}
                  style={{ backgroundColor: accent }}
                  aria-hidden
                />
                <div className="max-w-[85%]">
                  <div
                    className="rounded-2xl rounded-tl-sm px-4 py-3 text-base leading-relaxed"
                    style={{ backgroundColor: bubbleLys, color: isDarkish ? '#fff' : tokens.text }}
                  >
                    {m.content}
                  </div>
                  <button
                    type="button"
                    onClick={() => speak(m.content)}
                    className="mt-1 flex min-h-[44px] min-w-[44px] items-center rounded-full text-white/40 transition-all duration-200 hover:text-white"
                    aria-label="Læs højt"
                  >
                    <Volume2 className="h-5 w-5" />
                  </button>
                </div>
              </>
            ) : (
              <>
                <div
                  className="max-w-[85%] rounded-2xl rounded-tr-sm px-4 py-3 text-base leading-relaxed"
                  style={{
                    backgroundColor: bubbleUser,
                    color: isDarkish ? '#fff' : tokens.text,
                  }}
                >
                  {m.content}
                </div>
                <div
                  className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                  style={{ backgroundColor: 'var(--budr-purple, #7F77DD)' }}
                  aria-hidden
                >
                  {initials.slice(0, 2)}
                </div>
              </>
            )}
          </div>
        ))}

        {loading ? (
          <div className="flex justify-start gap-2">
            <div
              className="h-6 w-6 shrink-0 rounded-full"
              style={{ backgroundColor: accent }}
              aria-hidden
            />
            <div
              className="rounded-2xl rounded-tl-sm px-4 py-3"
              style={{ backgroundColor: bubbleLys }}
            >
              {typing}
            </div>
          </div>
        ) : null}
      </div>

      <div
        className="fixed left-0 right-0 z-30 border-t border-white/10 px-4 py-3 transition-all duration-200"
        style={{
          bottom: NAV_SAFE_BOTTOM,
          backgroundColor: `${tokens.bg}F2`,
          backdropFilter: 'blur(12px)',
        }}
      >
        <div className="mx-auto flex w-full max-w-full items-end gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && void submit(input)}
            placeholder="Skriv til Lys …"
            className="min-h-[48px] flex-1 rounded-full border px-5 text-base outline-none transition-all duration-200"
            style={{
              borderColor: isDarkish ? 'rgba(255,255,255,0.2)' : tokens.cardBorder,
              backgroundColor: isDarkish ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.9)',
              color: textPrimary,
            }}
          />
          <button
            type="button"
            onClick={toggleMic}
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white transition-all duration-200 ${
              recording && !reducedMotion ? 'ring-4 ring-red-500/60' : ''
            }`}
            style={{ backgroundColor: accent }}
            aria-pressed={recording}
            aria-label={recording ? 'Stop optagelse' : 'Tal'}
          >
            <Mic className="h-5 w-5" />
          </button>
          {input.trim() ? (
            <button
              type="button"
              onClick={() => void submit(input)}
              disabled={loading}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-white transition-all duration-200 disabled:opacity-40"
              style={{ backgroundColor: accent }}
              aria-label="Send"
            >
              <ArrowUp className="h-5 w-5" />
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
