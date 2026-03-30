'use client';

import React, { useState, useEffect, useRef } from 'react';
import CompanionAvatar, { CompanionReaction } from '@/components/CompanionAvatar';

interface CompanionBubbleProps {
  companion: string;
  percent: number;
  completedToday: number;
  /** Pass the latest completed task ID to trigger a reaction */
  lastCompletedTaskId?: string;
}

const getCompanionMessage = (percent: number, completed: number): string => {
  if (percent === 100) return 'WOW! Du har klaret alle opgaver! Jeg er så stolt af dig! 🎉';
  if (percent >= 80) return 'Næsten alle opgaver! Du er fantastisk! 💪';
  if (percent >= 50) return `${completed} opgaver færdige — du er godt på vej! ⭐`;
  if (percent >= 20) return 'Godt begyndt! Husk: ét skridt ad gangen 🌱';
  if (completed === 0) return 'Hej! Klar til at starte dagen? Jeg er her! 🐾';
  return 'Fortsæt — du klarer det! Jeg tror på dig! 🤝';
};

const getMood = (percent: number): 'happy' | 'excited' | 'neutral' | 'sleepy' => {
  if (percent >= 80) return 'excited';
  if (percent >= 40) return 'happy';
  if (percent >= 10) return 'neutral';
  return 'sleepy';
};

export default function CompanionBubble({ companion, percent, completedToday, lastCompletedTaskId }: CompanionBubbleProps) {
  const message = getCompanionMessage(percent, completedToday);
  const mood = getMood(percent);
  const [reaction, setReaction] = useState<CompanionReaction>('idle');
  const prevTaskIdRef = useRef<string | undefined>(undefined);
  const prevPercentRef = useRef<number>(percent);

  // Trigger task completion reaction when a new task is completed
  useEffect(() => {
    if (lastCompletedTaskId && lastCompletedTaskId !== prevTaskIdRef.current) {
      prevTaskIdRef.current = lastCompletedTaskId;
      // Use celebrate for 100%, taskComplete otherwise
      setReaction(percent === 100 ? 'celebrate' : 'taskComplete');
    }
  }, [lastCompletedTaskId, percent]);

  // Trigger energy/mood reaction when percent crosses a milestone
  useEffect(() => {
    const prev = prevPercentRef.current;
    prevPercentRef.current = percent;
    const milestones = [25, 50, 75, 100];
    const crossed = milestones.some((m) => prev < m && percent >= m);
    if (crossed && percent !== 100) {
      setReaction('moodChange');
    }
  }, [percent]);

  return (
    <div className="flex-1 flex items-start gap-3 bg-midnight-800 rounded-3xl border border-midnight-700 p-4 shadow-card-dark">
      <CompanionAvatar
        companion={companion}
        size="sm"
        animate
        mood={mood}
        clickable
        reaction={reaction}
        onReactionEnd={() => setReaction('idle')}
      />
      <div className="flex-1 min-w-0">
        <p className="text-xs text-sunrise-400 font-semibold mb-1 font-display">Din ledsager:</p>
        <p className="text-sm text-midnight-200 font-medium leading-snug">{message}</p>
      </div>
    </div>
  );
}