'use client';
import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Sparkles, Mic, Square, Loader2 } from 'lucide-react';
import { HandoverEntry, FlagColor, ShiftLabel } from './HandoverClient';
import { toast } from 'sonner';

interface Props {
  entry: HandoverEntry;
  onUpdate: (updates: Partial<HandoverEntry>) => void;
}

const flagConfig = {
  groen: { label: 'Grøn', color: '#22C55E', bg: '#F0FDF4', border: '#86EFAC' },
  gul: { label: 'Gul', color: '#EAB308', bg: '#FEFCE8', border: '#FDE047' },
  roed: { label: 'Rød', color: '#EF4444', bg: '#FEF2F2', border: '#FECACA' },
  sort: { label: 'Sort (kritisk)', color: '#1F2937', bg: '#F9FAFB', border: '#D1D5DB' },
};

const aiHandoverSuggestions = [
  'Anders M. har haft en rolig morgen. Spiste morgenmad og tog sin medicin. Stemning 7/10, grøn trafiklys. Ingen bekymringer. Anbefaler fortsat opmuntring til udeaktivitet som del af målplan.',
  'Finn L. er i en kritisk periode. Aktiverede kriseplan om natten. Behøver tæt opfølgning i dag. Rød trafiklys. Anbefaler kontakt med behandler. Medicin taget under observation.',
  'Kirsten R. har haft en svær nat. Græd og ville ikke spise morgenmad. Rød trafiklys, stemning 2/10. Anbefaler en rolig samtale tidligt på dagvagten. Ingen medicin ændringer.',
  'Maja T. viser tegn på angst men er tilgængelig for kontakt. Gul trafiklys. Vejrtrækningsøvelser hjalp i går. Anbefales fortsat støtte og opfølgning på trivsel.',
  'Thomas B. var fraværende i går. Ingen observationer. Tjek ind ved ankomst.',
  'Lena P. har det godt. Deltog aktivt i fællesaktiviteter. Grøn trafiklys, stemning 8/10. Ingen bekymringer.',
];

export default function ResidentHandoverCard({ entry, onUpdate }: Props) {
  const [expanded, setExpanded] = useState(entry.flagColor === 'roed');
  const [loadingAI, setLoadingAI] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  const residentIndex = ['res-001', 'res-002', 'res-003', 'res-004', 'res-005', 'res-006'].indexOf(
    entry.residentId
  );
  const aiSuggestion = aiHandoverSuggestions[Math.max(0, residentIndex)];

  const handleGenerateAI = async () => {
    setLoadingAI(true);
    // Backend: POST /api/portal/ai/handover with resident PARK context
    await new Promise((r) => setTimeout(r, 1600));
    onUpdate({ note: aiSuggestion });
    setLoadingAI(false);
    toast.success('AI-vagtnotat genereret');
  };

  const handleRecord = async () => {
    if (recording) {
      setRecording(false);
      setRecordingSeconds(0);
      // Backend: Send audio to Supabase Edge Function voice-to-krap → Whisper + Claude
      await new Promise((r) => setTimeout(r, 1000));
      onUpdate({
        note: `[Transskription] ${entry.residentName} havde en rolig morgen. Spiste morgenmad og virkede afslappet. Ingen bekymringer observeret.`,
      });
      toast.success('Lydnotat transskriberet');
    } else {
      setRecording(true);
      const interval = setInterval(() => {
        setRecordingSeconds((s) => {
          if (s >= 30) {
            clearInterval(interval);
            setRecording(false);
            return 0;
          }
          return s + 1;
        });
      }, 1000);
    }
  };

  const fc = entry.flagColor ? flagConfig[entry.flagColor] : null;

  return (
    <div
      className={`bg-white rounded-lg border overflow-hidden transition-all ${
        entry.flagColor === 'roed'
          ? 'border-red-200'
          : entry.flagColor === 'gul'
            ? 'border-yellow-200'
            : 'border-gray-100'
      }`}
    >
      {/* Card header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center gap-3 px-4 py-3.5 hover:bg-gray-50 transition-colors text-left"
      >
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
          style={{ backgroundColor: fc?.color ?? '#9CA3AF' }}
        >
          {entry.initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-800">{entry.residentName}</span>
            {fc && (
              <span
                className="text-xs px-2 py-0.5 rounded font-medium"
                style={{ backgroundColor: fc.bg, color: fc.color }}
              >
                {fc.label}
              </span>
            )}
            {!entry.flagColor && (
              <span className="text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-400">
                Ingen flag
              </span>
            )}
          </div>
          {entry.note ? (
            <div className="text-xs text-gray-500 truncate mt-0.5">
              {entry.note.slice(0, 80)}...
            </div>
          ) : (
            <div className="text-xs text-gray-400 mt-0.5">Ingen note endnu</div>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          {entry.note && <div className="w-2 h-2 rounded-full bg-green-400" />}
          {expanded ? (
            <ChevronUp size={16} className="text-gray-400" />
          ) : (
            <ChevronDown size={16} className="text-gray-400" />
          )}
        </div>
      </button>

      {expanded && (
        <div className="border-t border-gray-100 px-4 py-4 space-y-4">
          {/* Previous shift note */}
          {entry.previousNote && (
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-xs font-medium text-gray-500 mb-1.5">
                Forrige vagt: {entry.previousShift}
              </div>
              <div className="text-sm text-gray-600 leading-relaxed">{entry.previousNote}</div>
            </div>
          )}

          {/* Flag selector */}
          <div>
            <label className="text-xs font-medium text-gray-600 mb-2 block">Flag-farve</label>
            <div className="flex gap-2">
              {(Object.keys(flagConfig) as FlagColor[]).filter(Boolean).map((f) => {
                const cfg = flagConfig[f!];
                return (
                  <button
                    key={`flag-${entry.residentId}-${f}`}
                    onClick={() => onUpdate({ flagColor: f })}
                    className={`flex-1 py-2 rounded-lg text-xs font-semibold border-2 transition-all ${
                      entry.flagColor === f ? 'scale-105' : 'opacity-60 hover:opacity-90'
                    }`}
                    style={{
                      borderColor: entry.flagColor === f ? cfg.color : 'transparent',
                      backgroundColor: cfg.bg,
                      color: cfg.color,
                    }}
                  >
                    {cfg.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Shift label */}
          <div>
            <label className="text-xs font-medium text-gray-600 mb-2 block">Vagttype</label>
            <div className="flex gap-2">
              {(['dag', 'aften', 'nat'] as ShiftLabel[]).map((s) => (
                <button
                  key={`shiftlabel-${entry.residentId}-${s}`}
                  onClick={() => onUpdate({ shiftLabel: s })}
                  className={`flex-1 py-2 rounded-lg text-xs font-medium border transition-all capitalize ${
                    entry.shiftLabel === s
                      ? 'bg-[#0F1B2D] text-white border-[#0F1B2D]'
                      : 'bg-white text-gray-600 border-gray-200 hover:border-gray-400'
                  }`}
                >
                  {s === 'dag' ? '☀️' : s === 'aften' ? '🌙' : '🌃'}{' '}
                  {s.charAt(0).toUpperCase() + s.slice(1)}
                </button>
              ))}
            </div>
          </div>

          {/* Note textarea */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-medium text-gray-600">Vagtnotat</label>
              <div className="flex gap-2">
                {/* Voice recorder */}
                <button
                  onClick={handleRecord}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                    recording
                      ? 'bg-red-50 border-red-300 text-red-600'
                      : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-gray-400'
                  }`}
                >
                  {recording ? (
                    <>
                      <Square size={10} className="text-red-500" />
                      Stop ({recordingSeconds}s)
                      {/* Waveform bars */}
                      <div className="flex gap-0.5 items-end h-4">
                        {[1, 2, 3, 4, 5].map((b) => (
                          <div
                            key={`wave-${b}`}
                            className="w-0.5 bg-red-400 rounded-full waveform-bar"
                            style={{ animationDelay: `${b * 0.1}s` }}
                          />
                        ))}
                      </div>
                    </>
                  ) : (
                    <>
                      <Mic size={10} />
                      VoiceKRAP
                    </>
                  )}
                </button>
                {/* AI composer */}
                <button
                  onClick={handleGenerateAI}
                  disabled={loadingAI}
                  className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-[#1D9E75]/30 bg-[#E6F7F2] text-[#1D9E75] hover:bg-[#1D9E75]/20 transition-all disabled:opacity-50"
                >
                  {loadingAI ? (
                    <Loader2 size={10} className="animate-spin" />
                  ) : (
                    <Sparkles size={10} />
                  )}
                  Generer med AI
                </button>
              </div>
            </div>
            <textarea
              value={entry.note}
              onChange={(e) => onUpdate({ note: e.target.value })}
              placeholder="Skriv observationer, hændelser og anbefalinger til næste vagt..."
              className="w-full text-sm border border-gray-200 rounded-lg p-3 resize-none focus:outline-none focus:border-[#1D9E75] transition-colors text-gray-700 placeholder-gray-400"
              rows={4}
            />
            <div className="flex justify-end mt-1">
              <span className="text-xs text-gray-400">{entry.note.length} tegn</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
