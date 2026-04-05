'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Plus, X, Droplets, ChevronLeft, Sparkles } from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import { useResidentSession } from '@/hooks/useResidentSession';
import * as dataService from '@/lib/dataService';
import {
  getWaterCredits,
  consumeWaterCredit,
  HAVEN_WATER_CREDITS_EVENT,
} from '@/lib/havenWaterCredits';
import { HavenGardenScene } from '@/components/haven/HavenGardenScene';
import { HavenPlantSvg } from '@/components/haven/HavenPlantSvg';
import { HavenShareMoment } from '@/components/haven/HavenShareMoment';
import { HavenStyleStudio } from '@/components/haven/HavenStyleStudio';
import { HavenTopHud } from '@/components/haven/HavenTopHud';
import {
  getHavenAmbientPeriod,
  HAVEN_PLANT_ACCENTS,
  HAVEN_PLANT_LABELS,
  HAVEN_STAGE_LABELS,
  HAVEN_WATER_THRESHOLDS,
} from '@/components/haven/havenConstants';
import type { HavenAmbientPeriod } from '@/components/haven/havenConstants';
import type { HavenPlantType } from '@/components/haven/havenConstants';
import {
  HAVEN_DEFAULT_CUSTOMIZATION,
  havenFrameClass,
  loadHavenCustomization,
  resolveHavenSkyGradient,
  type HavenCustomization,
} from '@/lib/havenCustomization';
import {
  computeHavenQuests,
  gardenerTitleForLevel,
  markWateredToday,
  readHavenStreak,
  registerHavenWaterStreak,
  xpToNextLevel,
} from '@/lib/havenGamification';
import {
  syncBadgesAfterGardenPlots,
  syncBadgesAfterHavenWaterStreak,
} from '@/lib/residentBadgeSync';
import type { XpData } from '@/types/local';

// ── Types ─────────────────────────────────────────────────────────────────────

type GardenPlot = {
  id: string;
  resident_id: string;
  slot_index: number;
  plant_type: HavenPlantType;
  plant_name: string;
  goal_text: string;
  growth_stage: 0 | 1 | 2 | 3 | 4;
  total_water: number;
  last_watered_at: string | null;
};

function stageFromWater(w: number): 0 | 1 | 2 | 3 | 4 {
  if (w >= 200) return 4;
  if (w >= 120) return 3;
  if (w >= 60) return 2;
  if (w >= 20) return 1;
  return 0;
}

// ── Main component ────────────────────────────────────────────────────────────

export default function HavenPage() {
  return (
    <React.Suspense>
      <HavenView />
    </React.Suspense>
  );
}

function HavenView() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const session = useResidentSession();

  const [plots, setPlots] = useState<GardenPlot[]>([]);
  const [ambient, setAmbient] = useState<HavenAmbientPeriod>(() =>
    getHavenAmbientPeriod(new Date().getHours())
  );
  const [selected, setSelected] = useState<GardenPlot | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [addSlot, setAddSlot] = useState<number>(0);
  const [watering, setWatering] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const [waterPulseSlot, setWaterPulseSlot] = useState<number | null>(null);
  const [waterCredits, setWaterCredits] = useState(0);

  // Add modal state
  const [newType, setNewType] = useState<HavenPlantType>('flower');
  const [newName, setNewName] = useState('');
  const [newGoal, setNewGoal] = useState('');
  const [saving, setSaving] = useState(false);
  const [addError, setAddError] = useState<string | null>(null);

  const [havenStyle, setHavenStyle] = useState<HavenCustomization>(() => ({
    ...HAVEN_DEFAULT_CUSTOMIZATION,
  }));
  const [styleOpen, setStyleOpen] = useState(false);
  const [shareOpen, setShareOpen] = useState(false);
  const [xpData, setXpData] = useState<XpData>({ total_xp: 0, level: 1 });
  const [streakDays, setStreakDays] = useState(0);
  const [shareNickname, setShareNickname] = useState('Jeg');

  // Resolve activeId: URL param wins (passed from LysHome), then session.
  // Treat empty-string param (?r=) the same as no param — it means guest mode.
  const rawParam = searchParams.get('r');
  const paramId = rawParam || null; // '' → null
  const activeId = paramId ?? session.activeId;
  const mode: 'supabase' | 'local' = paramId
    ? typeof document !== 'undefined' && document.cookie.includes('budr_resident_id')
      ? 'supabase'
      : 'local'
    : session.storageMode;

  // Ambient timer
  const ambientRef = useRef<ReturnType<typeof setInterval> | null>(null);
  useEffect(() => {
    ambientRef.current = setInterval(() => {
      setAmbient(getHavenAmbientPeriod(new Date().getHours()));
    }, 60_000);
    return () => {
      if (ambientRef.current) clearInterval(ambientRef.current);
    };
  }, []);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const on = () => setReducedMotion(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);

  const load = useCallback(async () => {
    if (!activeId) return;
    try {
      const data = await dataService.getGardenPlots(mode, activeId);
      setPlots(data as GardenPlot[]);
    } catch {
      setPlots([]);
    }
  }, [activeId, mode]);

  useEffect(() => {
    if (activeId) void load();
  }, [activeId, load]);

  useEffect(() => {
    if (!activeId) return;
    setHavenStyle(loadHavenCustomization(activeId));
    setStreakDays(readHavenStreak(activeId).days);
  }, [activeId]);

  const refreshProgress = useCallback(async () => {
    if (!activeId) return;
    const [xp, profile] = await Promise.all([
      dataService.getXp(mode, activeId),
      dataService.getProfile(mode, activeId),
    ]);
    setXpData(xp);
    const nick = profile.nickname?.trim();
    setShareNickname(nick && nick.length > 0 ? nick : 'Jeg');
  }, [activeId, mode]);

  useEffect(() => {
    void refreshProgress();
  }, [activeId, load, refreshProgress]);

  const refreshWaterCredits = useCallback(() => {
    if (!activeId) {
      setWaterCredits(0);
      return;
    }
    setWaterCredits(getWaterCredits(activeId));
  }, [activeId]);

  useEffect(() => {
    refreshWaterCredits();
  }, [refreshWaterCredits]);

  useEffect(() => {
    const onBankChange = () => refreshWaterCredits();
    window.addEventListener(HAVEN_WATER_CREDITS_EVENT, onBankChange);
    window.addEventListener('storage', onBankChange);
    return () => {
      window.removeEventListener(HAVEN_WATER_CREDITS_EVENT, onBankChange);
      window.removeEventListener('storage', onBankChange);
    };
  }, [refreshWaterCredits]);

  const handleWater = async () => {
    if (!selected || !activeId || watering) return;
    if (getWaterCredits(activeId) < 1) {
      toast.message('Ingen vand lige nu', {
        description:
          'Fuldfør opgaver under Din dag i Lys — hver fuldført opgave giver ét vand til haven.',
      });
      return;
    }
    setWatering(true);

    const newTotal = selected.total_water + 10;
    const newStage = stageFromWater(newTotal);

    try {
      await dataService.updatePlot(mode, activeId, selected.id, {
        total_water: newTotal,
        growth_stage: newStage,
        last_watered_at: new Date().toISOString(),
      });
      await dataService.addXp(mode, activeId, 'haven_water', 10);
      consumeWaterCredit(activeId);
      refreshWaterCredits();

      markWateredToday(activeId);
      const st = registerHavenWaterStreak(activeId);
      setStreakDays(st.days);
      void syncBadgesAfterHavenWaterStreak(mode, activeId, st.days);
      void refreshProgress();

      if (newStage === 4) {
        try {
          const badges = await dataService.getBadges(mode, activeId);
          if (!badges.some((b) => b.badge_key === 'haven_full_bloom')) {
            await dataService.earnBadge(mode, activeId, 'haven_full_bloom');
            toast.success('🏆 Badge: Fuld blomst!', {
              description: 'Del dit øjeblik — du har groet noget helt ud.',
            });
          }
        } catch {
          /* badge-tabeller kan mangle i ældre miljøer */
        }
      }

      setWaterPulseSlot(selected.slot_index);
      window.setTimeout(() => setWaterPulseSlot(null), 1000);
      const updated = {
        ...selected,
        total_water: newTotal,
        growth_stage: newStage as GardenPlot['growth_stage'],
      };
      setSelected(updated);
      setPlots((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
    } catch {
      toast.error('Kunne ikke gemme vanding — prøv igen');
    } finally {
      setWatering(false);
    }
  };

  const handleAddPlant = async () => {
    if (!newName.trim() || saving) return;
    if (!activeId) {
      setAddError('Kunne ikke finde din profil. Prøv at gå tilbage og åbne haven igen.');
      return;
    }
    setSaving(true);
    setAddError(null);
    try {
      await dataService.savePlot(mode, activeId, {
        slot_index: addSlot,
        plant_type: newType,
        plant_name: newName.trim(),
        goal_text: newGoal.trim(),
        growth_stage: 0,
        total_water: 0,
        last_watered_at: null,
        is_park_linked: false,
      });
    } catch (e) {
      const detail = e instanceof Error ? e.message : '';
      setAddError(detail ? `Kunne ikke gemme planten. ${detail}` : 'Noget gik galt. Prøv igen.');
      setSaving(false);
      return;
    }
    setSaving(false);
    setShowAdd(false);
    setNewName('');
    setNewGoal('');
    setAddError(null);
    await load();
    try {
      const rows = await dataService.getGardenPlots(mode, activeId);
      void syncBadgesAfterGardenPlots(mode, activeId, rows.length);
    } catch {
      /* ignore */
    }
  };

  const handleDeletePlot = async (id: string) => {
    if (!activeId) return;
    await dataService.deletePlot(mode, activeId, id);
    setSelected(null);
    await load();
  };

  const openAdd = (slot: number) => {
    setAddSlot(slot);
    setNewType('flower');
    setNewName('');
    setNewGoal('');
    setAddError(null);
    setShowAdd(true);
  };

  // Build 6 slots
  const slots = Array.from({ length: 6 }, (_, i) => plots.find((p) => p.slot_index === i) ?? null);

  const scenePlots = plots.map((p) => ({
    id: p.id,
    slot_index: p.slot_index,
    plant_type: p.plant_type,
    plant_name: p.plant_name,
    growth_stage: p.growth_stage,
  }));

  const skyForScene = resolveHavenSkyGradient(havenStyle.skyMood, ambient);
  const frameClass = havenStyle.frame === 'none' ? '' : havenFrameClass(havenStyle.frame);
  const quests = computeHavenQuests(activeId ?? '', plots);
  const xpBar = xpToNextLevel(xpData.total_xp);
  const gardener = gardenerTitleForLevel(xpBar.level);
  const matureCount = plots.filter((p) => p.growth_stage >= 4).length;

  const accent = selected ? HAVEN_PLANT_ACCENTS[selected.plant_type] : '#10B981';
  const nextThreshold = selected
    ? (HAVEN_WATER_THRESHOLDS[Math.min(selected.growth_stage + 1, 4)] ?? 200)
    : 200;
  const waterProgress = selected ? Math.min((selected.total_water / nextThreshold) * 100, 100) : 0;

  return (
    <div
      className="relative min-h-screen overflow-hidden flex flex-col bg-[#0b1220]"
      style={{
        transition: 'background 2s ease',
      }}
    >
      {/* Header */}
      <div
        className="relative z-10 flex items-center justify-between px-5 pt-12 pb-4"
        style={{ background: 'linear-gradient(180deg, rgba(0,0,0,0.35) 0%, transparent 100%)' }}
      >
        <button
          type="button"
          onClick={() => router.back()}
          className="flex items-center gap-1.5 text-sm font-semibold text-white drop-shadow hover:opacity-80 transition-opacity"
        >
          <ChevronLeft className="h-5 w-5" />
          Tilbage
        </button>
        <div className="text-center">
          <h1 className="text-xl font-black tracking-tight text-white drop-shadow">Min Have 🌿</h1>
          <p className="text-xs text-white/70 capitalize">{ambient.label}</p>
        </div>
        <div className="w-16 flex justify-end">
          <span
            className="rounded-full bg-white/10 p-2 text-amber-200/90"
            title="Din have — dit udtryk"
          >
            <Sparkles className="h-4 w-4" aria-hidden />
          </span>
        </div>
      </div>

      {activeId && (
        <HavenTopHud
          gardenerTitle={gardener.title}
          gardenerSub={gardener.sub}
          level={xpBar.level}
          xpPct={xpBar.pct}
          totalXp={xpData.total_xp}
          nextXp={xpBar.next}
          streakDays={streakDays}
          waterCredits={waterCredits}
          quests={quests}
          onStyle={() => setStyleOpen(true)}
          onShare={() => setShareOpen(true)}
        />
      )}

      {/* Garden scene — altid rig atmosfære; animationer respekterer prefers-reduced-motion */}
      <div className="relative flex-1 px-3 pb-2" style={{ minHeight: '52vh' }}>
        <HavenGardenScene
          className="min-h-[52vh] shadow-xl"
          plots={scenePlots}
          ambient={ambient}
          showcase
          reducedMotion={reducedMotion}
          pulseSlotIndex={waterPulseSlot}
          skyBackgroundOverride={skyForScene}
          decorativeFrameClass={frameClass}
          showButterflies={havenStyle.butterflies}
          onSlotClick={(slot, plot) => {
            if (plot) {
              const full = plots.find((p) => p.id === plot.id) ?? null;
              if (full) setSelected(full);
            } else openAdd(slot);
          }}
        />
      </div>

      {/* FAB */}
      <button
        type="button"
        onClick={() => openAdd(slots.findIndex((s) => s === null))}
        disabled={slots.every((s) => s !== null) || !activeId}
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
          waterCredits={waterCredits}
        />
      )}

      {/* Add plant modal */}
      {showAdd && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowAdd(false);
          }}
        >
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-black text-gray-900">Tilføj plante</h3>
              <button
                type="button"
                onClick={() => setShowAdd(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Type picker */}
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-gray-700 mb-2">Type</p>
              <div className="grid grid-cols-5 gap-2">
                {(Object.keys(HAVEN_PLANT_LABELS) as HavenPlantType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setNewType(t)}
                    className="flex flex-col items-center gap-1 rounded-2xl py-3 transition-all duration-150"
                    style={{
                      backgroundColor: newType === t ? `${HAVEN_PLANT_ACCENTS[t]}18` : '#f9fafb',
                      border: `2px solid ${newType === t ? HAVEN_PLANT_ACCENTS[t] : '#e5e7eb'}`,
                    }}
                  >
                    <div className="w-10 h-10">
                      <HavenPlantSvg type={t} stage={2} />
                    </div>
                    <span className="text-[10px] font-bold text-gray-600">
                      {HAVEN_PLANT_LABELS[t]}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wide text-gray-700 block mb-1">
                Navn på din plante
              </label>
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder={`F.eks. "Min ${HAVEN_PLANT_LABELS[newType].toLowerCase()}"…`}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-green-400"
                autoFocus
              />
            </div>

            <div>
              <label className="text-xs font-bold uppercase tracking-wide text-gray-700 block mb-1">
                Hvad vil du arbejde på? <span className="normal-case text-gray-500">(valgfri)</span>
              </label>
              <input
                type="text"
                value={newGoal}
                onChange={(e) => setNewGoal(e.target.value)}
                placeholder={'F.eks. \u201cMere ro i hverdagen\u201d\u2026'}
                className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-green-400"
              />
            </div>

            <p className="text-xs text-gray-600 bg-green-50 border border-green-200 rounded-xl p-3">
              Du får <strong>ét vand</strong> hver gang du fuldfører en opgave på{' '}
              <strong>Din dag</strong> i Lys. Brug vandet her for at vokse planten og optjene XP —
              det er ikke et ubegrænset tryk.
            </p>

            {addError && (
              <p className="text-sm font-semibold text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
                {addError}
              </p>
            )}

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
                style={{
                  background: `linear-gradient(135deg, ${HAVEN_PLANT_ACCENTS[newType]}, ${HAVEN_PLANT_ACCENTS[newType]}bb)`,
                }}
              >
                {saving ? 'Planter…' : 'Plant den!'}
              </button>
            </div>
          </div>
        </div>
      )}

      {activeId && (
        <>
          <HavenStyleStudio
            open={styleOpen}
            onClose={() => setStyleOpen(false)}
            residentId={activeId}
            value={havenStyle}
            onApply={setHavenStyle}
          />
          <HavenShareMoment
            open={shareOpen}
            onClose={() => setShareOpen(false)}
            displayName={shareNickname}
            vibeLine={havenStyle.vibeLine}
            plantCount={plots.length}
            maturePlants={matureCount}
            streakDays={streakDays}
            gardenerTitle={gardener.title}
            level={xpBar.level}
            totalXp={xpData.total_xp}
          />
        </>
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
  waterCredits,
}: {
  plot: GardenPlot;
  onClose: () => void;
  onWater: () => void;
  onDelete: (id: string) => void;
  watering: boolean;
  waterProgress: number;
  nextThreshold: number;
  accent: string;
  waterCredits: number;
}) {
  const stageLabel = HAVEN_STAGE_LABELS[plot.growth_stage] ?? '';
  const isFull = plot.growth_stage === 4;
  const waterNeeded = Math.max(0, nextThreshold - plot.total_water);

  return (
    <div
      className="fixed inset-x-0 bottom-0 z-40 rounded-t-3xl bg-white shadow-2xl"
      style={{
        maxHeight: '70vh',
        overflowY: 'auto',
        paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom, 0px))',
      }}
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
                <HavenPlantSvg type={plot.plant_type} stage={plot.growth_stage} />
              </div>
            </div>
            <div>
              <h2 className="text-xl font-black text-gray-900">{plot.plant_name}</h2>
              <p className="text-sm font-medium text-gray-600">
                {HAVEN_PLANT_LABELS[plot.plant_type]} · {stageLabel}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 mt-1"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Goal */}
        {plot.goal_text && (
          <div
            className="rounded-2xl px-4 py-3 mb-4"
            style={{ backgroundColor: `${accent}10`, border: `1px solid ${accent}22` }}
          >
            <p className="text-xs font-bold uppercase tracking-wide mb-1" style={{ color: accent }}>
              Mit mål
            </p>
            <p className="text-sm text-gray-700">{plot.goal_text}</p>
          </div>
        )}

        {/* Growth progress */}
        <div className="mb-5">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-xs font-bold text-gray-700">Vækst mod næste trin</p>
            {!isFull && <p className="text-xs text-gray-600">{waterNeeded} vand tilbage</p>}
          </div>
          {isFull ? (
            <p className="text-sm font-bold" style={{ color: accent }}>
              🌳 Fuldt vokset!
            </p>
          ) : (
            <div className="h-3 rounded-full bg-gray-100 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{
                  width: `${waterProgress}%`,
                  background: `linear-gradient(90deg, ${accent}, ${accent}bb)`,
                }}
              />
            </div>
          )}
          <div className="flex justify-between mt-1.5">
            {HAVEN_STAGE_LABELS.map((l, i) => (
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
            <p className="text-xs text-gray-600 font-medium mb-0.5">Vand i alt</p>
            <p className="text-xl font-black text-gray-800">{plot.total_water} 💧</p>
          </div>
          <div className="rounded-2xl bg-gray-50 px-4 py-3">
            <p className="text-xs text-gray-600 font-medium mb-0.5">Sidst vandet</p>
            <p className="text-sm font-bold text-gray-800">
              {plot.last_watered_at
                ? new Date(plot.last_watered_at).toLocaleDateString('da-DK', {
                    day: 'numeric',
                    month: 'short',
                  })
                : 'Aldrig'}
            </p>
          </div>
        </div>

        {!isFull && (
          <p className="mb-2 text-center text-xs text-gray-600">
            {waterCredits > 0 ? (
              <>
                {waterCredits === 1 ? (
                  <>
                    Du har <strong className="text-gray-900">ét vand</strong> tilbage
                  </>
                ) : (
                  <>
                    Du har <strong className="text-gray-900">{waterCredits}</strong> vand tilbage
                  </>
                )}{' '}
                fra dagens opgaver · ét bruges pr. vanding
              </>
            ) : (
              <>
                <strong className="text-amber-700">Ingen vand tilbage.</strong> Gå til{' '}
                <strong>Din dag</strong> i Lys og fuldfør opgaver for at tjene vand.
              </>
            )}
          </p>
        )}

        {/* Water button — forbruger ét "vand" fra opgave-banken (ikke ubegrænset) */}
        <button
          type="button"
          onClick={onWater}
          disabled={watering || isFull || waterCredits < 1}
          className="w-full flex items-center justify-center gap-2 rounded-2xl py-4 text-base font-bold text-white transition-all duration-200 active:scale-[0.98] disabled:opacity-40 mb-3"
          style={{
            background: `linear-gradient(135deg, ${accent}, ${accent}cc)`,
            boxShadow: `0 8px 24px ${accent}40`,
          }}
        >
          <Droplets className="h-5 w-5" />
          {watering
            ? 'Vander…'
            : isFull
              ? 'Fuldt vokset 🌳'
              : waterCredits < 1
                ? 'Fuldfør opgaver for at få vand'
                : 'Brug vand (+10 XP)'}
        </button>

        <button
          type="button"
          onClick={() => void onDelete(plot.id)}
          className="w-full py-3 text-sm font-semibold text-red-500 hover:text-red-700 transition-colors"
        >
          Fjern plante
        </button>
      </div>
    </div>
  );
}
