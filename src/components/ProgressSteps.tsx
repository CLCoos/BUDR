'use client';

import React from 'react';
import { Check } from 'lucide-react';

interface ProgressStepsProps {
  totalSteps: number;
  currentStep: number;
}

export default function ProgressSteps({ totalSteps, currentStep }: ProgressStepsProps) {
  return (
    <div className="flex items-center justify-center gap-2">
      {Array.from({ length: totalSteps }).map((_, i) => {
        const stepNum = i + 1;
        const isCompleted = stepNum < currentStep;
        const isActive = stepNum === currentStep;

        return (
          <React.Fragment key={`step-${stepNum}`}>
            <div
              className="flex items-center justify-center rounded-full border-2 transition-all duration-300 flex-shrink-0"
              style={{
                width: isActive ? 32 : 28,
                height: isActive ? 32 : 28,
                borderColor: isCompleted || isActive ? '#FB923C' : 'rgba(255,255,255,0.15)',
                background: isCompleted || isActive ? '#FB923C' : 'rgba(255,255,255,0.05)',
                boxShadow: isActive ? '0 0 16px rgba(251,146,60,0.4)' : 'none',
              }}
            >
              {isCompleted ? (
                <Check size={14} strokeWidth={2.5} color="#0f0f1a" />
              ) : (
                <span
                  className="text-xs font-bold"
                  style={{ color: isActive ? '#0f0f1a' : 'rgba(255,255,255,0.3)' }}
                >
                  {stepNum}
                </span>
              )}
            </div>
            {i < totalSteps - 1 && (
              <div
                className="h-0.5 w-5 sm:w-8 rounded-full transition-all duration-500 flex-shrink-0"
                style={{ background: stepNum < currentStep ? '#FB923C' : 'rgba(255,255,255,0.1)' }}
              />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
}
