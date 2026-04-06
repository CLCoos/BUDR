'use client';

import React from 'react';
import { ResourceState } from './JournalView';

interface ResourceCheckInProps {
  resources: ResourceState;
  onChange: (r: ResourceState) => void;
}

const resourceItems: {
  key: keyof ResourceState;
  label: string;
  emoji: string;
  lowLabel: string;
  highLabel: string;
  accent: string;
}[] = [
  {
    key: 'sleep',
    label: 'Søvn',
    emoji: '😴',
    lowLabel: 'Dårlig',
    highLabel: 'Fantastisk',
    accent: '#60A5FA',
  },
  {
    key: 'food',
    label: 'Mad',
    emoji: '🥗',
    lowLabel: 'Sprang over',
    highLabel: 'Spiste godt',
    accent: '#34D399',
  },
  {
    key: 'movement',
    label: 'Bevægelse',
    emoji: '🚶',
    lowLabel: 'Ingen',
    highLabel: 'Aktiv dag',
    accent: '#FB923C',
  },
  {
    key: 'social',
    label: 'Social',
    emoji: '👥',
    lowLabel: 'Isoleret',
    highLabel: 'Forbundet',
    accent: '#F472B6',
  },
  {
    key: 'stress',
    label: 'Stress',
    emoji: '🧘',
    lowLabel: 'Meget',
    highLabel: 'Ingen',
    accent: '#A78BFA',
  },
];

export default function ResourceCheckIn({ resources, onChange }: ResourceCheckInProps) {
  const handleChange = (key: keyof ResourceState, value: number) => {
    onChange({ ...resources, [key]: value });
  };

  return (
    <div className="card-dark">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xl">⚡</span>
        <h2 className="font-display text-base font-bold text-midnight-50">Ressource-tjek</h2>
        <span className="ml-auto text-xs text-midnight-400">Dine ressourcer i dag</span>
      </div>

      <div className="space-y-4">
        {resourceItems.map(({ key, label, emoji, lowLabel, highLabel, accent }) => {
          const val = resources[key];
          return (
            <div key={key}>
              <div className="flex items-center justify-between mb-2 gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="text-base flex-shrink-0">{emoji}</span>
                  <span className="text-sm font-semibold text-midnight-100 truncate">{label}</span>
                </div>
                <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-midnight-700 text-midnight-300 flex-shrink-0 whitespace-nowrap">
                  {val === 1 ? lowLabel : val === 5 ? highLabel : `${val}/5`}
                </span>
              </div>
              <div className="flex gap-2">
                {[1, 2, 3, 4, 5].map((n) => (
                  <button
                    key={n}
                    onClick={() => handleChange(key, n)}
                    className="flex-1 h-8 rounded-xl border-2 transition-all duration-200 active:scale-95"
                    style={{
                      background: n <= val ? accent : 'rgba(255,255,255,0.05)',
                      borderColor: n <= val ? accent : 'rgba(255,255,255,0.08)',
                    }}
                    aria-label={`${label} ${n}`}
                  />
                ))}
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-xs text-midnight-500">{lowLabel}</span>
                <span className="text-xs text-midnight-500">{highLabel}</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
