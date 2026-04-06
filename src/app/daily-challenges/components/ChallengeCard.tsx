'use client';

import React, { useState } from 'react';
import { Challenge } from './DailyChallengesView';

interface ChallengeCardProps {
  challenge: Challenge;
  onComplete: (id: string) => void;
  animationDelay: number;
}

export default function ChallengeCard({ challenge, onComplete, animationDelay }: ChallengeCardProps) {
  const [pressing, setPressing] = useState(false);

  const handleTap = () => {
    if (challenge.completed) return;
    setPressing(true);
    setTimeout(() => {
      setPressing(false);
      onComplete(challenge.id);
    }, 150);
  };

  const formatDuration = (minutes: number) => {
    if (minutes < 60) return `${minutes} min`;
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    return m > 0 ? `${h}t ${m}m` : `${h} time`;
  };

  return (
    <div
      className="animate-slide-up"
      style={{ animationDelay: `${animationDelay}ms`, animationFillMode: 'both' }}
    >
      <button
        onClick={handleTap}
        disabled={challenge.completed}
        className={`w-full text-left flex items-center gap-3 rounded-2xl border-2 p-4 transition-all duration-200 ${
          pressing ? 'scale-95' : ''
        } ${
          challenge.completed
            ? 'opacity-60 cursor-default border-midnight-700/30 bg-midnight-900/40' :'border-midnight-600/50 bg-midnight-800/60 hover:border-midnight-500/70 active:scale-[0.98]'
        }`}
        aria-label={challenge.completed ? `${challenge.title} - gennemført` : `Gennemfør: ${challenge.title}`}
      >
        {/* Completion circle */}
        <div
          className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 border-2 transition-all duration-300"
          style={{
            borderColor: challenge.completed ? '#34D399' : 'rgba(255,255,255,0.12)',
            background: challenge.completed ? '#34D399' : 'rgba(255,255,255,0.04)',
          }}
        >
          {challenge.completed ? (
            <svg width="18" height="14" viewBox="0 0 18 14" fill="none" className="animate-pop-in">
              <path d="M1.5 7L6.5 12L16.5 1" stroke="#0f0f1a" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : (
            <span className="text-xl select-none">{challenge.emoji}</span>
          )}
        </div>

        {/* Task info */}
        <div className="flex-1 min-w-0">
          <span className={`font-semibold text-sm leading-tight ${challenge.completed ? 'line-through text-midnight-500' : 'text-midnight-100'}`}>
            {challenge.title}
          </span>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="flex items-center gap-1 text-xs text-midnight-500">
              <span>{challenge.categoryIcon}</span>
              <span>{challenge.category}</span>
            </span>
            <span className="text-midnight-700 text-xs">·</span>
            <span className="flex items-center gap-0.5 text-xs text-midnight-500">
              <svg width="10" height="10" viewBox="0 0 10 10" fill="none" className="flex-shrink-0">
                <circle cx="5" cy="5" r="4" stroke="currentColor" strokeWidth="1.2" />
                <path d="M5 2.5V5L6.5 6.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
              </svg>
              <span>{formatDuration(challenge.duration)}</span>
            </span>
            <span className="text-midnight-700 text-xs">·</span>
            <span className="text-xs font-semibold text-aurora-teal bg-aurora-teal/10 px-1.5 py-0.5 rounded-full">
              +{challenge.xp} XP
            </span>
          </div>
        </div>

        {!challenge.completed && (
          <div className="flex-shrink-0 text-midnight-500">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M6 3l5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </div>
        )}
      </button>
    </div>
  );
}
