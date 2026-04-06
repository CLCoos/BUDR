'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { HavenGardenScene } from '@/components/haven/HavenGardenScene';
import { HavenPlantSvg } from '@/components/haven/HavenPlantSvg';
import {
  getHavenAmbientPeriod,
  HAVEN_PLANT_ACCENTS,
  HAVEN_PLANT_LABELS,
  HAVEN_STAGE_LABELS,
  HAVEN_WATER_THRESHOLDS,
} from '@/components/haven/havenConstants';
import type { HavenPlantType } from '@/components/haven/havenConstants';

type GardenPlot = {
  id: string;
  slot_index: number;
  plant_type: HavenPlantType;
  plant_name: string;
  goal_text: string;
  growth_stage: 0 | 1 | 2 | 3 | 4;
  total_water: number;
  last_watered_at: string | null;
};

type Props = { residentId: string; residentName: string };

export default function ResidentHavenTab({ residentId, residentName }: Props) {
  const [plots, setPlots] = useState<GardenPlot[] | null>(null);
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setReducedMotion(mq.matches);
    const on = () => setReducedMotion(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);

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
        <p className="text-gray-400 text-sm mt-1">
          Haven vises her, når borgeren tilføjer planter i Lys
        </p>
      </div>
    );
  }

  const scenePlots = plots.map((p) => ({
    id: p.id,
    slot_index: p.slot_index,
    plant_type: p.plant_type,
    plant_name: p.plant_name,
    growth_stage: p.growth_stage,
  }));

  return (
    <div className="space-y-6">
      <HavenGardenScene
        plots={scenePlots}
        ambient={getHavenAmbientPeriod(new Date().getHours())}
        showcase
        reducedMotion={reducedMotion}
        compact
        title={`${residentName.split(' ')[0]}s have`}
        subtitle="Som borgeren ser den i Lys"
      />

      <div>
        <h2 className="text-base font-bold text-gray-800 mb-3">Planter ({plots.length})</h2>
        <div className="space-y-3">
          {plots.map((plot) => {
            const accent = HAVEN_PLANT_ACCENTS[plot.plant_type];
            const nextThreshold = HAVEN_WATER_THRESHOLDS[Math.min(plot.growth_stage + 1, 4)] ?? 200;
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
                  <HavenPlantSvg type={plot.plant_type} stage={plot.growth_stage} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-0.5">
                    <p className="text-sm font-bold text-gray-800">{plot.plant_name}</p>
                    <span
                      className="text-[10px] font-bold rounded-full px-2 py-0.5"
                      style={{ backgroundColor: `${accent}18`, color: accent }}
                    >
                      {HAVEN_PLANT_LABELS[plot.plant_type]}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mb-2">
                    {HAVEN_STAGE_LABELS[plot.growth_stage]} · {plot.total_water} 💧 i alt
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
