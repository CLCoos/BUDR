'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Toaster, toast } from 'sonner';
import CheckInStepEnergy from './CheckInStepEnergy';
import CheckInStepMood from './CheckInStepMood';
import CheckInStepIntention from './CheckInStepIntention';
import CheckInComplete from './CheckInComplete';
import Lys from '@/components/Lys';
import CompanionAvatar, { CompanionReaction } from '@/components/CompanionAvatar';

export interface CheckInData {
  energy: number;
  mood: string;
  intention: string;
  companion: string;
}

export default function MorningCheckInFlow() {
  const router = useRouter();
  const [step, setStep] = useState(1);
  const [data, setData] = useState<CheckInData>({
    energy: 0,
    mood: '',
    intention: '',
    companion: 'bjorn',
  });
  const [transitioning, setTransitioning] = useState(false);
  const [companionReaction, setCompanionReaction] = useState<CompanionReaction>('idle');
  const prevEnergyRef = useRef<number>(0);
  const prevMoodRef = useRef<string>('');

  // Trigger energySwing reaction when energy changes
  useEffect(() => {
    if (data.energy && data.energy !== prevEnergyRef.current) {
      prevEnergyRef.current = data.energy;
      setCompanionReaction('energySwing');
    }
  }, [data.energy]);

  // Trigger moodChange reaction when mood changes
  useEffect(() => {
    if (data.mood && data.mood !== prevMoodRef.current) {
      prevMoodRef.current = data.mood;
      setCompanionReaction('moodChange');
    }
  }, [data.mood]);

  const goNext = () => {
    setTransitioning(true);
    setTimeout(() => {
      setStep((s) => s + 1);
      setTransitioning(false);
    }, 180);
  };

  const goBack = () => {
    if (step > 1) {
      setTransitioning(true);
      setTimeout(() => {
        setStep((s) => s - 1);
        setTransitioning(false);
      }, 180);
    }
  };

  const handleComplete = () => {
    try {
      const today = new Date().toISOString().slice(0, 10);
      localStorage.setItem(
        'budr_today_checkin',
        JSON.stringify({
          date: today,
          energy: data.energy,
          mood: data.mood,
          intention: data.intention,
        }),
      );
    } catch {
      /* ignore */
    }
    setCompanionReaction('celebrate');
    toast.success('God morgen! Din dag er klar 🌅');
    setTimeout(() => router.push('/daily-structure'), 1800);
  };

  const steps = [
    { num: 1, label: 'Energi' },
    { num: 2, label: 'Humør' },
    { num: 3, label: 'Intention' },
  ];

  const getLysMoodFromEnergy = () => {
    if (data.energy >= 4) return 'energized' as const;
    if (data.energy >= 3) return 'focused' as const;
    if (data.energy >= 2) return 'calm' as const;
    return 'tired' as const;
  };

  const getCompanionMood = (): 'happy' | 'excited' | 'neutral' | 'sleepy' => {
    if (data.energy >= 4) return 'excited';
    if (data.energy >= 3) return 'happy';
    if (data.energy >= 2) return 'neutral';
    if (data.energy > 0) return 'sleepy';
    return 'happy';
  };

  return (
    <div className="min-h-screen gradient-midnight flex flex-col">
      <Toaster position="top-center" />

      {/* Top bar */}
      <div className="sticky top-0 z-20 bg-midnight-900/90 backdrop-blur-xl border-b border-midnight-700/50">
        <div className="max-w-lg mx-auto px-4 pt-4 pb-3">
          <div className="flex items-center justify-between mb-3">
            {step > 1 && step < 4 ? (
              <button
                onClick={goBack}
                className="text-sunrise-400 font-medium text-sm hover:text-sunrise-300 transition-colors min-h-[44px] min-w-[44px] flex items-center"
              >
                ← Tilbage
              </button>
            ) : (
              <div className="min-h-[44px]" />
            )}
            {step < 4 && (
              <div className="flex items-center gap-2 ml-auto">
                {steps.map((s) => (
                  <div key={`check-step-${s.num}`} className="flex items-center gap-1.5">
                    <div
                      className={`rounded-full transition-all duration-300 flex items-center justify-center ${
                        s.num < step
                          ? 'w-6 h-6 bg-sunrise-400'
                          : s.num === step
                          ? 'w-7 h-7 bg-sunrise-400 shadow-sunrise'
                          : 'w-6 h-6 bg-midnight-700'
                      }`}
                    >
                      {s.num < step ? (
                        <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
                          <path d="M1 4L3.5 6.5L9 1" stroke="#0f0f1a" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      ) : (
                        <span className={`text-xs font-bold ${s.num === step ? 'text-midnight-900' : 'text-midnight-500'}`}>
                          {s.num}
                        </span>
                      )}
                    </div>
                    {s.num < steps.length && (
                      <div className={`w-5 h-0.5 rounded-full ${s.num < step ? 'bg-sunrise-400' : 'bg-midnight-700'}`} />
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Companion strip — shows animated companion reacting to energy/mood */}
      {step < 4 && (
        <div className="flex flex-col items-center py-4">
          <div className="flex justify-center items-center gap-4">
            <Lys mood={getLysMoodFromEnergy()} size="sm" />
            <CompanionAvatar
              companion={data.companion}
              size="sm"
              animate
              mood={getCompanionMood()}
              reaction={companionReaction}
              onReactionEnd={() => setCompanionReaction('idle')}
            />
          </div>
          {step === 1 && (
            <p className="text-center text-xs text-midnight-500 px-6 mt-3 max-w-md leading-relaxed">
              Lyset skifter fra kolde til varme farver, jo mere energi du viser — så du kan se med det samme, hvor du er.
            </p>
          )}
        </div>
      )}

      {/* Step content */}
      <div
        className={`flex-1 transition-all duration-200 ${
          transitioning ? 'opacity-0 translate-y-2' : 'opacity-100 translate-y-0'
        }`}
      >
        {step === 1 && <CheckInStepEnergy data={data} setData={setData} onNext={goNext} />}
        {step === 2 && <CheckInStepMood data={data} setData={setData} onNext={goNext} />}
        {step === 3 && <CheckInStepIntention data={data} setData={setData} onNext={goNext} />}
        {step === 4 && <CheckInComplete data={data} onComplete={handleComplete} />}
      </div>
    </div>
  );
}