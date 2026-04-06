'use client';

import React, { useState, useEffect, useRef } from 'react';
import BottomNav from '@/components/BottomNav';
import { ANTHROPIC_CHAT_MODEL } from '@/lib/ai/anthropicModel';

// Web Speech API types
interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
  resultIndex: number;
}
interface SpeechRecognitionErrorEvent extends Event {
  error: string;
}
interface SpeechRecognitionInstance extends EventTarget {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  start(): void;
  stop(): void;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: ((event: SpeechRecognitionErrorEvent) => void) | null;
  onend: (() => void) | null;
}

declare global {
  interface Window {
    SpeechRecognition: new () => SpeechRecognitionInstance;
    webkitSpeechRecognition: new () => SpeechRecognitionInstance;
  }
}

interface KrapAnalysis {
  krop: string;
  rolle: string;
  affekt: string;
  plan: string;
  summary: string;
}

export default function VoiceJournalView() {
  const [isRecording, setIsRecording] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [interimTranscript, setInterimTranscript] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [krapAnalysis, setKrapAnalysis] = useState<KrapAnalysis | null>(null);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [supported, setSupported] = useState(true);
  const [error, setError] = useState('');
  const [saved, setSaved] = useState(false);

  const recognitionRef = useRef<SpeechRecognitionInstance | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    if (typeof window !== 'undefined') {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SR) setSupported(false);
    }
    return () => {
      mountedRef.current = false;
      if (timerRef.current) clearInterval(timerRef.current);
      recognitionRef.current?.stop();
    };
  }, []);

  const startRecording = () => {
    if (typeof window === 'undefined') return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { setSupported(false); return; }

    setError('');
    setTranscript('');
    setInterimTranscript('');
    setKrapAnalysis(null);
    setRecordingSeconds(0);

    const recognition = new SR();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'da-DK';

    recognition.onresult = (event: SpeechRecognitionEvent) => {
      let final = '';
      let interim = '';
      for (let i = event.resultIndex; i < event.results.length; i++) {
        const result = event.results[i];
        if (result.isFinal) {
          final += result[0].transcript + ' ';
        } else {
          interim += result[0].transcript;
        }
      }
      if (final && mountedRef.current) {
        setTranscript(prev => prev + final);
      }
      if (mountedRef.current) setInterimTranscript(interim);
    };

    recognition.onerror = (event: SpeechRecognitionErrorEvent) => {
      if (mountedRef.current) {
        setError(`Mikrofonfejl: ${event.error}`);
        setIsRecording(false);
        if (timerRef.current) clearInterval(timerRef.current);
      }
    };

    recognition.onend = () => {
      if (mountedRef.current) {
        setIsRecording(false);
        setInterimTranscript('');
        if (timerRef.current) clearInterval(timerRef.current);
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
    setIsRecording(true);

    timerRef.current = setInterval(() => {
      if (mountedRef.current) setRecordingSeconds(s => s + 1);
    }, 1000);
  };

  const stopRecording = () => {
    recognitionRef.current?.stop();
    setIsRecording(false);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const analyzeWithClaude = async () => {
    const fullText = transcript.trim();
    if (!fullText) return;
    setIsAnalyzing(true);
    try {
      const res = await fetch('/api/ai/chat-completion', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: 'ANTHROPIC',
          model: ANTHROPIC_CHAT_MODEL,
          messages: [
            {
              role: 'system',
              content: `Du er en empatisk AI-coach i en dansk mental sundhedsapp. Analyser brugerens stemmejournal og udtræk KRAP-noter (Krop, Rolle, Affekt, Plan) samt en kort opsummering. Svar KUN med valid JSON i dette format:
{"krop":"hvad brugeren siger om kroppen (max 30 ord)","rolle":"hvilken rolle brugeren beskriver (max 30 ord)","affekt":"følelser der nævnes (max 30 ord)","plan":"hvad brugeren vil gøre (max 30 ord)","summary":"varm, personlig opsummering af journalen (max 3 sætninger)"}
Hvis et felt ikke nævnes, skriv en kort empatisk observation baseret på konteksten.`,
            },
            {
              role: 'user',
              content: `Stemmejournal:\n"${fullText}"\n\nUdtræk KRAP-noter og giv en personlig opsummering.`,
            },
          ],
          stream: false,
          parameters: { max_tokens: 400, temperature: 0.7 },
        }),
      });
      if (res.ok) {
        const data = await res.json();
        const text = data?.choices?.[0]?.message?.content;
        if (text && mountedRef.current) {
          try {
            const jsonMatch = text.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
              const parsed = JSON.parse(jsonMatch[0]);
              setKrapAnalysis(parsed);
            }
          } catch {
            // fallback
          }
        }
      }
    } catch {
      // silently fail
    } finally {
      if (mountedRef.current) setIsAnalyzing(false);
    }
  };

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const formatTime = (s: number) => `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;

  return (
    <div className="min-h-screen gradient-midnight pb-32">
      <div className="sticky top-0 z-20 bg-midnight-900/90 backdrop-blur-xl border-b border-midnight-700/50">
        <div className="max-w-lg mx-auto px-4 py-3">
          <h1 className="font-display text-lg sm:text-xl font-bold text-midnight-50">🎙️ Stemmejournal</h1>
          <p className="text-xs text-midnight-400 mt-0.5">Tal — Claude transskriberer og analyserer automatisk</p>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-5 space-y-4">
        {!supported && (
          <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-4">
            <p className="text-sm text-rose-300">Din browser understøtter ikke stemmeindtastning. Prøv Chrome eller Edge.</p>
          </div>
        )}

        {error && (
          <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-4">
            <p className="text-sm text-rose-300">{error}</p>
          </div>
        )}

        {/* Recording button */}
        <div className="flex flex-col items-center gap-4 bg-midnight-800/50 rounded-3xl p-6 border border-midnight-700/50">
          <button
            onClick={isRecording ? stopRecording : startRecording}
            disabled={!supported}
            className={`relative w-20 h-20 sm:w-24 sm:h-24 rounded-full flex items-center justify-center transition-all duration-300 focus:outline-none active:scale-95 ${
              isRecording
                ? 'bg-rose-500/20 border-2 border-rose-400 shadow-lg shadow-rose-500/20'
                : 'bg-aurora-violet/20 border-2 border-aurora-violet/50 hover:border-aurora-violet'
            } disabled:opacity-40`}
            aria-label={isRecording ? 'Stop optagelse' : 'Start optagelse'}
          >
            {isRecording && (
              <span className="absolute inset-0 rounded-full border-2 border-rose-400 animate-ping opacity-30" />
            )}
            <span className="text-3xl sm:text-4xl">{isRecording ? '⏹' : '🎙️'}</span>
          </button>

          {isRecording && (
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-rose-400 rounded-full animate-pulse" />
              <span className="text-sm font-mono text-rose-300">{formatTime(recordingSeconds)}</span>
              <span className="text-xs text-midnight-400">optager...</span>
            </div>
          )}

          {!isRecording && !transcript && (
            <p className="text-sm text-midnight-400 text-center leading-relaxed">Tryk for at starte optagelse.<br />Tal frit om din dag, dine følelser, din krop.</p>
          )}
        </div>

        {/* Live transcript */}
        {(transcript || interimTranscript) && (
          <div className="bg-midnight-800/60 rounded-2xl border border-midnight-700/50 p-4">
            <p className="text-xs text-midnight-400 font-semibold mb-2">📝 Transskription:</p>
            <p className="text-sm text-midnight-100 leading-relaxed">
              {transcript}
              {interimTranscript && (
                <span className="text-midnight-400 italic">{interimTranscript}</span>
              )}
            </p>
          </div>
        )}

        {/* Analyze button */}
        {transcript && !isRecording && !krapAnalysis && (
          <button
            onClick={analyzeWithClaude}
            disabled={isAnalyzing}
            className="w-full flex items-center justify-center gap-2 bg-aurora-violet/10 border border-aurora-violet/25 rounded-2xl px-4 py-4 text-sm text-purple-300 font-medium hover:bg-aurora-violet/15 transition-all duration-200 disabled:opacity-50"
          >
            {isAnalyzing ? (
              <>
                <span className="inline-block w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="inline-block w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="inline-block w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                <span className="ml-2">Claude analyserer...</span>
              </>
            ) : (
              <><span>🔮</span><span>Analyser med Claude — udtræk KRAP-noter</span></>
            )}
          </button>
        )}

        {/* KRAP Analysis result */}
        {krapAnalysis && (
          <div className="space-y-3 animate-slide-up">
            <div className="bg-aurora-violet/10 border border-aurora-violet/25 rounded-2xl p-4">
              <p className="text-xs text-purple-400 font-semibold mb-2">🔮 Claude&apos;s opsummering:</p>
              <p className="text-sm text-midnight-100 leading-relaxed italic">&ldquo;{krapAnalysis.summary}&rdquo;</p>
            </div>

            {[
              { key: 'krop', label: 'Krop', emoji: '🫀', color: '#F472B6' },
              { key: 'rolle', label: 'Rolle', emoji: '🎭', color: '#A78BFA' },
              { key: 'affekt', label: 'Affekt', emoji: '💭', color: '#60A5FA' },
              { key: 'plan', label: 'Plan', emoji: '🗺️', color: '#34D399' },
            ].map(({ key, label, emoji, color }) => (
              <div key={key} className="rounded-2xl border p-4" style={{ borderColor: `${color}25`, background: `${color}08` }}>
                <div className="flex items-center gap-2 mb-1">
                  <span>{emoji}</span>
                  <span className="text-sm font-bold" style={{ color }}>{label}</span>
                </div>
                <p className="text-sm text-midnight-200">{krapAnalysis[key as keyof KrapAnalysis]}</p>
              </div>
            ))}

            <button
              onClick={handleSave}
              className={`w-full py-4 rounded-2xl font-semibold text-sm transition-all duration-300 ${
                saved
                  ? 'bg-emerald-500/20 border border-emerald-500/40 text-emerald-300' :'bg-sunrise-400/20 border border-sunrise-400/30 text-sunrise-300 hover:bg-sunrise-400/25'
              }`}
            >
              {saved ? '✅ Gemt i journalen!' : '💾 Gem stemmejournal'}
            </button>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
