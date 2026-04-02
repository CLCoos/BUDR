'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ChevronDown, ChevronUp, Mic, MicOff, Pen } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useResident } from '../context/ResidentContext';
import { useResidentSession } from '@/hooks/useResidentSession';
import * as dataService from '@/lib/dataService';
import { getLysPhase, phaseDaLabel } from '../lib/lysTheme';
import type { LysThemeTokens } from '../lib/lysTheme';
import { ANTHROPIC_CHAT_MODEL } from '@/lib/ai/anthropicModel';
import type { JournalEntry, SelfLetter } from '@/types/local';
import { LOCAL_KEYS } from '@/types/local';

type Mode = 'write' | 'voice';
type JournalSection = 'dagbog' | 'brev';
type Privacy = 'private' | 'shared';

// ── Prompts (styrkebaserede, borgersprog) ────────────────────────────────────

const PROMPTS_LOW = [
  'Hvad var den mindste ting i dag, der faktisk virkede?',
  'Hvem eller hvad gav dig lidt energi, selvom du havde det svært?',
  'Hvad har du mest brug for lige nu — ro, kontakt eller noget helt tredje?',
  'Hvad vil du ønske dig til i morgen?',
  'Hvad hjalp dig bare lidt i dag?',
  'Hvad klarede du i dag, som du ikke troede du kunne?',
  'Hvornår følte du dig mindst alene i dag?',
];

const PROMPTS_MID = [
  'Hvad vil du gerne huske om i dag, når du ser tilbage om en uge?',
  'Hvad overraskede dig i dag?',
  'Hvad er én ting, du gerne ville have gjort anderledes — og hvorfor?',
  'Hvad mærkede du i kroppen i dag?',
  'Hvem betød noget for dig i dag — og hvordan?',
  'Hvad er du glad for, at du sagde eller gjorde i dag?',
  'Hvad tænkte du på, da du vågnede i dag?',
];

const PROMPTS_HIGH = [
  'Hvad vil du gerne bære med dig ind i morgen?',
  'Hvad har givet dig mest energi eller glæde i dag?',
  'Hvad er du taknemmelig for lige nu?',
  'Hvad gik bedre end forventet i dag?',
  'Hvad lærte du om dig selv i dag?',
  'Hvad er du stolt af fra i dag — også de helt små ting?',
  'Hvem vil du gerne takke for noget fra i dag?',
];

function getDailyPrompt(mood: number): string {
  const start = new Date(new Date().getFullYear(), 0, 0).getTime();
  const dayOfYear = Math.floor((Date.now() - start) / 86400000);
  const pool = mood <= 2 ? PROMPTS_LOW : mood >= 4 ? PROMPTS_HIGH : PROMPTS_MID;
  return pool[dayOfYear % pool.length];
}

// ── Feelings ─────────────────────────────────────────────────────────────────

const FEELINGS: { word: string; valence: 1 | 0 | -1 }[] = [
  { word: 'Glad',        valence:  1 },
  { word: 'Taknemmelig', valence:  1 },
  { word: 'Rolig',       valence:  1 },
  { word: 'Energisk',    valence:  1 },
  { word: 'Tryg',        valence:  1 },
  { word: 'Stolt',       valence:  1 },
  { word: 'Træt',        valence:  0 },
  { word: 'Urolig',      valence:  0 },
  { word: 'Trist',       valence: -1 },
  { word: 'Frustreret',  valence: -1 },
  { word: 'Overvældet',  valence: -1 },
  { word: 'Ensom',       valence: -1 },
  { word: 'Vred',        valence: -1 },
  { word: 'Bange',       valence: -1 },
];

const MOOD_OPTIONS = [
  { value: 1, emoji: '😴', label: 'Svært' },
  { value: 2, emoji: '😔', label: 'Dårligt' },
  { value: 3, emoji: '😐', label: 'OK' },
  { value: 4, emoji: '🙂', label: 'Godt' },
  { value: 5, emoji: '😁', label: 'Fantastisk' },
];

function toDateStr(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function calcStreak(entries: JournalEntry[]): number {
  if (entries.length === 0) return 0;
  let count = 0;
  const d = new Date();
  const todayDs = toDateStr(d);
  if (!entries.some(e => e.date.startsWith(todayDs))) {
    d.setDate(d.getDate() - 1); // start counting from yesterday if nothing today
  }
  for (let i = 0; i < 30; i++) {
    const ds = toDateStr(d);
    if (entries.some(e => e.date.startsWith(ds))) {
      count++;
      d.setDate(d.getDate() - 1);
    } else {
      break;
    }
  }
  return count;
}

type Props = {
  tokens: LysThemeTokens;
  accent: string;
};

export default function LysJournalTab({ tokens, accent }: Props) {
  const { residentId: ctxResidentId } = useResident();
  const session = useResidentSession();
  const residentId = ctxResidentId || session.activeId;
  const storageMode = ctxResidentId ? 'supabase' as const : session.storageMode;

  const [section, setSection] = useState<JournalSection>('dagbog');
  const [mode, setMode] = useState<Mode>('write');
  const [text, setText] = useState('');
  const [mood, setMood] = useState(3);
  const [feelings, setFeelings] = useState<string[]>([]);
  const [privacy, setPrivacy] = useState<Privacy>('private');
  const [saving, setSaving] = useState(false);
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [lysMsg, setLysMsg] = useState<string | null>(null);
  const [lysMsgLoading, setLysMsgLoading] = useState(false);
  const [todayPlanAnchor, setTodayPlanAnchor] = useState<string | null>(null);

  // Self-letter state
  const [letters, setLetters] = useState<SelfLetter[]>([]);
  const [letterText, setLetterText] = useState('');
  const [letterWeeks, setLetterWeeks] = useState(4);
  const [letterSaving, setLetterSaving] = useState(false);
  const [openLetter, setOpenLetter] = useState<SelfLetter | null>(null);

  // Voice state
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [editingTranscript, setEditingTranscript] = useState(false);
  const recRef = useRef<{
    lang: string; continuous: boolean; interimResults: boolean;
    start: () => void; stop: () => void;
    onresult: ((ev: Event) => void) | null;
    onend: (() => void) | null;
  } | null>(null);
  const accRef = useRef('');
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // Load journal entries
  useEffect(() => {
    dataService.getJournalEntries().then(e => {
      if (mountedRef.current) setEntries(e);
    });
  }, []);

  // Load self-letters
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LOCAL_KEYS.selfLetters);
      const all = raw ? (JSON.parse(raw) as SelfLetter[]) : [];
      setLetters(all);
      // Auto-open the first unread delivered letter
      const today = new Date().toISOString().slice(0, 10);
      const ready = all.find(l => !l.delivered && l.deliver_at <= today);
      if (ready) setOpenLetter(ready);
    } catch { /* ignore */ }
  }, []);

  const saveLetters = (updated: SelfLetter[]) => {
    try { localStorage.setItem(LOCAL_KEYS.selfLetters, JSON.stringify(updated)); } catch { /* ignore */ }
    setLetters(updated);
  };

  const handleSaveLetter = () => {
    if (!letterText.trim() || letterSaving) return;
    setLetterSaving(true);
    const deliverDate = new Date();
    deliverDate.setDate(deliverDate.getDate() + letterWeeks * 7);
    const letter: SelfLetter = {
      id: crypto.randomUUID(),
      text: letterText.trim(),
      written_at: new Date().toISOString(),
      deliver_at: deliverDate.toISOString().slice(0, 10),
      delivered: false,
    };
    saveLetters([letter, ...letters]);
    setLetterText('');
    setLetterSaving(false);
  };

  const markLetterRead = (id: string) => {
    const updated = letters.map(l => l.id === id ? { ...l, delivered: true } : l);
    saveLetters(updated);
    setOpenLetter(null);
  };

  // Load today's calendar anchor
  useEffect(() => {
    if (!residentId) return;
    const today = toDateStr(new Date());
    dataService.getPlanItems(storageMode, residentId)
      .then(items => {
        const active = items.filter(i => i.active_from <= today);
        if (active.length > 0 && mountedRef.current) {
          const pick = active[Math.floor(Math.random() * active.length)];
          setTodayPlanAnchor(pick.title);
        }
      })
      .catch(() => { /* ignore if no items */ });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [residentId]);

  // ── Voice ──────────────────────────────────────────────────────────────────

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
    setEditingTranscript(false);
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
    rec.onend = () => { setIsListening(false); recRef.current = null; };
    recRef.current = rec;
    try { rec.start(); setIsListening(true); } catch { setIsListening(false); }
  }, [stopMic]);

  const toggleMic = () => { if (isListening) stopMic(); else startMic(); };
  useEffect(() => () => stopMic(), [stopMic]);

  // ── Lys continuity response ────────────────────────────────────────────────

  const fetchLysMessage = async (content: string, moodVal: number, recentEntries: JournalEntry[]) => {
    setLysMsgLoading(true);
    try {
      const phase = getLysPhase(new Date());
      const historyLines = recentEntries.slice(0, 3).map(e => {
        const d = new Date(e.date).toLocaleDateString('da-DK', { weekday: 'short', day: 'numeric' });
        const m = MOOD_OPTIONS.find(o => o.value === e.mood)?.label ?? '';
        return `${d}: "${e.text.slice(0, 80)}"${m ? ` (${m})` : ''}`;
      });
      const historyCtx = historyLines.length > 0
        ? `\n\nSeneste indlæg:\n${historyLines.join('\n')}`
        : '';

      const res = await fetch('/api/ai/chat-completion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: 'ANTHROPIC',
          model: ANTHROPIC_CHAT_MODEL,
          messages: [
            {
              role: 'system',
              content: 'Du er Lys — en varm, empatisk ledsager i en dansk mental sundhedsapp. Skriv én kort, oprigtig og personlig kommentar (maks 2 sætninger, maks 35 ord) til hvad borgeren netop har skrevet. Hvis du ser et positivt mønster på tværs af de seneste indlæg, fremhæv det varmt og anerkendende. Slut med ét roligt emoji.',
            },
            {
              role: 'user',
              content: `Stemning: ${MOOD_OPTIONS.find(o => o.value === moodVal)?.label ?? 'OK'}. Tidspunkt: ${phaseDaLabel(phase)}.${historyCtx}\n\nDagens indlæg: "${content.slice(0, 400)}"`,
            },
          ],
          stream: false,
          parameters: { max_tokens: 90, temperature: 0.75 },
        }),
      });
      const d = (await res.json()) as { choices?: [{ message: { content: string } }] };
      const msg = d.choices?.[0]?.message?.content?.trim();
      if (msg && mountedRef.current) setLysMsg(msg);
    } catch { /* silently fail */ }
    finally { if (mountedRef.current) setLysMsgLoading(false); }
  };

  // ── Save ───────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    const content = mode === 'write' ? text.trim() : transcript.trim();
    if (!content || saving) return;
    setSaving(true);
    setLysMsg(null);

    await dataService.saveJournalEntry(storageMode, residentId, {
      date: new Date().toISOString(),
      mode,
      text: content,
      mood,
      feelings: feelings.length > 0 ? feelings : undefined,
      privacy,
      prompt: mode === 'write' ? getDailyPrompt(mood) : undefined,
    });

    const updated = await dataService.getJournalEntries();
    if (mountedRef.current) setEntries(updated);

    if (ctxResidentId) {
      const supabase = createClient();
      void supabase?.rpc('award_xp', { p_resident_id: residentId, p_activity: 'journal', p_xp: 15 });
    }

    setSaving(false);
    setText('');
    setTranscript('');
    setFeelings([]);
    accRef.current = '';

    void fetchLysMessage(content, mood, updated.slice(1, 4));
  };

  const toggleFeeling = (word: string) => {
    setFeelings(prev =>
      prev.includes(word) ? prev.filter(f => f !== word) : [...prev, word]
    );
  };

  // ── Derived ────────────────────────────────────────────────────────────────

  const content = mode === 'write' ? text : transcript;
  const dailyPrompt = getDailyPrompt(mood);
  const streak = calcStreak(entries);
  const today = new Date().toLocaleDateString('da-DK', {
    weekday: 'long', day: 'numeric', month: 'long',
  });

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="font-sans" style={{ color: tokens.text }}>

      {/* Header */}
      <div className="px-5 pt-5 pb-3">
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight">Journal ✍️</h1>
            <p className="text-sm capitalize mt-0.5" style={{ color: tokens.textMuted }}>{today}</p>
          </div>
          {streak >= 2 && (
            <div
              className="flex flex-col items-center rounded-2xl px-3 py-2 shrink-0"
              style={{ backgroundColor: `${accent}18`, border: `1.5px solid ${accent}30` }}
            >
              <span className="text-lg leading-none">🔥</span>
              <span className="text-[10px] font-black mt-0.5" style={{ color: accent }}>
                {streak} dage
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="px-5 space-y-4 pb-8">

        {/* Delivered letter modal */}
        {openLetter && (
          <div
            className="rounded-3xl p-5 border-2"
            style={{ backgroundColor: `${accent}10`, borderColor: accent }}
          >
            <p className="text-xs font-bold uppercase tracking-wide mb-1" style={{ color: accent }}>
              📬 Et brev til dig selv er ankommet
            </p>
            <p className="text-xs mb-3" style={{ color: tokens.textMuted }}>
              Skrevet {new Date(openLetter.written_at).toLocaleDateString('da-DK', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
            <p className="text-sm leading-relaxed whitespace-pre-wrap mb-4" style={{ color: tokens.text }}>
              {openLetter.text}
            </p>
            <button
              type="button"
              onClick={() => markLetterRead(openLetter.id)}
              className="rounded-2xl px-5 py-2.5 text-sm font-bold text-white"
              style={{ background: `linear-gradient(135deg, ${accent}, ${accent}cc)` }}
            >
              Jeg har læst det ✓
            </button>
          </div>
        )}

        {/* Section switcher */}
        <div
          className="flex rounded-2xl p-1"
          style={{ backgroundColor: tokens.cardBg, boxShadow: tokens.shadow }}
        >
          {(['dagbog', 'brev'] as const).map(s => (
            <button
              key={s}
              type="button"
              onClick={() => setSection(s)}
              className="flex flex-1 items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold transition-all duration-200"
              style={{
                backgroundColor: section === s ? accent : 'transparent',
                color: section === s ? '#fff' : tokens.textMuted,
              }}
            >
              {s === 'dagbog' ? '✍️ Dagbog' : '💌 Brev til mig selv'}
            </button>
          ))}
        </div>

        {/* Brev til mig selv section */}
        {section === 'brev' && (
          <BrevSection
            tokens={tokens}
            accent={accent}
            letters={letters}
            letterText={letterText}
            setLetterText={setLetterText}
            letterWeeks={letterWeeks}
            setLetterWeeks={setLetterWeeks}
            letterSaving={letterSaving}
            onSave={handleSaveLetter}
          />
        )}

        {/* Daily journal section — only shown when dagbog is active */}
        {section === 'dagbog' && <>

        {/* Write / Voice toggle */}
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

        {/* Mood selector */}
        <div
          className="rounded-2xl px-4 py-4"
          style={{ backgroundColor: tokens.cardBg, boxShadow: tokens.shadow }}
        >
          <p className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color: tokens.textMuted }}>
            Stemning lige nu
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
                  border: `1.5px solid ${mood === opt.value ? accent : `${accent}18`}`,
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

        {/* Feelings word-picker */}
        <div
          className="rounded-2xl px-4 py-4"
          style={{ backgroundColor: tokens.cardBg, boxShadow: tokens.shadow }}
        >
          <p className="text-xs font-bold uppercase tracking-wide mb-3" style={{ color: tokens.textMuted }}>
            Hvad mærker du?{' '}
            <span className="font-normal normal-case">vælg gerne flere</span>
          </p>
          <div className="flex flex-wrap gap-2">
            {FEELINGS.map(({ word, valence }) => {
              const selected = feelings.includes(word);
              const chipColor = valence === 1 ? '#22c55e' : valence === -1 ? '#f87171' : accent;
              return (
                <button
                  key={word}
                  type="button"
                  onClick={() => toggleFeeling(word)}
                  className="rounded-full px-3 py-1.5 text-xs font-semibold transition-all duration-150 active:scale-95"
                  style={{
                    backgroundColor: selected ? `${chipColor}22` : 'transparent',
                    border: `1.5px solid ${selected ? chipColor : `${accent}18`}`,
                    color: selected ? chipColor : tokens.textMuted,
                  }}
                >
                  {word}
                </button>
              );
            })}
          </div>
        </div>

        {/* Calendar anchor */}
        {todayPlanAnchor && mode === 'write' && !text && (
          <button
            type="button"
            onClick={() => setText(`${todayPlanAnchor} — `)}
            className="w-full rounded-2xl px-4 py-3.5 text-left transition-all duration-200 active:scale-[0.99]"
            style={{
              backgroundColor: `${accent}10`,
              border: `1.5px dashed ${accent}40`,
            }}
          >
            <p className="text-xs font-bold uppercase tracking-wide mb-1" style={{ color: accent }}>
              Fra din dag i dag
            </p>
            <p className="text-sm font-medium" style={{ color: tokens.text }}>
              &ldquo;{todayPlanAnchor}&rdquo;
            </p>
            <p className="text-xs mt-0.5" style={{ color: tokens.textMuted }}>
              Tryk for at starte med det
            </p>
          </button>
        )}

        {/* Write mode */}
        {mode === 'write' && (
          <div
            className="rounded-3xl p-5"
            style={{ backgroundColor: tokens.cardBg, boxShadow: tokens.shadow }}
          >
            <p className="text-xs font-bold uppercase tracking-wide mb-1" style={{ color: tokens.textMuted }}>
              Dagens spørgsmål
            </p>
            <p className="text-sm font-medium mb-3 leading-snug" style={{ color: tokens.text }}>
              {dailyPrompt}
            </p>
            <textarea
              value={text}
              onChange={e => setText(e.target.value)}
              rows={5}
              placeholder="Skriv frit her — ét afsnit er rigeligt…"
              className="w-full rounded-2xl px-4 py-3.5 text-sm leading-relaxed resize-none outline-none"
              style={{
                backgroundColor: `${accent}08`,
                border: `1.5px solid ${accent}20`,
                color: tokens.text,
                caretColor: accent,
              }}
            />
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
              className="h-20 w-20 rounded-full flex items-center justify-center text-white transition-all duration-200 active:scale-95"
              style={{
                background: isListening
                  ? `linear-gradient(135deg, ${accent}, ${accent}bb)`
                  : `linear-gradient(135deg, ${accent}cc, ${accent}88)`,
                boxShadow: isListening ? `0 0 0 10px ${accent}20` : 'none',
              }}
              aria-label={isListening ? 'Stop optagelse' : 'Start optagelse'}
            >
              {isListening ? <MicOff className="h-8 w-8" /> : <Mic className="h-8 w-8" />}
            </button>
            <p className="text-sm font-medium" style={{ color: tokens.textMuted }}>
              {isListening ? 'Taler… tryk igen for at stoppe' : 'Tryk for at tale'}
            </p>

            {transcript && (
              editingTranscript ? (
                <div className="w-full">
                  <textarea
                    value={transcript}
                    onChange={e => setTranscript(e.target.value)}
                    rows={5}
                    autoFocus
                    className="w-full rounded-2xl px-4 py-3.5 text-sm leading-relaxed resize-none outline-none"
                    style={{
                      backgroundColor: `${accent}08`,
                      border: `1.5px solid ${accent}40`,
                      color: tokens.text,
                      caretColor: accent,
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setEditingTranscript(false)}
                    className="mt-2 text-xs font-semibold"
                    style={{ color: tokens.textMuted }}
                  >
                    Færdig med at rette
                  </button>
                </div>
              ) : (
                <div className="w-full">
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
                  <button
                    type="button"
                    onClick={() => setEditingTranscript(true)}
                    className="mt-2 text-xs font-semibold"
                    style={{ color: accent }}
                  >
                    Ret teksten
                  </button>
                </div>
              )
            )}
          </div>
        )}

        {/* Privacy toggle */}
        <div
          className="flex items-center justify-between rounded-2xl px-4 py-3"
          style={{ backgroundColor: tokens.cardBg, boxShadow: tokens.shadow }}
        >
          <div>
            <p className="text-sm font-semibold" style={{ color: tokens.text }}>
              {privacy === 'private' ? '🔒 Kun for dig' : '👁 Delt med dit team'}
            </p>
            <p className="text-xs mt-0.5" style={{ color: tokens.textMuted }}>
              {privacy === 'private'
                ? 'Personalet kan ikke se dette indlæg'
                : 'Dit team kan se dette indlæg'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setPrivacy(p => p === 'private' ? 'shared' : 'private')}
            className="rounded-full px-3 py-1.5 text-xs font-bold transition-all duration-200 shrink-0"
            style={{
              backgroundColor: privacy === 'shared' ? `${accent}22` : `${accent}10`,
              color: privacy === 'shared' ? accent : tokens.textMuted,
              border: `1.5px solid ${privacy === 'shared' ? accent : `${accent}20`}`,
            }}
          >
            {privacy === 'private' ? 'Del med team' : 'Gør privat'}
          </button>
        </div>

        {/* Save */}
        <button
          type="button"
          onClick={() => void handleSave()}
          disabled={!content || saving}
          className="w-full rounded-2xl py-4 text-sm font-bold text-white transition-all duration-200 active:scale-[0.98] disabled:opacity-40"
          style={{
            background: `linear-gradient(135deg, ${accent}, ${accent}cc)`,
            boxShadow: `0 4px 16px ${accent}30`,
          }}
        >
          {saving ? 'Gemmer…' : 'Gem i journal'}
        </button>

        {/* Lys continuity message */}
        {(lysMsg || lysMsgLoading) && (
          <div
            className="rounded-3xl p-5"
            style={{
              backgroundColor: tokens.cardBg,
              boxShadow: tokens.shadow,
              border: `1px solid ${accent}18`,
            }}
          >
            <div className="flex items-start gap-3">
              <div
                className="h-9 w-9 shrink-0 rounded-full flex items-center justify-center text-sm font-black text-white mt-0.5"
                style={{ background: `linear-gradient(135deg, ${accent}, ${accent}99)` }}
                aria-hidden
              >
                ✦
              </div>
              <div className="flex-1">
                <p className="text-xs font-bold uppercase tracking-wide mb-1.5" style={{ color: accent }}>
                  Lys
                </p>
                {lysMsgLoading ? (
                  <span className="flex gap-1">
                    {[0, 120, 240].map(d => (
                      <span
                        key={d}
                        className="w-1.5 h-1.5 rounded-full animate-bounce"
                        style={{ backgroundColor: accent, animationDelay: `${d}ms` }}
                      />
                    ))}
                  </span>
                ) : (
                  <p className="text-sm leading-relaxed" style={{ color: tokens.text }}>{lysMsg}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Previous entries — expandable */}
        {entries.length > 0 && (
          <div>
            <p className="text-xs font-bold uppercase tracking-wide mb-3 mt-2" style={{ color: tokens.textMuted }}>
              Tidligere indlæg
            </p>
            <div className="space-y-2">
              {entries.map(entry => {
                const expanded = expandedId === entry.id;
                const dateStr = new Date(entry.date).toLocaleDateString('da-DK', {
                  weekday: 'short', day: 'numeric', month: 'short',
                });
                return (
                  <div
                    key={entry.id}
                    className="rounded-2xl overflow-hidden transition-all duration-200"
                    style={{ backgroundColor: tokens.cardBg, boxShadow: tokens.shadow }}
                  >
                    <button
                      type="button"
                      className="w-full text-left px-4 py-3.5"
                      onClick={() => setExpandedId(expanded ? null : entry.id)}
                    >
                      {/* Row header */}
                      <div className="flex items-center justify-between mb-1.5">
                        <p className="text-xs font-semibold capitalize" style={{ color: tokens.textMuted }}>
                          {dateStr}
                        </p>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px]" style={{ color: tokens.textMuted }}>
                            {entry.privacy === 'shared' ? '👁' : '🔒'}
                          </span>
                          {entry.mood !== undefined && (
                            <span className="text-sm">
                              {MOOD_OPTIONS.find(o => o.value === entry.mood)?.emoji}
                            </span>
                          )}
                          <span className="text-xs" style={{ color: tokens.textMuted }}>
                            {entry.mode === 'voice' ? '🎙️' : '✍️'}
                          </span>
                          {expanded
                            ? <ChevronUp className="h-3.5 w-3.5" style={{ color: tokens.textMuted }} />
                            : <ChevronDown className="h-3.5 w-3.5" style={{ color: tokens.textMuted }} />
                          }
                        </div>
                      </div>

                      {/* Text — preview or full */}
                      <p className="text-sm leading-relaxed" style={{ color: tokens.text }}>
                        {expanded
                          ? entry.text
                          : entry.text.slice(0, 120) + (entry.text.length > 120 ? '…' : '')}
                      </p>
                    </button>

                    {/* Expanded extras */}
                    {expanded && (
                      <div
                        className="px-4 pb-3.5"
                        style={{ borderTop: `1px solid ${accent}12` }}
                      >
                        {/* Prompt used */}
                        {entry.prompt && (
                          <p className="text-xs italic mt-3 mb-2" style={{ color: tokens.textMuted }}>
                            Spørgsmål: {entry.prompt}
                          </p>
                        )}
                        {/* Feelings chips */}
                        {entry.feelings && entry.feelings.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-2">
                            {entry.feelings.map(f => (
                              <span
                                key={f}
                                className="rounded-full px-2.5 py-1 text-xs font-semibold"
                                style={{ backgroundColor: `${accent}15`, color: accent }}
                              >
                                {f}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        </> /* end section === 'dagbog' */}

      </div>
    </div>
  );
}

// ── Brev til mig selv section ─────────────────────────────────────────────────

function BrevSection({
  tokens,
  accent,
  letters,
  letterText,
  setLetterText,
  letterWeeks,
  setLetterWeeks,
  letterSaving,
  onSave,
}: {
  tokens: LysThemeTokens;
  accent: string;
  letters: SelfLetter[];
  letterText: string;
  setLetterText: (v: string) => void;
  letterWeeks: number;
  setLetterWeeks: (v: number) => void;
  letterSaving: boolean;
  onSave: () => void;
}) {
  const today = new Date().toISOString().slice(0, 10);
  const pending = letters.filter(l => !l.delivered && l.deliver_at > today);
  const delivered = letters.filter(l => l.delivered);
  const WEEK_OPTIONS = [1, 2, 4, 8];

  const deliverLabel = (() => {
    const d = new Date();
    d.setDate(d.getDate() + letterWeeks * 7);
    return d.toLocaleDateString('da-DK', { day: 'numeric', month: 'long', year: 'numeric' });
  })();

  return (
    <div className="space-y-4">
      <p className="text-sm leading-relaxed" style={{ color: tokens.textMuted }}>
        Skriv et brev til dig selv — du modtager det efter dit valgte tidspunkt.
      </p>

      {/* Compose */}
      <div className="rounded-3xl p-5 space-y-4" style={{ backgroundColor: tokens.cardBg, boxShadow: tokens.shadow }}>
        <textarea
          value={letterText}
          onChange={e => setLetterText(e.target.value)}
          rows={6}
          placeholder="Kære mig selv… Hvad vil du gerne huske? Hvad håber du på?"
          className="w-full rounded-2xl px-4 py-3.5 text-sm leading-relaxed resize-none outline-none"
          style={{
            backgroundColor: `${accent}08`,
            border: `1.5px solid ${accent}20`,
            color: tokens.text,
            caretColor: accent,
          }}
        />

        <div>
          <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: tokens.textMuted }}>
            Åbn brevet om
          </p>
          <div className="flex gap-2">
            {WEEK_OPTIONS.map(w => (
              <button
                key={w}
                type="button"
                onClick={() => setLetterWeeks(w)}
                className="flex-1 rounded-xl py-2.5 text-xs font-bold transition-all duration-150"
                style={{
                  backgroundColor: letterWeeks === w ? `${accent}22` : 'transparent',
                  border: `1.5px solid ${letterWeeks === w ? accent : `${accent}20`}`,
                  color: letterWeeks === w ? accent : tokens.textMuted,
                }}
              >
                {w === 1 ? '1 uge' : `${w} uger`}
              </button>
            ))}
          </div>
          <p className="text-xs mt-2" style={{ color: tokens.textMuted }}>
            Leveres {deliverLabel}
          </p>
        </div>

        <button
          type="button"
          onClick={onSave}
          disabled={!letterText.trim() || letterSaving}
          className="w-full rounded-2xl py-3.5 text-sm font-bold text-white transition-all active:scale-[0.98] disabled:opacity-40"
          style={{ background: `linear-gradient(135deg, ${accent}, ${accent}cc)` }}
        >
          💌 Forsegl og gem brevet
        </button>
      </div>

      {/* Pending letters */}
      {pending.length > 0 && (
        <div>
          <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: tokens.textMuted }}>
            Forseglet — venter på åbningsdato
          </p>
          <div className="space-y-2">
            {pending.map(l => (
              <div key={l.id} className="rounded-2xl px-4 py-3" style={{ backgroundColor: tokens.cardBg }}>
                <p className="text-xs" style={{ color: tokens.textMuted }}>
                  🔒 Åbnes {new Date(l.deliver_at).toLocaleDateString('da-DK', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Delivered/read letters */}
      {delivered.length > 0 && (
        <div>
          <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: tokens.textMuted }}>
            Læste breve
          </p>
          <div className="space-y-2">
            {delivered.map(l => (
              <div key={l.id} className="rounded-2xl px-4 py-3.5" style={{ backgroundColor: tokens.cardBg, boxShadow: tokens.shadow }}>
                <p className="text-xs mb-2" style={{ color: tokens.textMuted }}>
                  Skrevet {new Date(l.written_at).toLocaleDateString('da-DK', { day: 'numeric', month: 'short', year: 'numeric' })}
                </p>
                <p className="text-sm leading-relaxed" style={{ color: tokens.text }}>{l.text}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
