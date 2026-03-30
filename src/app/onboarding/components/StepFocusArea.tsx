'use client';

import React, { useState } from 'react';
import StickyPrimaryFooter from '@/components/StickyPrimaryFooter';
import { OnboardingData } from './OnboardingFlow';

interface StepProps {
  data: OnboardingData;
  setData: React.Dispatch<React.SetStateAction<OnboardingData>>;
  onNext: () => void;
  onBack: () => void;
  onComplete: () => void;
}

const focusAreas = [
  {
    id: 'energi',
    label: 'Energi',
    emoji: '⚡',
    description: 'Styr din energi og undgå overbelastning',
    selectedBorder: 'border-yellow-400',
    selectedBg: 'bg-yellow-400/10',
    border: 'border-midnight-600',
  },
  {
    id: 'struktur',
    label: 'Struktur',
    emoji: '🗓️',
    description: 'Skab faste rutiner og overblik',
    selectedBorder: 'border-blue-400',
    selectedBg: 'bg-blue-400/10',
    border: 'border-midnight-600',
  },
  {
    id: 'mental-sundhed',
    label: 'Mental sundhed',
    emoji: '🧠',
    description: 'Plej dit indre velvære og ro',
    selectedBorder: 'border-violet-400',
    selectedBg: 'bg-violet-400/10',
    border: 'border-midnight-600',
  },
  {
    id: 'relationer',
    label: 'Relationer',
    emoji: '🤝',
    description: 'Styrk forbindelser til andre',
    selectedBorder: 'border-rose-400',
    selectedBg: 'bg-rose-400/10',
    border: 'border-midnight-600',
  },
  {
    id: 'søvn',
    label: 'Søvn',
    emoji: '😴',
    description: 'Bedre nattesøvn og hvile',
    selectedBorder: 'border-indigo-400',
    selectedBg: 'bg-indigo-400/10',
    border: 'border-midnight-600',
  },
  {
    id: 'bevægelse',
    label: 'Bevægelse',
    emoji: '🚶',
    description: 'Mere aktivitet i hverdagen',
    selectedBorder: 'border-emerald-400',
    selectedBg: 'bg-emerald-400/10',
    border: 'border-midnight-600',
  },
];

export default function StepFocusArea({ data, setData, onNext }: StepProps) {
  const [error, setError] = useState('');

  const toggle = (id: string) => {
    setError('');
    setData((d) => {
      const already = d.focusAreas.includes(id);
      if (already) {
        return { ...d, focusAreas: d.focusAreas.filter((f) => f !== id) };
      }
      if (d.focusAreas.length >= 3) {
        return d;
      }
      return { ...d, focusAreas: [...d.focusAreas, id] };
    });
  };

  const handleNext = () => {
    if (data.focusAreas.length === 0) {
      setError('Vælg mindst ét fokusområde for at fortsætte');
      return;
    }
    onNext();
  };

  return (
    <div className="max-w-lg mx-auto px-4 pb-28">
      {/* Header */}
      <div className="mb-4">
        <h2 className="font-display text-xl sm:text-2xl font-bold text-midnight-50 mb-1.5">
          Hvad vil du arbejde med,{' '}
          <span className="text-sunrise-400">{data.name}?</span>
        </h2>
        <p className="text-midnight-400 text-sm leading-relaxed">
          Vælg op til <strong className="text-midnight-200">3 fokusområder</strong>. Du kan altid ændre det senere.
        </p>
      </div>

      {/* Selection counter */}
      <div className="flex items-center gap-2 mb-4">
        {[1, 2, 3].map((n) => (
          <div
            key={`dot-${n}`}
            className={`h-2 flex-1 rounded-full transition-all duration-300 ${
              n <= data.focusAreas.length ? 'bg-sunrise-400' : 'bg-midnight-700'
            }`}
          />
        ))}
        <span className="text-xs text-midnight-400 font-medium ml-1">
          {data.focusAreas.length}/3
        </span>
      </div>

      {/* Focus area grid */}
      <div className="grid grid-cols-2 gap-2.5 mb-5">
        {focusAreas.map((area) => {
          const isSelected = data.focusAreas.includes(area.id);
          const isDisabled = !isSelected && data.focusAreas.length >= 3;

          return (
            <button
              key={`focus-${area.id}`}
              onClick={() => toggle(area.id)}
              disabled={isDisabled}
              className={`
                relative flex flex-col items-center text-center p-4 rounded-2xl border-2
                transition-all duration-200 cursor-pointer bg-midnight-800 min-h-[100px]
                ${isSelected
                  ? `${area.selectedBorder} ${area.selectedBg} shadow-md scale-[1.02]`
                  : isDisabled
                  ? 'border-midnight-700 opacity-40 cursor-not-allowed'
                  : `${area.border} hover:border-midnight-500 hover:shadow-md hover:scale-[1.01] active:scale-95`
                }
              `}
              aria-pressed={isSelected}
              aria-label={area.label}
            >
              {isSelected && (
                <div className="absolute top-2 right-2 w-5 h-5 bg-sunrise-400 rounded-full flex items-center justify-center">
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                    <path d="M1 4L3.5 6.5L9 1" stroke="#0f0f1a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              )}
              <span className="text-3xl mb-1.5 select-none">{area.emoji}</span>
              <span className="font-display font-bold text-midnight-100 text-sm mb-0.5 break-words w-full text-center">
                {area.label}
              </span>
              <span className="text-xs text-midnight-400 leading-snug break-words w-full text-center">
                {area.description}
              </span>
            </button>
          );
        })}
      </div>

      {error && (
        <p className="text-rose-400 text-sm font-medium text-center mb-4">{error}</p>
      )}

      <StickyPrimaryFooter>
        <button type="button" onClick={handleNext} className="btn-primary w-full text-base py-3.5 min-h-[48px]">
          Fortsæt →
        </button>
      </StickyPrimaryFooter>
    </div>
  );
}