'use client';

import React, { useState } from 'react';
import { Challenge } from './DailyChallengesView';
import CompanionAvatar from '@/components/CompanionAvatar';

interface CelebrationOverlayProps {
  challenge: Challenge;
  companion?: string;
}

const CONFETTI_COLORS = ['#FB923C', '#A78BFA', '#34D399', '#F472B6', '#60A5FA', '#FBBF24'];
const CONFETTI_COUNT = 18;

interface ConfettiPiece {
  id: number;
  color: string;
  left: number;
  delay: number;
  size: number;
  rotation: number;
}

export default function CelebrationOverlay({ challenge, companion = 'bjorn' }: CelebrationOverlayProps) {
  const [confetti] = useState<ConfettiPiece[]>(() =>
    Array.from({ length: CONFETTI_COUNT }, (_, i) => ({
      id: i,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      left: 5 + (i / CONFETTI_COUNT) * 90,
      delay: (i * 80) % 600,
      size: 6 + (i % 4) * 2,
      rotation: (i * 47) % 360,
    }))
  );

  return (
    <div className="fixed inset-0 z-50 pointer-events-none flex items-end justify-center pb-36">
      {confetti.map((piece) => (
        <div
          key={`confetti-${piece.id}`}
          className="absolute top-0 animate-confetti"
          style={{ left: `${piece.left}%`, animationDelay: `${piece.delay}ms`, animationDuration: '1.6s' }}
        >
          <div
            style={{
              width: piece.size,
              height: piece.size,
              backgroundColor: piece.color,
              borderRadius: piece.id % 3 === 0 ? '50%' : piece.id % 3 === 1 ? '2px' : '0',
              transform: `rotate(${piece.rotation}deg)`,
            }}
          />
        </div>
      ))}

      {/* Toast card */}
      <div className="animate-pop-in bg-midnight-800 rounded-3xl shadow-2xl border border-midnight-600 px-5 py-4 flex items-center gap-3 max-w-xs w-full mx-4">
        {/* Companion celebrating */}
        <CompanionAvatar
          companion={companion}
          size="sm"
          mood="excited"
          reaction="celebrate"
        />
        <div className="flex-1 min-w-0">
          <p className="font-display font-bold text-midnight-50 text-sm leading-tight">{challenge.title}</p>
          <p className="text-xs text-emerald-400 font-semibold mt-0.5">✅ Gennemført!</p>
          <div className="flex items-center gap-1.5 mt-1.5">
            <span className="text-xs font-bold text-aurora-teal bg-aurora-teal/10 px-2 py-0.5 rounded-full">
              ⚡ +{challenge.xp} XP
            </span>
            <span className="text-xs text-sunrise-400 font-semibold">🔥 Godt klaret!</span>
          </div>
        </div>
      </div>
    </div>
  );
}
