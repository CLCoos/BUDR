'use client';

import React from 'react';

interface MoodScaleProps {
  mood: number;
  onChange: (value: number) => void;
}

const moodConfig: Record<number, { emoji: string; label: string; accent: string }> = {
  1: { emoji: '😩', label: 'Meget dårlig', accent: '#F87171' },
  2: { emoji: '😢', label: 'Dårlig', accent: '#FB923C' },
  3: { emoji: '😔', label: 'Lav', accent: '#FBBF24' },
  4: { emoji: '😕', label: 'Lidt lav', accent: '#FB923C' },
  5: { emoji: '😐', label: 'Neutral', accent: '#A78BFA' },
  6: { emoji: '🙂', label: 'OK', accent: '#60A5FA' },
  7: { emoji: '😊', label: 'God', accent: '#34D399' },
  8: { emoji: '😁', label: 'Rigtig god', accent: '#34D399' },
  9: { emoji: '🤩', label: 'Fantastisk', accent: '#6EE7B7' },
  10: { emoji: '🥳', label: 'Perfekt dag!', accent: '#FB923C' },
};

export default function MoodScale({ mood, onChange }: MoodScaleProps) {
  const config = moodConfig[mood];

  return (
    <div className="card-dark">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xl">🌡️</span>
        <h2 className="font-display text-base font-bold text-midnight-50">Humørskala</h2>
        <span className="ml-auto text-xs text-midnight-400">Hvordan har du det i dag?</span>
      </div>

      {/* Current mood display */}
      <div
        className="flex items-center gap-3 rounded-2xl border px-4 py-3 mb-5 transition-all duration-300"
        style={{ borderColor: `${config.accent}40`, background: `${config.accent}12` }}
      >
        <span className="text-3xl sm:text-4xl">{config.emoji}</span>
        <div>
          <p className="font-display text-lg font-bold" style={{ color: config.accent }}>
            {mood}/10
          </p>
          <p className="text-sm font-medium text-midnight-300">{config.label}</p>
        </div>
      </div>

      {/* Scale buttons — 5 per row on mobile, 10 in one row on sm+ */}
      <div className="grid grid-cols-5 sm:grid-cols-10 gap-1.5">
        {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => {
          const isSelected = n === mood;
          const cfg = moodConfig[n];
          return (
            <button
              key={n}
              onClick={() => onChange(n)}
              className="flex flex-col items-center justify-center rounded-xl py-2 border-2 transition-all duration-200 active:scale-90"
              style={{
                borderColor: isSelected ? cfg.accent : 'rgba(255,255,255,0.08)',
                background: isSelected ? `${cfg.accent}18` : 'rgba(255,255,255,0.03)',
                transform: isSelected ? 'scale(1.05)' : undefined,
              }}
            >
              <span className="text-sm sm:text-base leading-none">{cfg.emoji}</span>
              <span
                className="text-xs font-bold mt-1"
                style={{ color: isSelected ? cfg.accent : 'rgba(255,255,255,0.3)' }}
              >
                {n}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
