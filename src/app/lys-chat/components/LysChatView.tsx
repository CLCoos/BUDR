'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, Mic, MicOff, Send, Settings, WifiOff } from 'lucide-react';
import { VoiceMessageButton } from '@/components/lys/VoiceMessageButton';
import { VoiceInputWhisper } from '@/components/lys/VoiceInputWhisper';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { trackEvent } from '@/lib/analytics';
import { tryEarnFirstChatBadge } from '@/lib/residentBadgeSync';
import { CHRIS_VOICE_ID, LYS_VOICE_CHOICES, STINE_VOICE_ID } from '@/lib/voice/voices';
import { getLysPhase, lysTheme, phaseDaLabel } from '@/app/park-hub/lib/lysTheme';
import {
  recordStreamCompleted,
  recordStreamFirstToken,
  recordStreamNotUsed,
  recordVoiceInterrupt,
  type VoiceStreamSource,
} from '@/lib/voice/voiceObservability';
import type { LysChatMessage } from '@/app/api/lys-chat/route';

const LYS_CHAT_DRAFT_KEY = 'budr_lys_chat_draft';
const LYS_VOICE_INTERRUPT_EVENT = 'lys:voice-interrupt';
type VoiceInterruptSource = 'browser_stt' | 'whisper' | 'manual';

// ── Types ────────────────────────────────────────────────────────────────────

type SavedConversation = {
  id: string;
  title: string | null;
  messages: LysChatMessage[];
  updated_at: string;
};

type ResidentProfileResponse = {
  nickname?: string | null;
  display_name?: string | null;
  lys_voice_effective_id?: string;
  lys_voice_autoplay?: boolean;
  lys_voice_intro_played_at?: string | null;
};

function getTtsErrorMessage(status: number): string {
  if (status === 401) return 'Log ind igen for at bruge oplæsning.';
  if (status === 429) return 'Der er travlt med oplæsning lige nu. Prøv igen om lidt.';
  if (status >= 500) return 'Oplæsning er midlertidigt utilgængelig.';
  return 'Kunne ikke afspille lyd lige nu.';
}

function splitTtsChunks(text: string): string[] {
  const rawParts = text
    .split(/(?<=[.!?])\s+/)
    .map((p) => p.trim())
    .filter(Boolean);
  const out: string[] = [];
  for (const part of rawParts) {
    if (part.length <= 220) {
      out.push(part);
      continue;
    }
    const words = part.split(/\s+/).filter(Boolean);
    let current = '';
    for (const word of words) {
      const next = current ? `${current} ${word}` : word;
      if (next.length > 180) {
        if (current) out.push(current);
        current = word;
      } else {
        current = next;
      }
    }
    if (current) out.push(current);
  }
  return out;
}

// ── Hooks ────────────────────────────────────────────────────────────────────

function useResidentId(): string | null {
  const [id, setId] = useState<string | null>(null);
  useEffect(() => {
    const match = document.cookie.match(/budr_resident_id=([^;]+)/);
    setId(match?.[1] ?? null);
  }, []);
  return id;
}

// ── Component ────────────────────────────────────────────────────────────────

export default function LysChatView() {
  const router = useRouter();
  const residentId = useResidentId();
  const online = useOnlineStatus();

  const [now] = useState(() => new Date());
  const phase = useMemo(() => getLysPhase(now), [now]);
  const tokens = useMemo(() => lysTheme(phase), [phase]);
  const accent = tokens.accent;

  const [messages, setMessages] = useState<LysChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [convId, setConvId] = useState<string | null>(null);

  // History panel
  const [showHistory, setShowHistory] = useState(false);
  const [history, setHistory] = useState<SavedConversation[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Voice
  const [voiceMode, setVoiceMode] = useState(false);
  const [isListening, setIsListening] = useState(false);
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

  const bottomRef = useRef<HTMLDivElement>(null);
  const draftRestored = useRef(false);

  type VoicePrefs = {
    lys_voice_effective_id: string;
    lys_voice_autoplay: boolean;
    lys_voice_intro_played_at: string | null;
  };
  const [voicePrefs, setVoicePrefs] = useState<VoicePrefs | null>(null);
  const [residentName, setResidentName] = useState<string>('');
  const [introMarkedLocal, setIntroMarkedLocal] = useState(false);
  const [voiceSwitchSaving, setVoiceSwitchSaving] = useState(false);
  const [voiceSwitchMsg, setVoiceSwitchMsg] = useState<string | null>(null);
  const userGesturedRef = useRef(false);
  const lastAutoplayContentRef = useRef<string | null>(null);
  const playedWelcomeRef = useRef(false);
  const [voiceBanner, setVoiceBanner] = useState<string | null>(null);
  const [pendingTtsText, setPendingTtsText] = useState<string | null>(null);
  const ttsAbortRef = useRef<AbortController | null>(null);
  const activeAutoplaySignatureRef = useRef<string | null>(null);
  const lastInterruptSourceRef = useRef<VoiceInterruptSource | null>(null);

  const emitVoiceInterrupt = useCallback((source: VoiceInterruptSource) => {
    lastInterruptSourceRef.current = source;
    window.dispatchEvent(new Event(LYS_VOICE_INTERRUPT_EVENT));
  }, []);

  const interruptVoicePlayback = useCallback(() => {
    const hadActivePlayback = !!ttsAbortRef.current;
    ttsAbortRef.current?.abort();
    ttsAbortRef.current = null;
    setPendingTtsText(null);
    if (hadActivePlayback) {
      trackEvent('lys_voice_interrupt', {
        source: lastInterruptSourceRef.current ?? 'manual',
      });
      recordVoiceInterrupt(lastInterruptSourceRef.current ?? 'manual');
    }
  }, []);

  const quickVoiceChoices = useMemo(
    () =>
      LYS_VOICE_CHOICES.filter((v) => v.id === STINE_VOICE_ID || v.id === CHRIS_VOICE_ID).map(
        (v) => ({ id: v.id, name: v.name })
      ),
    []
  );

  // Gendan kladde (kun én gang, tom tråd)
  useEffect(() => {
    if (draftRestored.current || messages.length > 0) return;
    draftRestored.current = true;
    try {
      const d = localStorage.getItem(LYS_CHAT_DRAFT_KEY);
      if (d) setInput(d);
    } catch {
      /* ignore */
    }
  }, [messages.length]);

  useEffect(() => {
    const onFirst = () => {
      userGesturedRef.current = true;
    };
    window.addEventListener('pointerdown', onFirst, { once: true });
    return () => window.removeEventListener('pointerdown', onFirst);
  }, []);

  useEffect(() => {
    if (!residentId) {
      setVoicePrefs(null);
      return;
    }
    let cancelled = false;
    fetch('/api/park/resident-me', { credentials: 'same-origin' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: ResidentProfileResponse | null) => {
        if (cancelled || !d?.lys_voice_effective_id) return;
        const preferredName =
          (typeof d.nickname === 'string' && d.nickname.trim()) ||
          (typeof d.display_name === 'string' && d.display_name.trim()) ||
          '';
        setResidentName(preferredName);
        setVoicePrefs({
          lys_voice_effective_id: String(d.lys_voice_effective_id),
          lys_voice_autoplay: !!d.lys_voice_autoplay,
          lys_voice_intro_played_at:
            typeof d.lys_voice_intro_played_at === 'string' ? d.lys_voice_intro_played_at : null,
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [residentId]);

  const playTts = useCallback(
    async (text: string, signal?: AbortSignal) => {
      if (!voicePrefs) return { ok: false, blocked: false as const };
      if (signal?.aborted) return { ok: false, blocked: false as const };
      try {
        const res = await fetch('/api/voice/tts', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({
            text,
            voiceId: voicePrefs.lys_voice_effective_id,
          }),
        });
        if (!res.ok) {
          if (signal?.aborted) return { ok: false, blocked: false as const };
          setVoiceBanner(getTtsErrorMessage(res.status));
          return { ok: false, blocked: false as const };
        }
        const blob = await res.blob();
        if (signal?.aborted) return { ok: false, blocked: false as const };
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audio.onended = () => URL.revokeObjectURL(url);
        if (signal) {
          signal.addEventListener(
            'abort',
            () => {
              audio.pause();
              URL.revokeObjectURL(url);
            },
            { once: true }
          );
        }
        try {
          await audio.play();
          if (signal?.aborted) return { ok: false, blocked: false as const };
          setVoiceBanner(null);
          setPendingTtsText(null);
          return { ok: true, blocked: false as const };
        } catch {
          URL.revokeObjectURL(url);
          setPendingTtsText(text);
          setVoiceBanner('Lyd er slået fra i browseren. Tryk "Aktiver lyd" for at høre svar.');
          return { ok: false, blocked: true as const };
        }
      } catch {
        if (signal?.aborted) return { ok: false, blocked: false as const };
        setVoiceBanner('Netværksfejl ved oplæsning. Tekstchat virker stadig.');
        return { ok: false, blocked: false as const };
      }
    },
    [voicePrefs]
  );

  const playTtsQueue = useCallback(
    async (text: string) => {
      interruptVoicePlayback();
      const controller = new AbortController();
      ttsAbortRef.current = controller;
      const chunks = splitTtsChunks(text);
      for (const chunk of chunks) {
        if (controller.signal.aborted) return;
        const result = await playTts(chunk, controller.signal);
        if (!result.ok && !result.blocked) return;
        if (result.blocked) return;
      }
    },
    [interruptVoicePlayback, playTts]
  );

  useEffect(() => {
    const onInterrupt = () => interruptVoicePlayback();
    window.addEventListener(LYS_VOICE_INTERRUPT_EVENT, onInterrupt);
    return () => {
      window.removeEventListener(LYS_VOICE_INTERRUPT_EVENT, onInterrupt);
      interruptVoicePlayback();
    };
  }, [interruptVoicePlayback]);

  useEffect(() => {
    if (!voicePrefs || playedWelcomeRef.current) return;
    playedWelcomeRef.current = true;
    const namePart = residentName ? ` ${residentName}` : '';
    const welcomeText = `Hej${namePart}, du kan enten tale med mig eller skrive til mig.`;

    void playTts(welcomeText).then((result) => {
      if (result.ok || result.blocked) return;
      const onFirstPointer = () => void playTts(welcomeText);
      window.addEventListener('pointerdown', onFirstPointer, { once: true });
    });
  }, [playTts, residentName, voicePrefs]);

  useEffect(() => {
    if (!voicePrefs?.lys_voice_autoplay || !userGesturedRef.current) return;
    const last = messages[messages.length - 1];
    if (!last || last.role !== 'assistant') return;
    const signature = `${messages.length}:${last.content}`;
    if (signature === activeAutoplaySignatureRef.current) return;
    activeAutoplaySignatureRef.current = signature;
    lastAutoplayContentRef.current = last.content;
    void (async () => {
      await playTtsQueue(last.content);
    })();
  }, [messages, playTtsQueue, voicePrefs]);

  const setQuickVoice = useCallback(
    async (voiceId: string) => {
      if (!voicePrefs || voicePrefs.lys_voice_effective_id === voiceId) return;
      setVoiceSwitchSaving(true);
      setVoiceSwitchMsg(null);
      try {
        const res = await fetch('/api/voice/save-preference', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({
            lys_voice_id: voiceId,
            lys_voice_autoplay: !!voicePrefs.lys_voice_autoplay,
          }),
        });
        if (!res.ok) {
          const j = (await res.json().catch(() => ({}))) as { error?: string };
          setVoiceSwitchMsg(j.error ?? 'Kunne ikke skifte stemme');
          return;
        }
        setVoicePrefs((prev) =>
          prev
            ? {
                ...prev,
                lys_voice_effective_id: voiceId,
              }
            : prev
        );
        setVoiceSwitchMsg(null);
      } catch {
        setVoiceSwitchMsg('Netværksfejl ved stemmeskift');
      } finally {
        setVoiceSwitchSaving(false);
      }
    },
    [voicePrefs]
  );

  // Gem kladde løbende
  useEffect(() => {
    const t = window.setTimeout(() => {
      try {
        if (input.trim()) localStorage.setItem(LYS_CHAT_DRAFT_KEY, input);
        else localStorage.removeItem(LYS_CHAT_DRAFT_KEY);
      } catch {
        /* ignore */
      }
    }, 400);
    return () => window.clearTimeout(t);
  }, [input]);

  // Scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  // ── Save conversation to Supabase ─────────────────────────────────────────
  const saveConversation = useCallback(
    async (msgs: LysChatMessage[], existingId: string | null) => {
      if (!residentId || msgs.length < 2) return existingId;
      const supabase = createClient();
      if (!supabase) return existingId;
      const title = msgs.find((m) => m.role === 'user')?.content.slice(0, 60) ?? null;
      if (existingId) {
        await supabase
          .from('lys_conversations')
          .update({ messages: msgs, title, updated_at: new Date().toISOString() })
          .eq('id', existingId);
        return existingId;
      } else {
        const { data } = await supabase
          .from('lys_conversations')
          .insert({ resident_id: residentId, messages: msgs, title })
          .select('id')
          .single();
        return (data as { id: string } | null)?.id ?? null;
      }
    },
    [residentId]
  );

  // ── Send message ──────────────────────────────────────────────────────────
  const handleSend = useCallback(
    async (text?: string) => {
      const trimmed = (text ?? input).trim();
      if (!trimmed || loading) return;

      if (!online) {
        setInput(trimmed);
        return;
      }

      setInput('');
      accRef.current = '';

      const userMsg: LysChatMessage = { role: 'user', content: trimmed };
      const next = [...messages, userMsg];
      setMessages(next);
      setLoading(true);

      try {
        const requestStartedAt = Date.now();
        const res = await fetch('/api/lys-chat', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({
            messages: next.slice(-12),
            residentFirstName: '',
            timeOfDay: phaseDaLabel(phase),
            mood: null,
            sessionContext: '',
            stream: true,
            conversation_id: convId ?? undefined,
          }),
        });
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as { text?: string; error?: string };
          const errReply =
            res.status === 429
              ? 'Der blev sendt mange beskeder på kort tid. Vent lidt og prøv igen.'
              : res.status === 503
                ? 'Lys er ikke tilgængelig lige nu. Prøv igen om et øjeblik.'
                : typeof data.error === 'string' && data.error.trim().length > 0
                  ? data.error
                  : 'Det lykkedes ikke at få svar. Tjek dit net og prøv igen.';
          setMessages([...next, { role: 'assistant' as const, content: errReply }]);
          return;
        }

        const contentType = res.headers.get('content-type') ?? '';
        const streamSourceRaw = res.headers.get('x-lys-stream-source') ?? 'none';
        const streamSource: VoiceStreamSource =
          streamSourceRaw === 'anthropic' ||
          streamSourceRaw === 'fallback' ||
          streamSourceRaw === 'local'
            ? streamSourceRaw
            : 'none';
        let reply = '';
        if (contentType.includes('text/event-stream') && res.body) {
          const reader = res.body.getReader();
          const decoder = new TextDecoder();
          let buffered = '';
          let assembled = '';
          let firstTokenTracked = false;
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            buffered += decoder.decode(value, { stream: true });
            let splitIndex = buffered.indexOf('\n\n');
            while (splitIndex >= 0) {
              const frame = buffered.slice(0, splitIndex);
              buffered = buffered.slice(splitIndex + 2);
              const lines = frame.split('\n');
              const eventLine = lines.find((line) => line.startsWith('event: '));
              const dataLine = lines.find((line) => line.startsWith('data: '));
              const eventType = eventLine?.slice(7).trim() ?? '';
              if (dataLine) {
                const jsonPart = dataLine.slice(6);
                try {
                  const payload = JSON.parse(jsonPart) as { text?: string };
                  if (typeof payload.text === 'string' && payload.text.length > 0) {
                    if (eventType === 'token') {
                      if (!firstTokenTracked) {
                        firstTokenTracked = true;
                        trackEvent('lys_stream_first_token', {
                          ms: Date.now() - requestStartedAt,
                          source: streamSource,
                        });
                        recordStreamFirstToken(Date.now() - requestStartedAt);
                      }
                      assembled += payload.text;
                      setMessages([...next, { role: 'assistant' as const, content: assembled }]);
                    } else if (eventType === 'end') {
                      assembled = payload.text;
                      setMessages([...next, { role: 'assistant' as const, content: assembled }]);
                    }
                  }
                } catch {
                  /* ignorer ukendt stream-frame */
                }
              }
              splitIndex = buffered.indexOf('\n\n');
            }
          }
          reply = assembled.trim();
          trackEvent('lys_stream_completed', {
            source: streamSource,
            chars: reply.length,
          });
          recordStreamCompleted(streamSource, reply.length);
        } else {
          const data = (await res.json().catch(() => ({}))) as { text?: string };
          reply = data.text?.trim() ?? '';
          trackEvent('lys_stream_not_used', {
            source: streamSource,
          });
          recordStreamNotUsed(streamSource);
        }
        if (!reply) {
          reply = 'Jeg hørte dig. Fortæl mig gerne mere.';
        }
        const final = [...next, { role: 'assistant' as const, content: reply }];
        setMessages(final);
        try {
          localStorage.removeItem(LYS_CHAT_DRAFT_KEY);
        } catch {
          /* ignore */
        }
        trackEvent('lys_chat_exchange', { linked_resident: residentId ? 1 : 0 });

        if (residentId) {
          void tryEarnFirstChatBadge('supabase', decodeURIComponent(residentId));
        }

        if (residentId && final.filter((m) => m.role === 'user').length >= 3) {
          const supabase = createClient();
          void supabase?.rpc('award_xp', {
            p_resident_id: residentId,
            p_activity: 'lys_chat',
            p_xp: 10,
          });
        }

        const newId = await saveConversation(final, convId);
        if (newId && !convId) setConvId(newId);
      } catch {
        setMessages([
          ...next,
          {
            role: 'assistant' as const,
            content:
              'Jeg kunne ikke få kontakt til serveren. Tjek dit netværk — eller prøv igen om lidt.',
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [input, loading, messages, online, phase, residentId, convId, saveConversation]
  );

  // ── Voice ─────────────────────────────────────────────────────────────────
  const stopMic = useCallback(() => {
    try {
      recRef.current?.stop();
    } catch {
      /* ignore */
    }
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
    emitVoiceInterrupt('browser_stt');
    stopMic();
    accRef.current = '';
    setInput('');
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
  }, [emitVoiceInterrupt, stopMic]);

  const toggleMic = () => {
    if (isListening) {
      const t = input.trim();
      stopMic();
      if (t) void handleSend(t);
    } else {
      emitVoiceInterrupt('browser_stt');
      startMic();
    }
  };

  useEffect(() => () => stopMic(), [stopMic]);

  // ── History ───────────────────────────────────────────────────────────────
  const loadHistory = async () => {
    if (!residentId) return;
    const supabase = createClient();
    if (!supabase) return;
    setHistoryLoading(true);
    const { data } = await supabase
      .from('lys_conversations')
      .select('id, title, messages, updated_at')
      .eq('resident_id', residentId)
      .order('updated_at', { ascending: false })
      .limit(20);
    setHistory((data ?? []) as SavedConversation[]);
    setHistoryLoading(false);
  };

  const openHistory = () => {
    setShowHistory(true);
    void loadHistory();
  };

  const loadConversation = (conv: SavedConversation) => {
    lastAutoplayContentRef.current = null;
    setMessages(conv.messages);
    setConvId(conv.id);
    setShowHistory(false);
    setInput('');
    try {
      localStorage.removeItem(LYS_CHAT_DRAFT_KEY);
    } catch {
      /* ignore */
    }
  };

  const startNew = () => {
    lastAutoplayContentRef.current = null;
    setMessages([]);
    setConvId(null);
    setShowHistory(false);
    try {
      localStorage.removeItem(LYS_CHAT_DRAFT_KEY);
    } catch {
      /* ignore */
    }
    setInput('');
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      className="min-h-dvh flex flex-col font-sans"
      style={{
        backgroundColor: tokens.bg,
        color: tokens.text,
        animation: 'lysChatIn 0.3s ease-out',
      }}
    >
      <style>{`
        @keyframes lysChatIn {
          from { opacity: 0; transform: translateY(18px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Header */}
      <header
        className="sticky top-0 z-20 flex items-center gap-3 px-4 py-3 backdrop-blur-xl"
        style={{
          backgroundColor: `${tokens.bg}E8`,
          borderBottom: `1px solid ${accent}14`,
        }}
      >
        <button
          type="button"
          onClick={() => router.back()}
          className="flex h-10 w-10 items-center justify-center rounded-full transition-opacity hover:opacity-70"
          style={{ backgroundColor: tokens.cardBg, color: tokens.textMuted }}
          aria-label="Tilbage"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <div className="flex-1 min-w-0">
          <p className="text-base font-black" style={{ color: accent }}>
            Lys
          </p>
          <p className="text-xs" style={{ color: tokens.textMuted }}>
            Din ledsager
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => router.push('/lys-settings')}
            className="flex h-9 w-9 items-center justify-center rounded-full transition-all duration-150 active:scale-90"
            style={{ backgroundColor: tokens.cardBg, color: tokens.textMuted }}
            aria-label="Stemmeindstillinger"
            title="Stemme"
          >
            <Settings className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => setVoiceMode((v) => !v)}
            className="flex h-12 min-w-[64px] items-center justify-center gap-1.5 rounded-full px-3 transition-all duration-150 active:scale-90"
            style={{
              backgroundColor: voiceMode ? `${accent}22` : tokens.cardBg,
              color: voiceMode ? accent : tokens.textMuted,
            }}
            aria-label="Skift inputtilstand"
            title={voiceMode ? 'Skift til tekst' : 'Skift til tale'}
          >
            <Mic className="h-4 w-4" />
            <span className="text-[11px] font-semibold">Tal</span>
          </button>
          <button
            type="button"
            onClick={openHistory}
            className="rounded-full px-3 py-1.5 text-xs font-semibold transition-all duration-150 active:scale-95"
            style={{ backgroundColor: tokens.cardBg, color: tokens.textMuted }}
          >
            Tidligere
          </button>
          {messages.length > 0 && (
            <button
              type="button"
              onClick={startNew}
              className="rounded-full px-3 py-1.5 text-xs font-semibold transition-all duration-150 active:scale-95"
              style={{ backgroundColor: `${accent}18`, color: accent }}
            >
              Ny
            </button>
          )}
        </div>
      </header>
      {voicePrefs ? (
        <div
          className="sticky top-[61px] z-10 px-4 py-2 backdrop-blur-xl"
          style={{
            backgroundColor: `${tokens.bg}E8`,
            borderBottom: `1px solid ${accent}14`,
          }}
        >
          <div className="mx-auto flex w-full max-w-[430px] items-center gap-2">
            <p className="shrink-0 text-xs font-semibold" style={{ color: tokens.textMuted }}>
              Stemme:
            </p>
            <div className="flex items-center gap-2">
              {quickVoiceChoices.map((v) => {
                const active = voicePrefs.lys_voice_effective_id === v.id;
                return (
                  <button
                    key={v.id}
                    type="button"
                    disabled={voiceSwitchSaving}
                    onClick={() => void setQuickVoice(v.id)}
                    className="rounded-full px-3 py-1.5 text-xs font-semibold transition-all duration-150 disabled:opacity-50"
                    style={{
                      backgroundColor: active ? `${accent}22` : tokens.cardBg,
                      color: active ? accent : tokens.textMuted,
                      border: `1px solid ${active ? `${accent}44` : `${accent}14`}`,
                    }}
                    aria-pressed={active}
                  >
                    {v.name}
                  </button>
                );
              })}
            </div>
          </div>
          {voiceSwitchMsg ? (
            <p className="mx-auto mt-1 max-w-[430px] text-xs text-amber-300">{voiceSwitchMsg}</p>
          ) : null}
        </div>
      ) : null}

      {!online && (
        <div
          className="sticky top-0 z-10 flex items-center justify-center gap-2 px-4 py-2 text-center text-xs font-semibold"
          style={{
            backgroundColor: 'rgba(180,83,9,0.95)',
            color: '#fffbeb',
            borderBottom: '1px solid rgba(255,251,235,0.2)',
          }}
          role="status"
        >
          <WifiOff className="h-3.5 w-3.5 shrink-0 opacity-90" aria-hidden />
          <span>Du er offline — beskeder kan ikke sendes, før du har net igen.</span>
        </div>
      )}
      {voiceBanner && (
        <div
          className="sticky top-0 z-10 flex items-center justify-center gap-2 px-4 py-2 text-center text-xs font-semibold"
          style={{
            backgroundColor: 'rgba(30,41,59,0.95)',
            color: '#e2e8f0',
            borderBottom: '1px solid rgba(148,163,184,0.25)',
          }}
          role="status"
        >
          <span>{voiceBanner}</span>
          {pendingTtsText ? (
            <button
              type="button"
              onClick={() => void playTts(pendingTtsText)}
              className="rounded-full px-2.5 py-1 text-[11px] font-bold"
              style={{ backgroundColor: `${accent}26`, color: accent }}
            >
              Aktiver lyd
            </button>
          ) : null}
        </div>
      )}

      {/* Messages */}
      <div
        className="flex-1 overflow-y-auto px-4 pt-4 pb-4"
        style={{ paddingBottom: 'calc(5rem + max(1rem, env(safe-area-inset-bottom, 0px)))' }}
      >
        {messages.length === 0 && !loading && (
          <div
            className="rounded-3xl px-6 py-8 text-center mt-4"
            style={{
              background: `linear-gradient(150deg, ${tokens.gradientFrom} 0%, ${tokens.gradientTo} 100%)`,
              boxShadow: tokens.glowShadow,
            }}
          >
            <div
              className="h-14 w-14 rounded-full flex items-center justify-center text-2xl font-black text-white mx-auto mb-4"
              style={{ background: `linear-gradient(135deg, ${accent}, ${accent}99)` }}
              aria-hidden
            >
              ✦
            </div>
            <p className="text-base font-semibold mb-1">Hej. Jeg er Lys.</p>
            <p className="text-sm" style={{ color: tokens.textMuted }}>
              Hvad har du på hjerte? Du kan skrive eller tale frit — jeg lytter.
            </p>
            {!online && (
              <p className="text-xs mt-3 font-medium" style={{ color: tokens.textMuted }}>
                Når du er online igen, kan du sende beskeder som vanligt.
              </p>
            )}
          </div>
        )}

        <div className="mx-auto mt-4 w-full max-w-full space-y-3">
          {messages.map((m, i) => (
            <div
              key={`${m.role}-${i}`}
              className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {m.role === 'assistant' && (
                <div
                  className="h-8 w-8 shrink-0 rounded-full flex items-center justify-center text-sm font-black text-white mr-2 mt-0.5"
                  style={{ background: `linear-gradient(135deg, ${accent}, ${accent}99)` }}
                  aria-hidden
                >
                  ✦
                </div>
              )}
              <div
                className={`flex max-w-[85%] items-start gap-2 ${m.role === 'user' ? '' : 'flex-row'}`}
              >
                <div
                  className="min-w-0 flex-1 rounded-2xl px-4 py-3 text-sm leading-relaxed"
                  style={
                    m.role === 'user'
                      ? {
                          backgroundColor: `${accent}22`,
                          color: tokens.text,
                          border: `1px solid ${accent}33`,
                        }
                      : {
                          backgroundColor: tokens.cardBg,
                          color: tokens.text,
                          boxShadow: tokens.shadow,
                        }
                  }
                >
                  {m.content}
                </div>
                {m.role === 'assistant' && voicePrefs ? (
                  <VoiceMessageButton
                    text={m.content}
                    voiceId={voicePrefs.lys_voice_effective_id}
                    accentColor={accent}
                    mutedColor={tokens.textMuted}
                  />
                ) : null}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex justify-start">
              <div
                className="h-8 w-8 shrink-0 rounded-full flex items-center justify-center text-sm font-black text-white mr-2 mt-0.5"
                style={{ background: `linear-gradient(135deg, ${accent}, ${accent}99)` }}
                aria-hidden
              >
                ✦
              </div>
              <div
                className="rounded-2xl px-4 py-3 flex items-center gap-1.5"
                style={{ backgroundColor: tokens.cardBg, boxShadow: tokens.shadow }}
              >
                {[0, 120, 240].map((d) => (
                  <span
                    key={d}
                    className="w-1.5 h-1.5 rounded-full animate-bounce"
                    style={{ backgroundColor: accent, animationDelay: `${d}ms` }}
                  />
                ))}
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>
      </div>

      {/* Input bar */}
      <div
        className="fixed bottom-0 left-1/2 z-30 w-full max-w-[430px] -translate-x-1/2 px-4 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom,0px))] backdrop-blur-xl"
        style={{ backgroundColor: `${tokens.bg}F0`, borderTop: `1px solid ${accent}14` }}
      >
        <div className="mx-auto flex w-full max-w-full items-end gap-2">
          {residentId && voicePrefs && !voiceMode ? (
            <VoiceInputWhisper
              onTranscript={(t) => setInput((prev) => (prev.trim() ? `${prev.trim()} ${t}` : t))}
              onStartCapture={() => emitVoiceInterrupt('whisper')}
              disabled={loading || !online}
              accentColor={accent}
              mutedColor={tokens.textMuted}
              introAlreadyPlayed={!!voicePrefs.lys_voice_intro_played_at || introMarkedLocal}
              onIntroMarkedPlayed={() => {
                setIntroMarkedLocal(true);
                setVoicePrefs((p) =>
                  p
                    ? {
                        ...p,
                        lys_voice_intro_played_at: new Date().toISOString(),
                      }
                    : p
                );
              }}
              voiceIdForIntro={voicePrefs.lys_voice_effective_id}
            />
          ) : null}
          {voiceMode ? (
            /* Voice mode: big mic button + live transcript */
            <div className="flex-1 flex flex-col gap-2">
              {input && (
                <div
                  className="rounded-2xl px-4 py-3 text-sm leading-relaxed"
                  style={{
                    backgroundColor: tokens.cardBg,
                    color: tokens.text,
                    boxShadow: tokens.shadow,
                  }}
                >
                  {input}
                </div>
              )}
              <div className="flex gap-2 items-center">
                <button
                  type="button"
                  onClick={toggleMic}
                  disabled={!online && !isListening}
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full text-white transition-all duration-200 active:scale-90 disabled:opacity-40"
                  style={{
                    background: isListening
                      ? `linear-gradient(135deg, ${accent}, ${accent}bb)`
                      : `linear-gradient(135deg, ${accent}cc, ${accent}88)`,
                    boxShadow: isListening ? `0 0 0 6px ${accent}28` : 'none',
                  }}
                  aria-label={isListening ? 'Stop og send' : 'Start tale'}
                >
                  {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                </button>
                <p className="text-xs" style={{ color: tokens.textMuted }}>
                  {isListening ? 'Taler… tryk for at sende' : 'Tryk for at tale'}
                </p>
              </div>
            </div>
          ) : (
            /* Text mode */
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  void handleSend();
                }
              }}
              placeholder="Skriv til Lys…"
              rows={1}
              className="flex-1 min-h-[48px] max-h-32 rounded-2xl px-4 py-3 text-sm resize-none outline-none transition-all duration-200"
              style={{
                backgroundColor: tokens.cardBg,
                border: `1.5px solid ${accent}22`,
                color: tokens.text,
                caretColor: accent,
              }}
              disabled={loading || !online}
              aria-label="Besked til Lys"
            />
          )}

          <button
            type="button"
            onClick={() => void handleSend()}
            disabled={loading || !input.trim() || !online}
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-white transition-all duration-150 active:scale-90 disabled:opacity-40"
            style={{ background: `linear-gradient(135deg, ${accent}, ${accent}cc)` }}
            aria-label="Send"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* History panel */}
      {showHistory && (
        <div className="fixed inset-0 z-50 flex justify-center bg-black/35">
          <div
            className="flex h-full w-full max-w-[430px] flex-col shadow-2xl"
            style={{ backgroundColor: tokens.bg }}
          >
            <div
              className="flex items-center gap-3 border-b px-4 py-3"
              style={{ borderColor: `${accent}14` }}
            >
              <button
                type="button"
                onClick={() => setShowHistory(false)}
                className="flex h-10 w-10 items-center justify-center rounded-full"
                style={{ backgroundColor: tokens.cardBg, color: tokens.textMuted }}
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <p className="text-base font-bold">Tidligere samtaler</p>
            </div>

            <div className="flex-1 overflow-y-auto px-4 pt-4 space-y-2">
              <button
                type="button"
                onClick={startNew}
                className="w-full rounded-2xl px-4 py-4 text-left text-sm font-bold transition-all duration-150 active:scale-[0.98]"
                style={{
                  background: `linear-gradient(135deg, ${accent}18, ${accent}08)`,
                  border: `1.5px solid ${accent}30`,
                  color: accent,
                }}
              >
                + Ny samtale
              </button>

              {historyLoading && (
                <div className="flex justify-center py-8">
                  <div className="flex gap-1.5">
                    {[0, 150, 300].map((d) => (
                      <div
                        key={d}
                        className="w-2 h-2 rounded-full animate-bounce"
                        style={{ backgroundColor: accent, animationDelay: `${d}ms` }}
                      />
                    ))}
                  </div>
                </div>
              )}

              {!historyLoading && history.length === 0 && (
                <p className="text-center text-sm py-8" style={{ color: tokens.textMuted }}>
                  Ingen tidligere samtaler
                </p>
              )}

              {history.map((conv) => (
                <button
                  key={conv.id}
                  type="button"
                  onClick={() => loadConversation(conv)}
                  className="w-full rounded-2xl px-4 py-4 text-left transition-all duration-150 active:scale-[0.98]"
                  style={{ backgroundColor: tokens.cardBg, boxShadow: tokens.shadow }}
                >
                  <p className="text-sm font-semibold mb-1 truncate" style={{ color: tokens.text }}>
                    {conv.title ?? 'Samtale'}
                  </p>
                  <p className="text-xs" style={{ color: tokens.textMuted }}>
                    {new Date(conv.updated_at).toLocaleDateString('da-DK', {
                      day: 'numeric',
                      month: 'short',
                    })}
                    {' · '}
                    {(conv.messages as LysChatMessage[]).length} beskeder
                  </p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
