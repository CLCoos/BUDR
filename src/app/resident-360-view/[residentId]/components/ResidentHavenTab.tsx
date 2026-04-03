'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import TreePlant from '@/components/haven/plants/TreePlant';
import FlowerPlant from '@/components/haven/plants/FlowerPlant';
import HerbPlant from '@/components/haven/plants/HerbPlant';
import BushPlant from '@/components/haven/plants/BushPlant';
import VegetablePlant from '@/components/haven/plants/VegetablePlant';

type PlantType = 'tree' | 'flower' | 'herb' | 'bush' | 'vegetable';

type GardenPlot = {
  id: string;
  slot_index: number;
  plant_type: PlantType;
  plant_name: string;
  goal_text: string;
  growth_stage: 0 | 1 | 2 | 3 | 4;
  total_water: number;
  last_watered_at: string | null;
};

const PLANT_ACCENTS: Record<PlantType, string> = {
  tree: '#1D9E75',
  flower: '#F59E0B',
  herb: '#10B981',
  bush: '#7F77DD',
  vegetable: '#EF4444',
};

const PLANT_LABELS: Record<PlantType, string> = {
  tree: 'Træ',
  flower: 'Blomst',
  herb: 'Urt',
  bush: 'Busk',
  vegetable: 'Grøntsag',
};

const STAGE_LABELS = ['Frø 🌱', 'Spire 🌿', 'Ung 🌾', 'Moden 🌸', 'Fuld 🌳'];
const WATER_THRESHOLDS = [0, 20, 60, 120, 200];

function PlantSvg({ type, stage }: { type: PlantType; stage: 0 | 1 | 2 | 3 | 4 }) {
  const accent = PLANT_ACCENTS[type];
  switch (type) {
    case 'tree':
      return <TreePlant stage={stage} accent={accent} />;
    case 'flower':
      return <FlowerPlant stage={stage} accent={accent} />;
    case 'herb':
      return <HerbPlant stage={stage} accent={accent} />;
    case 'bush':
      return <BushPlant stage={stage} accent={accent} />;
    case 'vegetable':
      return <VegetablePlant stage={stage} accent={accent} />;
  }
}

type Props = { residentId: string; residentName: string };

export default function ResidentHavenTab({ residentId, residentName }: Props) {
  const [plots, setPlots] = useState<GardenPlot[] | null>(null);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;
    supabase
      .from('garden_plots')
      .select(
        'id, slot_index, plant_type, plant_name, goal_text, growth_stage, total_water, last_watered_at'
      )
      .eq('resident_id', residentId)
      .order('slot_index')
      .then(
        ({ data }) => setPlots((data ?? []) as GardenPlot[]),
        () => setPlots([])
      );
  }, [residentId]);

  if (plots === null) {
    return <div className="py-12 text-center text-gray-400 text-sm">Indlæser have…</div>;
  }

  if (plots.length === 0) {
    return (
      <div className="rounded-2xl border-2 border-dashed border-gray-200 py-16 text-center">
        <p className="text-3xl mb-3">🌱</p>
        <p className="text-gray-500 font-semibold">
          {residentName.split(' ')[0]} har ikke plantet noget endnu
        </p>
        <p className="text-gray-400 text-sm mt-1">Haven vises her, når borgeren tilføjer planter</p>
      </div>
    );
  }

  // Build 6 slots
  const slots = Array.from({ length: 6 }, (_, i) => plots.find((p) => p.slot_index === i) ?? null);

  return (
    <div className="space-y-6">
      {/* Mini garden overview */}
      <div
        className="rounded-3xl p-6 overflow-hidden relative"
        style={{
          background: 'linear-gradient(180deg, #38bdf8 0%, #7dd3fc 40%, #86efac 70%, #166534 100%)',
          minHeight: 200,
        }}
      >
        <p className="text-white/70 text-xs font-bold uppercase tracking-wide mb-4">
          {residentName.split(' ')[0]}s have
        </p>
        {/* Back row */}
        <div className="flex justify-around items-end mb-2 px-8">
          {slots.slice(0, 3).map((plot, i) => (
            <div
              key={`b${i}`}
              className="flex flex-col items-center"
              style={{ filter: 'brightness(0.85)' }}
            >
              <div className="w-16 h-16">
                {plot ? (
                  <PlantSvg type={plot.plant_type} stage={plot.growth_stage} />
                ) : (
                  <div className="w-full h-full rounded-xl border-2 border-dashed border-white/30 flex items-center justify-center text-white/40 text-xl">
                    +
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
        {/* Front row */}
        <div className="flex justify-around items-end px-2">
          {slots.slice(3, 6).map((plot, i) => (
            <div key={`f${i}`} className="flex flex-col items-center">
              <div className="w-20 h-20">
                {plot ? (
                  <PlantSvg type={plot.plant_type} stage={plot.growth_stage} />
                ) : (
                  <div className="w-full h-full rounded-xl border-2 border-dashed border-white/30 flex items-center justify-center text-white/40 text-2xl">
                    +
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Plant list */}
      <div>
        <h2 className="text-base font-bold text-gray-800 mb-3">Planter ({plots.length})</h2>
        <div className="space-y-3">
          {plots.map((plot) => {
            const accent = PLANT_ACCENTS[plot.plant_type];
            const nextThreshold = WATER_THRESHOLDS[Math.min(plot.growth_stage + 1, 4)] ?? 200;
            const progress =
              plot.growth_stage === 4
                ? 100
                : Math.min((plot.total_water / nextThreshold) * 100, 100);

            return (
              <div
                key={plot.id}
                className="flex items-start gap-4 rounded-2xl border border-gray-100 bg-white p-4 shadow-sm"
              >
                <div
                  className="w-14 h-14 shrink-0 rounded-xl flex items-end justify-center overflow-hidden pb-0.5"
                  style={{ backgroundColor: `${accent}14` }}
                >
                  <PlantSvg type={plot.plant_type} stage={plot.growth_stage} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <p className="text-sm font-bold text-gray-800">{plot.plant_name}</p>
                    <span
                      className="text-[10px] font-bold rounded-full px-2 py-0.5"
                      style={{ backgroundColor: `${accent}18`, color: accent }}
                    >
                      {PLANT_LABELS[plot.plant_type]}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mb-2">
                    {STAGE_LABELS[plot.growth_stage]} · {plot.total_water} 💧 i alt
                    {plot.last_watered_at && (
                      <>
                        {' '}
                        · Sidst{' '}
                        {new Date(plot.last_watered_at).toLocaleDateString('da-DK', {
                          day: 'numeric',
                          month: 'short',
                        })}
                      </>
                    )}
                  </p>
                  {plot.goal_text && (
                    <p className="text-xs text-gray-500 italic mb-2">«{plot.goal_text}»</p>
                  )}
                  {/* Progress bar */}
                  <div className="h-2 rounded-full bg-gray-100 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-700"
                      style={{
                        width: `${progress}%`,
                        background: `linear-gradient(90deg, ${accent}, ${accent}bb)`,
                      }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
