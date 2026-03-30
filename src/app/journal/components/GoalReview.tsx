'use client';

import React, { useState } from 'react';
import { GoalItem } from './JournalView';

interface GoalReviewProps {
  goals: GoalItem[];
  onChange: (goals: GoalItem[]) => void;
}

export default function GoalReview({ goals, onChange }: GoalReviewProps) {
  const [newGoalText, setNewGoalText] = useState('');

  const toggleGoal = (id: string) => {
    onChange(goals.map((g) => (g.id === id ? { ...g, done: !g.done } : g)));
  };

  const addGoal = () => {
    const text = newGoalText.trim();
    if (!text) return;
    const newGoal: GoalItem = {
      id: `g-${Date.now()}`,
      text,
      done: false,
    };
    onChange([...goals, newGoal]);
    setNewGoalText('');
  };

  const removeGoal = (id: string) => {
    onChange(goals.filter((g) => g.id !== id));
  };

  const completedCount = goals.filter((g) => g.done).length;
  const pct = goals.length > 0 ? Math.round((completedCount / goals.length) * 100) : 0;

  return (
    <div className="card-dark">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xl">🎯</span>
        <h2 className="font-display text-base font-bold text-midnight-50">Mål-gennemgang</h2>
        <span className="ml-auto text-xs font-bold text-sunrise-300">{completedCount}/{goals.length}</span>
      </div>

      {/* Progress bar */}
      {goals.length > 0 && (
        <div className="mb-4">
          <div className="h-2 bg-midnight-700 rounded-full overflow-hidden mt-2">
            <div
              className="h-full bg-gradient-to-r from-sunrise-400 to-aurora-teal rounded-full transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          <p className="text-xs text-midnight-400 mt-1">{pct}% gennemført</p>
        </div>
      )}

      {/* Goal list */}
      <div className="space-y-2 mb-4">
        {goals.map((goal) => (
          <div
            key={goal.id}
            className={`flex items-center gap-3 rounded-2xl border-2 px-4 py-3 transition-all duration-200 ${
              goal.done
                ? 'bg-aurora-teal/10 border-aurora-teal/30' :'bg-midnight-900/40 border-midnight-600 hover:border-midnight-500'
            }`}
          >
            <button
              onClick={() => toggleGoal(goal.id)}
              className={`w-6 h-6 rounded-full border-2 flex items-center justify-center flex-shrink-0 transition-all duration-200 active:scale-90 ${
                goal.done
                  ? 'bg-aurora-teal border-aurora-teal text-midnight-900' :'border-midnight-500 hover:border-sunrise-400'
              }`}
              aria-label={goal.done ? 'Marker som ikke gjort' : 'Marker som gjort'}
            >
              {goal.done && (
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </button>
            <span className={`flex-1 text-sm font-medium ${goal.done ? 'line-through text-midnight-500' : 'text-midnight-100'}`}>
              {goal.text}
            </span>
            <button
              onClick={() => removeGoal(goal.id)}
              className="text-midnight-600 hover:text-rose-400 transition-colors duration-150 text-lg leading-none"
              aria-label="Fjern mål"
            >
              ×
            </button>
          </div>
        ))}

        {goals.length === 0 && (
          <p className="text-sm text-midnight-400 text-center py-3">Ingen mål endnu – tilføj et nedenfor</p>
        )}
      </div>

      {/* Add goal */}
      <div className="flex gap-2">
        <input
          type="text"
          value={newGoalText}
          onChange={(e) => setNewGoalText(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && addGoal()}
          placeholder="Tilføj et nyt mål..."
          className="flex-1 rounded-xl border-2 border-midnight-600 bg-midnight-900 px-3 py-2 text-sm text-midnight-100 placeholder-midnight-600 focus:outline-none focus:border-sunrise-400 transition-colors"
        />
        <button
          onClick={addGoal}
          disabled={!newGoalText.trim()}
          className="bg-sunrise-400 hover:bg-sunrise-500 disabled:opacity-40 text-midnight-900 font-bold rounded-xl px-4 py-2 text-sm transition-all duration-200 active:scale-95"
        >
          +
        </button>
      </div>
    </div>
  );
}
