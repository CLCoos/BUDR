'use client';

import React from 'react';

interface ProgressRingProps {
  percent: number;
  completed: number;
  total: number;
}

export default function ProgressRing({ percent, completed, total }: ProgressRingProps) {
  const radius = 42;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (percent / 100) * circumference;

  const getColor = () => {
    if (percent >= 80) return '#22c55e';
    if (percent >= 50) return '#f59e0b';
    if (percent >= 20) return '#fb923c';
    return '#334155';
  };

  const getMessage = () => {
    if (percent === 100) return 'Perfekt! 🎉';
    if (percent >= 80) return 'Næsten der! 💪';
    if (percent >= 50) return 'Godt arbejde! ⭐';
    if (percent >= 20) return 'Fortsæt! 🌱';
    return 'Klar til start! 🚀';
  };

  return (
    <div className="flex flex-col items-center bg-midnight-800 rounded-3xl border border-midnight-700 p-4 shadow-card-dark min-w-[110px]">
      <div className="relative">
        <svg width="100" height="100" viewBox="0 0 100 100" className="-rotate-90">
          {/* Background circle */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke="rgba(255,255,255,0.06)"
            strokeWidth="10"
          />
          {/* Progress circle */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke={getColor()}
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-700 ease-out"
          />
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-display text-2xl font-bold text-midnight-50 tabular-nums">
            {percent}%
          </span>
        </div>
      </div>
      <p className="text-xs font-semibold text-midnight-400 mt-1 text-center">
        {completed}/{total} opgaver
      </p>
      <p className="text-xs text-sunrise-400 font-bold mt-0.5">{getMessage()}</p>
    </div>
  );
}