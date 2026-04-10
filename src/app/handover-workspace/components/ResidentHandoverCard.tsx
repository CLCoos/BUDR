'use client';
import React, { useState } from 'react';
import { ChevronDown, ChevronUp, Sparkles, Mic, Square, Loader2 } from 'lucide-react';
import { HandoverEntry, FlagColor } from './HandoverClient';
import { toast } from 'sonner';

interface Props {
  entry: HandoverEntry;
  onUpdate: (updates: Partial<HandoverEntry>) => void;
  carePortalDark?: boolean;
}

const flagConfig = {
  groen: {
    label: 'Grøn',
    color: '#22C55E',
    bg: '#F0FDF4',
    border: '#86EFAC',
    darkBg: 'rgba(34,197,94,0.16)',
  },
  gul: {
    label: 'Gul',
    color: '#EAB308',
    bg: '#FEFCE8',
    border: '#FDE047',
    darkBg: 'rgba(234,179,8,0.14)',
  },
  roed: {
    label: 'Rød',
    color: '#EF4444',
    bg: '#FEF2F2',
    border: '#FECACA',
    darkBg: 'rgba(239,68,68,0.14)',
  },
  sort: {
    label: 'Sort (kritisk)',
    color: '#1F2937',
    bg: '#F9FAFB',
    border: '#D1D5DB',
    darkBg: 'rgba(148,163,184,0.12)',
  },
};

/** Pladsholder {navn} erstattes med den aktuelle beboer (live UUID eller demo-id). */
const AI_HANDOVER_TEMPLATES = [
  '{navn} har haft en rolig morgen. Spiste morgenmad og tog sin medicin. Stemning 7/10, grøn trafiklys. Ingen bekymringer. Anbefaler fortsat opmuntring til udeaktivitet som del af målplan.',
  '{navn} er i en kritisk periode. Aktiverede kriseplan om natten. Behøver tæt opfølgning i dag. Rød trafiklys. Anbefaler kontakt med behandler. Medicin taget under observation.',
  '{navn} har haft en svær nat. Græd og ville ikke spise morgenmad. Rød trafiklys, stemning 2/10. Anbefaler en rolig samtale tidligt på dagvagten. Ingen medicin ændringer.',
  '{navn} viser tegn på angst men er tilgængelig for kontakt. Gul trafiklys. Vejrtrækningsøvelser hjalp i går. Anbefales fortsat støtte og opfølgning på trivsel.',
  '{navn} var fraværende i går. Ingen observationer. Tjek ind ved ankomst.',
  '{navn} har det godt. Deltog aktivt i fællesaktiviteter. Grøn trafiklys, stemning 8/10. Ingen bekymringer.',
];

function fillHandoverTemplate(template: string, residentName: string): string {
  const n = residentName.trim() || 'Beboeren';
  return template.split('{navn}').join(n);
}

function pickHandoverAiTemplateIndex(residentId: string): number {
  const DEMO_RESIDENT_ORDER = [
    'res-001',
    'res-002',
    'res-003',
    'res-004',
    'res-005',
    'res-006',
  ] as const;
  const demoIdx = DEMO_RESIDENT_ORDER.indexOf(residentId as (typeof DEMO_RESIDENT_ORDER)[number]);
  if (demoIdx >= 0) return demoIdx;
  const hash = [...residentId].reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return hash % AI_HANDOVER_TEMPLATES.length;
}

export default function ResidentHandoverCard({ entry, onUpdate, carePortalDark = false }: Props) {
  const pd = carePortalDark;
  const [expanded, setExpanded] = useState(entry.flagColor === 'roed');
  const [loadingAI, setLoadingAI] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);

  const aiSuggestion = fillHandoverTemplate(
    AI_HANDOVER_TEMPLATES[pickHandoverAiTemplateIndex(entry.residentId)]!,
    entry.residentName
  );

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
      className={`rounded-lg border overflow-hidden transition-all ${
        entry.flagColor === 'roed'
          ? 'border-red-200'
          : entry.flagColor === 'gul'
            ? 'border-yellow-200'
            : pd
              ? ''
              : 'border-gray-100'
      }`}
      style={
        pd
          ? {
              backgroundColor: 'var(--cp-bg2)',
              borderColor:
                entry.flagColor === 'roed'
                  ? 'rgba(245,101,101,0.35)'
                  : entry.flagColor === 'gul'
                    ? 'rgba(246,173,85,0.35)'
                    : 'var(--cp-border)',
            }
          : { backgroundColor: '#fff' }
      }
    >
      {/* Card header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left transition-colors"
        style={pd ? { color: 'var(--cp-text)' } : undefined}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.backgroundColor = pd ? 'var(--cp-bg3)' : '#f9fafb';
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.backgroundColor = '';
        }}
      >
        <div
          className="w-9 h-9 rounded-full flex items-center justify-center text-white text-sm font-bold flex-shrink-0"
          style={{ backgroundColor: fc?.color ?? '#9CA3AF' }}
        >
          {entry.initials}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span
              className="text-sm font-semibold"
              style={{ color: pd ? 'var(--cp-text)' : '#1f2937' }}
            >
              {entry.residentName}
            </span>
            {fc && (
              <span
                className="text-xs px-2 py-0.5 rounded font-medium"
                style={{
                  backgroundColor: pd ? flagConfig[entry.flagColor!].darkBg : fc.bg,
                  color: entry.flagColor === 'sort' && pd ? '#F3F4F6' : fc.color,
                }}
              >
                {fc.label}
              </span>
            )}
            {!entry.flagColor && (
              <span
                className="rounded px-2 py-0.5 text-xs"
                style={
                  pd
                    ? { backgroundColor: 'var(--cp-bg3)', color: 'var(--cp-muted2)' }
                    : { backgroundColor: '#f3f4f6', color: '#9ca3af' }
                }
              >
                Ingen flag
              </span>
            )}
          </div>
          {entry.note ? (
            <div
              className="mt-0.5 truncate text-xs"
              style={{ color: pd ? 'var(--cp-muted)' : '#6b7280' }}
            >
              {entry.note.slice(0, 80)}...
            </div>
          ) : (
            <div className="mt-0.5 text-xs" style={{ color: pd ? 'var(--cp-muted2)' : '#9ca3af' }}>
              Ingen note endnu
            </div>
          )}
        </div>
        <div className="flex flex-shrink-0 items-center gap-2">
          {entry.note && <div className="h-2 w-2 rounded-full bg-green-400" />}
          {expanded ? (
            <ChevronUp size={16} style={{ color: pd ? 'var(--cp-muted)' : '#9ca3af' }} />
          ) : (
            <ChevronDown size={16} style={{ color: pd ? 'var(--cp-muted)' : '#9ca3af' }} />
          )}
        </div>
      </button>

      {expanded && (
        <div
          className="space-y-4 border-t px-4 py-4"
          style={{ borderColor: pd ? 'var(--cp-border)' : '#f3f4f6' }}
        >
          {/* Previous shift note */}
          {entry.previousNote && (
            <div
              className="rounded-lg p-3"
              style={{ backgroundColor: pd ? 'var(--cp-bg3)' : '#f9fafb' }}
            >
              <div
                className="mb-1.5 text-xs font-medium"
                style={{ color: pd ? 'var(--cp-muted)' : '#6b7280' }}
              >
                Forrige vagt: {entry.previousShift}
              </div>
              <div
                className="text-sm leading-relaxed"
                style={{ color: pd ? 'var(--cp-text)' : '#4b5563' }}
              >
                {entry.previousNote}
              </div>
            </div>
          )}

          {/* Flag selector */}
          <div>
            <label
              className="mb-2 block text-xs font-medium"
              style={{ color: pd ? 'var(--cp-muted)' : '#4b5563' }}
            >
              Flag-farve
            </label>
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
                      backgroundColor: pd ? cfg.darkBg : cfg.bg,
                      color: f === 'sort' && pd ? '#F3F4F6' : cfg.color,
                    }}
                  >
                    {cfg.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Note textarea */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <label
                className="text-xs font-medium"
                style={{ color: pd ? 'var(--cp-muted)' : '#4b5563' }}
              >
                Vagtnotat
              </label>
              <div className="flex gap-2">
                {/* Voice recorder */}
                <button
                  onClick={handleRecord}
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                    recording
                      ? 'bg-red-50 border-red-300 text-red-600'
                      : pd
                        ? ''
                        : 'bg-gray-50 border-gray-200 text-gray-600 hover:border-gray-400'
                  }`}
                  style={
                    !recording && pd
                      ? {
                          backgroundColor: 'var(--cp-bg3)',
                          borderColor: 'var(--cp-border)',
                          color: 'var(--cp-muted)',
                        }
                      : undefined
                  }
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
                  className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border transition-all disabled:opacity-50 ${
                    pd
                      ? 'border-[rgba(45,212,160,0.35)] bg-[rgba(45,212,160,0.08)] text-[var(--cp-green)] hover:bg-[rgba(45,212,160,0.14)]'
                      : 'border-[#1D9E75]/30 bg-[#E6F7F2] text-[#1D9E75] hover:bg-[#1D9E75]/20'
                  }`}
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
              className="w-full resize-none rounded-lg border p-3 text-sm transition-colors focus:outline-none focus:border-[#1D9E75] focus:ring-1 focus:ring-[rgba(45,212,160,0.25)]"
              style={
                pd
                  ? {
                      borderColor: 'var(--cp-border)',
                      backgroundColor: 'var(--cp-bg)',
                      color: 'var(--cp-text)',
                    }
                  : undefined
              }
              rows={4}
            />
            <div className="mt-1 flex justify-end">
              <span className="text-xs" style={{ color: pd ? 'var(--cp-muted2)' : '#9ca3af' }}>
                {entry.note.length} tegn
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
