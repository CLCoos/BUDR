'use client';
import React, { useState } from 'react';
import { Check, Smile, Frown } from 'lucide-react';
import { toast } from 'sonner';
import VoiceJournal from './VoiceJournal';

const moodEmojis = ['😔', '😟', '😕', '😐', '🙂', '😊', '😄', '😃', '🤩', '🥳'];

type TrafficUi = 'groen' | 'gul' | 'roed';

const TRAFFIC_LABELS: Record<TrafficUi, string> = {
  groen: 'Grøn',
  gul: 'Gul',
  roed: 'Rød',
};

export default function DailyCheckin() {
  const [mood, setMood] = useState(6);
  const [traffic, setTraffic] = useState<TrafficUi | null>(null);
  const [note, setNote] = useState('');
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);
  const [voiceTranscript, setVoiceTranscript] = useState<string | null>(null);
  const [voiceSummary, setVoiceSummary] = useState<string | null>(null);

  const handleSave = async () => {
    if (!traffic) {
      toast.error('Vælg venligst en trafiklysfarve');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch('/api/park/daily-checkin', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          mood_score: mood,
          traffic_light: traffic,
          note: note.trim() || undefined,
          voice_transcript: voiceTranscript ?? undefined,
          ai_summary: voiceSummary ?? undefined,
        }),
      });
      if (!res.ok) {
        const data = (await res.json()) as { error?: string };
        toast.error(data.error ?? 'Noget gik galt — prøv igen');
        return;
      }
      setSaved(true);
      toast.success('Check-in gemt! Godt klaret 🌟');
    } catch {
      toast.error('Netværksfejl — kunne ikke gemme check-in');
    } finally {
      setLoading(false);
    }
  };

  if (saved) {
    return (
      <div className="bg-white rounded-lg p-6 text-center border border-gray-100">
        <div className="text-4xl mb-3">✅</div>
        <div className="font-semibold text-gray-800 mb-1">Check-in registreret!</div>
        <div className="text-sm text-gray-500 mb-4">
          Du har det {moodEmojis[mood - 1]} i dag — stemning {mood}/10
        </div>
        {traffic && (
          <div
            className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
              traffic === 'groen'
                ? 'bg-green-100 text-green-700'
                : traffic === 'gul'
                  ? 'bg-yellow-100 text-yellow-700'
                  : 'bg-red-100 text-red-700'
            }`}
          >
            <div
              className={`w-2 h-2 rounded-full ${
                traffic === 'groen'
                  ? 'bg-green-500'
                  : traffic === 'gul'
                    ? 'bg-yellow-500'
                    : 'bg-red-500'
              }`}
            />
            {TRAFFIC_LABELS[traffic]}
          </div>
        )}
        {voiceSummary && (
          <p className="mt-3 text-sm italic text-[#1D9E75]">Du fortalte: {voiceSummary}</p>
        )}
        <button
          type="button"
          onClick={() => setSaved(false)}
          className="mt-4 block w-full text-sm text-[#7F77DD] hover:underline"
        >
          Ret check-in
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Mood slider */}
      <div className="bg-white rounded-lg p-5 border border-gray-100">
        <div className="text-sm font-semibold text-gray-700 mb-1">Hvordan har du det?</div>
        <div className="text-xs text-gray-500 mb-4">Skala 1–10 · Vælg et tal</div>

        <div className="flex items-center justify-between mb-3">
          <Frown size={20} className="text-gray-400" />
          <span className="text-3xl font-bold tabular-nums" style={{ color: '#7F77DD' }}>
            {mood}
          </span>
          <Smile size={20} className="text-gray-400" />
        </div>

        <input
          type="range"
          min={1}
          max={10}
          value={mood}
          onChange={(e) => setMood(Number(e.target.value))}
          className="w-full accent-[#7F77DD] h-2 rounded-full cursor-pointer"
        />

        <div className="flex justify-between mt-2">
          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
            <button
              key={`mood-${n}`}
              type="button"
              onClick={() => setMood(n)}
              className={`w-7 h-7 rounded-full text-xs font-medium transition-all ${
                mood === n
                  ? 'bg-[#7F77DD] text-white scale-110'
                  : 'bg-gray-100 text-gray-500 hover:bg-[#7F77DD]/20'
              }`}
            >
              {n}
            </button>
          ))}
        </div>

        <div className="mt-3 text-center text-2xl">{moodEmojis[mood - 1]}</div>
      </div>

      {/* Traffic light */}
      <div className="bg-white rounded-lg p-5 border border-gray-100">
        <div className="text-sm font-semibold text-gray-700 mb-1">Trafiklys</div>
        <div className="text-xs text-gray-500 mb-4">
          Hvordan vil du beskrive din dag overordnet?
        </div>

        <div className="grid grid-cols-3 gap-3">
          {[
            {
              key: 'groen' as TrafficUi,
              label: 'Grøn',
              sublabel: 'Det går godt',
              color: '#22C55E',
              bg: '#F0FDF4',
              border: '#86EFAC',
            },
            {
              key: 'gul' as TrafficUi,
              label: 'Gul',
              sublabel: 'Lidt udfordret',
              color: '#EAB308',
              bg: '#FEFCE8',
              border: '#FDE047',
            },
            {
              key: 'roed' as TrafficUi,
              label: 'Rød',
              sublabel: 'Har det svært',
              color: '#EF4444',
              bg: '#FEF2F2',
              border: '#FECACA',
            },
          ].map((opt) => (
            <button
              key={`traffic-${opt.key}`}
              type="button"
              onClick={() => setTraffic(opt.key)}
              className={`flex flex-col items-center gap-2 py-4 px-2 rounded-lg border-2 transition-all ${
                traffic === opt.key ? 'scale-105 shadow-sm' : 'opacity-70 hover:opacity-100'
              }`}
              style={{
                borderColor: traffic === opt.key ? opt.color : opt.border,
                backgroundColor: opt.bg,
              }}
            >
              <div className="w-8 h-8 rounded-full" style={{ backgroundColor: opt.color }} />
              <div className="text-xs font-semibold" style={{ color: opt.color }}>
                {opt.label}
              </div>
              <div className="text-xs text-gray-500 text-center leading-tight">{opt.sublabel}</div>
              {traffic === opt.key && <Check size={12} style={{ color: opt.color }} />}
            </button>
          ))}
        </div>
      </div>

      {/* Note */}
      <div className="bg-white rounded-lg p-5 border border-gray-100">
        <div className="text-sm font-semibold text-gray-700 mb-1">Tilføj en note (valgfri)</div>
        <textarea
          value={note}
          onChange={(e) => setNote(e.target.value)}
          placeholder="Hvad tænker du på i dag? Hvad skete der?"
          className="w-full text-sm text-gray-700 placeholder-gray-400 border border-gray-200 rounded-lg p-3 resize-none focus:outline-none focus:border-[#7F77DD] transition-colors"
          rows={3}
        />
      </div>

      <VoiceJournal
        onSkip={() => {
          setVoiceTranscript(null);
          setVoiceSummary(null);
        }}
        onComplete={(transcript, summary) => {
          setVoiceTranscript(transcript);
          setVoiceSummary(summary);
        }}
      />

      <button
        type="button"
        onClick={() => void handleSave()}
        disabled={loading}
        className="w-full py-3.5 rounded-lg font-semibold text-white text-sm transition-all active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
        style={{ backgroundColor: '#7F77DD' }}
      >
        {loading ? 'Gemmer…' : 'Gem check-in'}
      </button>
    </div>
  );
}
