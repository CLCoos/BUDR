'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import Lys from '@/components/Lys';
import BottomNav from '@/components/BottomNav';

const gentlePrompts = [
  'Du er her. Det er nok.',
  'Træk vejret. Én gang ad gangen.',
  'Du behøver ikke præstere i dag.',
  'Hvile er ikke svaghed. Det er visdom.',
  'Lys er her med dig.',
];

export default function StilleTilstand() {
  const router = useRouter();
  const [promptIndex, setPromptIndex] = React.useState(0);
  const [fading, setFading] = React.useState(false);

  const nextPrompt = () => {
    setFading(true);
    setTimeout(() => {
      setPromptIndex((i) => (i + 1) % gentlePrompts?.length);
      setFading(false);
    }, 400);
  };

  return (
    <div className="min-h-screen stille-bg flex flex-col items-center justify-center pb-24 px-8">
      {/* Back */}
      <button
        onClick={() => router?.back()}
        className="absolute top-6 left-6 text-midnight-500 hover:text-midnight-300 transition-colors text-sm"
      >
        ← Tilbage
      </button>
      <div className="flex flex-col items-center gap-10 animate-fade-in">
        {/* Lys */}
        <Lys mood="calm" size="xl" showMessage={false} />

        {/* Gentle prompt */}
        <button
          onClick={nextPrompt}
          className="text-center focus:outline-none"
          aria-label="Næste besked"
        >
          <p
            className={`font-display text-2xl font-light text-midnight-200 leading-relaxed transition-opacity duration-400 max-w-xs text-center ${
              fading ? 'opacity-0' : 'opacity-100'
            }`}
          >
            {gentlePrompts?.[promptIndex]}
          </p>
          <p className="text-midnight-600 text-xs mt-4">Tryk for næste</p>
        </button>

        {/* Minimal actions */}
        <div className="flex flex-col gap-3 w-full max-w-xs">
          <button
            onClick={() => router?.push('/daily-structure')}
            className="w-full py-3 rounded-2xl bg-midnight-800/60 border border-midnight-700/50 text-midnight-300 text-sm font-medium hover:bg-midnight-700/60 transition-all duration-200 active:scale-95"
          >
            Se min dag
          </button>
          <button
            onClick={() => router?.push('/journal')}
            className="w-full py-3 rounded-2xl bg-midnight-800/60 border border-midnight-700/50 text-midnight-300 text-sm font-medium hover:bg-midnight-700/60 transition-all duration-200 active:scale-95"
          >
            Skriv lidt
          </button>
        </div>
      </div>
      <BottomNav />
    </div>
  );
}
