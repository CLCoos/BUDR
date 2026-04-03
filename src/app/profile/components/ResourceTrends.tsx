'use client';

import React from 'react';

interface ResourceTrend {
  key: string;
  label: string;
  emoji: string;
  thisWeek: number;
  lastWeek: number;
  color: string;
  accentColor: string;
}

const RESOURCE_TRENDS: ResourceTrend[] = [
  {
    key: 'sleep',
    label: 'Søvn',
    emoji: '😴',
    thisWeek: 3.8,
    lastWeek: 3.2,
    color: 'bg-blue-400',
    accentColor: '#60A5FA',
  },
  {
    key: 'food',
    label: 'Mad',
    emoji: '🥗',
    thisWeek: 4.1,
    lastWeek: 3.9,
    color: 'bg-emerald-400',
    accentColor: '#34D399',
  },
  {
    key: 'movement',
    label: 'Bevægelse',
    emoji: '🚶',
    thisWeek: 3.2,
    lastWeek: 2.8,
    color: 'bg-sunrise-400',
    accentColor: '#FB923C',
  },
  {
    key: 'social',
    label: 'Social',
    emoji: '👥',
    thisWeek: 2.9,
    lastWeek: 3.5,
    color: 'bg-aurora-violet',
    accentColor: '#A78BFA',
  },
  {
    key: 'stress',
    label: 'Stress',
    emoji: '🧘',
    thisWeek: 3.5,
    lastWeek: 2.7,
    color: 'bg-aurora-teal',
    accentColor: '#2DD4BF',
  },
];

function TrendArrow({ thisWeek, lastWeek }: { thisWeek: number; lastWeek: number }) {
  const diff = thisWeek - lastWeek;
  if (Math.abs(diff) < 0.1) {
    return <span className="text-midnight-400 text-sm font-bold">→</span>;
  }
  if (diff > 0) {
    return <span className="text-emerald-400 text-sm font-bold">↑</span>;
  }
  return <span className="text-rose-400 text-sm font-bold">↓</span>;
}

export default function ResourceTrends() {
  return (
    <div className="card-dark">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xl">⚡</span>
        <h2 className="font-display text-base font-bold text-midnight-50">Ressource-tendenser</h2>
        <span className="ml-auto text-xs text-midnight-400">Ugentligt gennemsnit</span>
      </div>

      <div className="space-y-4">
        {RESOURCE_TRENDS.map((r) => {
          const pct = (r.thisWeek / 5) * 100;
          const lastPct = (r.lastWeek / 5) * 100;
          return (
            <div key={r.key}>
              <div className="flex items-center justify-between mb-1.5">
                <div className="flex items-center gap-2">
                  <span className="text-base">{r.emoji}</span>
                  <span className="text-sm font-semibold text-midnight-200">{r.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <TrendArrow thisWeek={r.thisWeek} lastWeek={r.lastWeek} />
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full border border-midnight-600 bg-midnight-700 text-midnight-200">
                    {r.thisWeek.toFixed(1)}/5
                  </span>
                </div>
              </div>
              {/* Stacked bar: last week (ghost) + this week */}
              <div className="relative h-3 bg-midnight-700 rounded-full overflow-hidden">
                {/* Last week ghost */}
                <div
                  className="absolute top-0 left-0 h-full rounded-full bg-midnight-600 transition-all duration-500"
                  style={{ width: `${lastPct}%` }}
                />
                {/* This week */}
                <div
                  className={`absolute top-0 left-0 h-full rounded-full ${r.color} transition-all duration-700`}
                  style={{ width: `${pct}%`, opacity: 0.85 }}
                />
              </div>
              <div className="flex justify-between mt-1">
                <span className="text-xs text-midnight-500">
                  Forrige uge: {r.lastWeek.toFixed(1)}
                </span>
                <span className="text-xs text-midnight-500">Maks: 5</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
