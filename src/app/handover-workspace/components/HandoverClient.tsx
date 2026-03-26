'use client';
import React, { useState } from 'react';
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
  { residentId: 'res-001', residentName: 'Anders M.', initials: 'AM', flagColor: 'groen', note: '', shiftLabel: 'dag', previousNote: 'God aften. Spiste aftensmad med de andre. Tog medicin til rette tid. Sov hurtigt.', previousShift: 'Aftenvagt · Morten L.' },
  { residentId: 'res-002', residentName: 'Finn L.', initials: 'FL', flagColor: 'roed', note: '', shiftLabel: 'dag', previousNote: 'Meget urolig. Aktiverede kriseplan kl. 02:30. Ringede til vagttelefonen. Sov ikke.', previousShift: 'Nattevagt · Hanne B.' },
  { residentId: 'res-003', residentName: 'Kirsten R.', initials: 'KR', flagColor: 'roed', note: '', shiftLabel: 'dag', previousNote: 'Græd ved aftensmad. Ville ikke tale. Gik i seng tidligt. Sov uroligt.', previousShift: 'Aftenvagt · Morten L.' },
  { residentId: 'res-004', residentName: 'Maja T.', initials: 'MT', flagColor: 'gul', note: '', shiftLabel: 'dag', previousNote: 'Let angst. Lavede vejrtrækningsøvelser med personalet. Roligere til sidst.', previousShift: 'Aftenvagt · Morten L.' },
  { residentId: 'res-005', residentName: 'Thomas B.', initials: 'TB', flagColor: null, note: '', shiftLabel: 'dag', previousNote: 'Ingen observationer. Var på besøg hos familie.', previousShift: 'Aftenvagt · Morten L.' },
  { residentId: 'res-006', residentName: 'Lena P.', initials: 'LP', flagColor: 'groen', note: '', shiftLabel: 'dag', previousNote: 'God aften. Deltog i fællesaktivitet. God stemning.', previousShift: 'Aftenvagt · Morten L.' },
];

export default function HandoverClient() {
  const [entries, setEntries] = useState<HandoverEntry[]>(initialEntries);
  const [currentShift, setCurrentShift] = useState<ShiftLabel>('dag');
  const [saving, setSaving] = useState(false);

  const updateEntry = (residentId: string, updates: Partial<HandoverEntry>) => {
    setEntries(prev => prev.map(e => e.residentId === residentId ? { ...e, ...updates } : e));
  };

  const handleSaveAll = async () => {
    setSaving(true);
    // Backend: INSERT INTO care_handover_notes (resident_id, staff_id, flag_color, shift_label, body, created_at) for each entry
    await new Promise(r => setTimeout(r, 1200));
    setSaving(false);
    toast.success(`Vagtnotat gemt for ${currentShift}vagt`);
  };

  const handleDownload = () => {
    const lines = entries
      .filter(e => e.note.trim())
      .map(e => `[${e.flagColor?.toUpperCase() ?? 'INGEN'}] ${e.residentName} · ${e.shiftLabel}vagt\n${e.note}\n`);
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

  const completedCount = entries.filter(e => e.note.trim() && e.flagColor).length;

  return (
    <div className="p-6 max-w-screen-2xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Vagtoverleveringsrum</h1>
          <div className="text-sm text-gray-500 mt-0.5">Bosted Nordlys · 26/03/2026 · Sara K.</div>
        </div>
        <div className="flex items-center gap-3">
          {/* Shift selector */}
          <div className="flex bg-white border border-gray-200 rounded-lg overflow-hidden">
            {(['dag', 'aften', 'nat'] as ShiftLabel[]).map(s => (
              <button
                key={`shift-${s}`}
                onClick={() => setCurrentShift(s)}
                className={`px-4 py-2 text-sm font-medium transition-all capitalize ${
                  currentShift === s
                    ? 'bg-[#0F1B2D] text-white'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                {s === 'dag' ? '☀️' : s === 'aften' ? '🌙' : '🌃'} {s.charAt(0).toUpperCase() + s.slice(1)}
              </button>
            ))}
          </div>
          <button
            onClick={handleDownload}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-gray-200 text-sm text-gray-600 hover:bg-gray-100 transition-all"
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
      <div className="bg-white rounded-lg border border-gray-100 p-4 mb-5">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-gray-700">Vagtnotat fremskridt</span>
          <span className="text-sm font-bold tabular-nums text-gray-800">{completedCount}/{entries.length}</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all duration-500"
            style={{ width: `${(completedCount / entries.length) * 100}%`, backgroundColor: '#1D9E75' }}
          />
        </div>
        <div className="flex gap-4 mt-3">
          {(['groen', 'gul', 'roed', 'sort'] as FlagColor[]).map(f => {
            const count = entries.filter(e => e.flagColor === f).length;
            const colors = { groen: '#22C55E', gul: '#EAB308', roed: '#EF4444', sort: '#1F2937' };
            return (
              <div key={`flag-count-${f}`} className="flex items-center gap-1.5 text-xs text-gray-500">
                <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: colors[f!] }} />
                {count} {f === 'groen' ? 'grøn' : f === 'gul' ? 'gul' : f === 'roed' ? 'rød' : 'sort'}
              </div>
            );
          })}
        </div>
      </div>

      {/* Resident cards */}
      <div className="space-y-3">
        {entries.map(entry => (
          <ResidentHandoverCard
            key={entry.residentId}
            entry={entry}
            onUpdate={(updates) => updateEntry(entry.residentId, updates)}
          />
        ))}
      </div>
    </div>
  );
}