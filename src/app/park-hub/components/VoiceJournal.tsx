'use client';

import React, { useMemo, useRef, useState } from 'react';
import { Mic, MicOff } from 'lucide-react';

type Props = {
  onComplete: (transcript: string, summary: string) => void;
  onSkip: () => void;
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

export default function VoiceJournal({ onComplete, onSkip }: Props) {
  const speechCtor = useMemo(() => getSpeechCtor(), []);
  const [status, setStatus] = useState<Status>(speechCtor ? 'idle' : 'unsupported');
  const [transcript, setTranscript] = useState('');
  const [summary, setSummary] = useState('');
  const recRef = useRef<InstanceType<SpeechRecognitionType> | null>(null);
  const statusRef = useRef<Status>(speechCtor ? 'idle' : 'unsupported');

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

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-4 sm:p-5 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-semibold text-gray-700">Vil du fortælle mere?</p>
        <button
          type="button"
          onClick={onSkip}
          className="rounded-md px-2 py-1 text-xs font-medium text-gray-500 active:scale-95"
        >
          Spring over
        </button>
      </div>

      {(status === 'unsupported' || status === 'error') && (
        <p className="text-xs text-gray-500">
          Stemmegenkendelse er ikke tilgængelig her. Du kan skrive din note i stedet.
        </p>
      )}

      {status !== 'done' && (
        <textarea
          value={transcript}
          onChange={(e) => setTranscript(e.target.value)}
          placeholder="Skriv hvad der fylder for dig i dag..."
          className="w-full min-h-[120px] text-sm text-gray-700 placeholder-gray-400 border border-gray-200 rounded-lg p-3 resize-y focus:outline-none focus:border-[#7F77DD]"
        />
      )}

      {status === 'idle' && speechCtor && (
        <button
          type="button"
          onClick={start}
          className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-[#2D5BE3] px-4 py-2 text-sm font-semibold text-white"
        >
          <Mic size={16} /> Start optagelse
        </button>
      )}

      {status === 'recording' && (
        <button
          type="button"
          onClick={() => void stopAndSummarize()}
          className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-[#C0392B] px-4 py-2 text-sm font-semibold text-white"
        >
          <MicOff size={16} /> Stop optagelse
        </button>
      )}

      {(status === 'unsupported' || status === 'error' || status === 'idle') &&
        transcript.trim() && (
          <button
            type="button"
            onClick={() => void saveManual()}
            className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-lg bg-[#0F1B2D] px-4 py-2 text-sm font-semibold text-white"
          >
            Gem note
          </button>
        )}

      {status === 'processing' && <p className="text-sm text-gray-500">Et øjeblik...</p>}

      {status === 'done' && (
        <div className="rounded-lg border border-[#A8DFC9] bg-[#E1F5EE] p-3">
          <p className="text-xs font-semibold text-[#1D9E75]">Her er hvad du fortalte</p>
          <p className="text-sm italic text-[#1D9E75] mt-1">{summary}</p>
          <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => onComplete(transcript.trim(), summary)}
              className="min-h-[44px] rounded-lg bg-[#1D9E75] px-3 py-2 text-xs font-semibold text-white"
            >
              Ja, gem det
            </button>
            <button
              type="button"
              onClick={() => setStatusSafe('idle')}
              className="min-h-[44px] rounded-lg border border-gray-200 px-3 py-2 text-xs font-semibold text-gray-600"
            >
              Rediger
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
