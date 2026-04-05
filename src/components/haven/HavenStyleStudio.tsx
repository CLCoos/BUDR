'use client';

import React, { useEffect, useState } from 'react';
import { Sparkles, X } from 'lucide-react';
import {
  type HavenCustomization,
  HAVEN_DEFAULT_CUSTOMIZATION,
  HAVEN_VIBE_LINES,
  type HavenFrameStyle,
  type HavenSkyMood,
  saveHavenCustomization,
} from '@/lib/havenCustomization';

const SKY_OPTIONS: { id: HavenSkyMood; label: string; hint: string }[] = [
  { id: 'realtime', label: 'Døgnrytme', hint: 'Himmel følger tid på dagen' },
  { id: 'aurora', label: 'Nordlys', hint: 'Turkis & lilla drama' },
  { id: 'sunset_punch', label: 'Solnedgang', hint: 'Varm, energisk' },
  { id: 'midnight_jade', label: 'Midnats jade', hint: 'Rolig dybde' },
  { id: 'rose_glow', label: 'Rosenglimt', hint: 'Blød & drømmende' },
  { id: 'electric_dusk', label: 'Elektrisk skumring', hint: 'Neon & håb' },
];

const FRAME_OPTIONS: { id: HavenFrameStyle; label: string }[] = [
  { id: 'none', label: 'Ingen' },
  { id: 'opal', label: 'Opalglas' },
  { id: 'gold', label: 'Guldglød' },
  { id: 'neon_lime', label: 'Neon' },
];

type Props = {
  open: boolean;
  onClose: () => void;
  residentId: string;
  value: HavenCustomization;
  onApply: (next: HavenCustomization) => void;
};

export function HavenStyleStudio({ open, onClose, residentId, value, onApply }: Props) {
  const [draft, setDraft] = useState<HavenCustomization>(value);

  useEffect(() => {
    if (open) setDraft(value);
  }, [open, value]);

  if (!open) return null;

  const commit = () => {
    saveHavenCustomization(residentId, draft);
    onApply(draft);
    onClose();
  };

  const reset = () => {
    setDraft({ ...HAVEN_DEFAULT_CUSTOMIZATION });
  };

  return (
    <div
      className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-4 bg-black/70 backdrop-blur-sm"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        className="w-full max-w-lg max-h-[90dvh] overflow-y-auto rounded-3xl border border-white/10 bg-[#0c1524] p-6 shadow-2xl"
        style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
      >
        <div className="flex items-start justify-between gap-3 mb-5">
          <div>
            <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-widest text-emerald-400/90">
              <Sparkles className="h-3.5 w-3.5" />
              Dit have-udtryk
            </p>
            <h2 className="mt-1 text-xl font-black text-white">Design din oase</h2>
            <p className="mt-1 text-sm text-slate-400 leading-relaxed">
              Vælg stemning og ramme — perfekt til at vise frem eller tage et skærmbillede.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-slate-400 hover:bg-white/10 hover:text-white"
            aria-label="Luk"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-2">Himmel</p>
        <div className="grid grid-cols-2 gap-2 mb-5">
          {SKY_OPTIONS.map((o) => (
            <button
              key={o.id}
              type="button"
              onClick={() => setDraft((d) => ({ ...d, skyMood: o.id }))}
              className="rounded-2xl border px-3 py-3 text-left transition-all active:scale-[0.98]"
              style={{
                borderColor:
                  draft.skyMood === o.id ? 'rgba(52,211,153,0.6)' : 'rgba(255,255,255,0.08)',
                backgroundColor:
                  draft.skyMood === o.id ? 'rgba(16,185,129,0.12)' : 'rgba(255,255,255,0.04)',
              }}
            >
              <p className="text-sm font-bold text-white">{o.label}</p>
              <p className="text-[11px] text-slate-400 mt-0.5 leading-snug">{o.hint}</p>
            </button>
          ))}
        </div>

        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-2">Ramme</p>
        <div className="flex flex-wrap gap-2 mb-5">
          {FRAME_OPTIONS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setDraft((d) => ({ ...d, frame: f.id }))}
              className="rounded-full px-4 py-2 text-xs font-bold transition-all"
              style={{
                backgroundColor:
                  draft.frame === f.id ? 'rgba(52,211,153,0.25)' : 'rgba(255,255,255,0.06)',
                color: draft.frame === f.id ? '#6ee7b7' : '#94a3b8',
                border: `1px solid ${draft.frame === f.id ? 'rgba(52,211,153,0.45)' : 'rgba(255,255,255,0.1)'}`,
              }}
            >
              {f.label}
            </button>
          ))}
        </div>

        <label className="flex items-center gap-3 mb-5 cursor-pointer rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
          <input
            type="checkbox"
            checked={draft.butterflies}
            onChange={(e) => setDraft((d) => ({ ...d, butterflies: e.target.checked }))}
            className="h-4 w-4 rounded border-slate-500"
          />
          <div>
            <p className="text-sm font-semibold text-white">Magiske små væsner</p>
            <p className="text-xs text-slate-400">Sommerfugle & glimt over haven</p>
          </div>
        </label>

        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500 mb-2">
          Din signatur (på del-kort)
        </p>
        <select
          value={draft.vibeLine}
          onChange={(e) => setDraft((d) => ({ ...d, vibeLine: e.target.value }))}
          className="w-full rounded-xl border border-white/10 bg-[#0f1b2d] px-3 py-3 text-sm text-white mb-2"
        >
          {HAVEN_VIBE_LINES.map((line) => (
            <option key={line} value={line}>
              {line}
            </option>
          ))}
        </select>

        <div className="flex gap-2 pt-2">
          <button
            type="button"
            onClick={reset}
            className="flex-1 rounded-xl border border-white/15 py-3 text-sm font-semibold text-slate-300"
          >
            Nulstil
          </button>
          <button
            type="button"
            onClick={commit}
            className="flex-1 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 py-3 text-sm font-black text-white shadow-lg shadow-emerald-500/25"
          >
            Gem & vis
          </button>
        </div>
      </div>
    </div>
  );
}
