'use client';

import React, { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useResident } from '../context/ResidentContext';
import type { LysThemeTokens } from '../lib/lysTheme';

const RESOURCE_CATEGORIES = [
  { key: 'søvn',     label: 'Søvn',      emoji: '😴' },
  { key: 'mad',      label: 'Mad',       emoji: '🍽' },
  { key: 'bevæg',    label: 'Bevægelse', emoji: '🚶' },
  { key: 'social',   label: 'Social',    emoji: '👥' },
  { key: 'stress',   label: 'Stress',    emoji: '🌊' },
];

type MoodDay = {
  date: string;        // YYYY-MM-DD
  energy_level: number | null;
};

type Props = {
  tokens: LysThemeTokens;
  accent: string;
  firstName: string;
  initials: string;
  reducedMotion: boolean;
  flowerFilledThisWeek?: boolean;
  onOpenBlomst: () => void;
  onOpenCrisis: () => void;
};

function getLevelColor(level: number | null): string {
  if (level === null) return 'rgba(0,0,0,0.10)';
  const colors = ['', '#EF4444', '#F97316', '#EAB308', '#84CC16', '#22C55E'];
  return colors[level] ?? '#EAB308';
}

export default function LysMigScreen({
  tokens,
  accent,
  firstName,
  initials,
  reducedMotion,
  flowerFilledThisWeek = false,
  onOpenBlomst,
  onOpenCrisis,
}: Props) {
  const { residentId } = useResident();
  const [moodHistory, setMoodHistory] = useState<MoodDay[]>([]);
  const [xpTotal, setXpTotal] = useState(0);

  // Load XP from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem('budr_xp_v1');
      if (raw) setXpTotal((JSON.parse(raw) as { total: number }).total);
    } catch { /* ignore */ }
  }, []);

  // Fetch last 7 days mood history from park_daily_checkin
  useEffect(() => {
    if (!residentId) return;
    const supabase = createClient();
    if (!supabase) return;
    const today = new Date();
    const sevenAgo = new Date(today);
    sevenAgo.setDate(today.getDate() - 6);
    const from = sevenAgo.toISOString().slice(0, 10);
    supabase
      .from('park_daily_checkin')
      .select('check_in_date, energy_level')
      .eq('resident_id', residentId)
      .gte('check_in_date', from)
      .order('check_in_date')
      .then(({ data }) => {
        if (!data) return;
        // Build 7-day array
        const map = new Map<string, number | null>();
        for (const row of data) {
          map.set(
            row.check_in_date as string,
            typeof row.energy_level === 'number' ? row.energy_level : null,
          );
        }
        const result: MoodDay[] = [];
        for (let i = 6; i >= 0; i--) {
          const d = new Date(today);
          d.setDate(today.getDate() - i);
          const key = d.toISOString().slice(0, 10);
          result.push({ date: key, energy_level: map.get(key) ?? null });
        }
        setMoodHistory(result);
      })
      .catch(() => { /* ignore */ });
  }, [residentId]);

  const level = Math.floor(xpTotal / 100) + 1;
  const xpProgress = xpTotal % 100;
  const streak = 5; // mock until we compute from check-in history
  const activeDays = moodHistory.filter(d => d.energy_level !== null).length;

  const isDarkish = tokens.bg.startsWith('#0') || tokens.bg.startsWith('#08');

  const cardBg = isDarkish ? 'rgba(255,255,255,0.07)' : tokens.cardBg;
  const subtext = isDarkish ? 'rgba(255,255,255,0.45)' : tokens.textMuted;

  return (
    <div className="space-y-4 px-5 pb-8 pt-4 font-sans" style={{ color: tokens.text }}>

      {/* Profile hero */}
      <section
        className="rounded-3xl p-6"
        style={{
          background: `linear-gradient(150deg, ${accent}18 0%, ${accent}06 100%)`,
          border: `1px solid ${accent}20`,
        }}
      >
        <div className="flex items-center gap-4 mb-5">
          <div
            className="h-20 w-20 shrink-0 rounded-full flex items-center justify-center text-2xl font-black text-white"
            style={{
              background: `linear-gradient(135deg, ${accent}, ${accent}99)`,
              boxShadow: `0 6px 24px ${accent}40`,
            }}
          >
            {initials}
          </div>
          <div>
            <h1 className="text-2xl font-black leading-tight">{firstName}</h1>
            <p className="text-sm mt-0.5 font-semibold" style={{ color: accent }}>
              Niveau {level}
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-0 mb-4">
          <div className="flex-1 text-center">
            <p className="text-2xl font-black">🔥 {streak}</p>
            <p className="text-xs mt-0.5" style={{ color: subtext }}>dages streak</p>
          </div>
          <div className="w-px h-10 self-center" style={{ backgroundColor: `${accent}25` }} />
          <div className="flex-1 text-center">
            <p className="text-2xl font-black" style={{ color: accent }}>{xpTotal}</p>
            <p className="text-xs mt-0.5" style={{ color: subtext }}>XP i alt</p>
          </div>
          <div className="w-px h-10 self-center" style={{ backgroundColor: `${accent}25` }} />
          <div className="flex-1 text-center">
            <p className="text-2xl font-black">📅 {activeDays}</p>
            <p className="text-xs mt-0.5" style={{ color: subtext }}>aktive dage</p>
          </div>
        </div>

        {/* XP progress bar */}
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-xs font-semibold" style={{ color: subtext }}>
              {xpProgress} / 100 XP til niveau {level + 1}
            </p>
            <p className="text-xs font-bold" style={{ color: accent }}>{xpProgress}%</p>
          </div>
          <div className="h-2 w-full rounded-full overflow-hidden" style={{ backgroundColor: `${accent}20` }}>
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${xpProgress}%`, backgroundColor: accent }}
            />
          </div>
        </div>
      </section>

      {/* 7-day mood chart */}
      <section
        className="rounded-3xl p-5"
        style={{ backgroundColor: cardBg, boxShadow: isDarkish ? 'none' : tokens.shadow }}
      >
        <h2 className="text-base font-bold mb-4">Ugentlig humørkurve</h2>
        <div className="flex items-end justify-between gap-1.5 h-16">
          {(moodHistory.length === 7 ? moodHistory : Array.from({ length: 7 }, (_, i) => ({
            date: new Date(Date.now() - i * 86400000).toISOString().slice(0, 10),
            energy_level: null,
          })).reverse()).map(day => {
            const barH = day.energy_level !== null
              ? `${(day.energy_level / 5) * 100}%`
              : '8px';
            const dayLabel = new Date(day.date).toLocaleDateString('da-DK', { weekday: 'short' }).slice(0, 3);
            return (
              <div key={day.date} className="flex flex-1 flex-col items-center gap-1">
                <div className="w-full flex-1 flex items-end rounded-sm overflow-hidden" style={{ backgroundColor: `${accent}14` }}>
                  <div
                    className="w-full rounded-sm transition-all duration-500"
                    style={{
                      height: barH,
                      backgroundColor: getLevelColor(day.energy_level),
                      animation: !reducedMotion ? 'lysTabIn 0.5s ease-out' : undefined,
                    }}
                  />
                </div>
                <p className="text-[9px] font-semibold capitalize" style={{ color: subtext }}>{dayLabel}</p>
              </div>
            );
          })}
        </div>
        <div className="flex items-center justify-between mt-3">
          {[1, 2, 3, 4, 5].map(l => (
            <div key={l} className="flex items-center gap-1">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: getLevelColor(l) }} />
              <span className="text-[9px]" style={{ color: subtext }}>{l}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Ressource-tendenser */}
      <section
        className="rounded-3xl p-5"
        style={{ backgroundColor: cardBg, boxShadow: isDarkish ? 'none' : tokens.shadow }}
      >
        <h2 className="text-base font-bold mb-4">Ressource-tendenser</h2>
        <div className="space-y-3">
          {RESOURCE_CATEGORIES.map((cat, idx) => {
            // Mock scores (later: compute from check-in data)
            const score = [4, 3, 4, 3, 2][idx] ?? 3;
            const trend: 'up' | 'down' | 'same' = (['up', 'same', 'up', 'down', 'same'] as const)[idx] ?? 'same';
            const trendIcon = trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→';
            const trendColor = trend === 'up' ? '#22C55E' : trend === 'down' ? '#EF4444' : tokens.textMuted;
            return (
              <div key={cat.key} className="flex items-center gap-3">
                <span className="text-xl w-7 text-center" aria-hidden>{cat.emoji}</span>
                <p className="text-sm font-medium w-24 shrink-0">{cat.label}</p>
                <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ backgroundColor: `${accent}14` }}>
                  <div
                    className="h-full rounded-full transition-all duration-500"
                    style={{ width: `${(score / 5) * 100}%`, backgroundColor: accent }}
                  />
                </div>
                <span className="text-sm font-bold w-5 text-center" style={{ color: trendColor }}>
                  {trendIcon}
                </span>
              </div>
            );
          })}
        </div>
      </section>

      {/* Ressourceblomst */}
      <section
        className="rounded-3xl p-5"
        style={{ backgroundColor: cardBg, boxShadow: isDarkish ? 'none' : tokens.shadow }}
      >
        <h2 className="text-base font-bold mb-3">Ressourceblomst 🌸</h2>
        <button
          type="button"
          onClick={onOpenBlomst}
          className={`min-h-[52px] w-full rounded-2xl py-3.5 text-sm font-bold text-white transition-all duration-200 active:scale-[0.98] ${
            !flowerFilledThisWeek && !reducedMotion ? 'animate-pulse' : ''
          }`}
          style={{
            background: `linear-gradient(135deg, ${accent}, ${accent}cc)`,
            boxShadow: !flowerFilledThisWeek ? `0 0 0 4px ${accent}33` : undefined,
          }}
        >
          {!flowerFilledThisWeek ? 'Din blomst venter 🌸' : 'Opdater din blomst'}
        </button>
      </section>

      {/* Crisis card */}
      <section
        className="rounded-3xl p-5"
        style={{
          backgroundColor: '#FFF1F2',
          border: '1.5px solid #FECDD3',
        }}
      >
        <div className="flex items-center gap-3 mb-3">
          <span className="text-2xl">🆘</span>
          <div>
            <h2 className="text-sm font-bold text-rose-900">Har du brug for hjælp?</h2>
            <p className="text-xs text-rose-700 mt-0.5">
              Du behøver ikke klare det alene.
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={onOpenCrisis}
          className="w-full rounded-2xl py-3.5 text-sm font-bold text-white transition-all duration-200 active:scale-[0.98]"
          style={{
            backgroundColor: '#E11D48',
            boxShadow: '0 4px 16px rgba(225,29,72,0.25)',
          }}
        >
          Åbn krise-støtte
        </button>
      </section>

    </div>
  );
}
