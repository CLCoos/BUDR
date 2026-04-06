'use client';

import React, { useState } from 'react';
import { Task } from './DailyStructureView';

interface TaskCardProps {
  task: Task;
  onComplete: (id: string) => void;
  onSkip: (id: string) => void;
  isCompleting: boolean;
}

const difficultyColors: Record<string, string> = {
  let: 'bg-emerald-500/15 text-emerald-300',
  normal: 'bg-sunrise-400/15 text-sunrise-300',
  udfordrende: 'bg-rose-500/15 text-rose-300',
};

const difficultyLabels: Record<string, string> = {
  let: 'Let',
  normal: 'Normal',
  udfordrende: 'Udfordrende',
};

export default function TaskCard({ task, onComplete, onSkip, isCompleting }: TaskCardProps) {
  const [showActions, setShowActions] = useState(false);

  const isCompleted = task.status === 'completed';
  const isSkipped = task.status === 'skipped';
  const isInProgress = task.status === 'in-progress';

  return (
    <div
      className={`
        task-card relative overflow-hidden
        transition-all duration-400
        ${isCompleted ? 'completed opacity-75' : ''}
        ${isSkipped ? 'opacity-50 bg-midnight-900/50 border-midnight-700/30' : ''}
        ${isInProgress ? 'active border-sunrise-400/60' : ''}
        ${isCompleting ? 'scale-95 opacity-60' : ''}
      `}
      onMouseEnter={() => setShowActions(true)}
      onMouseLeave={() => setShowActions(false)}
    >
      {/* In-progress indicator */}
      {isInProgress && (
        <div className="absolute left-0 top-0 bottom-0 w-1 bg-amber-400 rounded-l-2xl" />
      )}

      <div className="flex items-center gap-3">
        {/* Complete button */}
        <button
          onClick={() => onComplete(task.id)}
          disabled={isSkipped || isCompleting}
          className={`
            w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 border-2
            transition-all duration-200 active:scale-90
            ${
              isCompleted
                ? 'bg-emerald-500 border-emerald-500 text-white shadow-sm'
                : isSkipped
                  ? 'bg-midnight-700 border-midnight-600 cursor-not-allowed'
                  : 'bg-midnight-800 border-midnight-500 hover:border-sunrise-400 hover:bg-midnight-700'
            }
          `}
          aria-label={isCompleted ? 'Marker som ikke gennemført' : 'Marker som gennemført'}
        >
          {isCompleted ? (
            <svg width="16" height="12" viewBox="0 0 16 12" fill="none">
              <path
                d="M1.5 6L5.5 10L14.5 1"
                stroke="white"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          ) : isSkipped ? (
            <span className="text-midnight-500 text-lg">—</span>
          ) : (
            <span className="text-xl select-none">{task.emoji}</span>
          )}
        </button>

        {/* Task info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span
              className={`font-semibold text-sm truncate ${
                isCompleted
                  ? 'line-through text-midnight-500'
                  : isSkipped
                    ? 'text-midnight-500 line-through'
                    : 'text-midnight-100'
              }`}
            >
              {task.title}
            </span>
            {task.isRecommended && !isCompleted && !isSkipped && (
              <span className="text-xs bg-sunrise-400/15 text-sunrise-300 font-semibold px-1.5 py-0.5 rounded-full flex-shrink-0">
                ⭐ Anbefalet
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-midnight-500">⏱ {task.duration}</span>
            <span className="text-midnight-700">·</span>
            <span className="text-xs text-midnight-500">{task.category}</span>
            <span className="text-midnight-700">·</span>
            <span
              className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${difficultyColors[task.difficulty]}`}
            >
              {difficultyLabels[task.difficulty]}
            </span>
          </div>
        </div>

        {/* Actions — always visible on mobile, hover-only on desktop */}
        <div
          className={`flex items-center gap-1.5 transition-all duration-200 ${
            showActions ? 'opacity-100' : 'opacity-100 sm:opacity-0'
          }`}
        >
          {!isCompleted && !isSkipped && (
            <button
              onClick={() => onSkip(task.id)}
              className="w-8 h-8 rounded-xl bg-midnight-700 hover:bg-midnight-600 flex items-center justify-center text-midnight-400 active:scale-90 transition-all"
              aria-label="Spring over"
              title="Spring over"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path
                  d="M2 7h10M8 3l4 4-4 4"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          )}
          {isSkipped && (
            <button
              onClick={() => onSkip(task.id)}
              className="w-8 h-8 rounded-xl bg-sunrise-400/10 hover:bg-sunrise-400/20 flex items-center justify-center text-sunrise-400 active:scale-90 transition-all"
              aria-label="Gendan opgave"
              title="Gendan"
            >
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                <path
                  d="M1 1v5h5M13 13V8H8"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M1 6a6 6 0 0 1 10.66-3.77M13 8a6 6 0 0 1-10.66 3.77"
                  stroke="currentColor"
                  strokeWidth="1.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Completed overlay shimmer */}
      {isCompleted && (
        <div className="absolute inset-0 bg-gradient-to-r from-transparent via-emerald-500/5 to-transparent pointer-events-none rounded-2xl" />
      )}
    </div>
  );
}
