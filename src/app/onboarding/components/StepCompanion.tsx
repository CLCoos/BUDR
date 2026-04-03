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

const companions = [
  {
    id: 'bjorn',
    name: 'Bjørn',
    emoji: '🐻',
    personality: 'Rolig og stærk',
    personalLine: '«Vi tager det i dit tempo.»',
    description: 'Bjørn er tålmodig og altid klar til at støtte dig',
    selectedBorder: 'border-amber-400',
    selectedBg: 'bg-amber-400/10',
    circleBg: 'bg-gradient-to-br from-amber-300/30 to-amber-600/20',
    sparkle: '✨',
    accent: 'text-amber-300',
  },
  {
    id: 'ræv',
    name: 'Ræv',
    emoji: '🦊',
    personality: 'Nysgerrig og klog',
    description: 'Ræv finder altid nye måder at hjælpe dig på',
    selectedBorder: 'border-orange-400',
    selectedBg: 'bg-orange-400/10',
    circleBg: 'bg-gradient-to-br from-orange-300/30 to-red-500/20',
    sparkle: '🍂',
    accent: 'text-orange-300',
  },
  {
    id: 'ugle',
    name: 'Ugle',
    emoji: '🦉',
    personality: 'Vis og omhyggelig',
    personalLine: '«Jeg ser det små fremskridt, du overser.»',
    description: 'Ugle husker alt og holder øje med din fremgang',
    selectedBorder: 'border-indigo-400',
    selectedBg: 'bg-indigo-400/10',
    circleBg: 'bg-gradient-to-br from-indigo-300/30 to-purple-600/20',
    sparkle: '🌙',
    accent: 'text-indigo-300',
  },
  {
    id: 'pingvin',
    name: 'Pingvin',
    emoji: '🐧',
    personality: 'Sjov og trofast',
    personalLine: '«Lille skridt fortjener også confetti.»',
    description: 'Pingvin er altid i godt humør og elsker at fejre',
    selectedBorder: 'border-sky-400',
    selectedBg: 'bg-sky-400/10',
    circleBg: 'bg-gradient-to-br from-sky-300/30 to-blue-600/20',
    sparkle: '❄️',
    accent: 'text-sky-300',
  },
  {
    id: 'hund',
    name: 'Hund',
    emoji: '🐶',
    personality: 'Loyal og energisk',
    personalLine: '«Jeg hepper på dig — også på tunge dage.»',
    description: 'Hund er altid glad for at se dig og give dig mod',
    selectedBorder: 'border-yellow-400',
    selectedBg: 'bg-yellow-400/10',
    circleBg: 'bg-gradient-to-br from-yellow-300/30 to-amber-500/20',
    sparkle: '🌟',
    accent: 'text-yellow-300',
  },
  {
    id: 'kat',
    name: 'Kat',
    emoji: '🐱',
    personality: 'Selvstændig og blid',
    personalLine: '«Ingen krav — bare nærvær, når du er klar.»',
    description: 'Kat respekterer dit tempo og er der når du har brug',
    selectedBorder: 'border-rose-400',
    selectedBg: 'bg-rose-400/10',
    circleBg: 'bg-gradient-to-br from-rose-300/30 to-pink-600/20',
    sparkle: '🌸',
    accent: 'text-rose-300',
  },
];

export default function StepCompanion({ data, setData, onNext }: StepProps) {
  const [error, setError] = useState('');

  const select = (id: string) => {
    setError('');
    setData((d) => ({ ...d, companion: id }));
  };

  const handleNext = () => {
    if (!data.companion) {
      setError('Vælg en ledsager for at fortsætte');
      return;
    }
    onNext();
  };

  const selectedCompanion = companions.find((c) => c.id === data.companion);

  return (
    <div className="max-w-lg mx-auto px-4 pb-28">
      <div className="mb-4 text-center">
        <h2 className="font-display text-xl sm:text-2xl font-bold text-midnight-50 mb-1.5">
          Vælg din ledsager 🐾
        </h2>
        <p className="text-midnight-400 text-sm leading-relaxed">
          Din ledsager følger dig gennem appen og giver dig opmuntring og støtte.
        </p>
      </div>

      {/* Selected companion preview */}
      {selectedCompanion && (
        <div
          className={`mb-4 p-4 rounded-2xl bg-midnight-800 border-2 ${selectedCompanion.selectedBorder} ${selectedCompanion.selectedBg} flex items-center gap-4 animate-slide-up`}
        >
          <div
            className={`w-16 h-16 ${selectedCompanion.circleBg} rounded-full flex items-center justify-center shadow-lg companion-float flex-shrink-0 border-2 ${selectedCompanion.selectedBorder}`}
          >
            <span className="text-4xl select-none">{selectedCompanion.emoji}</span>
          </div>
          <div className="min-w-0">
            <p className="font-display font-bold text-midnight-50 text-base">
              {selectedCompanion.name} er din ledsager! {selectedCompanion.sparkle}
            </p>
            <p className="text-xs text-midnight-400 mt-0.5 leading-snug">
              {selectedCompanion.description}
            </p>
          </div>
        </div>
      )}

      {/* Companion grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {companions.map((companion) => {
          const isSelected = data.companion === companion.id;

          return (
            <button
              key={`companion-${companion.id}`}
              onClick={() => select(companion.id)}
              className={`
                flex flex-col items-center justify-center rounded-2xl border-2 p-4 cursor-pointer transition-all duration-200 min-h-[140px] relative overflow-hidden
                ${
                  isSelected
                    ? `${companion.selectedBorder} ${companion.selectedBg} shadow-xl scale-[1.04]`
                    : 'border-midnight-600 bg-midnight-800 hover:shadow-md hover:scale-[1.02] active:scale-95'
                }
              `}
              aria-pressed={isSelected}
              aria-label={`Vælg ${companion.name}`}
            >
              {/* Sparkle decoration top-right when selected */}
              {isSelected && (
                <span className="absolute top-2 right-2 text-sm animate-bounce">
                  {companion.sparkle}
                </span>
              )}

              {/* Circular animal avatar */}
              <div
                className={`w-16 h-16 rounded-full flex items-center justify-center mb-2.5 transition-all duration-300 border-2 ${
                  isSelected
                    ? `${companion.circleBg} ${companion.selectedBorder} shadow-lg companion-float`
                    : 'bg-midnight-700 border-midnight-600'
                }`}
              >
                <span className="text-4xl select-none">{companion.emoji}</span>
              </div>

              <p className="font-display font-bold text-midnight-100 text-sm break-words w-full text-center">
                {companion.name}
              </p>
              <p
                className={`text-xs mt-0.5 break-words w-full text-center ${isSelected ? companion.accent : 'text-midnight-400'}`}
              >
                {companion.personality}
              </p>
              <p className="text-[10px] text-midnight-500 mt-1 italic break-words w-full text-center leading-snug px-0.5">
                {companion.personalLine}
              </p>

              {isSelected && (
                <div className="mt-2 w-5 h-5 bg-sunrise-400 rounded-full flex items-center justify-center mx-auto">
                  <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                    <path
                      d="M1 4L3.5 6.5L9 1"
                      stroke="#0f0f1a"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </div>
              )}
            </button>
          );
        })}
      </div>

      {error && <p className="text-rose-400 text-sm font-medium text-center mb-4">{error}</p>}

      <StickyPrimaryFooter>
        <button
          type="button"
          onClick={handleNext}
          className="btn-primary w-full text-base py-3.5 min-h-[48px]"
        >
          Vælg {selectedCompanion ? selectedCompanion.name : 'ledsager'} →
        </button>
      </StickyPrimaryFooter>
    </div>
  );
}
