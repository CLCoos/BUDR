'use client';

import React from 'react';
import { EnergyLevel, energyConfig } from './DailyChallengesView';

interface EnergySelectorProps {
  energy: EnergyLevel;
  onSelect: (level: EnergyLevel) => void;
}

export default function EnergySelector({ energy, onSelect }: EnergySelectorProps) {
  return (
    <div className="mb-5">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-sm font-semibold text-midnight-200">Energiniveau:</span>
        <span className="text-sm text-midnight-500">Vælg dit niveau</span>
      </div>

      <div className="flex gap-2">
        {energyConfig.map((level) => {
          const isActive = energy === level.value;
          return (
            <button
              key={`energy-${level.value}`}
              onClick={() => onSelect(level.value)}
              className="flex-1 flex flex-col items-center gap-1 py-3 px-1 rounded-2xl border-2 transition-all duration-200 active:scale-95"
              style={{
                borderColor: isActive ? '#FB923C' : 'rgba(255,255,255,0.08)',
                background: isActive ? 'rgba(251,146,60,0.12)' : 'rgba(255,255,255,0.03)',
                transform: isActive ? 'scale(1.04)' : undefined,
              }}
              aria-pressed={isActive}
              aria-label={level.label}
            >
              <span
                className={`text-xl transition-transform duration-200 ${isActive ? 'scale-110' : ''}`}
              >
                {level.emoji}
              </span>
              <div className="flex gap-0.5">
                {[1, 2, 3, 4, 5].map((dot) => (
                  <div
                    key={`dot-${level.value}-${dot}`}
                    className="w-1 h-1 rounded-full transition-all duration-200"
                    style={{
                      background:
                        dot <= level.value
                          ? isActive
                            ? '#FB923C'
                            : 'rgba(251,146,60,0.4)'
                          : 'rgba(255,255,255,0.1)',
                    }}
                  />
                ))}
              </div>
            </button>
          );
        })}
      </div>

      <div className="mt-2 text-center">
        {(() => {
          const active = energyConfig.find((e) => e.value === energy);
          return active ? (
            <span className="text-xs font-semibold text-sunrise-300">
              {active.emoji} {active.label}
            </span>
          ) : null;
        })()}
      </div>
    </div>
  );
}
