'use client';

import React, { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { HavenPlantSvg } from '@/components/haven/HavenPlantSvg';
import type { HavenGrowthStage } from '@/components/haven/HavenPlantSvg';
import type { HavenAmbientPeriod, HavenPlantType } from '@/components/haven/havenConstants';
import { HAVEN_PLANT_ACCENTS } from '@/components/haven/havenConstants';
import '@/components/haven/haven-showcase.css';

export type HavenScenePlot = {
  id: string;
  slot_index: number;
  plant_type: HavenPlantType;
  plant_name: string;
  growth_stage: HavenGrowthStage;
};

type Props = {
  plots: HavenScenePlot[];
  ambient: HavenAmbientPeriod;
  /** Ekstra lag: skyer, glød, let plante-bob — demoen og portal-forhåndsvisning */
  showcase: boolean;
  reducedMotion: boolean;
  /** Vand / highlight ét plot (fx efter vanding i demoen) */
  pulseSlotIndex?: number | null;
  title?: string;
  subtitle?: string;
  onSlotClick?: (slotIndex: number, plot: HavenScenePlot | null) => void;
  className?: string;
  /** Lavere min-højde i indlejret portal-visning */
  compact?: boolean;
};

function Fireflies({ active }: { active: boolean }) {
  if (!active) return null;
  const spots = [
    { l: '8%', t: '22%', d: 0 },
    { l: '72%', t: '18%', d: -1.1 },
    { l: '45%', t: '35%', d: -2.3 },
    { l: '88%', t: '42%', d: -0.7 },
    { l: '22%', t: '48%', d: -3.1 },
    { l: '58%', t: '28%', d: -1.8 },
  ];
  return (
    <div className="pointer-events-none absolute inset-0 z-[1] overflow-hidden">
      {spots.map((s, i) => (
        <span
          key={i}
          className="haven-twinkle absolute h-1.5 w-1.5 rounded-full bg-amber-200 shadow-[0_0_8px_#fde68a]"
          style={{
            left: s.l,
            top: s.t,
            animationDelay: `${s.d}s`,
            opacity: 0.7,
          }}
        />
      ))}
    </div>
  );
}

function CloudLayer({ visible, motionOn }: { visible: boolean; motionOn: boolean }) {
  if (!visible) return null;
  return (
    <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden opacity-[0.5]">
      <div
        className={`absolute -left-[10%] top-[5%] h-12 w-[46%] rounded-full bg-white/85 blur-md ${motionOn ? 'haven-drift-slow haven-parallax-far' : ''}`}
        style={{ mixBlendMode: 'overlay' }}
      />
      <div
        className={`absolute left-[44%] top-[11%] h-9 w-[38%] rounded-full bg-white/60 blur-md ${motionOn ? 'haven-drift-med' : ''}`}
        style={{ mixBlendMode: 'overlay' }}
      />
      <div
        className={`absolute left-[8%] top-[19%] h-7 w-[32%] rounded-full bg-white/45 blur-sm ${motionOn ? 'haven-drift-slow' : ''}`}
        style={{ mixBlendMode: 'overlay', animationDelay: '-20s' }}
      />
    </div>
  );
}

function SkyWash({ motionOn }: { motionOn: boolean }) {
  return (
    <div
      className={`pointer-events-none absolute inset-0 z-[1] bg-gradient-to-b from-white/[0.14] via-sky-100/[0.06] to-amber-950/[0.28] ${motionOn ? 'haven-sky-shimmer' : ''}`}
      aria-hidden
    />
  );
}

function HavenCelestial({ hour }: { hour: number }) {
  const night = hour >= 21 || hour < 5;
  const dusk = hour >= 17 && hour < 21;

  if (night) {
    return (
      <div
        className="pointer-events-none absolute right-[9%] top-[6%] z-[2] h-12 w-12 rounded-full bg-gradient-to-br from-slate-100 to-slate-300/90 shadow-[0_0_28px_rgba(191,219,254,0.45),0_0_48px_rgba(99,102,241,0.2)]"
        aria-hidden
      />
    );
  }

  return (
    <div className="pointer-events-none absolute right-[6%] top-[5%] z-[2]" aria-hidden>
      <div
        className="h-[4.25rem] w-[4.25rem] rounded-full"
        style={{
          background: dusk
            ? 'radial-gradient(circle at 32% 32%, #fff7ed 0%, #fdba74 38%, #ea580c 92%)'
            : 'radial-gradient(circle at 32% 32%, #ffffff 0%, #fde047 35%, #facc15 72%, #eab308 100%)',
          boxShadow: dusk
            ? '0 0 42px rgba(251,146,60,0.55), 0 0 72px rgba(234,88,12,0.28)'
            : '0 0 38px rgba(253,224,71,0.7), 0 0 64px rgba(250,204,21,0.35)',
        }}
      />
    </div>
  );
}

function HorizonGlow({ ambient }: { ambient: HavenAmbientPeriod }) {
  return (
    <div
      className="pointer-events-none absolute left-0 right-0 z-[2] h-28"
      style={{
        bottom: '32%',
        background: `radial-gradient(ellipse 85% 55% at 50% 100%, ${ambient.horizon}55 0%, transparent 72%)`,
        transition: 'background 2s ease',
      }}
    />
  );
}

function PlotSlot({
  plot,
  size,
  ambient,
  showcase,
  motionClass,
  onClick,
  pulsing,
  interactive,
}: {
  plot: HavenScenePlot | null;
  size: 'sm' | 'lg';
  ambient: HavenAmbientPeriod;
  showcase: boolean;
  motionClass: boolean;
  onClick: () => void;
  pulsing: boolean;
  interactive: boolean;
}) {
  const dim = size === 'sm' ? 'w-20 h-20' : 'w-28 h-28';
  const moundW = size === 'sm' ? 72 : 96;
  const moundH = size === 'sm' ? 14 : 18;
  const bob = showcase && motionClass ? (size === 'lg' ? 'haven-bob' : 'haven-bob-delayed') : '';

  const inner = (
    <>
      {pulsing && (
        <span
          className="haven-ripple-ring absolute inset-0 z-10 rounded-full border-2 border-cyan-300/90"
          aria-hidden
        />
      )}
      {plot ? (
        <>
          <div className={`absolute inset-0 flex items-end justify-center pb-1 ${bob}`}>
            <HavenPlantSvg type={plot.plant_type} stage={plot.growth_stage} />
          </div>
          <div
            className={`absolute -top-0.5 -right-0.5 z-[5] flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold text-white shadow-md ${showcase && motionClass ? 'haven-sparkle' : ''}`}
            style={{
              background: HAVEN_PLANT_ACCENTS[plot.plant_type],
            }}
          >
            {plot.growth_stage + 1}
          </div>
        </>
      ) : showcase ? (
        <div className="haven-plot-empty flex h-full w-full flex-col items-center justify-center gap-0.5 rounded-2xl">
          <span className="text-[1.15rem] drop-shadow-md" aria-hidden>
            🌱
          </span>
          <Plus className="h-4 w-4 text-amber-50/90" strokeWidth={2.5} />
        </div>
      ) : (
        <div className="flex h-full w-full items-center justify-center rounded-2xl border-2 border-dashed border-white/45 bg-white/12 backdrop-blur-[2px]">
          <Plus className="h-5 w-5 text-white/65" />
        </div>
      )}
    </>
  );

  return (
    <div
      className="flex flex-col items-center"
      style={{ filter: size === 'sm' ? 'brightness(0.88)' : 'none' }}
    >
      {interactive ? (
        <button
          type="button"
          onClick={onClick}
          className={`${dim} relative flex items-end justify-center transition-transform duration-150 active:scale-95`}
          aria-label={plot ? plot.plant_name : 'Tom planteplads'}
        >
          {inner}
        </button>
      ) : (
        <div
          className={`${dim} relative flex items-end justify-center`}
          role="img"
          aria-label={plot ? plot.plant_name : 'Tom planteplads'}
        >
          {inner}
        </div>
      )}
      <svg
        width={moundW}
        height={moundH}
        viewBox={`0 0 ${moundW} ${moundH}`}
        fill="none"
        className="-mt-1"
        style={{ overflow: 'visible' }}
      >
        <ellipse
          cx={moundW / 2}
          cy={moundH / 2}
          rx={moundW / 2}
          ry={moundH / 2}
          fill={ambient.ground}
        />
        <ellipse
          cx={moundW / 2}
          cy={moundH / 2 - 2}
          rx={moundW / 2 - 4}
          ry={moundH / 2 - 2}
          fill={`${ambient.ground}99`}
        />
      </svg>
      {plot && (
        <p className="mt-0.5 max-w-[88px] truncate text-center text-[10px] font-bold text-white drop-shadow-md">
          {plot.plant_name}
        </p>
      )}
    </div>
  );
}

export function HavenGardenScene({
  plots,
  ambient,
  showcase,
  reducedMotion,
  pulseSlotIndex = null,
  title,
  subtitle,
  onSlotClick,
  className = '',
  compact = false,
}: Props) {
  const slots = Array.from({ length: 6 }, (_, i) => plots.find((p) => p.slot_index === i) ?? null);
  const backRow = slots.slice(0, 3);
  const frontRow = slots.slice(3, 6);
  const motionOn = showcase && !reducedMotion;
  const rich = showcase;
  const interactive = Boolean(onSlotClick);
  const rootClass = `${motionOn ? 'haven-showcase--motion' : ''} ${className}`.trim();

  const [hour, setHour] = useState(() =>
    typeof window !== 'undefined' ? new Date().getHours() : 12
  );
  useEffect(() => {
    const tick = () => setHour(new Date().getHours());
    const id = window.setInterval(tick, 60_000);
    tick();
    return () => clearInterval(id);
  }, []);

  return (
    <div
      className={`relative overflow-hidden rounded-3xl shadow-[inset_0_0_100px_rgba(0,0,0,0.08)] ring-1 ring-inset ring-white/20 ${rootClass}`}
      style={{
        background: ambient.sky,
        transition: 'background 2s ease',
        color: ambient.textColor,
        minHeight: compact ? 220 : 280,
      }}
    >
      {rich && <SkyWash motionOn={motionOn} />}
      <CloudLayer visible={rich} motionOn={motionOn} />
      {rich && <HavenCelestial hour={hour} />}
      {motionOn && (
        <div
          className="haven-glow-pulse pointer-events-none absolute left-1/2 top-[28%] z-[1] h-24 w-[70%] -translate-x-1/2 rounded-full bg-amber-200/25"
          aria-hidden
        />
      )}
      <Fireflies active={motionOn} />

      {(title || subtitle) && (
        <div className="relative z-[4] px-5 pb-2 pt-4">
          {title && (
            <p className="text-xs font-bold uppercase tracking-widest text-white/75 drop-shadow">
              {title}
            </p>
          )}
          {subtitle && (
            <p className="mt-0.5 text-sm font-semibold text-white drop-shadow">{subtitle}</p>
          )}
        </div>
      )}

      <div
        className={`relative z-[3] flex flex-col justify-end px-3 ${compact ? 'pb-4 pt-2' : 'pb-6 pt-4'}`}
      >
        <HorizonGlow ambient={ambient} />
        <div
          className={`relative rounded-2xl px-2 pb-2 pt-5 ${rich ? 'haven-ground-furrows' : ''}`}
          style={{
            background: `linear-gradient(180deg, ${ambient.ground}00 0%, ${ambient.ground}ee 36%, ${ambient.ground} 100%)`,
            transition: 'background 2s ease',
          }}
        >
          <div className="mb-2 flex justify-around px-3">
            {backRow.map((plot, i) => (
              <PlotSlot
                key={`b-${i}`}
                plot={plot}
                size="sm"
                ambient={ambient}
                showcase={showcase}
                motionClass={motionOn}
                pulsing={pulseSlotIndex === i}
                interactive={interactive}
                onClick={() => onSlotClick?.(i, plot)}
              />
            ))}
          </div>
          <div className="flex justify-around px-0">
            {frontRow.map((plot, i) => (
              <PlotSlot
                key={`f-${i}`}
                plot={plot}
                size="lg"
                ambient={ambient}
                showcase={showcase}
                motionClass={motionOn}
                pulsing={pulseSlotIndex === i + 3}
                interactive={interactive}
                onClick={() => onSlotClick?.(i + 3, plot)}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
