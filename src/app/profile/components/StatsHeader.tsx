'use client';

import React from 'react';

const LEVEL_THRESHOLDS = [0, 100, 250, 500, 900, 1400, 2000, 2800, 3800, 5000];

function getLevelInfo(xp: number) {
  let level = 1;
  for (let i = LEVEL_THRESHOLDS.length - 1; i >= 0; i--) {
    if (xp >= LEVEL_THRESHOLDS[i]) { level = i + 1; break; }
  }
  const currentThreshold = LEVEL_THRESHOLDS[level - 1] ?? 0;
  const nextThreshold = LEVEL_THRESHOLDS[level] ?? LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];
  const progress = Math.min(100, Math.round(((xp - currentThreshold) / (nextThreshold - currentThreshold)) * 100));
  return { level, progress, nextThreshold };
}

const MOCK_XP = 620;
const MOCK_STREAK = 7;
const MOCK_TOTAL_DAYS = 23;

export default function StatsHeader() {
  const { level, progress, nextThreshold } = getLevelInfo(MOCK_XP);

  return (
    <div className="space-y-4">
      {/* Avatar + name */}
      <div className="card-dark flex items-center gap-4">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shadow-md flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #FB923C 0%, #A78BFA 100%)' }}
        >
          🦊
        </div>
        <div className="flex-1 min-w-0">
          <h2 className="font-display text-lg font-bold text-midnight-50">Daglig Helt</h2>
          <p className="text-sm text-midnight-400">Niveau {level} · {MOCK_XP} XP samlet</p>
          <div className="mt-2">
            <div className="flex justify-between text-xs text-midnight-500 mb-1">
              <span>{MOCK_XP} XP</span>
              <span>{nextThreshold} XP til niveau {level + 1}</span>
            </div>
            <div className="h-2.5 bg-midnight-700 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-700"
                style={{ width: `${progress}%`, background: 'linear-gradient(90deg, #FB923C, #A78BFA)' }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { emoji: '🔥', value: MOCK_STREAK, label: 'Dages streak', accent: '#FB923C' },
          { emoji: '⚡', value: MOCK_XP, label: 'Total XP', accent: '#FBBF24' },
          { emoji: '📅', value: MOCK_TOTAL_DAYS, label: 'Aktive dage', accent: '#34D399' },
        ].map((stat) => (
          <div
            key={stat.label}
            className="flex flex-col items-center justify-center rounded-3xl border p-4 gap-1"
            style={{ borderColor: `${stat.accent}25`, background: `${stat.accent}10` }}
          >
            <span className="text-2xl">{stat.emoji}</span>
            <span className="font-display text-2xl font-bold" style={{ color: stat.accent }}>{stat.value}</span>
            <span className="text-xs text-midnight-400 font-medium text-center leading-tight">{stat.label}</span>
          </div>
        ))}
      </div>

      {/* Level badge */}
      <div className="card-dark flex items-center gap-4">
        <div
          className="w-12 h-12 rounded-2xl flex items-center justify-center text-xl shadow-sm flex-shrink-0"
          style={{ background: 'linear-gradient(135deg, #A78BFA 0%, #60A5FA 100%)' }}
        >
          🏅
        </div>
        <div>
          <p className="text-xs text-midnight-400 font-medium">Nuværende niveau</p>
          <p className="font-display text-base font-bold text-midnight-50">
            {level <= 1 ? 'Nybegynder' : level <= 2 ? 'Udfordrer' : level <= 3 ? 'Vokser' : level <= 4 ? 'Stærk' : level <= 5 ? 'Mester' : 'Legende'}
          </p>
          <p className="text-xs text-midnight-500">{progress}% til næste niveau</p>
        </div>
        <div className="ml-auto">
          <span className="font-display text-3xl font-bold gradient-sunrise-text">{level}</span>
        </div>
      </div>
    </div>
  );
}
