'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Volume2, Pause, Loader2, RotateCcw } from 'lucide-react';
import { trackEvent } from '@/lib/analytics';
import { recordVoiceMessageInterrupted } from '@/lib/voice/voiceObservability';

const LYS_VOICE_INTERRUPT_EVENT = 'lys:voice-interrupt';

export type VoiceMessageButtonProps = {
  text: string;
  voiceId: string;
  /** Lys accent / tekst (fx phase-teal) */
  accentColor: string;
  mutedColor: string;
};

export function VoiceMessageButton({
  text,
  voiceId,
  accentColor,
  mutedColor,
}: VoiceMessageButtonProps) {
  const [state, setState] = useState<'idle' | 'loading' | 'playing'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [rateIndex, setRateIndex] = useState(1);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const urlRef = useRef<string | null>(null);
  const rates = [0.9, 1.0, 1.1] as const;
  const activeRate = rates[rateIndex];

  const cleanupAudio = useCallback(() => {
    audioRef.current?.pause();
    audioRef.current = null;
    if (urlRef.current) {
      URL.revokeObjectURL(urlRef.current);
      urlRef.current = null;
    }
  }, []);

  useEffect(() => () => cleanupAudio(), [cleanupAudio]);

  useEffect(() => {
    const onInterrupt = () => {
      const hadPlayback = !!audioRef.current || state === 'playing' || ready;
      cleanupAudio();
      setState('idle');
      setReady(false);
      if (hadPlayback) {
        trackEvent('lys_voice_message_interrupted');
        recordVoiceMessageInterrupted();
      }
    };
    window.addEventListener(LYS_VOICE_INTERRUPT_EVENT, onInterrupt);
    return () => window.removeEventListener(LYS_VOICE_INTERRUPT_EVENT, onInterrupt);
  }, [cleanupAudio, ready, state]);

  function getPlaybackErrorMessage(status: number): string {
    if (status === 401) return 'Log ind igen for oplæsning';
    if (status === 429) return 'For mange forespørgsler - prøv om lidt';
    if (status >= 500) return 'Tale er midlertidigt utilgængelig';
    return 'Kunne ikke afspille';
  }

  async function play() {
    setError(null);
    if (state === 'playing') {
      audioRef.current?.pause();
      setState('idle');
      return;
    }
    if (ready && audioRef.current) {
      try {
        await audioRef.current.play();
        setState('playing');
      } catch {
        setError('Kunne ikke genoptage afspilning');
        setState('idle');
      }
      return;
    }

    setState('loading');
    try {
      cleanupAudio();
      const res = await fetch('/api/voice/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ text: text.slice(0, 1000), voiceId }),
      });

      if (!res.ok) {
        const j = (await res.json().catch(() => ({}))) as { error?: string };
        setError(j.error ?? getPlaybackErrorMessage(res.status));
        setState('idle');
        return;
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      urlRef.current = url;
      const audio = new Audio(url);
      audio.playbackRate = activeRate;
      audioRef.current = audio;
      setReady(true);

      audio.onended = () => {
        setState('idle');
        setReady(false);
        cleanupAudio();
      };
      audio.onerror = () => {
        setState('idle');
        setReady(false);
        cleanupAudio();
      };

      await audio.play();
      setState('playing');
    } catch {
      setError('Netværksfejl ved afspilning');
      setState('idle');
      setReady(false);
    }
  }

  function restart() {
    const audio = audioRef.current;
    if (!audio) return;
    audio.currentTime = 0;
    void audio.play().then(
      () => setState('playing'),
      () => {
        setError('Kunne ikke genstarte');
        setState('idle');
      }
    );
  }

  function toggleRate() {
    const next = (rateIndex + 1) % rates.length;
    setRateIndex(next);
    if (audioRef.current) {
      audioRef.current.playbackRate = rates[next];
    }
  }

  return (
    <div className="inline-flex items-center gap-1.5">
      <button
        type="button"
        onClick={() => void play()}
        className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-full transition-opacity hover:opacity-90 active:scale-95"
        style={{
          color: state === 'idle' ? mutedColor : accentColor,
          border: `1px solid ${accentColor}33`,
          backgroundColor: `${accentColor}12`,
        }}
        aria-label={
          state === 'playing' ? 'Pause afspilning' : ready ? 'Genoptag afspilning' : 'Afspil besked'
        }
        title={
          error ??
          (state === 'playing'
            ? 'Pause afspilning'
            : ready
              ? 'Genoptag afspilning'
              : 'Afspil besked')
        }
      >
        {state === 'idle' && !ready && <Volume2 size={20} aria-hidden />}
        {state === 'idle' && ready && <Volume2 size={20} aria-hidden />}
        {state === 'loading' && <Loader2 size={20} className="animate-spin" aria-hidden />}
        {state === 'playing' && <Pause size={20} aria-hidden />}
      </button>
      {ready ? (
        <button
          type="button"
          onClick={restart}
          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full transition-opacity hover:opacity-90 active:scale-95"
          style={{
            color: mutedColor,
            border: `1px solid ${accentColor}26`,
            backgroundColor: `${accentColor}0E`,
          }}
          aria-label="Genstart oplæsning"
          title="Genstart"
        >
          <RotateCcw size={14} aria-hidden />
        </button>
      ) : null}
      <button
        type="button"
        onClick={toggleRate}
        className="inline-flex h-8 min-w-[42px] shrink-0 items-center justify-center rounded-full px-2 text-[11px] font-semibold transition-opacity hover:opacity-90 active:scale-95"
        style={{
          color: mutedColor,
          border: `1px solid ${accentColor}26`,
          backgroundColor: `${accentColor}0E`,
        }}
        aria-label={`Afspilningshastighed ${activeRate.toFixed(1)}x`}
        title="Skift hastighed"
      >
        {activeRate.toFixed(1)}x
      </button>
    </div>
  );
}
