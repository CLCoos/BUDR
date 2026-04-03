'use client';

import React, { useState } from 'react';
import { Task } from './DailyStructureView';
import TaskCard from './TaskCard';

interface TaskTimeBlockProps {
  timeBlock: 'morgen' | 'eftermiddag' | 'aften';
  label: string;
  emoji: string;
  colorClass: string;
  bgClass: string;
  tasks: Task[];
  onComplete: (id: string) => void;
  onSkip: (id: string) => void;
  completingTaskId: string | null;
}

export default function TaskTimeBlock({
  label,
  emoji,
  colorClass,
  bgClass,
  tasks,
  onComplete,
  onSkip,
  completingTaskId,
}: TaskTimeBlockProps) {
  const [collapsed, setCollapsed] = useState(false);
  const completedCount = tasks.filter((t) => t.status === 'completed').length;
  const allDone = completedCount === tasks.length;

  return (
    <div className="mb-4">
      {/* Block header */}
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="w-full flex items-center justify-between mb-3 group"
        aria-expanded={!collapsed}
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-9 h-9 ${colorClass} rounded-2xl flex items-center justify-center shadow-sm`}
          >
            <span className="text-lg select-none">{emoji}</span>
          </div>
          <div className="text-left">
            <span className="font-display font-bold text-midnight-100 text-base">{label}</span>
            <p className="text-xs text-midnight-400 mt-0.5">
              {completedCount}/{tasks.length} gennemført
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {allDone && (
            <span className="text-xs bg-emerald-500/15 text-emerald-300 font-bold px-2.5 py-1 rounded-full">
              ✓ Færdig!
            </span>
          )}
          {/* Mini progress bar */}
          <div className="w-16 h-1.5 bg-midnight-700 rounded-full overflow-hidden">
            <div
              className={`h-full ${colorClass} rounded-full transition-all duration-500`}
              style={{ width: `${tasks.length > 0 ? (completedCount / tasks.length) * 100 : 0}%` }}
            />
          </div>
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            className={`text-midnight-500 transition-transform duration-200 ${collapsed ? '-rotate-90' : ''}`}
          >
            <path
              d="M4 6L8 10L12 6"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
      </button>

      {/* Tasks */}
      {!collapsed && (
        <div className={`${bgClass} rounded-3xl p-3 space-y-2.5`}>
          {tasks.length === 0 ? (
            <div className="text-center py-6">
              <span className="text-3xl block mb-2">🎯</span>
              <p className="text-sm text-midnight-400 font-medium">
                Ingen opgaver for {label.toLowerCase()}
              </p>
            </div>
          ) : (
            tasks.map((task) => (
              <TaskCard
                key={task.id}
                task={task}
                onComplete={onComplete}
                onSkip={onSkip}
                isCompleting={completingTaskId === task.id}
              />
            ))
          )}
        </div>
      )}
    </div>
  );
}
