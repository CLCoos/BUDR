'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Mic, Pen } from 'lucide-react';
import type { LysThemeTokens } from '../lib/lysTheme';

type Mode = 'write' | 'voice';

type JournalEntry = {
  id: string;
  date: string;
  mode: Mode;
  text: string;
  mood?: number;
};

const MOOD_OPTIONS = [
  { value: 1, emoji: '😞', label: 'Svært' },
  { value: 2, emoji: '😔', label: 'Tungt' },
  { value: 3, emoji: '😐', label: 'OK' },
  { value: 4, emoji: '🙂', label: 'Godt' },
  { value: 5, emoji: '😄', label: 'Dejligt' },
];

const STORAGE_KEY = 'budr_journal_entries_v1';

function loadEntries(): JournalEntry[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as JournalEntry[]) : [];
  } catch { return []; }
}

function saveEntry(entry: JournalEntry): void {
  try {
    const entries = loadEntries();
    entries.unshift(entry);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, 50)));
  } catch { /* ignore */ }
}

type Props = {
  tokens: LysThemeTokens;
  accent: string;
};

export default function LysJournalTab({ tokens, accent }: Props) {
  const [mode, setMode] = useState<Mode>('write');
  const [text, setText] = useState('');
  const [mood, setMood] = useState(3);
  const [saved, setSaved] = useState(false);
  const [entries, setEntries] = useState<JournalEntry[]>([]);

  // Voice state
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const recRef = useRef<{
    lang: string;
    continuous: boolean;
    interimResults: boolean;
    start: () => void;
    stop: () => void;
    onresult: ((ev: Event) => void) | null;
    onend: (() => void) | null;
  } | null>(null);
  const accRef = useRef('');

  useEffect(() => {
    setEntries(loadEntries());
  }, []);

  const handleSave = () => {
    const content = mode === 'write' ? text.trim() : transcript.trim();
    if (!content) return;
    const entry: JournalEntry = {
      id: `${Date.now()}`,
      date: new Date().toISOString(),
      mode,
      text: content,
      mood: mode === 'write' ? mood : undefined,
    };
    saveEntry(entry);
    setEntries(loadEntries());
    // Award XP
    try {
      const raw = localStorage.getItem('budr_xp_v1');
      const xpData = raw ? (JSON.parse(raw) as { total: number }) : { total: 0 };
      localStorage.setItem('budr_xp_v1', JSON.stringify({ total: xpData.total + 15 }));
    } catch { /* ignore */ }
    setSaved(true);
    setText('');
    setTranscript('');
    accRef.current = '';
    setTimeout(() => setSaved(false), 2200);
  };

  const stopMic = useCallback(() => {
    try { recRef.current?.stop(); } catch { /* ignore */ }
    recRef.current = null;
    setIsListening(false);
  }, []);

  const startMic = useCallback(() => {
    const w = window as unknown as {
      SpeechRecognition?: new () => NonNullable<typeof recRef.current>;
      webkitSpeechRecognition?: new () => NonNullable<typeof recRef.current>;
    };
    const Ctor = w.SpeechRecognition ?? w.webkitSpeechRecognition;
    if (!Ctor) return;
    stopMic();
    accRef.current = '';
    setTranscript('');
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
      setTranscript((accRef.current + interim).trimStart());
    };
    rec.onend = () => {
      setIsListening(false);
      recRef.current = null;
    };
    recRef.current = rec;
    try {
      rec.start();
      setIsListening(true);
    } catch { setIsListening(false); }
  }, [stopMic]);

  const toggleMic = () => {
    if (isListening) stopMic();
    else startMic();
  };

  useEffect(() => () => stopMic(), [stopMic]);

  const today = new Date().toLocaleDateString('da-DK', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="font-sans" style={{ color: tokens.text }}>

      {/* Header */}
      <div className="px-5 pt-5 pb-3">
        <h1 className="text-2xl font-black tracking-tight">Journal ✍️</h1>
        <p className="text-sm capitalize mt-0.5" style={{ color: tokens.textMuted }}>{today}</p>
      </div>

      <div className="px-5 space-y-4 pb-8">

        {/* Mode switcher */}
        <div
          className="flex rounded-2xl p-1"
          style={{ backgroundColor: tokens.cardBg, boxShadow: tokens.shadow }}
        >
          {([['write', 'Skriv', Pen], ['voice', 'Tal i stedet', Mic]] as const).map(([m, label, Icon]) => (
            <button
              key={m}
              type="button"
              onClick={() => { setMode(m); stopMic(); }}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold transition-all duration-200"
              style={{
                backgroundColor: mode === m ? accent : 'transparent',
                color: mode === m ? '#fff' : tokens.textMuted,
              }}
            >
              <Icon className="h-4 w-4" aria-hidden />
              {label}
            </button>
          ))}
        </div>

        {/* Write mode */}
        {mode === 'write' && (
          <div
            className="rounded-3xl p-5 space-y-4"
            style={{ backgroundColor: tokens.cardBg, boxShadow: tokens.shadow }}
          >
            <div>
              <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: tokens.textMuted }}>
                Hvad vil du gerne huske om i dag?
              </p>
              <textarea
                value={text}
                onChange={e => setText(e.target.value)}
                rows={5}
                placeholder="Skriv frit her — ét afsnit er rigeligt…"
                className="w-full rounded-2xl px-4 py-3.5 text-sm leading-relaxed resize-none outline-none transition-all duration-200"
                style={{
                  backgroundColor: `${accent}08`,
                  border: `1.5px solid ${accent}20`,
                  color: tokens.text,
                }}
              />
            </div>
            {/* Mood */}
            <div>
              <p className="text-xs font-bold uppercase tracking-wide mb-2.5" style={{ color: tokens.textMuted }}>
                Stemning
              </p>
              <div className="flex justify-between gap-1.5">
                {MOOD_OPTIONS.map(opt => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setMood(opt.value)}
                    className="flex flex-1 flex-col items-center gap-1 rounded-xl py-2.5 transition-all duration-150 active:scale-95"
                    style={{
                      backgroundColor: mood === opt.value ? `${accent}22` : 'transparent',
                      border: `1.5px solid ${mood === opt.value ? accent : `${accent}20`}`,
                    }}
                    aria-pressed={mood === opt.value}
                    title={opt.label}
                  >
                    <span className="text-xl leading-none">{opt.emoji}</span>
                    <span className="text-[9px] font-bold" style={{ color: mood === opt.value ? accent : tokens.textMuted }}>
                      {opt.label}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Voice mode */}
        {mode === 'voice' && (
          <div
            className="rounded-3xl p-5 flex flex-col items-center gap-4"
            style={{ backgroundColor: tokens.cardBg, boxShadow: tokens.shadow }}
          >
            <button
              type="button"
              onClick={toggleMic}
              className="relative h-20 w-20 rounded-full flex items-center justify-center text-white transition-all duration-200 active:scale-95"
              style={{
                background: isListening
                  ? `linear-gradient(135deg, ${accent}, ${accent}bb)`
                  : `linear-gradient(135deg, ${accent}cc, ${accent}88)`,
                boxShadow: isListening ? `0 0 0 10px ${accent}20` : 'none',
              }}
              aria-pressed={isListening}
              aria-label={isListening ? 'Stop optagelse' : 'Start optagelse'}
            >
              <Mic className="h-8 w-8" />
            </button>
            <p className="text-sm font-medium" style={{ color: tokens.textMuted }}>
              {isListening ? 'Taler… tryk igen for at stoppe' : 'Tryk for at tale'}
            </p>
            {transcript ? (
              <div
                className="w-full rounded-2xl px-4 py-3.5 text-sm leading-relaxed"
                style={{
                  backgroundColor: `${accent}08`,
                  border: `1.5px solid ${accent}20`,
                  color: tokens.text,
                }}
              >
                {transcript}
              </div>
            ) : null}
          </div>
        )}

        {/* Save button */}
        <button
          type="button"
          onClick={handleSave}
          disabled={!(mode === 'write' ? text.trim() : transcript.trim())}
          className="w-full rounded-2xl py-4 text-sm font-bold text-white transition-all duration-200 active:scale-[0.98] disabled:opacity-40"
          style={{
            background: `linear-gradient(135deg, ${accent}, ${accent}cc)`,
            boxShadow: `0 4px 16px ${accent}30`,
          }}
        >
          {saved ? '✓ Gemt!' : 'Gem i journal'}
        </button>

        {/* Previous entries */}
        {entries.length > 0 && (
          <div>
            <p className="text-xs font-bold uppercase tracking-wide mb-3 mt-2" style={{ color: tokens.textMuted }}>
              Tidligere noter
            </p>
            <div className="space-y-2">
              {entries.map(entry => {
                const dateStr = new Date(entry.date).toLocaleDateString('da-DK', {
                  weekday: 'short', day: 'numeric', month: 'short',
                });
                return (
                  <div
                    key={entry.id}
                    className="rounded-2xl px-4 py-3.5"
                    style={{
                      backgroundColor: tokens.cardBg,
                      boxShadow: tokens.shadow,
                    }}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <p className="text-xs font-semibold capitalize" style={{ color: tokens.textMuted }}>
                        {dateStr}
                      </p>
                      <div className="flex items-center gap-1.5">
                        {entry.mood !== undefined && (
                          <span className="text-sm">{MOOD_OPTIONS.find(o => o.value === entry.mood)?.emoji}</span>
                        )}
                        <span className="text-xs" style={{ color: tokens.textMuted }}>
                          {entry.mode === 'voice' ? '🎙️' : '✍️'}
                        </span>
                      </div>
                    </div>
                    <p className="text-sm leading-relaxed line-clamp-3" style={{ color: tokens.text }}>
                      {entry.text}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
