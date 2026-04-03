'use client';

import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import type { LysThemeTokens } from '../lib/lysTheme';

type Tool = 'menu' | 'breathing' | 'grounding' | 'color';
type BreathPhase = 'inhale' | 'hold1' | 'exhale' | 'hold2';

const BREATH_SEQUENCE: { phase: BreathPhase; label: string; duration: number }[] = [
  { phase: 'inhale', label: 'Træk vejret ind', duration: 4000 },
  { phase: 'hold1', label: 'Hold…', duration: 4000 },
  { phase: 'exhale', label: 'Pust langsomt ud', duration: 6000 },
  { phase: 'hold2', label: 'Hvil…', duration: 2000 },
];

const GROUNDING_STEPS = [
  { count: 5, sense: 'Se', icon: '👁', prompt: 'Nævn 5 ting du KAN SE lige nu' },
  { count: 4, sense: 'Hør', icon: '👂', prompt: 'Nævn 4 ting du KAN HØRE' },
  { count: 3, sense: 'Mærk', icon: '🖐', prompt: 'Nævn 3 ting du KAN FØLE med kroppen' },
  {
    count: 2,
    sense: 'Lugt',
    icon: '👃',
    prompt: 'Nævn 2 ting du KAN LUGTE (eller forestille dig)',
  },
  {
    count: 1,
    sense: 'Smag',
    icon: '👅',
    prompt: 'Nævn 1 ting du KAN SMAGE (eller forestille dig)',
  },
];

const CALM_COLORS = [
  { name: 'Dybt hav', bg: '#0C2340', text: '#A8C8E8', accent: '#4A9ECC' },
  { name: 'Skovgrøn', bg: '#0D2B1A', text: '#A8D4B8', accent: '#4AB878' },
  { name: 'Aftenlilla', bg: '#1A0D2B', text: '#C8A8D4', accent: '#9B59B6' },
  { name: 'Varm sand', bg: '#2B1F0D', text: '#D4C4A8', accent: '#C49A45' },
  { name: 'Måneskær', bg: '#0D1A2B', text: '#A8C0D4', accent: '#5B8BA8' },
];

type Props = {
  tokens: LysThemeTokens;
  accent: string;
  onClose: () => void;
};

export default function LysSansekasse({ tokens, accent, onClose }: Props) {
  const [tool, setTool] = useState<Tool>('menu');

  return (
    <div
      className="mx-auto flex w-full max-w-lg flex-col min-h-dvh"
      style={{ backgroundColor: tokens.bg, color: tokens.text }}
    >
      {/* Top bar */}
      <div className="flex items-center gap-3 px-5 pt-5 pb-4 shrink-0">
        <button
          type="button"
          onClick={tool === 'menu' ? onClose : () => setTool('menu')}
          className="flex h-10 w-10 items-center justify-center rounded-full transition-all active:scale-90"
          style={{ backgroundColor: tokens.cardBg }}
          aria-label="Tilbage"
        >
          <ArrowLeft className="h-5 w-5" style={{ color: tokens.textMuted }} />
        </button>
        <div>
          <h1 className="text-lg font-black tracking-tight">Sansekasse</h1>
          <p className="text-xs" style={{ color: tokens.textMuted }}>
            Ro og jordforbindelse
          </p>
        </div>
      </div>

      <div className="flex-1 px-5 pb-8">
        {tool === 'menu' && <MenuView tokens={tokens} accent={accent} onSelect={setTool} />}
        {tool === 'breathing' && <BreathingView tokens={tokens} accent={accent} />}
        {tool === 'grounding' && <GroundingView tokens={tokens} accent={accent} />}
        {tool === 'color' && <ColorRoomView />}
      </div>
    </div>
  );
}

// ── Menu ──────────────────────────────────────────────────────────────────────

function MenuView({
  tokens,
  accent,
  onSelect,
}: {
  tokens: LysThemeTokens;
  accent: string;
  onSelect: (t: Tool) => void;
}) {
  const tools = [
    {
      id: 'breathing' as Tool,
      icon: '🫧',
      title: 'Vejrtrækning',
      desc: 'Blid boks-vejrtrækning — 4 sekunder ad gangen',
    },
    {
      id: 'grounding' as Tool,
      icon: '🌱',
      title: 'Jordforbindelse',
      desc: '5-4-3-2-1 øvelse — bring dig tilbage til nu',
    },
    {
      id: 'color' as Tool,
      icon: '🌊',
      title: 'Farverum',
      desc: 'Vælg en ro-farve og lad den fylde skærmen',
    },
  ];

  return (
    <div className="space-y-3 pt-2">
      <p className="text-sm leading-relaxed mb-5" style={{ color: tokens.textMuted }}>
        Vælg en øvelse der passer til din situation lige nu.
      </p>
      {tools.map((t) => (
        <button
          key={t.id}
          type="button"
          onClick={() => onSelect(t.id)}
          className="w-full rounded-3xl px-5 py-5 text-left flex items-center gap-4 transition-all duration-150 active:scale-[0.98]"
          style={{ backgroundColor: tokens.cardBg, boxShadow: tokens.shadow }}
        >
          <span className="text-3xl shrink-0">{t.icon}</span>
          <div>
            <p className="font-bold text-base" style={{ color: tokens.text }}>
              {t.title}
            </p>
            <p className="text-sm mt-0.5" style={{ color: tokens.textMuted }}>
              {t.desc}
            </p>
          </div>
          <span className="ml-auto text-lg shrink-0" style={{ color: accent }}>
            →
          </span>
        </button>
      ))}
    </div>
  );
}

// ── Breathing ─────────────────────────────────────────────────────────────────

function BreathingView({ tokens, accent }: { tokens: LysThemeTokens; accent: string }) {
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [active, setActive] = useState(false);
  const [cycles, setCycles] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const current = BREATH_SEQUENCE[phaseIdx]!;
  const scale =
    current.phase === 'inhale'
      ? 1.0
      : current.phase === 'hold1'
        ? 1.0
        : current.phase === 'exhale'
          ? 0.55
          : 0.55;

  useEffect(() => {
    if (!active) return;
    timerRef.current = setTimeout(() => {
      const next = (phaseIdx + 1) % BREATH_SEQUENCE.length;
      if (next === 0) setCycles((c) => c + 1);
      setPhaseIdx(next);
    }, current.duration);
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [active, phaseIdx, current.duration]);

  const toggle = () => {
    if (active) {
      setActive(false);
      if (timerRef.current) clearTimeout(timerRef.current);
      setPhaseIdx(0);
    } else {
      setActive(true);
    }
  };

  return (
    <div className="flex flex-col items-center pt-4 gap-8">
      <p className="text-sm text-center" style={{ color: tokens.textMuted }}>
        Boks-vejrtrækning — fire sekunder per fase
      </p>

      {/* Breathing circle */}
      <div
        className="relative flex items-center justify-center"
        style={{ height: 240, width: 240 }}
      >
        {/* Outer ring */}
        <div
          className="absolute rounded-full transition-transform"
          style={{
            width: 200,
            height: 200,
            border: `3px solid ${accent}30`,
            transform: `scale(${active ? scale : 0.75})`,
            transition: active ? `transform ${current.duration}ms ease-in-out` : 'none',
          }}
        />
        {/* Inner circle */}
        <div
          className="absolute rounded-full flex items-center justify-center"
          style={{
            width: 160,
            height: 160,
            backgroundColor: `${accent}18`,
            border: `2px solid ${accent}40`,
            transform: `scale(${active ? scale : 0.75})`,
            transition: active ? `transform ${current.duration}ms ease-in-out` : 'none',
          }}
        >
          <span className="text-4xl">🫧</span>
        </div>
      </div>

      {/* Phase label */}
      <div className="text-center space-y-1">
        {active ? (
          <>
            <p className="text-xl font-bold" style={{ color: tokens.text }}>
              {current.label}
            </p>
            <p className="text-sm" style={{ color: tokens.textMuted }}>
              {current.duration / 1000} sekunder
            </p>
            {cycles > 0 && (
              <p className="text-xs" style={{ color: accent }}>
                {cycles} {cycles === 1 ? 'runde' : 'runder'} gennemført
              </p>
            )}
          </>
        ) : (
          <p className="text-base font-medium" style={{ color: tokens.textMuted }}>
            Tryk for at starte
          </p>
        )}
      </div>

      <button
        type="button"
        onClick={toggle}
        className="rounded-2xl px-10 py-4 text-base font-bold text-white transition-all duration-200 active:scale-95"
        style={{ background: `linear-gradient(135deg, ${accent}, ${accent}cc)` }}
      >
        {active ? 'Stop' : 'Start vejrtrækning'}
      </button>
    </div>
  );
}

// ── Grounding ─────────────────────────────────────────────────────────────────

function GroundingView({ tokens, accent }: { tokens: LysThemeTokens; accent: string }) {
  const [stepIdx, setStepIdx] = useState(0);
  const [checked, setChecked] = useState(0);
  const [done, setDone] = useState(false);

  const step = GROUNDING_STEPS[stepIdx];
  if (!step) return null;

  const advance = () => {
    if (checked < step.count) return;
    if (stepIdx < GROUNDING_STEPS.length - 1) {
      setStepIdx((i) => i + 1);
      setChecked(0);
    } else {
      setDone(true);
    }
  };

  if (done) {
    return (
      <div className="flex flex-col items-center justify-center pt-12 gap-6 text-center">
        <span className="text-6xl">🌿</span>
        <p className="text-2xl font-black" style={{ color: tokens.text }}>
          Godt gået
        </p>
        <p className="text-base leading-relaxed px-4" style={{ color: tokens.textMuted }}>
          Du er til stede her og nu. Husk: du klarede det.
        </p>
        <button
          type="button"
          onClick={() => {
            setStepIdx(0);
            setChecked(0);
            setDone(false);
          }}
          className="rounded-2xl px-8 py-3 text-sm font-bold"
          style={{ backgroundColor: `${accent}20`, color: accent }}
        >
          Prøv igen
        </button>
      </div>
    );
  }

  return (
    <div className="pt-4 space-y-6">
      {/* Progress */}
      <div className="flex gap-1.5">
        {GROUNDING_STEPS.map((s, i) => (
          <div
            key={s.sense}
            className="h-1.5 flex-1 rounded-full"
            style={{
              backgroundColor: i < stepIdx ? accent : i === stepIdx ? `${accent}60` : `${accent}18`,
            }}
          />
        ))}
      </div>

      <div
        className="rounded-3xl px-5 py-6 text-center space-y-5"
        style={{ backgroundColor: tokens.cardBg, boxShadow: tokens.shadow }}
      >
        <span className="text-5xl block">{step.icon}</span>
        <p className="text-lg font-bold" style={{ color: tokens.text }}>
          {step.prompt}
        </p>

        {/* Tap counters */}
        <div className="flex justify-center gap-2.5 flex-wrap">
          {Array.from({ length: step.count }).map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => setChecked((c) => Math.min(c + 1, step.count))}
              className="h-12 w-12 rounded-full flex items-center justify-center text-xl font-bold transition-all duration-200 active:scale-90"
              style={{
                backgroundColor: i < checked ? accent : `${accent}18`,
                color: i < checked ? '#fff' : accent,
                border: `2px solid ${i < checked ? accent : `${accent}30`}`,
              }}
              aria-label={`Punkt ${i + 1}`}
            >
              {i < checked ? '✓' : i + 1}
            </button>
          ))}
        </div>

        <p className="text-sm" style={{ color: tokens.textMuted }}>
          {checked < step.count ? `${step.count - checked} tilbage` : 'Alle fundet!'}
        </p>
      </div>

      <button
        type="button"
        onClick={advance}
        disabled={checked < step.count}
        className="w-full rounded-2xl py-4 text-sm font-bold text-white transition-all active:scale-[0.98] disabled:opacity-30"
        style={{ background: `linear-gradient(135deg, ${accent}, ${accent}cc)` }}
      >
        {stepIdx < GROUNDING_STEPS.length - 1 ? 'Næste sans →' : 'Afslut øvelsen'}
      </button>
    </div>
  );
}

// ── Color Room ────────────────────────────────────────────────────────────────

function ColorRoomView() {
  const [selected, setSelected] = useState<(typeof CALM_COLORS)[0] | null>(null);

  if (selected) {
    return (
      <div
        className="fixed inset-0 z-10 flex flex-col items-center justify-center gap-6 transition-colors duration-700"
        style={{ backgroundColor: selected.bg }}
      >
        <p className="text-lg font-semibold" style={{ color: selected.text }}>
          {selected.name}
        </p>
        <p
          className="text-sm text-center px-8 leading-relaxed"
          style={{ color: `${selected.text}99` }}
        >
          Lad farven fylde dig. Der er ingenting du skal præstere lige nu.
        </p>
        <button
          type="button"
          onClick={() => setSelected(null)}
          className="mt-4 rounded-2xl px-8 py-3 text-sm font-semibold transition-all active:scale-95"
          style={{ backgroundColor: `${selected.accent}30`, color: selected.text }}
        >
          Skift farve
        </button>
      </div>
    );
  }

  return (
    <div className="pt-4 space-y-4">
      <p className="text-sm" style={{ color: '#6b7280' }}>
        Vælg en farve der føles rolig for dig lige nu.
      </p>
      <div className="grid grid-cols-1 gap-3">
        {CALM_COLORS.map((c) => (
          <button
            key={c.name}
            type="button"
            onClick={() => setSelected(c)}
            className="rounded-3xl px-5 py-5 flex items-center gap-4 transition-all duration-150 active:scale-[0.98]"
            style={{ backgroundColor: c.bg }}
          >
            <div
              className="h-10 w-10 rounded-full shrink-0"
              style={{ backgroundColor: c.accent }}
            />
            <p className="text-base font-semibold" style={{ color: c.text }}>
              {c.name}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}
