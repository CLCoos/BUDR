'use client';

import React, { useCallback, useRef, useState } from 'react';
import { Mic, Square, Loader2 } from 'lucide-react';

const INTRO_TEXT_DA = 'Hej, jeg er Lys. Tryk på mikrofonen og tal til mig — jeg lytter.';

export type VoiceInputWhisperProps = {
  onTranscript: (text: string) => void;
  onStartCapture?: () => void;
  disabled?: boolean;
  accentColor: string;
  mutedColor?: string;
  /** True når `lys_voice_intro_played_at` er sat (eller efter mark-intro). */
  introAlreadyPlayed: boolean;
  onIntroMarkedPlayed: () => void;
  voiceIdForIntro: string;
};

export function VoiceInputWhisper({
  onTranscript,
  onStartCapture,
  disabled,
  accentColor,
  mutedColor: _mutedColor,
  introAlreadyPlayed,
  onIntroMarkedPlayed,
  voiceIdForIntro,
}: VoiceInputWhisperProps) {
  const [state, setState] = useState<'idle' | 'intro' | 'recording' | 'transcribing'>('idle');
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const statusText =
    state === 'intro'
      ? 'Gør klar til tale...'
      : state === 'recording'
        ? 'Lytter...'
        : state === 'transcribing'
          ? 'Behandler...'
          : 'Klar';

  const playIntroThen = useCallback(
    async (then: () => void) => {
      setState('intro');
      try {
        const res = await fetch('/api/voice/tts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          credentials: 'same-origin',
          body: JSON.stringify({ text: INTRO_TEXT_DA, voiceId: voiceIdForIntro }),
        });
        if (!res.ok) {
          setState('idle');
          then();
          return;
        }
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        await new Promise<void>((resolve) => {
          audio.onended = () => {
            URL.revokeObjectURL(url);
            resolve();
          };
          audio.onerror = () => {
            URL.revokeObjectURL(url);
            resolve();
          };
          void audio.play().catch(() => resolve());
        });
        await fetch('/api/voice/mark-intro-played', { method: 'POST', credentials: 'same-origin' });
        onIntroMarkedPlayed();
      } catch {
        /* fortsæt uden intro */
      } finally {
        then();
      }
    },
    [onIntroMarkedPlayed, voiceIdForIntro]
  );

  const startRecording = useCallback(() => {
    onStartCapture?.();
    void navigator.mediaDevices
      .getUserMedia({ audio: true })
      .then((stream) => {
        const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
          ? 'audio/webm;codecs=opus'
          : 'audio/webm';
        const mediaRecorder = new MediaRecorder(stream, { mimeType: mime });
        mediaRecorderRef.current = mediaRecorder;
        chunksRef.current = [];

        mediaRecorder.ondataavailable = (e) => {
          if (e.data.size > 0) chunksRef.current.push(e.data);
        };

        mediaRecorder.onstop = async () => {
          stream.getTracks().forEach((t) => t.stop());
          const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
          setState('transcribing');
          const formData = new FormData();
          formData.append('audio', blob, 'recording.webm');
          try {
            const res = await fetch('/api/voice/stt', {
              method: 'POST',
              body: formData,
              credentials: 'same-origin',
            });
            if (res.ok) {
              const data = (await res.json()) as { text?: string };
              const t = typeof data.text === 'string' ? data.text.trim() : '';
              if (t) onTranscript(t);
            }
          } catch {
            /* stille fejl — tekst-chat virker stadig */
          } finally {
            setState('idle');
          }
        };

        mediaRecorder.start();
        setState('recording');
      })
      .catch(() => {
        setState('idle');
      });
  }, [onStartCapture, onTranscript]);

  const start = useCallback(async () => {
    if (disabled || state !== 'idle') return;
    try {
      const run = () => startRecording();
      if (!introAlreadyPlayed) {
        await playIntroThen(run);
      } else {
        run();
      }
    } catch {
      setState('idle');
    }
  }, [disabled, introAlreadyPlayed, playIntroThen, startRecording, state]);

  const stop = useCallback(() => {
    mediaRecorderRef.current?.stop();
  }, []);

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={state === 'recording' ? stop : () => void start()}
        disabled={disabled || state === 'intro' || state === 'transcribing'}
        className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl transition-all duration-150 active:scale-90 disabled:opacity-40"
        style={{
          background:
            state === 'recording'
              ? `linear-gradient(135deg, ${accentColor}, ${accentColor}bb)`
              : `linear-gradient(135deg, ${accentColor}cc, ${accentColor}88)`,
          color: '#fff',
          boxShadow: state === 'recording' ? `0 0 0 4px ${accentColor}28` : 'none',
        }}
        aria-label={
          state === 'recording' ? 'Stop optagelse og send til tekst' : 'Tal besked (Whisper)'
        }
      >
        {state === 'idle' && <Mic className="h-5 w-5" aria-hidden />}
        {state === 'intro' && <Loader2 className="h-5 w-5 animate-spin" aria-hidden />}
        {state === 'recording' && <Square className="h-4 w-4 fill-current" aria-hidden />}
        {state === 'transcribing' && <Loader2 className="h-5 w-5 animate-spin" aria-hidden />}
      </button>
      <span
        className="text-xs font-medium"
        style={{ color: _mutedColor ?? '#94a3b8' }}
        aria-live="polite"
      >
        {statusText}
      </span>
    </div>
  );
}
