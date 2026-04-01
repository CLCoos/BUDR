'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Plus, X, Droplets, ChevronLeft } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import TreePlant from '@/components/haven/plants/TreePlant';
import FlowerPlant from '@/components/haven/plants/FlowerPlant';
import HerbPlant from '@/components/haven/plants/HerbPlant';
import BushPlant from '@/components/haven/plants/BushPlant';
import VegetablePlant from '@/components/haven/plants/VegetablePlant';

// ── Types ─────────────────────────────────────────────────────────────────────

type PlantType = 'tree' | 'flower' | 'herb' | 'bush' | 'vegetable';

type GardenPlot = {
  id: string;
  resident_id: string;
  slot_index: number;
  plant_type: PlantType;
  plant_name: string;
  goal_text: string;
  growth_stage: 0 | 1 | 2 | 3 | 4;
  total_water: number;
  last_watered_at: string | null;
};

// ── Ambient light system ──────────────────────────────────────────────────────

type AmbientPeriod = {
  label: string;
  sky: string;
  ground: string;
  horizon: string;
  textColor: string;
};

function getAmbientPeriod(h: number): AmbientPeriod {
  if (h >= 5 && h < 8) return {
    label: 'tidlig morgen',
    sky: 'linear-gradient(180deg, #1a1060 0%, #f97316 60%, #fde68a 100%)',
    ground: '#2d4a1e',
    horizon: '#f97316',
    textColor: '#fff',
  };
  if (h >= 8 && h < 12) return {
    label: 'formiddag',
    sky: 'linear-gradient(180deg, #38bdf8 0%, #7dd3fc 60%, #e0f2fe 100%)',
    ground: '#2d6a1e',
    horizon: '#bae6fd',
    textColor: '#0f172a',
  };
  if (h >= 12 && h < 16) return {
    label: 'eftermiddag',
    sky: 'linear-gradient(180deg, #1d4ed8 0%, #60a5fa 60%, #bfdbfe 100%)',
    ground: '#1e5216',
    horizon: '#93c5fd',
    textColor: '#0f172a',
  };
  if (h >= 16 && h < 19) return {
    label: 'sen eftermiddag',
    sky: 'linear-gradient(180deg, #9333ea 0%, #f97316 50%, #fbbf24 100%)',
    ground: '#1a3d12',
    horizon: '#f97316',
    textColor: '#fff',
  };
  if (h >= 19 && h < 22) return {
    label: 'aften',
    sky: 'linear-gradient(180deg, #0f172a 0%, #1e3a5f 50%, #374151 100%)',
    ground: '#0f2309',
    horizon: '#1e3a5f',
    textColor: '#e2e8f0',
  };
  return {
    label: 'nat',
    sky: 'linear-gradient(180deg, #020617 0%, #0f172a 60%, #1e293b 100%)',
    ground: '#0a1806',
    horizon: '#1e293b',
    textColor: '#cbd5e1',
  };
}

function stageFromWater(w: number): 0 | 1 | 2 | 3 | 4 {
  if (w >= 200) return 4;
  if (w >= 120) return 3;
  if (w >= 60) return 2;
  if (w >= 20) return 1;
  return 0;
}

// ── Plant component selector ──────────────────────────────────────────────────

const PLANT_ACCENTS: Record<PlantType, string> = {
  tree:      '#1D9E75',
  flower:    '#F59E0B',
  herb:      '#10B981',
  bush:      '#7F77DD',
  vegetable: '#EF4444',
};

const PLANT_LABELS: Record<PlantType, string> = {
  tree:      'Træ',
  flower:    'Blomst',
  herb:      'Urt',
  bush:      'Busk',
  vegetable: 'Grøntsag',
};

const PLANT_EMOJIS: Record<PlantType, string> = {
  tree:      '🌳',
  flower:    '🌸',
  herb:      '🌿',
  bush:      '🫐',
  vegetable: '🍅',
};

function PlantSvg({ type, stage }: { type: PlantType; stage: 0 | 1 | 2 | 3 | 4 }) {
  const accent = PLANT_ACCENTS[type];
  switch (type) {
    case 'tree':      return <TreePlant stage={stage} accent={accent} />;
    case 'flower':    return <FlowerPlant stage={stage} accent={accent} />;
    case 'herb':      return <HerbPlant stage={stage} accent={accent} />;
    case 'bush':      return <BushPlant stage={stage} accent={accent} />;
    case 'vegetable': return <VegetablePlant stage={stage} accent={accent} />;
  }
}

const STAGE_LABELS = ['Frø 🌱', 'Spire 🌿', 'Ung 🌾', 'Moden 🌸', 'Fuld 🌳'];
const WATER_THRESHOLDS = [0, 20, 60, 120, 200];

function getResidentId(): string | null {
  if (typeof document === 'undefined') return null;
  return document.cookie.match(/budr_resident_id=([^;]+)/)?.[1] ?? null;
}

// ── Main component ────────────────────────────────────────────────────────────

export default function HavenPage() {
  const router = useRouter();
  const [plots, setPlots] = useState<GardenPlot[]>([]);
  const [ambient, setAmbient] = useState<AmbientPeriod>(() => getAmbientPeriod(new Date().getHours()));
  const [selected, setSelected] = useState<GardenPlot | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [addSlot, setAddSlot] = useState<number>(0);
  const [watering, setWatering] = useState(false);
  const [residentId, setResidentId] = useState<string | null>(null);

  // Add modal state
  const [newType, setNewType] = useState<PlantType>('flower');
  const [newName, setNewName] = useState('');
  const [newGoal, setNewGoal] = useState('');
  const [saving, setSaving] = useState(false);

  // Ambient timer
  const ambientRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    ambientRef.current = setInterval(() => {
      setAmbient(getAmbientPeriod(new Date().getHours()));
    }, 60_000);
    return () => { if (ambientRef.current) clearInterval(ambientRef.current); };
  }, []);

  useEffect(() => {
    setResidentId(getResidentId());
  }, []);

  const load = useCallback(async (id: string) => {
    const supabase = createClient();
    if (!supabase) return;
    const { data } = await supabase
      .from('garden_plots')
      .select('id, resident_id, slot_index, plant_type, plant_name, goal_text, growth_stage, total_water, last_watered_at')
      .eq('resident_id', id)
      .order('slot_index');
    setPlots((data ?? []) as GardenPlot[]);
  }, []);

  useEffect(() => {
    if (residentId) void load(residentId);
  }, [residentId, load]);

  const handleWater = async () => {
    if (!selected || !residentId || watering) return;
    setWatering(true);
    const supabase = createClient();
    if (!supabase) { setWatering(false); return; }

    const newTotal = selected.total_water + 10;
    const newStage = stageFromWater(newTotal);

    await supabase
      .from('garden_plots')
      .update({
        total_water: newTotal,
        growth_stage: newStage,
        last_watered_at: new Date().toISOString(),
      })
      .eq('id', selected.id);

    // Award XP
    void supabase.rpc('award_xp', { p_resident_id: residentId, p_activity: 'haven_water', p_xp: 10 });

    setWatering(false);
    // Update local state
    const updated = { ...selected, total_water: newTotal, growth_stage: newStage as GardenPlot['growth_stage'] };
    setSelected(updated);
    setPlots(prev => prev.map(p => p.id === updated.id ? updated : p));
  };

  const handleAddPlant = async () => {
    if (!residentId || !newName.trim() || saving) return;
    setSaving(true);
    const supabase = createClient();
    await supabase?.from('garden_plots').upsert({
      resident_id: residentId,
      slot_index: addSlot,
      plant_type: newType,
      plant_name: newName.trim(),
      goal_text: newGoal.trim(),
      growth_stage: 0,
      total_water: 0,
    }, { onConflict: 'resident_id,slot_index' });
    setSaving(false);
    setShowAdd(false);
    setNewName('');
    setNewGoal('');
    if (residentId) await load(residentId);
  };

  const handleDeletePlot = async (id: string) => {
    const supabase = createClient();
    await supabase?.from('garden_plots').delete().eq('id', id);
    setSelected(null);
    if (residentId) await load(residentId);
  };

  const openAdd = (slot: number) => {
    setAddSlot(slot);
    setNewType('flower');
    setNewName('');
    setNewGoal('');
    setShowAdd(true);
  };

  // Build 6 slots
  const slots = Array.from({ length: 6 }, (_, i) => plots.find(p => p.slot_index === i) ?? null);

  // Perspective rows: back row slots 0-2 (smaller), front row 3-5 (larger)
  const backRow = slots.slice(0, 3);
  const frontRow = slots.slice(3, 6);

  const accent = selected ? PLANT_ACCENTS[selected.plant_type] : '#10B981';
  const nextThreshold = selected
    ? WATER_THRESHOLDS[Math.min(selected.growth_stage + 1, 4)] ?? 200
    : 200;
  const waterProgress = selected
    ? Math.min((selected.total_water / nextThreshold) * 100, 100)
    : 0;

  return (
    <div
      className="relative min-h-screen overflow-hidden flex flex-col"
      style={{ background: ambient.sky, transition: 'background 2s ease', color: ambient.textColor }}
    >
      {/* Header */}
      <div className="relative z-10 flex items-center justify-between px-5 pt-12 pb-4">
        <button
          type="button"
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm font-semibold opacity-80 hover:opacity-100 transition-opacity"
          style={{ color: ambient.textColor }}
        >
          <ChevronLeft className="h-5 w-5" />
          Tilbage
        </button>
        <div className="text-center">
          <h1 className="text-xl font-black tracking-tight">Min Have 🌿</h1>
          <p className="text-xs opacity-60 capitalize">{ambient.label}</p>
        </div>
        <div className="w-16" />
      </div>

      {/* Garden scene */}
      <div className="relative flex-1 flex flex-col justify-end" style={{ minHeight: '60vh' }}>
        {/* Horizon glow */}
        <div
          className="absolute left-0 right-0 h-24 pointer-events-none"
          style={{
            bottom: '35%',
            background: `radial-gradient(ellipse 80% 50% at 50% 100%, ${ambient.horizon}44 0%, transparent 100%)`,
            transition: 'background 2s ease',
          }}
        />

        {/* Ground */}
        <div
          className="relative px-4 pb-6 pt-4"
          style={{
            background: `linear-gradient(180deg, ${ambient.ground}00 0%, ${ambient.ground} 30%)`,
            transition: 'background 2s ease',
          }}
        >
          {/* Back row */}
          <div className="flex justify-around items-end mb-2 px-4">
            {backRow.map((plot, i) => (
              <PlotSlot
                key={`back-${i}`}
                plot={plot}
                size="sm"
                onClick={() => plot ? setSelected(plot) : openAdd(i)}
                ambient={ambient}
              />
            ))}
          </div>
          {/* Front row */}
          <div className="flex justify-around items-end px-0">
            {frontRow.map((plot, i) => (
              <PlotSlot
                key={`front-${i}`}
                plot={plot}
                size="lg"
                onClick={() => plot ? setSelected(plot) : openAdd(i + 3)}
                ambient={ambient}
              />
            ))}
          </div>
        </div>
      </div>

      {/* FAB */}
      <button
        type="button"
        onClick={() => openAdd(slots.findIndex(s => s === null))}
        disabled={slots.every(s => s !== null)}
        className="fixed right-5 z-20 flex h-14 w-14 items-center justify-center rounded-full text-white shadow-2xl transition-all duration-200 active:scale-90 disabled:opacity-30"
        style={{
          bottom: 'calc(1.5rem + env(safe-area-inset-bottom, 0px))',
          background: 'linear-gradient(135deg, #10B981, #059669)',
          boxShadow: '0 8px 32px rgba(16,185,129,0.5)',
        }}
        aria-label="Tilføj plante"
      >
        <Plus className="h-7 w-7" />
      </button>

      {/* Detail panel */}
      {selected && (
        <PlotDetailPanel
          plot={selected}
          onClose={() => setSelected(null)}
          onWater={handleWater}
          onDelete={handleDeletePlot}
          watering={watering}
          waterProgress={waterProgress}
          nextThreshold={nextThreshold}
          accent={accent}
        />
      )}

      {/* Add plant modal */}
      {showAdd && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60"
          onClick={e => { if (e.target === e.currentTarget) setShowAdd(false); }}
        >
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-gray-900">Tilføj plante</h3>
              <button type="button" onClick={() => setShowAdd(false)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Type picker */}
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-gray-500 mb-2">Type</p>
              <div className="grid grid-cols-5 gap-2">
                {(Object.keys(PLANT_LABELS) as PlantType[]).map(t => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setNewType(t)}
                    className="flex flex-col items-center gap-1 rounded-2xl py-3 transition-all duration-150"
                    style={{
                      backgroundColor: newType === t ? `${PLANT_ACCENTS[t]}18` : '#f9fafb',
                      border: `2px solid ${newType === t ? PLANT_ACCENTS[t] : '#e5e7eb'}`,
                    }}
                  >
                    <div className="w-10 h-10">
                      <PlantSvg type={t} stage={2} />
                    </div>
                    <span className="text-[10px] font-bold text-gray-600">{PLANT_LABELS[t]}</span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wide text-gray-500 block mb-1">Navn på din plante</label>
              <input
                type="text"
                value={newName}
                onChange={e => setNewName(e.target.value)}
                placeholder={`F.eks. "Min ${PLANT_LABELS[newType].toLowerCase()}"…`}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-green-400"
                autoFocus
              />
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wide text-gray-500 block mb-1">
                Hvad vil du arbejde på? <span className="normal-case text-gray-400">(valgfri)</span>
              </label>
              <input
                type="text"
                value={newGoal}
                onChange={e => setNewGoal(e.target.value)}
                placeholder={'F.eks. \u201cMere ro i hverdagen\u201d\u2026'}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-green-400"
              />
            </div>

            <p className="text-xs text-gray-400 bg-green-50 border border-green-100 rounded-xl p-3">
              Vand din plante for at se den vokse. Hvert vand giver 10 XP og rykker din plante nærmere fuld blomstring.
            </p>

            <div className="flex gap-2 pt-1">
              <button
                type="button"
                onClick={() => setShowAdd(false)}
                className="flex-1 rounded-xl border border-gray-200 py-3 text-sm font-medium text-gray-600"
              >
                Annuller
              </button>
              <button
                type="button"
                onClick={() => void handleAddPlant()}
                disabled={!newName.trim() || saving}
                className="flex-1 rounded-xl py-3 text-sm font-bold text-white disabled:opacity-40"
                style={{ background: `linear-gradient(135deg, ${PLANT_ACCENTS[newType]}, ${PLANT_ACCENTS[newType]}bb)` }}
              >
                {saving ? 'Planter…' : 'Plant den!'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── PlotSlot ──────────────────────────────────────────────────────────────────

function PlotSlot({
  plot,
  size,
  onClick,
  ambient,
}: {
  plot: GardenPlot | null;
  size: 'sm' | 'lg';
  onClick: () => void;
  ambient: AmbientPeriod;
}) {
  const dim = size === 'sm' ? 'w-20 h-20' : 'w-28 h-28';
  const moundW = size === 'sm' ? 72 : 96;
  const moundH = size === 'sm' ? 14 : 18;

  return (
    <div className="flex flex-col items-center" style={{ filter: size === 'sm' ? 'brightness(0.85)' : 'none' }}>
      <button
        type="button"
        onClick={onClick}
        className={`${dim} relative flex items-end justify-center transition-transform duration-150 active:scale-95`}
        aria-label={plot ? plot.plant_name : 'Tom planteplads'}
      >
        {plot ? (
          <>
            <div className="absolute inset-0 flex items-end justify-center pb-1">
              <PlantSvg type={plot.plant_type} stage={plot.growth_stage} />
            </div>
            {/* Water drop indicator */}
            <div
              className="absolute top-0 right-0 h-5 w-5 rounded-full flex items-center justify-center text-white"
              style={{ background: PLANT_ACCENTS[plot.plant_type], fontSize: 9, fontWeight: 'bold' }}
            >
              {plot.growth_stage + 1}
            </div>
          </>
        ) : (
          <div
            className="w-full h-full rounded-2xl flex items-center justify-center border-2 border-dashed"
            style={{
              borderColor: `${ambient.textColor}30`,
              backgroundColor: `${ambient.textColor}08`,
            }}
          >
            <Plus className="h-5 w-5 opacity-40" style={{ color: ambient.textColor }} />
          </div>
        )}
      </button>
      {/* Mound */}
      <svg
        width={moundW}
        height={moundH}
        viewBox={`0 0 ${moundW} ${moundH}`}
        fill="none"
        className="-mt-1"
        style={{ overflow: 'visible' }}
      >
        <ellipse cx={moundW / 2} cy={moundH / 2} rx={moundW / 2} ry={moundH / 2}
          fill={ambient.ground} />
        <ellipse cx={moundW / 2} cy={moundH / 2 - 2} rx={moundW / 2 - 4} ry={moundH / 2 - 2}
          fill={`${ambient.ground}88`} />
      </svg>
      {plot && (
        <p
          className="text-[10px] font-semibold mt-0.5 max-w-[80px] text-center truncate opacity-80"
          style={{ color: ambient.textColor }}
        >
          {plot.plant_name}
        </p>
      )}
    </div>
  );
}

// ── PlotDetailPanel ───────────────────────────────────────────────────────────

function PlotDetailPanel({
  plot,
  onClose,
  onWater,
  onDelete,
  watering,
  waterProgress,
  nextThreshold,
  accent,
}: {
  plot: GardenPlot;
  onClose: () => void;
  onWater: () => void;
  onDelete: (id: string) => void;
  watering: boolean;
  waterProgress: number;
  nextThreshold: number;
  accent: string;
}) {
  const stageLabel = STAGE_LABELS[plot.growth_stage] ?? '';
  const isFull = plot.growth_stage === 4;
  const waterNeeded = Math.max(0, nextThreshold - plot.total_water);

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 rounded-t-3xl bg-white shadow-2xl"
      style={{ maxHeight: '70vh', overflowY: 'auto', paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom, 0px))' }}
    >
      {/* Drag handle */}
      <div className="flex justify-center pt-3 pb-1">
        <div className="w-10 h-1 rounded-full bg-gray-200" />
      </div>

      <div className="px-6 pb-4">
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-5">
          <div className="flex items-center gap-3">
            <div
              className="w-14 h-14 rounded-2xl flex items-center justify-center"
              style={{ backgroundColor: `${accent}18` }}
            >
              <div className="w-10 h-10">
                <PlantSvg type={plot.plant_type} stage={plot.growth_stage} />
              </div>
            </div>
            <div>
              <h2 className="text-xl font-black text-gray-900">{plot.plant_name}</h2>
              <p className="text-sm text-gray-500">{PLANT_LABELS[plot.plant_type]} · {stageLabel}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="text-gray-400 hover:text-gray-600 mt-1">
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Goal */}
        {plot.goal_text && (
          <div
            className="rounded-2xl px-4 py-3 mb-4"
            style={{ backgroundColor: `${accent}10`, border: `1px solid ${accent}22` }}
          >
            <p className="text-xs font-bold uppercase tracking-wide mb-1" style={{ color: accent }}>Mit mål</p>
            <p className="text-sm text-gray-700">{plot.goal_text}</p>
          </div>
        )}

        {/* Growth progress */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-xs font-bold text-gray-500">Vækst mod næste trin</p>
            {!isFull && (
              <p className="text-xs text-gray-400">{waterNeeded} vand tilbage</p>
            )}
          </div>
          {isFull ? (
            <p className="text-sm font-bold" style={{ color: accent }}>🌳 Fuldt vokset!</p>
          ) : (
            <div className="h-3 rounded-full bg-gray-100 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${waterProgress}%`, background: `linear-gradient(90deg, ${accent}, ${accent}bb)` }}
              />
            </div>
          )}
          <div className="flex justify-between mt-1.5">
            {STAGE_LABELS.map((l, i) => (
              <span
                key={i}
                className="text-[9px] font-semibold"
                style={{ color: i <= plot.growth_stage ? accent : '#d1d5db' }}
              >
                {l.split(' ')[1]}
              </span>
            ))}
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          <div className="rounded-2xl bg-gray-50 px-4 py-3">
            <p className="text-xs text-gray-400 mb-0.5">Vand i alt</p>
            <p className="text-xl font-black text-gray-800">{plot.total_water} 💧</p>
          </div>
          <div className="rounded-2xl bg-gray-50 px-4 py-3">
            <p className="text-xs text-gray-400 mb-0.5">Sidst vandet</p>
            <p className="text-sm font-bold text-gray-800">
              {plot.last_watered_at
                ? new Date(plot.last_watered_at).toLocaleDateString('da-DK', { day: 'numeric', month: 'short' })
                : 'Aldrig'}
            </p>
          </div>
        </div>

        {/* Water button */}
        <button
          type="button"
          onClick={onWater}
          disabled={watering || isFull}
          className="w-full flex items-center justify-center gap-2 rounded-2xl py-4 text-base font-bold text-white transition-all duration-200 active:scale-[0.98] disabled:opacity-40 mb-3"
          style={{
            background: `linear-gradient(135deg, ${accent}, ${accent}cc)`,
            boxShadow: `0 8px 24px ${accent}40`,
          }}
        >
          <Droplets className="h-5 w-5" />
          {watering ? 'Vander…' : isFull ? 'Fuldt vokset 🌳' : 'Vand planten (+10 XP)'}
        </button>

        <button
          type="button"
          onClick={() => void onDelete(plot.id)}
          className="w-full py-3 text-sm font-medium text-red-400 hover:text-red-600 transition-colors"
        >
          Fjern plante
        </button>
      </div>
    </div>
  );
}
