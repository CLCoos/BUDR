'use client';

import React, { useState } from 'react';
import StickyPrimaryFooter from '@/components/StickyPrimaryFooter';
import { CheckInData } from './MorningCheckInFlow';

interface Props {
  data: CheckInData;
  setData: React.Dispatch<React.SetStateAction<CheckInData>>;
  onNext: () => void;
}

const energyLevels = [
  {
    value: 1,
    emoji: '😴',
    label: 'Meget træt',
    description: 'Har brug for ro og hvile',
    accent: '#60A5FA',
    accentBg: 'rgba(96,165,250,0.12)',
    badge: 'Rolig dag',
    taskLoad: '2–3 lette opgaver',
  },
  {
    value: 2,
    emoji: '😔',
    label: 'Lidt træt',
    description: 'Klar til lidt, men tager det roligt',
    accent: '#A78BFA',
    accentBg: 'rgba(167,139,250,0.12)',
    badge: 'Let dag',
    taskLoad: '3–5 opgaver',
  },
  {
    value: 3,
    emoji: '😐',
    label: 'OK',
    description: 'Normal energi til en normal dag',
    accent: '#FB923C',
    accentBg: 'rgba(251,146,60,0.12)',
    badge: 'Normal dag',
    taskLoad: '5–7 opgaver',
  },
  {
    value: 4,
    emoji: '🙂',
    label: 'God energi',
    description: 'Klar til en aktiv og god dag',
    accent: '#34D399',
    accentBg: 'rgba(52,211,153,0.12)',
    badge: 'Aktiv dag',
    taskLoad: '7–9 opgaver',
  },
  {
    value: 5,
    emoji: '😄',
    label: 'Fuld energi',
    description: 'Klar til alt — en fantastisk dag!',
    accent: '#FB923C',
    accentBg: 'rgba(251,146,60,0.18)',
    badge: 'Fuld dag',
    taskLoad: '9–12 opgaver',
  },
];

export default function CheckInStepEnergy({ data, setData, onNext }: Props) {
  const [error, setError] = useState('');
  const selected = energyLevels.find((e) => e.value === data.energy);

  const handleSelect = (value: number) => {
    setError('');
    setData((d) => ({ ...d, energy: value }));
  };

  const handleNext = () => {
    if (!data.energy) {
      setError('Vælg dit energiniveau for at fortsætte');
      return;
    }
    onNext();
  };

  return (
    <div className="max-w-lg mx-auto px-4 pb-28">
      <div className="mb-4 pt-2">
        <p className="text-xs text-midnight-400 font-medium mb-1">God morgen! 🌅</p>
        <h2 className="font-display text-xl sm:text-2xl font-bold text-midnight-50">
          Hvordan har du det i dag?
        </h2>
      </div>

      <div className="space-y-2.5 mb-4">
        {energyLevels.map((level) => {
          const isSelected = data.energy === level.value;
          return (
            <button
              key={`energy-${level.value}`}
              onClick={() => handleSelect(level.value)}
              className="w-full flex items-center gap-3 p-3.5 rounded-2xl border-2 text-left transition-all duration-200 cursor-pointer active:scale-[0.99] min-h-[64px]"
              style={{
                borderColor: isSelected ? level.accent : 'rgba(255,255,255,0.08)',
                background: isSelected ? level.accentBg : 'rgba(255,255,255,0.03)',
              }}
              aria-pressed={isSelected}
            >
              <div className="w-12 h-12 rounded-2xl flex items-center justify-center flex-shrink-0 bg-midnight-800">
                <span className="text-2xl select-none">{level.emoji}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                  <span className="font-display font-bold text-sm text-midnight-100 break-words">
                    {level.label}
                  </span>
                  {isSelected && (
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-midnight-700 text-midnight-200 whitespace-nowrap">
                      {level.badge}
                    </span>
                  )}
                </div>
                <p className="text-xs text-midnight-400 leading-snug break-words">
                  {level.description}
                </p>
                {isSelected && (
                  <p className="text-xs text-midnight-500 mt-0.5 break-words">
                    📋 {level.taskLoad} i dag
                  </p>
                )}
              </div>
              <div className="flex flex-col gap-1 flex-shrink-0 ml-1">
                {[1, 2, 3, 4, 5].map((dot) => (
                  <div
                    key={`dot-${level.value}-${dot}`}
                    className="w-1.5 h-1.5 rounded-full transition-all duration-200"
                    style={{
                      background: dot <= level.value ? level.accent : 'rgba(255,255,255,0.1)',
                    }}
                  />
                ))}
              </div>
            </button>
          );
        })}
      </div>

      {selected && (
        <div className="bg-midnight-800/60 rounded-2xl border border-midnight-600/50 p-3.5 mb-4 flex items-center gap-3 animate-slide-up">
          <span className="text-2xl">{selected.emoji}</span>
          <div>
            <p className="text-sm font-semibold text-midnight-100">
              Du har{' '}
              <strong style={{ color: selected.accent }}>{selected.label.toLowerCase()}</strong> i
              dag
            </p>
            <p className="text-xs text-midnight-500 mt-0.5">
              Vi tilpasser din dag til dit niveau 🎯
            </p>
          </div>
        </div>
      )}

      {error && <p className="text-rose-400 text-sm font-medium text-center mb-4">{error}</p>}
      <StickyPrimaryFooter>
        <button
          type="button"
          onClick={handleNext}
          className="btn-primary w-full text-base py-3.5 min-h-[48px]"
        >
          Næste →
        </button>
      </StickyPrimaryFooter>
    </div>
  );
}
