'use client';

import React, { useMemo, useState } from 'react';
import { Challenge } from './DailyChallengesView';
import ChallengeCard from './ChallengeCard';

interface ChallengeTaskListProps {
  challenges: Challenge[];
  onComplete: (id: string) => void;
}

const categoryOrder = [
  'Sundhed',
  'Krop',
  'Bevægelse',
  'Mad',
  'Ro',
  'Social',
  'Struktur',
  'Kreativitet',
  'Læring',
  'Refleksion',
  'Glæde',
  'Vækst',
];

export default function ChallengeTaskList({ challenges, onComplete }: ChallengeTaskListProps) {
  const [showAllPending, setShowAllPending] = useState(false);

  const grouped = useMemo(() => {
    const map: Record<string, Challenge[]> = {};
    challenges.forEach((c) => {
      if (!map[c.category]) map[c.category] = [];
      map[c.category].push(c);
    });
    // Sort by categoryOrder, then alphabetically for unknown categories
    return Object.entries(map).sort(([a], [b]) => {
      const ai = categoryOrder.indexOf(a);
      const bi = categoryOrder.indexOf(b);
      if (ai === -1 && bi === -1) return a.localeCompare(b);
      if (ai === -1) return 1;
      if (bi === -1) return -1;
      return ai - bi;
    });
  }, [challenges]);

  const pending = challenges.filter((c) => !c.completed);
  const completed = challenges.filter((c) => c.completed);
  const pendingVisibleCap = 3;
  const hiddenPendingCount = Math.max(0, pending.length - pendingVisibleCap);

  if (challenges.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <span className="text-5xl mb-4">😴</span>
        <p className="font-display font-bold text-midnight-200 text-lg">Hvil dig i dag</p>
        <p className="text-midnight-400 text-sm mt-1">Øg dit energiniveau for at se udfordringer</p>
      </div>
    );
  }

  let remainingSlots = showAllPending ? Number.POSITIVE_INFINITY : pendingVisibleCap;

  return (
    <div className="space-y-5">
      {/* Pending challenges grouped by category */}
      {pending.length > 0 &&
        grouped.map(([category, items]) => {
          const pendingItems = items.filter((c) => !c.completed);
          if (pendingItems.length === 0) return null;
          if (remainingSlots <= 0) return null;

          const sliceCount = showAllPending
            ? pendingItems.length
            : Math.min(pendingItems.length, remainingSlots);
          const toShow = pendingItems.slice(0, sliceCount);
          if (toShow.length === 0) return null;

          remainingSlots -= toShow.length;

          const icon = pendingItems[0]?.categoryIcon ?? '📌';

          return (
            <div key={`cat-${category}`}>
              <div className="flex items-center gap-2 mb-2.5">
                <span className="text-base">{icon}</span>
                <span className="text-xs font-bold text-midnight-400 uppercase tracking-wide">
                  {category}
                </span>
                <div className="flex-1 h-px bg-midnight-700" />
                <span className="text-xs text-midnight-500">{pendingItems.length} opgaver</span>
              </div>

              <div className="space-y-2.5">
                {toShow.map((challenge, idx) => (
                  <ChallengeCard
                    key={challenge.id}
                    challenge={challenge}
                    onComplete={onComplete}
                    animationDelay={idx * 60}
                  />
                ))}
              </div>
            </div>
          );
        })}

      {!showAllPending && hiddenPendingCount > 0 && (
        <button
          type="button"
          onClick={() => setShowAllPending(true)}
          className="w-full py-3.5 rounded-2xl text-sm font-semibold border border-sunrise-400/35 bg-sunrise-400/10 text-sunrise-300 hover:bg-sunrise-400/15 transition-colors min-h-[48px]"
        >
          Vis flere ({hiddenPendingCount} tilbage)
        </button>
      )}

      {/* Completed section */}
      {completed.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-2.5">
            <span className="text-base">✅</span>
            <span className="text-xs font-bold text-emerald-400 uppercase tracking-wide">
              Gennemført
            </span>
            <div className="flex-1 h-px bg-emerald-500/20" />
            <span className="text-xs text-emerald-400">{completed.length} opgaver</span>
          </div>
          <div className="space-y-2">
            {completed.map((challenge) => (
              <ChallengeCard
                key={challenge.id}
                challenge={challenge}
                onComplete={onComplete}
                animationDelay={0}
              />
            ))}
          </div>
        </div>
      )}

      {/* All done state */}
      {pending.length === 0 && completed.length > 0 && (
        <div className="bg-gradient-to-br from-sunrise-400/10 to-emerald-500/10 border border-sunrise-400/20 rounded-3xl p-6 text-center animate-pop-in">
          <span className="text-5xl block mb-3 companion-float">🏆</span>
          <p className="font-display font-bold text-midnight-50 text-lg">
            Alle udfordringer klaret!
          </p>
          <p className="text-midnight-400 text-sm mt-1">Du er fantastisk i dag 🌟</p>
        </div>
      )}
    </div>
  );
}
