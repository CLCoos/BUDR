'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Toaster, toast } from 'sonner';
import ProgressSteps from '@/components/ProgressSteps';
import StepWelcome from './StepWelcome';
import StepFocusArea from './StepFocusArea';
import StepGoals from './StepGoals';
import StepCompanion from './StepCompanion';
import StepCelebration from './StepCelebration';
import Lys from '@/components/Lys';

export interface OnboardingData {
  name: string;
  focusAreas: string[];
  goals: string[];
  companion: string;
}

const TOTAL_STEPS = 5;

export default function OnboardingFlow() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [data, setData] = useState<OnboardingData>({
    name: '',
    focusAreas: [],
    goals: [],
    companion: '',
  });
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionDirection, setTransitionDirection] = useState<'forward' | 'back'>('forward');
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const goNext = () => {
    setTransitionDirection('forward');
    setIsTransitioning(true);
    setTimeout(() => {
      setCurrentStep((s) => s + 1);
      setIsTransitioning(false);
    }, 250);
  };

  const goBack = () => {
    if (currentStep > 1) {
      setTransitionDirection('back');
      setIsTransitioning(true);
      setTimeout(() => {
        setCurrentStep((s) => s - 1);
        setIsTransitioning(false);
      }, 250);
    }
  };

  const handleComplete = () => {
    toast.success('Profil gemt! Velkommen til BUDR2.0 🎉');
    setTimeout(() => router.push('/morning-check-in'), 1500);
  };

  const stepProps = { data, setData, onNext: goNext, onBack: goBack, onComplete: handleComplete };

  const transitionClass = mounted && isTransitioning
    ? transitionDirection === 'forward'
      ? 'opacity-0 translate-x-4' :'opacity-0 -translate-x-4' :'opacity-100 translate-x-0';

  return (
    <div suppressHydrationWarning className="min-h-screen gradient-midnight flex flex-col">
      <Toaster position="top-center" />

      {/* Top Bar */}
      <div suppressHydrationWarning className="sticky top-0 z-20 bg-midnight-900/90 backdrop-blur-xl border-b border-midnight-700/50">
        <div className="max-w-lg mx-auto px-4 py-3">
          <div className="flex items-center justify-between mb-3">
            {currentStep > 1 && currentStep < TOTAL_STEPS ? (
              <button
                onClick={goBack}
                className="text-sunrise-400 font-medium text-sm hover:text-sunrise-300 transition-colors min-h-[44px] min-w-[44px] flex items-center"
                aria-label="Gå tilbage"
              >
                ← Tilbage
              </button>
            ) : (
              <div className="min-h-[44px]" />
            )}
            {currentStep < TOTAL_STEPS && (
              <div className="ml-auto">
                <ProgressSteps totalSteps={TOTAL_STEPS} currentStep={currentStep} />
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Lys companion with step indicator */}
      {currentStep < TOTAL_STEPS && (
        <div className="flex justify-center pt-4">
          <Lys mood="calm" size="sm" />
        </div>
      )}

      {/* Step Content with directional transition */}
      <div
        suppressHydrationWarning
        className={`flex-1 transition-all duration-250 ${transitionClass}`}
      >
        {currentStep === 1 && <StepWelcome {...stepProps} />}
        {currentStep === 2 && <StepFocusArea {...stepProps} />}
        {currentStep === 3 && <StepGoals {...stepProps} />}
        {currentStep === 4 && <StepCompanion {...stepProps} />}
        {currentStep === 5 && <StepCelebration {...stepProps} />}
      </div>
    </div>
  );
}