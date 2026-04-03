'use client';

import React from 'react';

interface RestDayToggleProps {
  isRestDay: boolean;
  onToggle: (val: boolean) => void;
}

export default function RestDayToggle({ isRestDay, onToggle }: RestDayToggleProps) {
  return (
    <div className="mt-3 mb-1">
      <button
        onClick={() => onToggle(!isRestDay)}
        className={`
          w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all duration-300
          ${
            isRestDay
              ? 'bg-aurora-violet/10 border-aurora-violet/40 shadow-sm'
              : 'bg-midnight-800 border-midnight-600 hover:border-midnight-500 hover:shadow-sm'
          }
        `}
        aria-pressed={isRestDay}
      >
        <div className="flex items-center gap-3">
          <span className="text-2xl select-none">{isRestDay ? '🌙' : '🗓️'}</span>
          <div className="text-left">
            <p
              className={`font-display font-bold text-sm ${isRestDay ? 'text-purple-300' : 'text-midnight-200'}`}
            >
              {isRestDay ? 'Hviledag aktiveret' : 'Marker som hviledag'}
            </p>
            <p className="text-xs text-midnight-400 mt-0.5">
              {isRestDay
                ? 'Ingen pres i dag — du fortjener hvile'
                : 'Tryk for at tage en pause fra opgaverne'}
            </p>
          </div>
        </div>

        {/* Toggle switch */}
        <div
          className={`w-12 h-6 rounded-full transition-all duration-300 flex items-center px-1 ${
            isRestDay ? 'bg-aurora-violet' : 'bg-midnight-600'
          }`}
        >
          <div
            className={`w-4 h-4 bg-white rounded-full shadow-sm transition-all duration-300 ${
              isRestDay ? 'translate-x-6' : 'translate-x-0'
            }`}
          />
        </div>
      </button>
    </div>
  );
}
