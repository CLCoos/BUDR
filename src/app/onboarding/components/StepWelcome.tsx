'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import Lys from '@/components/Lys';
import StickyPrimaryFooter from '@/components/StickyPrimaryFooter';
import { OnboardingData } from './OnboardingFlow';

interface StepProps {
  data: OnboardingData;
  setData: React.Dispatch<React.SetStateAction<OnboardingData>>;
  onNext: () => void;
  onBack: () => void;
  onComplete: () => void;
}

export default function StepWelcome({ data, setData, onNext }: StepProps) {
  const [nameError, setNameError] = useState('');

  const handleNext = () => {
    if (!data.name.trim()) {
      setNameError('Skriv venligst dit navn for at fortsætte');
      return;
    }
    setNameError('');
    onNext();
  };

  return (
    <div className="max-w-lg mx-auto px-4 pb-28 flex flex-col items-center text-center">
      {/* Lys hero */}
      <div className="mb-4 mt-2">
        <Lys mood="calm" size="lg" showMessage />
      </div>

      {/* Headline */}
      <h1 suppressHydrationWarning className="font-display text-2xl sm:text-3xl font-bold text-midnight-50 mb-2 leading-tight">
        Velkommen til<br />
        <span suppressHydrationWarning className="gradient-sunrise-text">BUDR2.0</span>
      </h1>
      <p className="text-midnight-400 text-sm sm:text-base mb-6 max-w-xs leading-relaxed">
        Din personlige støtte til en god dag. Struktur, overblik og fremgang — i dit eget tempo.
      </p>

      {/* Name Input */}
      <div className="w-full mb-5">
        <label htmlFor="user-name" className="block text-left text-sm font-semibold text-midnight-300 mb-2">
          Hvad hedder du? 👋
        </label>
        <input
          id="user-name"
          type="text"
          value={data.name}
          onChange={(e) => {
            setData((d) => ({ ...d, name: e.target.value }));
            if (nameError) setNameError('');
          }}
          onKeyDown={(e) => e.key === 'Enter' && handleNext()}
          placeholder="Dit fornavn..."
          className={`w-full rounded-2xl border-2 px-4 py-3.5 text-base font-medium bg-midnight-800 text-midnight-50 placeholder-midnight-600 outline-none transition-all duration-200 focus:border-sunrise-400 ${
            nameError ? 'border-rose-400' : 'border-midnight-600'
          }`}
          autoFocus
        />
        {nameError && <p className="mt-2 text-sm text-rose-400 text-left font-medium">{nameError}</p>}
      </div>

      {/* Promise bullets */}
      <div className="w-full bg-midnight-800/60 rounded-2xl border border-midnight-600/50 p-4 mb-6 text-left space-y-2.5">
        {[
          { emoji: '🗓️', text: 'Tydelig daglig struktur' },
          { emoji: '🎯', text: 'Opgaver tilpasset din energi' },
          { emoji: '💜', text: 'Lys — din ledsager på hvert skridt' },
          { emoji: '🌊', text: 'Energiflod der viser din dag' },
        ].map((item) => (
          <div key={`promise-${item.emoji}`} className="flex items-center gap-3">
            <span className="text-lg">{item.emoji}</span>
            <span className="text-midnight-200 font-medium text-sm">{item.text}</span>
          </div>
        ))}
      </div>

      <p className="w-full text-center mb-2">
        <Link
          href="/daily-structure"
          className="text-xs font-medium text-midnight-500 hover:text-sunrise-400 transition-colors underline underline-offset-2"
        >
          Spring over
        </Link>
        <span className="text-midnight-600"> · </span>
        <span className="text-xs text-midnight-500">udforsk appen først</span>
      </p>

      <StickyPrimaryFooter>
        <button type="button" onClick={handleNext} className="btn-primary w-full text-base py-3.5 min-h-[48px]">
          Kom i gang →
        </button>
        <p className="text-center text-[11px] text-midnight-500 mt-2">Det tager ca. 2 minutter at sætte op</p>
      </StickyPrimaryFooter>
    </div>
  );
}