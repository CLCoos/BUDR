'use client';

import React, { useEffect, useState } from 'react';
import { Phone } from 'lucide-react';

type BreathPhase = 'inhale' | 'hold-in' | 'exhale' | 'hold-out';

const PHASES: { phase: BreathPhase; label: string; duration: number; scale: number }[] = [
  { phase: 'inhale',   label: 'Træk vejret ind',  duration: 4000, scale: 1.5 },
  { phase: 'hold-in',  label: 'Hold vejret',       duration: 4000, scale: 1.5 },
  { phase: 'exhale',   label: 'Pust ud',            duration: 6000, scale: 1.0 },
  { phase: 'hold-out', label: 'Pause',              duration: 2000, scale: 1.0 },
];

const HOTLINES = [
  { name: 'Livslinien',        number: '70 201 201' },
  { name: 'BørneTelefonen',    number: '116 111' },
  { name: 'Seniortelefonerne', number: '70 278 278' },
];

type Props = {
  firstName: string;
  onClose: () => void;
};

export default function LysKrisekort({ firstName, onClose }: Props) {
  const [phaseIdx, setPhaseIdx] = useState(0);
  const [secondsLeft, setSecondsLeft] = useState(PHASES[0]!.duration / 1000);

  useEffect(() => {
    const phase = PHASES[phaseIdx]!;
    setSecondsLeft(phase.duration / 1000);
    const tick = window.setInterval(() => {
      setSecondsLeft(s => Math.max(0, s - 1));
    }, 1000);
    const advance = window.setTimeout(() => {
      setPhaseIdx(i => (i + 1) % PHASES.length);
    }, phase.duration);
    return () => {
      window.clearInterval(tick);
      window.clearTimeout(advance);
    };
  }, [phaseIdx]);

  const current = PHASES[phaseIdx]!;

  return (
    <div className="flex flex-col min-h-full" style={{ color: '#E2E8F0' }}>

      {/* Top: breathing */}
      <div className="flex flex-col items-center justify-center py-10 gap-8">
        <p className="text-sm font-bold tracking-widest uppercase opacity-50">Åndedrætsøvelse</p>

        {/* Breathing circle */}
        <div className="relative flex items-center justify-center">
          {/* Outer glow rings */}
          <div
            className="absolute rounded-full transition-all"
            style={{
              width: `${current.scale * 160 + 40}px`,
              height: `${current.scale * 160 + 40}px`,
              backgroundColor: 'rgba(99,102,241,0.08)',
              transitionDuration: `${current.duration}ms`,
              transitionTimingFunction: current.phase === 'inhale'
                ? 'cubic-bezier(0.4, 0, 0.2, 1)'
                : current.phase === 'exhale'
                ? 'cubic-bezier(0.4, 0, 0.2, 1)'
                : 'linear',
            }}
          />
          <div
            className="absolute rounded-full transition-all"
            style={{
              width: `${current.scale * 160 + 16}px`,
              height: `${current.scale * 160 + 16}px`,
              backgroundColor: 'rgba(99,102,241,0.14)',
              transitionDuration: `${current.duration}ms`,
              transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          />
          {/* Main circle */}
          <div
            className="relative flex items-center justify-center rounded-full transition-all"
            style={{
              width: `${current.scale * 160}px`,
              height: `${current.scale * 160}px`,
              background: 'linear-gradient(135deg, rgba(99,102,241,0.7) 0%, rgba(139,92,246,0.7) 100%)',
              boxShadow: '0 0 40px rgba(99,102,241,0.4)',
              transitionDuration: `${current.duration}ms`,
              transitionTimingFunction: 'cubic-bezier(0.4, 0, 0.2, 1)',
            }}
          >
            <div className="text-center">
              <p className="text-3xl font-black text-white">{secondsLeft}</p>
            </div>
          </div>
        </div>

        <div className="text-center space-y-1">
          <p className="text-xl font-bold text-white">{current.label}</p>
          <p className="text-sm opacity-50">
            {phaseIdx + 1} / {PHASES.length}
          </p>
        </div>
      </div>

      {/* Message */}
      <div className="mx-5 rounded-2xl px-5 py-4 text-center mb-6" style={{ backgroundColor: 'rgba(255,255,255,0.06)' }}>
        <p className="text-sm leading-relaxed opacity-80">
          Det lyder som en hård stund, {firstName}.{' '}
          Tag det i dit eget tempo — der er ingen forventninger.
        </p>
      </div>

      {/* Hotlines */}
      <div className="mx-5 space-y-2 mb-6">
        <p className="text-xs font-bold uppercase tracking-widest mb-3" style={{ color: 'rgba(255,255,255,0.4)' }}>
          Åbne telefonlinjer
        </p>
        {HOTLINES.map(line => (
          <a
            key={line.name}
            href={`tel:${line.number.replace(/\s/g, '')}`}
            className="flex items-center justify-between rounded-2xl px-4 py-3.5 transition-all duration-150 active:scale-[0.98]"
            style={{ backgroundColor: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.10)' }}
          >
            <div>
              <p className="text-sm font-semibold text-white">{line.name}</p>
              <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.5)' }}>{line.number}</p>
            </div>
            <Phone className="h-5 w-5 shrink-0" style={{ color: 'rgba(255,255,255,0.5)' }} aria-hidden />
          </a>
        ))}
      </div>

      {/* Staff note */}
      <div className="mx-5 rounded-2xl px-5 py-3.5 mb-6" style={{ backgroundColor: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)' }}>
        <p className="text-xs leading-relaxed" style={{ color: 'rgba(199,210,254,0.85)' }}>
          Personalet kan se, at du har haft det svært i dag — de vil gerne støtte dig.
        </p>
      </div>

      {/* Back button */}
      <div className="mx-5 mb-8">
        <button
          type="button"
          onClick={onClose}
          className="w-full rounded-2xl py-4 text-sm font-bold text-white transition-all duration-200 active:scale-[0.98]"
          style={{
            backgroundColor: 'rgba(255,255,255,0.12)',
            border: '1px solid rgba(255,255,255,0.2)',
          }}
        >
          Tilbage til Lys
        </button>
      </div>

    </div>
  );
}
