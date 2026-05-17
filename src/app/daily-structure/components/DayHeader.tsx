'use client';

import React, { useState, useEffect } from 'react';
import AppLogo from '@/components/ui/AppLogo';

interface DayHeaderProps {
  streak: number;
  xp: number;
}

const dayNames = ['Søndag', 'Mandag', 'Tirsdag', 'Onsdag', 'Torsdag', 'Fredag', 'Lørdag'];
const monthNames = [
  'januar',
  'februar',
  'marts',
  'april',
  'maj',
  'juni',
  'juli',
  'august',
  'september',
  'oktober',
  'november',
  'december',
];

export default function DayHeader({ streak, xp }: DayHeaderProps) {
  const [dateStr, setDateStr] = useState('');

  useEffect(() => {
    const now = new Date();
    const day = dayNames[now.getDay()];
    const date = now.getDate();
    const month = monthNames[now.getMonth()];
    setDateStr(`${day} d. ${date}. ${month}`);
  }, []);

  return (
    <div className="sticky top-0 z-20 bg-midnight-900/90 backdrop-blur-xl border-b border-midnight-700/50">
      <div className="max-w-lg mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Logo + date */}
          <div className="flex items-center gap-2 min-w-0">
            <AppLogo size={32} />
            <div className="min-w-0">
              <span className="font-display text-base font-bold text-midnight-50">BUDR2.0</span>
              {dateStr && <p className="text-xs text-midnight-400 -mt-0.5 truncate">{dateStr}</p>}
            </div>
          </div>

          {/* Streak + XP badges */}
          <div className="flex items-center gap-1.5 flex-shrink-0">
            <div className="streak-badge">
              <span className="text-base">🔥</span>
              <span>{streak}</span>
            </div>
            <div className="xp-badge">
              <span className="text-base">⭐</span>
              <span className="hidden xs:inline">{xp} XP</span>
              <span className="xs:hidden">{xp}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
