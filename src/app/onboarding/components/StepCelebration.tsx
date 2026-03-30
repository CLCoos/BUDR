'use client';

import React, { useEffect, useState } from 'react';
import StickyPrimaryFooter from '@/components/StickyPrimaryFooter';
import { OnboardingData } from './OnboardingFlow';
import CompanionAvatar from '@/components/CompanionAvatar';
import { CompanionReaction } from '@/components/CompanionAvatar';

interface StepProps {
  data: OnboardingData;
  setData: React.Dispatch<React.SetStateAction<OnboardingData>>;
  onNext: () => void;
  onBack: () => void;
  onComplete: () => void;
}

const confettiItems = [
  { id: 'conf-1', emoji: '🎉', left: '10%', delay: '0s' },
  { id: 'conf-2', emoji: '✨', left: '25%', delay: '0.2s' },
  { id: 'conf-3', emoji: '🌟', left: '40%', delay: '0.1s' },
  { id: 'conf-4', emoji: '🎊', left: '60%', delay: '0.3s' },
  { id: 'conf-5', emoji: '💛', left: '75%', delay: '0.15s' },
  { id: 'conf-6', emoji: '🎈', left: '88%', delay: '0.25s' },
];

export default function StepCelebration({ data, onComplete }: StepProps) {
  const [showContent, setShowContent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [companionReaction, setCompanionReaction] = useState<CompanionReaction>('idle');
  const [reactionPhase, setReactionPhase] = useState(0);

  useEffect(() => {
    const t1 = setTimeout(() => setShowContent(true), 300);
    // Phase 1: celebrate on mount
    const t2 = setTimeout(() => setCompanionReaction('celebrate'), 600);
    // Phase 2: after celebrate ends, do a second pulse
    const t3 = setTimeout(() => {
      setReactionPhase(1);
      setCompanionReaction('taskComplete');
    }, 4000);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, []);

  // Save companion to localStorage so other screens can use it
  useEffect(() => {
    if (data.companion && typeof window !== 'undefined') {
      localStorage.setItem('budr_companion', data.companion);
    }
  }, [data.companion]);

  const handleComplete = () => {
    setIsLoading(true);
    setCompanionReaction('celebrate');
    // TODO: Backend — save profile to Supabase, create initial daily structure
    setTimeout(() => {
      onComplete();
    }, 800);
  };

  const companionEmoji: Record<string, string> = {
    bjorn: '🐻',
    ræv: '🦊',
    ugle: '🦉',
    pingvin: '🐧',
    hund: '🐶',
    kat: '🐱',
  };

  const companionName: Record<string, string> = {
    bjorn: 'Bjørn',
    ræv: 'Ræv',
    ugle: 'Ugle',
    pingvin: 'Pingvin',
    hund: 'Hund',
    kat: 'Kat',
  };

  return (
    <div className="max-w-lg mx-auto px-4 pb-32 flex flex-col items-center text-center relative overflow-hidden" style={{ minHeight: '100dvh', justifyContent: 'center' }}>
      {/* Confetti */}
      {confettiItems.map((item) => (
        <div
          key={item.id}
          className="absolute top-0 text-2xl animate-confetti pointer-events-none"
          style={{ left: item.left, animationDelay: item.delay }}
        >
          {item.emoji}
        </div>
      ))}

      {/* Celebration circle */}
      <div
        className={`relative mb-6 transition-all duration-700 ${
          showContent ? 'opacity-100 scale-100' : 'opacity-0 scale-75'
        }`}
      >
        {/* Pulsing ring behind companion */}
        <div className="absolute inset-0 rounded-full animate-ping opacity-10 bg-yellow-400/40" style={{ animationDuration: '2.5s' }} />
        <div className="absolute -inset-3 rounded-full animate-ping opacity-5 bg-amber-400/30" style={{ animationDuration: '3s', animationDelay: '0.5s' }} />

        <div className="w-36 h-36 sm:w-44 sm:h-44 bg-gradient-to-br from-amber-500/20 via-yellow-400/15 to-amber-400/20 rounded-full flex items-center justify-center shadow-lg border border-amber-400/20 relative z-10">
          <CompanionAvatar
            companion={data.companion || 'bjorn'}
            size="lg"
            animate
            mood="excited"
            clickable
            reaction={companionReaction}
            onReactionEnd={() => setCompanionReaction('idle')}
          />
        </div>
        <div className="absolute -top-3 -right-3 text-3xl animate-bounce z-20">🎉</div>
        <div className="absolute -bottom-2 -left-3 text-2xl animate-bounce z-20" style={{ animationDelay: '0.3s' }}>✨</div>
        <div className="absolute top-2 -left-5 text-xl animate-bounce z-20" style={{ animationDelay: '0.6s' }}>🌟</div>
      </div>

      {/* Text */}
      <div
        className={`transition-all duration-700 delay-200 ${
          showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}
      >
        <h1 className="font-display text-2xl sm:text-3xl font-bold text-midnight-50 mb-2">
          Tillykke, {data.name}! 🎊
        </h1>
        <p className="text-midnight-400 text-sm mb-5 leading-relaxed max-w-xs mx-auto">
          Du er klar til at starte din vej.{' '}
          <strong className="text-sunrise-300">
            {companionName[data.companion] || 'Din ledsager'}
          </strong>{' '}
          {companionEmoji[data.companion] || '🐻'} glæder sig til at følge dig!
        </p>
      </div>

      {/* Summary card */}
      <div
        className={`w-full bg-midnight-800 rounded-2xl border border-midnight-600 p-4 mb-6 text-left space-y-2.5 transition-all duration-700 delay-300 ${
          showContent ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'
        }`}
      >
        <p className="font-display font-bold text-midnight-200 text-sm mb-2">Din profil</p>
        <div className="flex items-center gap-3">
          <span className="text-lg">👤</span>
          <div>
            <p className="text-xs text-midnight-500 font-medium">Navn</p>
            <p className="text-midnight-100 font-semibold text-sm">{data.name}</p>
          </div>
        </div>
        <div className="flex items-start gap-3">
          <span className="text-lg">🎯</span>
          <div>
            <p className="text-xs text-midnight-500 font-medium">Fokusområder</p>
            <div className="flex flex-wrap gap-1.5 mt-1">
              {data.focusAreas.map((area) => (
                <span
                  key={`summary-focus-${area}`}
                  className="bg-sunrise-400/15 border border-sunrise-400/25 text-sunrise-300 text-xs font-semibold px-2 py-0.5 rounded-full"
                >
                  {area}
                </span>
              ))}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-lg">🐾</span>
          <div>
            <p className="text-xs text-midnight-500 font-medium">Ledsager</p>
            <p className="text-midnight-100 font-semibold text-sm">
              {companionEmoji[data.companion]} {companionName[data.companion] || data.companion}
            </p>
          </div>
        </div>
      </div>

      {/* CTA */}
      <StickyPrimaryFooter className="!z-30">
        <button
          type="button"
          onClick={handleComplete}
          disabled={isLoading}
          onMouseEnter={() => !isLoading && setCompanionReaction('taskComplete')}
          className="btn-primary w-full text-base py-3.5 disabled:opacity-70 min-h-[52px]"
          aria-label="Start din første dag"
        >
          {isLoading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Opretter din profil...
            </span>
          ) : (
            'Start din første dag 🌅'
          )}
        </button>
      </StickyPrimaryFooter>
    </div>
  );
}