'use client';

import React, { useState } from 'react';

interface BareEtSkrigtProps {
  onClose: () => void;
  nextTask?: {
    emoji: string;
    title: string;
    duration: string;
  };
}

export default function BareEtSkridt({ onClose, nextTask }: BareEtSkrigtProps) {
  const [breathPhase, setBreathPhase] = useState<'in' | 'hold' | 'out' | 'idle'>('idle');
  const [breathCount, setBreathCount] = useState(0);

  const startBreath = () => {
    setBreathPhase('in');
    setTimeout(() => setBreathPhase('hold'), 4000);
    setTimeout(() => setBreathPhase('out'), 6000);
    setTimeout(() => {
      setBreathPhase('idle');
      setBreathCount((c) => c + 1);
    }, 10000);
  };

  const breathLabel = {
    in: 'Træk vejret ind...',
    hold: 'Hold...',
    out: 'Pust ud...',
    idle: 'Tryk for at trække vejret',
  };

  const defaultTask = {
    emoji: '🌬️',
    title: 'Træk vejret dybt tre gange',
    duration: '1 min',
  };

  const task = nextTask || defaultTask;

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-midnight-950/98 backdrop-blur-xl px-8">
      {/* Close */}
      <button
        onClick={onClose}
        className="absolute top-6 right-6 text-midnight-400 hover:text-midnight-200 transition-colors text-sm font-medium"
      >
        Tilbage
      </button>

      {/* Breathing orb */}
      <div className="flex flex-col items-center gap-8 animate-fade-in">
        <div className="text-center mb-2">
          <p className="text-midnight-400 text-sm font-medium tracking-widest uppercase">
            Bare ét skridt
          </p>
        </div>

        {/* Breath circle */}
        <button
          onClick={breathPhase === 'idle' ? startBreath : undefined}
          className="relative flex items-center justify-center"
          style={{ width: 180, height: 180 }}
        >
          <div
            className="absolute rounded-full transition-all duration-1000"
            style={{
              width: breathPhase === 'in' || breathPhase === 'hold' ? 180 : 120,
              height: breathPhase === 'in' || breathPhase === 'hold' ? 180 : 120,
              background: 'radial-gradient(circle, rgba(167,139,250,0.15) 0%, transparent 70%)',
            }}
          />
          <div
            className="absolute rounded-full transition-all duration-1000"
            style={{
              width: breathPhase === 'in' || breathPhase === 'hold' ? 140 : 90,
              height: breathPhase === 'in' || breathPhase === 'hold' ? 140 : 90,
              background: 'radial-gradient(circle, rgba(167,139,250,0.25) 0%, transparent 70%)',
            }}
          />
          <div
            className="rounded-full flex items-center justify-center transition-all duration-1000"
            style={{
              width: breathPhase === 'in' || breathPhase === 'hold' ? 100 : 70,
              height: breathPhase === 'in' || breathPhase === 'hold' ? 100 : 70,
              background: 'radial-gradient(circle, #A78BFA 0%, #7C3AED 100%)',
              boxShadow: '0 0 40px rgba(167, 139, 250, 0.4)',
            }}
          >
            <div
              className="rounded-full opacity-40"
              style={{
                width: '40%',
                height: '40%',
                background:
                  'radial-gradient(circle at 35% 35%, rgba(255,255,255,0.8) 0%, transparent 60%)',
              }}
            />
          </div>
        </button>

        <p className="text-midnight-300 text-sm text-center min-h-[20px]">
          {breathLabel[breathPhase]}
          {breathCount > 0 && breathPhase === 'idle' && (
            <span className="text-aurora-violet ml-2">({breathCount}×)</span>
          )}
        </p>

        {/* The one task */}
        <div className="w-full max-w-xs bg-midnight-800/80 backdrop-blur-sm rounded-3xl border border-midnight-600/50 p-6 text-center">
          <p className="text-midnight-400 text-xs font-medium tracking-widest uppercase mb-4">
            Dit næste skridt
          </p>
          <div className="text-5xl mb-3">{task.emoji}</div>
          <h2 className="font-display text-xl font-bold text-midnight-50 mb-2">{task.title}</h2>
          <p className="text-midnight-400 text-sm">{task.duration}</p>
        </div>

        <p className="text-midnight-500 text-xs text-center max-w-xs leading-relaxed">
          Du behøver ikke tænke på resten. Kun dette ene skridt. Det er nok.
        </p>
      </div>
    </div>
  );
}
