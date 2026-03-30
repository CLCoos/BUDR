'use client';

import React, { useState } from 'react';

interface DayMood {
  day: string;
  shortDay: string;
  mood: number | null;
  emoji: string;
}

const WEEKS_DATA: DayMood[][] = [
  [
    { day: 'Mandag', shortDay: 'Man', mood: 7, emoji: '🙂' },
    { day: 'Tirsdag', shortDay: 'Tir', mood: 5, emoji: '😐' },
    { day: 'Onsdag', shortDay: 'Ons', mood: 8, emoji: '🙂' },
    { day: 'Torsdag', shortDay: 'Tor', mood: 6, emoji: '😐' },
    { day: 'Fredag', shortDay: 'Fre', mood: 9, emoji: '😄' },
    { day: 'Lørdag', shortDay: 'Lør', mood: 8, emoji: '🙂' },
    { day: 'Søndag', shortDay: 'Søn', mood: null, emoji: '—' },
  ],
  [
    { day: 'Mandag', shortDay: 'Man', mood: 4, emoji: '😕' },
    { day: 'Tirsdag', shortDay: 'Tir', mood: 6, emoji: '😐' },
    { day: 'Onsdag', shortDay: 'Ons', mood: 7, emoji: '🙂' },
    { day: 'Torsdag', shortDay: 'Tor', mood: 5, emoji: '😐' },
    { day: 'Fredag', shortDay: 'Fre', mood: 8, emoji: '🙂' },
    { day: 'Lørdag', shortDay: 'Lør', mood: 9, emoji: '😄' },
    { day: 'Søndag', shortDay: 'Søn', mood: 7, emoji: '🙂' },
  ],
];

function getMoodAccent(mood: number): string {
  if (mood <= 3) return '#F87171';
  if (mood <= 5) return '#FB923C';
  if (mood <= 7) return '#FBBF24';
  if (mood <= 8) return '#34D399';
  return '#6EE7B7';
}

function getMoodEmoji(mood: number): string {
  if (mood <= 2) return '😔';
  if (mood <= 4) return '😕';
  if (mood <= 6) return '😐';
  if (mood <= 8) return '🙂';
  return '😄';
}

export default function WeeklyMoodChart() {
  const [weekIndex, setWeekIndex] = useState(0);
  const days = WEEKS_DATA[weekIndex];
  const validMoods = days.filter((d) => d.mood !== null).map((d) => d.mood as number);
  const avgMood = validMoods.length > 0 ? (validMoods.reduce((a, b) => a + b, 0) / validMoods.length).toFixed(1) : '—';

  return (
    <div className="card-dark">
      <div className="flex items-center gap-2 mb-4">
        <span className="text-xl">📈</span>
        <h2 className="font-display text-base font-bold text-midnight-50">Ugentlig humørkurve</h2>
        <div className="ml-auto flex items-center gap-1.5 bg-midnight-700 border border-midnight-600 rounded-full px-3 py-1">
          <span className="text-sm">{getMoodEmoji(parseFloat(avgMood) || 5)}</span>
          <span className="text-xs font-bold text-sunrise-300">Ø {avgMood}/10</span>
        </div>
      </div>

      <div className="flex gap-2 mb-5">
        {['Denne uge', 'Forrige uge'].map((label, i) => (
          <button
            key={i}
            onClick={() => setWeekIndex(i)}
            className={`flex-1 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 ${
              weekIndex === i
                ? 'bg-sunrise-400/20 text-sunrise-300 border border-sunrise-400/30' :'bg-midnight-700 text-midnight-400 border border-midnight-600 hover:text-midnight-200'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="flex items-end gap-2 h-32">
        {days.map((day) => {
          const barHeight = day.mood !== null ? (day.mood / 10) * 100 : 0;
          const accent = day.mood !== null ? getMoodAccent(day.mood) : 'rgba(255,255,255,0.05)';
          return (
            <div key={day.shortDay} className="flex-1 flex flex-col items-center gap-1">
              <div className="relative w-full flex-1 flex items-end">
                <div
                  className="w-full rounded-t-xl transition-all duration-500"
                  style={{
                    height: `${Math.max(barHeight, 6)}%`,
                    background: day.mood !== null ? accent : 'rgba(255,255,255,0.05)',
                    opacity: 0.85,
                  }}
                />
              </div>
              <span className="text-xs text-midnight-500 font-medium">{day.shortDay}</span>
            </div>
          );
        })}
      </div>

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-midnight-700">
        {[{ color: '#F87171', label: 'Lav' }, { color: '#FBBF24', label: 'Middel' }, { color: '#34D399', label: 'Høj' }].map((item) => (
          <div key={item.label} className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-full" style={{ background: item.color }} />
            <span className="text-xs text-midnight-500">{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
