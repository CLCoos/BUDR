'use client';

import React, { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { DEFAULT_VOICES } from '@/lib/voice/voices';
import { Volume2, Loader2, Mic, Square } from 'lucide-react';
import { getVoiceTelemetrySnapshot, resetVoiceTelemetry } from '@/lib/voice/voiceObservability';

const DEFAULT_TEXT =
  'Hej, jeg er Lys. Jeg er her for at lytte til dig — lige meget hvad du vil tale om. Du behøver ikke skynde dig.';

async function readVoiceApiErrorMessage(res: Response): Promise<string> {
  const ct = res.headers.get('content-type') ?? '';
  if (ct.includes('application/json')) {
    try {
      const j = (await res.json()) as { error?: string; detail?: string };
      const parts = [j.error?.trim(), j.detail?.trim()].filter(Boolean);
      if (parts.length) return parts.join(' — ');
    } catch {
      /* ignore */
    }
  } else {
    try {
      const t = (await res.text()).trim();
      if (t) return t.slice(0, 500);
    } catch {
      /* ignore */
    }
  }
  return res.statusText || `HTTP ${res.status}`;
}

export default function LysVoiceTestClient() {
  const [text, setText] = useState(DEFAULT_TEXT);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [ttsError, setTtsError] = useState('');
  const [sttState, setSttState] = useState<'idle' | 'recording' | 'transcribing'>('idle');
  const [sttResult, setSttResult] = useState('');
  const recRef = React.useRef<MediaRecorder | null>(null);
  const chunksRef = React.useRef<Blob[]>([]);
  const [telemetryTick, setTelemetryTick] = useState(0);

  async function playVoice(voiceId: string) {
    setPlayingId(voiceId);
    setTtsError('');
    try {
      const res = await fetch('/api/voice/tts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ text, voiceId }),
      });
      if (!res.ok) {
        const detail = await readVoiceApiErrorMessage(res);
        setTtsError(`TTS fejl (${res.status}): ${detail}`);
        return;
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.onended = () => URL.revokeObjectURL(url);
      await audio.play();
    } catch (e) {
      setTtsError(e instanceof Error ? e.message : 'TTS fejl');
    } finally {
      setPlayingId(null);
    }
  }

  function startStt() {
    void navigator.mediaDevices.getUserMedia({ audio: true }).then((stream) => {
      const mime = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';
      const rec = new MediaRecorder(stream, { mimeType: mime });
      recRef.current = rec;
      chunksRef.current = [];
      rec.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      rec.onstop = async () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        setSttState('transcribing');
        const fd = new FormData();
        fd.append('audio', blob, 'clip.webm');
        try {
          const res = await fetch('/api/voice/stt', {
            method: 'POST',
            body: fd,
            credentials: 'include',
          });
          const data = (await res.json()) as { text?: string; error?: string };
          if (!res.ok) {
            const detail = data.error?.trim() || 'Ukendt fejl';
            setSttResult(`STT fejl (${res.status}): ${detail}`);
          } else {
            setSttResult(data.text ?? data.error ?? '(tom)');
          }
        } catch {
          setSttResult('STT netværksfejl');
        } finally {
          setSttState('idle');
        }
      };
      rec.start();
      setSttState('recording');
    });
  }

  function stopStt() {
    recRef.current?.stop();
  }

  const females = DEFAULT_VOICES.filter((v) => v.gender === 'female');
  const males = DEFAULT_VOICES.filter((v) => v.gender === 'male');
  const telemetry = getVoiceTelemetrySnapshot();

  function percentile(values: number[], pct: number): number {
    if (values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const idx = Math.min(
      sorted.length - 1,
      Math.max(0, Math.ceil((pct / 100) * sorted.length) - 1)
    );
    return sorted[idx] ?? 0;
  }

  const p50 = percentile(telemetry.firstTokenMs, 50);
  const p95 = percentile(telemetry.firstTokenMs, 95);
  const streamTotal =
    telemetry.streamBySource.anthropic +
    telemetry.streamBySource.fallback +
    telemetry.streamBySource.local;
  const fallbackRatePct =
    streamTotal > 0 ? Math.round((telemetry.streamBySource.fallback / streamTotal) * 100) : 0;

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <h1 className="text-2xl font-semibold text-[var(--text-primary)]">Lys voice test</h1>
      <p className="text-sm text-[var(--text-secondary)]">
        Kræver <code className="text-xs">ELEVENLABS_API_KEY</code> og{' '}
        <code className="text-xs">OPENAI_API_KEY</code> på serveren. I production kræves
        beboer-cookie eller staff-login til TTS/STT.
      </p>

      {ttsError ? (
        <p
          role="alert"
          className="rounded-md border border-red-300 bg-red-50 px-3 py-2 text-sm text-red-800 dark:border-red-500/40 dark:bg-red-950/50 dark:text-red-100"
        >
          {ttsError}
        </p>
      ) : null}

      <Card>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">Voice observability</h2>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="secondary"
              onClick={() => setTelemetryTick((n) => n + 1)}
            >
              Opdater
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              onClick={() => {
                resetVoiceTelemetry();
                setTelemetryTick((n) => n + 1);
              }}
            >
              Nulstil
            </Button>
          </div>
        </div>
        <div className="mb-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div className="rounded-md border border-[var(--border-default)] bg-[var(--bg-surface-2)] p-3">
            <p className="text-xs text-[var(--text-secondary)]">FTT p50</p>
            <p className="text-lg font-semibold text-[var(--text-primary)]">{p50} ms</p>
          </div>
          <div className="rounded-md border border-[var(--border-default)] bg-[var(--bg-surface-2)] p-3">
            <p className="text-xs text-[var(--text-secondary)]">FTT p95</p>
            <p className="text-lg font-semibold text-[var(--text-primary)]">{p95} ms</p>
          </div>
          <div className="rounded-md border border-[var(--border-default)] bg-[var(--bg-surface-2)] p-3">
            <p className="text-xs text-[var(--text-secondary)]">Fallback-rate</p>
            <p className="text-lg font-semibold text-[var(--text-primary)]">{fallbackRatePct}%</p>
          </div>
          <div className="rounded-md border border-[var(--border-default)] bg-[var(--bg-surface-2)] p-3">
            <p className="text-xs text-[var(--text-secondary)]">Interrupts</p>
            <p className="text-lg font-semibold text-[var(--text-primary)]">
              {telemetry.interruptsTotal}
            </p>
          </div>
        </div>
        <p className="mb-3 text-xs text-[var(--text-secondary)]">
          Kilde: local telemetry i browser (senest opdateret{' '}
          {new Date(telemetry.updatedAt).toLocaleTimeString('da-DK')}
          ). Samples: {telemetry.firstTokenMs.length}. {/* keeps telemetryTick referenced */}
          <span className="sr-only">{telemetryTick}</span>
        </p>
        <div className="grid gap-3 text-xs text-[var(--text-secondary)] sm:grid-cols-2">
          <div className="rounded-md border border-[var(--border-default)] bg-[var(--bg-surface-2)] p-3">
            <p>Stream-kilder</p>
            <p>Anthropic: {telemetry.streamBySource.anthropic}</p>
            <p>Fallback: {telemetry.streamBySource.fallback}</p>
            <p>Lokal: {telemetry.streamBySource.local}</p>
            <p>Ikke-stream: {telemetry.streamNotUsedCount}</p>
          </div>
          <div className="rounded-md border border-[var(--border-default)] bg-[var(--bg-surface-2)] p-3">
            <p>Interrupt-kilder</p>
            <p>Browser STT: {telemetry.interruptsBySource.browser_stt}</p>
            <p>Whisper: {telemetry.interruptsBySource.whisper}</p>
            <p>Manual: {telemetry.interruptsBySource.manual}</p>
            <p>Besked-afbrydelser: {telemetry.messageInterruptions}</p>
          </div>
        </div>
      </Card>

      <Card>
        <label className="mb-2 block text-sm font-medium text-[var(--text-secondary)]">
          Testsætning
        </label>
        <textarea
          className="min-h-[120px] w-full rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface-2)] p-3 text-sm text-[var(--text-primary)]"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
      </Card>

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
          Kvindelige stemmer
        </h2>
        <Card padding="sm">
          <ul className="divide-y divide-[var(--border-subtle)]">
            {females.map((v) => (
              <li key={v.id} className="flex items-center justify-between gap-3 py-3">
                <div>
                  <p className="font-medium text-[var(--text-primary)]">{v.name}</p>
                  <p className="text-xs text-[var(--text-secondary)]">{v.description}</p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => void playVoice(v.id)}
                  disabled={!!playingId}
                  leftIcon={
                    playingId === v.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Volume2 className="h-4 w-4" />
                    )
                  }
                >
                  Afspil
                </Button>
              </li>
            ))}
          </ul>
        </Card>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-[var(--text-tertiary)]">
          Mandlige stemmer
        </h2>
        <Card padding="sm">
          <ul className="divide-y divide-[var(--border-subtle)]">
            {males.map((v) => (
              <li key={v.id} className="flex items-center justify-between gap-3 py-3">
                <div>
                  <p className="font-medium text-[var(--text-primary)]">{v.name}</p>
                  <p className="text-xs text-[var(--text-secondary)]">{v.description}</p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="secondary"
                  onClick={() => void playVoice(v.id)}
                  disabled={!!playingId}
                  leftIcon={
                    playingId === v.id ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Volume2 className="h-4 w-4" />
                    )
                  }
                >
                  Afspil
                </Button>
              </li>
            ))}
          </ul>
        </Card>
      </section>

      <Card>
        <h2 className="mb-2 text-sm font-semibold text-[var(--text-primary)]">
          Test STT (Whisper)
        </h2>
        <p className="mb-3 text-xs text-[var(--text-secondary)]">
          Optag kort — tryk igen for at stoppe og sende til Whisper.
        </p>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant={sttState === 'recording' ? 'destructive' : 'primary'}
            onClick={sttState === 'recording' ? stopStt : startStt}
            disabled={sttState === 'transcribing'}
          >
            {sttState === 'recording' ? (
              <Square className="h-4 w-4" />
            ) : (
              <Mic className="h-4 w-4" />
            )}
            <span className="ml-2">{sttState === 'recording' ? 'Stop' : 'Optag'}</span>
          </Button>
          {sttState === 'transcribing' && (
            <Loader2 className="h-5 w-5 animate-spin text-[var(--text-secondary)]" />
          )}
        </div>
        {sttResult ? (
          <p className="mt-3 rounded-md border border-[var(--border-default)] bg-[var(--bg-surface-2)] p-3 text-sm text-[var(--text-primary)]">
            {sttResult}
          </p>
        ) : null}
      </Card>
    </div>
  );
}
