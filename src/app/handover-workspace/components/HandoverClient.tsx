'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import ResidentHandoverCard from './ResidentHandoverCard';
import { Download } from 'lucide-react';
import { toast } from 'sonner';

export type FlagColor = 'groen' | 'gul' | 'roed' | 'sort' | null;
export type ShiftLabel = 'dag' | 'aften' | 'nat';

export interface HandoverEntry {
  residentId: string;
  residentName: string;
  initials: string;
  flagColor: FlagColor;
  note: string;
  shiftLabel: ShiftLabel;
  previousNote?: string;
  previousShift?: string;
}

const initialEntries: HandoverEntry[] = [
  {
    residentId: 'res-001',
    residentName: 'Anders M.',
    initials: 'AM',
    flagColor: 'groen',
    note: '',
    shiftLabel: 'dag',
    previousNote:
      'God aften. Spiste aftensmad med de andre. Tog medicin til rette tid. Sov hurtigt.',
    previousShift: 'Aftenvagt · Morten L.',
  },
  {
    residentId: 'res-002',
    residentName: 'Finn L.',
    initials: 'FL',
    flagColor: 'roed',
    note: '',
    shiftLabel: 'dag',
    previousNote:
      'Meget urolig. Aktiverede kriseplan kl. 02:30. Ringede til vagttelefonen. Sov ikke.',
    previousShift: 'Nattevagt · Hanne B.',
  },
  {
    residentId: 'res-003',
    residentName: 'Kirsten R.',
    initials: 'KR',
    flagColor: 'roed',
    note: '',
    shiftLabel: 'dag',
    previousNote: 'Græd ved aftensmad. Ville ikke tale. Gik i seng tidligt. Sov uroligt.',
    previousShift: 'Aftenvagt · Morten L.',
  },
  {
    residentId: 'res-004',
    residentName: 'Maja T.',
    initials: 'MT',
    flagColor: 'gul',
    note: '',
    shiftLabel: 'dag',
    previousNote: 'Let angst. Lavede vejrtrækningsøvelser med personalet. Roligere til sidst.',
    previousShift: 'Aftenvagt · Morten L.',
  },
  {
    residentId: 'res-005',
    residentName: 'Thomas B.',
    initials: 'TB',
    flagColor: null,
    note: '',
    shiftLabel: 'dag',
    previousNote: 'Ingen observationer. Var på besøg hos familie.',
    previousShift: 'Aftenvagt · Morten L.',
  },
  {
    residentId: 'res-006',
    residentName: 'Lena P.',
    initials: 'LP',
    flagColor: 'groen',
    note: '',
    shiftLabel: 'dag',
    previousNote: 'God aften. Deltog i fællesaktivitet. God stemning.',
    previousShift: 'Aftenvagt · Morten L.',
  },
];

type HandoverClientProps = {
  /** Mørk Care Portal-flade (fx demo med --cp-* tokens) */
  carePortalDark?: boolean;
};

export default function HandoverClient({ carePortalDark = false }: HandoverClientProps) {
  const [entries, setEntries] = useState<HandoverEntry[]>(initialEntries);
  const [currentShift, setCurrentShift] = useState<ShiftLabel>('dag');
  const [saving, setSaving] = useState(false);

  const updateEntry = (residentId: string, updates: Partial<HandoverEntry>) => {
    setEntries((prev) => prev.map((e) => (e.residentId === residentId ? { ...e, ...updates } : e)));
  };

  const handleSaveAll = async () => {
    setSaving(true);
    // Backend: INSERT INTO care_handover_notes (resident_id, staff_id, flag_color, shift_label, body, created_at) for each entry
    await new Promise((r) => setTimeout(r, 1200));
    setSaving(false);
    toast.success(`Vagtnotat gemt for ${currentShift}vagt`);
  };

  const handleDownload = () => {
    const lines = entries
      .filter((e) => e.note.trim())
      .map(
        (e) =>
          `[${e.flagColor?.toUpperCase() ?? 'INGEN'}] ${e.residentName} · ${e.shiftLabel}vagt\n${e.note}\n`
      );
    const content = `BUDR Vagtoverleveringsnotat\nBosted Nordlys · ${currentShift}vagt · 26/03/2026\nPersonale: Sara K.\n\n${lines.join('\n')}`;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vagtnotat-${currentShift}-26032026.txt`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success('Vagtnotat hentet som .txt');
  };

  const completedCount = entries.filter((e) => e.note.trim() && e.flagColor).length;

  const pd = carePortalDark;

  return (
    <div className="max-w-screen-2xl p-6">
      <div
        className="mb-4 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border px-4 py-3 text-sm"
        style={
          pd
            ? {
                backgroundColor: 'var(--cp-bg2)',
                borderColor: 'var(--cp-border)',
                color: 'var(--cp-muted)',
              }
            : { backgroundColor: '#f8fafc', borderColor: '#e2e8f0', color: '#475569' }
        }
      >
        <span className="font-medium" style={{ color: pd ? 'var(--cp-text)' : '#0f172a' }}>
          Relateret i portalen:
        </span>
        <Link
          href="/care-portal-dashboard"
          className="underline-offset-2 hover:underline"
          style={{ color: '#1D9E75' }}
        >
          Dashboard — journal og bekymringsnotater
        </Link>
        <Link
          href="/care-portal-demo/beskeder"
          className="underline-offset-2 hover:underline"
          style={{ color: '#7F77DD' }}
        >
          Demo beskeder
        </Link>
        <span className="text-xs opacity-80">(live beskeder — kommende)</span>
      </div>

      {/* Header */}
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: pd ? 'var(--cp-text)' : undefined }}>
            Vagtoverleveringsrum
          </h1>
          <div className="mt-0.5 text-sm" style={{ color: pd ? 'var(--cp-muted)' : '#6b7280' }}>
            Bosted Nordlys · 26/03/2026 · Sara K.
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          {/* Shift selector */}
          <div
            className="flex overflow-hidden rounded-lg border"
            style={
              pd
                ? { backgroundColor: 'var(--cp-bg2)', borderColor: 'var(--cp-border)' }
                : { backgroundColor: '#fff', borderColor: '#e5e7eb' }
            }
          >
            {(['dag', 'aften', 'nat'] as ShiftLabel[]).map((s) => (
              <button
                key={`shift-${s}`}
                onClick={() => setCurrentShift(s)}
                className={`px-4 py-2 text-sm font-medium capitalize transition-all ${
                  currentShift === s ? 'bg-[#0F1B2D] text-white' : ''
                }`}
                style={
                  pd && currentShift !== s
                    ? { color: 'var(--cp-muted)' }
                    : !pd && currentShift !== s
                      ? { color: '#4b5563' }
                      : undefined
                }
              >
                {s === 'dag' ? '☀️' : s === 'aften' ? '🌙' : '🌃'}{' '}
                {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-all"
            style={
              pd
                ? {
                    borderColor: 'var(--cp-border)',
                    color: 'var(--cp-muted)',
                    backgroundColor: 'var(--cp-bg2)',
                  }
                : undefined
            }
          >
            <Download size={14} /> Download .txt
          </button>
          <button
            onClick={handleSaveAll}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all active:scale-95 disabled:opacity-70"
            style={{ backgroundColor: '#1D9E75' }}
          >
            {saving ? (
              <span className="flex items-center gap-2">
                <div className="w-3 h-3 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                Gemmer...
              </span>
            ) : (
              `Gem alle noter (${completedCount}/${entries.length})`
            )}
          </button>
        </div>
      </div>

      {/* Progress bar */}
      <div
        className="mb-5 rounded-lg border p-4"
        style={
          pd
            ? {
                backgroundColor: 'var(--cp-bg2)',
                borderColor: 'var(--cp-border)',
              }
            : { backgroundColor: '#fff', borderColor: '#f3f4f6' }
        }
      >
        <div className="mb-2 flex items-center justify-between">
          <span
            className="text-sm font-medium"
            style={{ color: pd ? 'var(--cp-text)' : '#374151' }}
          >
            Vagtnotat fremskridt
          </span>
          <span
            className="text-sm font-bold tabular-nums"
            style={{ color: pd ? 'var(--cp-text)' : '#1f2937' }}
          >
            {completedCount}/{entries.length}
          </span>
        </div>
        <div
          className="h-2 overflow-hidden rounded-full"
          style={{ backgroundColor: pd ? 'var(--cp-bg3)' : '#f3f4f6' }}
        >
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{
              width: `${(completedCount / entries.length) * 100}%`,
              backgroundColor: '#1D9E75',
            }}
          />
        </div>
        <div className="mt-3 flex flex-wrap gap-4">
          {(['groen', 'gul', 'roed', 'sort'] as FlagColor[]).map((f) => {
            const count = entries.filter((e) => e.flagColor === f).length;
            const colors = { groen: '#22C55E', gul: '#EAB308', roed: '#EF4444', sort: '#1F2937' };
            return (
              <div
                key={`flag-count-${f}`}
                className="flex items-center gap-1.5 text-xs"
                style={{ color: pd ? 'var(--cp-muted)' : '#6b7280' }}
              >
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: colors[f!] }} />
                {count}{' '}
                {f === 'groen' ? 'grøn' : f === 'gul' ? 'gul' : f === 'roed' ? 'rød' : 'sort'}
              </div>
            );
          })}
        </div>
      </div>

      {/* Resident cards */}
      <div className="space-y-3">
        {entries.map((entry) => (
          <ResidentHandoverCard
            key={entry.residentId}
            entry={entry}
            carePortalDark={carePortalDark}
            onUpdate={(updates) => updateEntry(entry.residentId, updates)}
          />
        ))}
      </div>
    </div>
  );
}
