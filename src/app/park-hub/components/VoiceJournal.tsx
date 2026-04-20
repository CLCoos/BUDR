'use client';

import React, { useMemo, useRef, useState } from 'react';
import { Mic, MicOff } from 'lucide-react';
import type { LysThemeTokens } from '../lib/lysTheme';

type Props = {
  onComplete: (transcript: string, summary: string) => void;
  onSkip: () => void;
  /** Når sat, matcher feltet Lys-tema (lys/mørk) i stedet for hårdkodet hvid kasse */
  tokens?: LysThemeTokens;
  /** Sæt false når forælderen allerede har overskrift for sektionen */
  showTitle?: boolean;
};

type Status = 'idle' | 'recording' | 'processing' | 'done' | 'error' | 'unsupported';

type SpeechRecognitionType = new () => {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
};

type SpeechRecognitionEvent = {
  results: ArrayLike<{ isFinal: boolean; 0: { transcript: string } }>;
};

function getSpeechCtor(): SpeechRecognitionType | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognitionType;
    webkitSpeechRecognition?: SpeechRecognitionType;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export default function VoiceJournal({ onComplete, onSkip, tokens, showTitle = true }: Props) {
  const speechCtor = useMemo(() => getSpeechCtor(), []);
  const [status, setStatus] = useState<Status>(speechCtor ? 'idle' : 'unsupported');
  const [transcript, setTranscript] = useState('');
  const [summary, setSummary] = useState('');
  const recRef = useRef<InstanceType<SpeechRecognitionType> | null>(null);
  const statusRef = useRef<Status>(speechCtor ? 'idle' : 'unsupported');

  const themed = Boolean(tokens);
  const isDark = tokens?.colorScheme === 'dark';

  const setStatusSafe = (next: Status) => {
    statusRef.current = next;
    setStatus(next);
  };

  async function summarize(text: string): Promise<string | null> {
    const res = await fetch('/api/ai/summarize-checkin', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ transcript: text }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { summary?: string };
    return data.summary?.trim() ?? null;
  }

  const start = () => {
    if (!speechCtor) return;
    const rec = new speechCtor();
    rec.lang = 'da-DK';
    rec.continuous = true;
    rec.interimResults = true;
    rec.onresult = (event) => {
      let finalText = '';
      for (let i = 0; i < event.results.length; i += 1) {
        finalText += event.results[i][0].transcript;
      }
      setTranscript(finalText.trim());
    };
    rec.onerror = () => setStatusSafe('error');
    rec.onend = () => {
      if (statusRef.current === 'recording') setStatusSafe('idle');
    };
    recRef.current = rec;
    setStatusSafe('recording');
    rec.start();
  };

  const stopAndSummarize = async () => {
    recRef.current?.stop();
    if (!transcript.trim()) {
      setStatusSafe('error');
      return;
    }
    setStatusSafe('processing');
    const s = await summarize(transcript.trim());
    if (!s) {
      setStatusSafe('error');
      return;
    }
    setSummary(s);
    setStatusSafe('done');
  };

  const saveManual = async () => {
    if (!transcript.trim()) return;
    setStatusSafe('processing');
    const s = await summarize(transcript.trim());
    if (!s) {
      setStatusSafe('error');
      return;
    }
    setSummary(s);
    setStatusSafe('done');
  };

  const surfaceClass = themed
    ? 'rounded-2xl border p-4 sm:p-5 space-y-3'
    : 'rounded-xl border border-gray-100 bg-white p-4 sm:p-5 space-y-3';

  const surfaceStyle = themed
    ? {
        backgroundColor: tokens!.cardBg,
        borderColor: tokens!.cardBorder,
        color: tokens!.text,
      }
    : undefined;

  const labelStyle = themed ? { color: tokens!.text } : undefined;
  const mutedStyle = themed ? { color: tokens!.textMuted } : undefined;
  const skipBtnClass = themed
    ? 'rounded-md px-2 py-1 text-xs font-medium active:scale-95'
    : 'rounded-md px-2 py-1 text-xs font-medium text-gray-500 active:scale-95';

  const skipBtnStyle = themed
    ? { color: tokens!.textMuted, backgroundColor: 'transparent' }
    : undefined;

  const textareaClass = themed
    ? 'w-full min-h-[120px] text-base rounded-2xl px-4 py-3 outline-none resize-y transition-all'
    : 'w-full min-h-[120px] text-sm text-gray-700 placeholder-gray-400 border border-gray-200 rounded-lg p-3 resize-y focus:outline-none focus:border-[#7F77DD]';

  const textareaStyle = themed
    ? {
        backgroundColor: isDark ? 'rgba(255,255,255,0.04)' : tokens!.bg,
        border: `1px solid ${tokens!.cardBorder}`,
        color: tokens!.text,
      }
    : undefined;

  const primaryBtn = {
    backgroundColor: themed ? tokens!.accent : '#2D5BE3',
    color: '#fff',
  };
  const stopBtn = { backgroundColor: '#C0392B', color: '#fff' };
  const manualBtn = {
    backgroundColor: themed ? tokens!.accent : '#0F1B2D',
    color: '#fff',
  };

  const doneBoxStyle = themed
    ? {
        border: `1px solid ${tokens!.cardBorder}`,
        backgroundColor: tokens!.accentSoft,
        color: tokens!.accentSoftText,
      }
    : undefined;

  return (
    <div className={surfaceClass} style={surfaceStyle}>
      {showTitle && (
        <div className="flex items-center justify-between gap-2">
          <p
            className={`text-sm font-semibold ${!themed ? 'text-gray-700' : ''}`}
            style={labelStyle}
          >
            Vil du fortælle mere?
          </p>
          <button type="button" onClick={onSkip} className={skipBtnClass} style={skipBtnStyle}>
            Spring over
          </button>
        </div>
      )}

      {!showTitle && (
        <div className="flex justify-end">
          <button type="button" onClick={onSkip} className={skipBtnClass} style={skipBtnStyle}>
            Spring stemme over
          </button>
        </div>
      )}

      {(status === 'unsupported' || status === 'error') && (
        <p className={`text-xs ${!themed ? 'text-gray-500' : ''}`} style={mutedStyle}>
          Stemmegenkendelse er ikke tilgængelig her. Du kan skrive i feltet i stedet.
        </p>
      )}

      {status !== 'done' && (
        <textarea
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          placeholder="Valgfrit: optag eller skriv mere her…"
          className={textareaClass}
          style={textareaStyle}
        />
      )}

      {status === 'idle' && speechCtor && (
        <button
          type="button"
          onClick={start}
          className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white"
          style={primaryBtn}
        >
          <Mic size={16} /> Start optagelse
        </button>
      )}

      {status === 'recording' && (
        <button
          type="button"
          onClick={() => void stopAndSummarize()}
          className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white"
          style={stopBtn}
        >
          <MicOff size={16} /> Stop optagelse
        </button>
      )}

      {(status === 'unsupported' || status === 'error' || status === 'idle') &&
        transcript.trim() && (
          <button
            type="button"
            onClick={() => void saveManual()}
            className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold text-white"
            style={manualBtn}
          >
            Gem som note
          </button>
        )}

      {status === 'processing' && (
        <p className={`text-sm ${!themed ? 'text-gray-500' : ''}`} style={mutedStyle}>
          Et øjeblik…
        </p>
      )}

      {status === 'done' && (
        <div
          className={
            themed ? 'rounded-xl p-3' : 'rounded-lg border border-[#A8DFC9] bg-[#E1F5EE] p-3'
          }
          style={doneBoxStyle}
        >
          <p className={`text-xs font-semibold ${!themed ? 'text-[#1D9E75]' : ''}`}>
            Her er hvad du fortalte
          </p>
          <p className={`text-sm italic mt-1 ${!themed ? 'text-[#1D9E75]' : ''}`}>{summary}</p>
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => onComplete(transcript.trim(), summary)}
              className="min-h-[44px] rounded-xl px-3 py-2 text-xs font-semibold text-white"
              style={{ backgroundColor: themed ? tokens!.accent : '#1D9E75' }}
            >
              Ja, tag med
            </button>
            <button
              type="button"
              onClick={() => setStatusSafe('idle')}
              className={`min-h-[44px] rounded-xl border px-3 py-2 text-xs font-semibold ${
                !themed ? 'border-gray-200 text-gray-600' : ''
              }`}
              style={
                themed
                  ? {
                      borderColor: tokens!.cardBorder,
                      color: tokens!.textMuted,
                      backgroundColor: 'transparent',
                    }
                  : undefined
              }
            >
              Rediger
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
