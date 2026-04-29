export type VoiceStreamSource = 'anthropic' | 'fallback' | 'local' | 'none';
export type VoiceInterruptSource = 'browser_stt' | 'whisper' | 'manual';

type VoiceTelemetry = {
  firstTokenMs: number[];
  streamCompletedCount: number;
  streamCharsTotal: number;
  streamBySource: Record<VoiceStreamSource, number>;
  streamNotUsedCount: number;
  interruptsTotal: number;
  interruptsBySource: Record<VoiceInterruptSource, number>;
  messageInterruptions: number;
  updatedAt: string;
};

const STORAGE_KEY = 'budr_lys_voice_telemetry_v1';
const MAX_FIRST_TOKEN_SAMPLES = 300;

function baseTelemetry(): VoiceTelemetry {
  return {
    firstTokenMs: [],
    streamCompletedCount: 0,
    streamCharsTotal: 0,
    streamBySource: { anthropic: 0, fallback: 0, local: 0, none: 0 },
    streamNotUsedCount: 0,
    interruptsTotal: 0,
    interruptsBySource: { browser_stt: 0, whisper: 0, manual: 0 },
    messageInterruptions: 0,
    updatedAt: new Date().toISOString(),
  };
}

function readTelemetry(): VoiceTelemetry {
  if (typeof window === 'undefined') return baseTelemetry();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return baseTelemetry();
    const parsed = JSON.parse(raw) as Partial<VoiceTelemetry>;
    return {
      ...baseTelemetry(),
      ...parsed,
      streamBySource: {
        ...baseTelemetry().streamBySource,
        ...(parsed.streamBySource ?? {}),
      },
      interruptsBySource: {
        ...baseTelemetry().interruptsBySource,
        ...(parsed.interruptsBySource ?? {}),
      },
      firstTokenMs: Array.isArray(parsed.firstTokenMs)
        ? parsed.firstTokenMs.filter(
            (n): n is number => typeof n === 'number' && Number.isFinite(n)
          )
        : [],
    };
  } catch {
    return baseTelemetry();
  }
}

function writeTelemetry(next: VoiceTelemetry): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  } catch {
    /* ignore storage quota/privacy mode errors */
  }
}

function updateTelemetry(mutator: (prev: VoiceTelemetry) => VoiceTelemetry): void {
  const next = mutator(readTelemetry());
  next.updatedAt = new Date().toISOString();
  writeTelemetry(next);
}

export function recordStreamFirstToken(ms: number): void {
  updateTelemetry((prev) => {
    const firstTokenMs = [...prev.firstTokenMs, Math.max(0, Math.round(ms))].slice(
      -MAX_FIRST_TOKEN_SAMPLES
    );
    return { ...prev, firstTokenMs };
  });
}

export function recordStreamCompleted(source: VoiceStreamSource, chars: number): void {
  updateTelemetry((prev) => ({
    ...prev,
    streamCompletedCount: prev.streamCompletedCount + 1,
    streamCharsTotal: prev.streamCharsTotal + Math.max(0, Math.round(chars)),
    streamBySource: {
      ...prev.streamBySource,
      [source]: prev.streamBySource[source] + 1,
    },
  }));
}

export function recordStreamNotUsed(source: VoiceStreamSource): void {
  updateTelemetry((prev) => ({
    ...prev,
    streamNotUsedCount: prev.streamNotUsedCount + 1,
    streamBySource: {
      ...prev.streamBySource,
      [source]: prev.streamBySource[source] + 1,
    },
  }));
}

export function recordVoiceInterrupt(source: VoiceInterruptSource): void {
  updateTelemetry((prev) => ({
    ...prev,
    interruptsTotal: prev.interruptsTotal + 1,
    interruptsBySource: {
      ...prev.interruptsBySource,
      [source]: prev.interruptsBySource[source] + 1,
    },
  }));
}

export function recordVoiceMessageInterrupted(): void {
  updateTelemetry((prev) => ({
    ...prev,
    messageInterruptions: prev.messageInterruptions + 1,
  }));
}

export function getVoiceTelemetrySnapshot(): VoiceTelemetry {
  return readTelemetry();
}

export function resetVoiceTelemetry(): void {
  writeTelemetry(baseTelemetry());
}
