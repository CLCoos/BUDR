'use client';

import React, { useState, useCallback, useEffect } from 'react';
import type { LysThemeTokens } from '../lib/lysTheme';

type EnergyLevel = 1 | 2 | 3 | 4 | 5;

const ALL_CHALLENGES = [
  { id: 'ch-001', title: 'Drik et glas vand', emoji: '💧', category: 'Sundhed', xp: 5, minEnergy: 1 },
  { id: 'ch-002', title: 'Træk vejret dybt 5 gange', emoji: '🌬️', category: 'Ro', xp: 5, minEnergy: 1 },
  { id: 'ch-003', title: 'Stræk armene over hovedet', emoji: '🙆', category: 'Krop', xp: 5, minEnergy: 1 },
  { id: 'ch-004', title: 'Skriv én ting du er taknemmelig for', emoji: '🙏', category: 'Refleksion', xp: 10, minEnergy: 1 },
  { id: 'ch-005', title: 'Lyt til en sang du holder af', emoji: '🎵', category: 'Glæde', xp: 5, minEnergy: 1 },
  { id: 'ch-006', title: 'Spis et stykke frugt', emoji: '🍎', category: 'Mad', xp: 10, minEnergy: 2 },
  { id: 'ch-007', title: 'Ryd op på dit bord', emoji: '🧹', category: 'Struktur', xp: 10, minEnergy: 2 },
  { id: 'ch-008', title: 'Send en venlig besked til nogen', emoji: '💌', category: 'Social', xp: 15, minEnergy: 2 },
  { id: 'ch-009', title: 'Gå ud og få frisk luft i 5 min', emoji: '🌿', category: 'Bevægelse', xp: 10, minEnergy: 2 },
  { id: 'ch-010', title: 'Gå en tur på 15 minutter', emoji: '🚶', category: 'Bevægelse', xp: 20, minEnergy: 3 },
  { id: 'ch-011', title: 'Lav 10 squats', emoji: '🏋️', category: 'Krop', xp: 15, minEnergy: 3 },
  { id: 'ch-012', title: 'Ring til en ven eller familie', emoji: '📞', category: 'Social', xp: 20, minEnergy: 3 },
  { id: 'ch-013', title: 'Skriv 3 mål for i dag', emoji: '🎯', category: 'Struktur', xp: 15, minEnergy: 3 },
  { id: 'ch-014', title: 'Lav en kreativ aktivitet', emoji: '🎨', category: 'Kreativitet', xp: 20, minEnergy: 3 },
  { id: 'ch-015', title: 'Løb eller cykel i 20 minutter', emoji: '🏃', category: 'Bevægelse', xp: 30, minEnergy: 4 },
  { id: 'ch-016', title: 'Lær noget nyt i 15 min', emoji: '📚', category: 'Læring', xp: 25, minEnergy: 4 },
  { id: 'ch-017', title: 'Lav en sund middag fra bunden', emoji: '🍳', category: 'Mad', xp: 25, minEnergy: 4 },
  { id: 'ch-018', title: 'Ryd op i et rum', emoji: '🏠', category: 'Struktur', xp: 20, minEnergy: 4 },
  { id: 'ch-019', title: 'Træn i 30 minutter', emoji: '💪', category: 'Krop', xp: 40, minEnergy: 5 },
  { id: 'ch-020', title: 'Prøv noget du aldrig har gjort', emoji: '✨', category: 'Vækst', xp: 50, minEnergy: 5 },
];

const ENERGY_OPTIONS: { value: EnergyLevel; emoji: string; label: string }[] = [
  { value: 1, emoji: '😴', label: 'Meget træt' },
  { value: 2, emoji: '😔', label: 'Lidt træt' },
  { value: 3, emoji: '😐', label: 'OK' },
  { value: 4, emoji: '🙂', label: 'God energi' },
  { value: 5, emoji: '😄', label: 'Fuld energi' },
];

type Props = {
  tokens: LysThemeTokens;
  accent: string;
};

export default function LysDagTab({ tokens, accent }: Props) {
  const [energy, setEnergy] = useState<EnergyLevel>(3);
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [totalXp, setTotalXp] = useState(0);
  const [justCompleted, setJustCompleted] = useState<string | null>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem('budr_today_checkin');
      if (!raw) return;
      const parsed = JSON.parse(raw) as { date?: string; energy?: number };
      const today = new Date().toISOString().slice(0, 10);
      if (parsed.date === today && typeof parsed.energy === 'number' && parsed.energy >= 1 && parsed.energy <= 5) {
        setEnergy(parsed.energy as EnergyLevel);
      }
    } catch { /* ignore */ }
  }, []);

  const handleEnergyChange = (level: EnergyLevel) => {
    setEnergy(level);
    setCompleted(new Set());
    setTotalXp(0);
  };

  const handleComplete = useCallback((id: string, xp: number) => {
    setCompleted(prev => { const s = new Set(prev); s.add(id); return s; });
    setTotalXp(prev => prev + xp);
    setJustCompleted(id);
    setTimeout(() => setJustCompleted(null), 1200);
  }, []);

  const filtered = ALL_CHALLENGES.filter(c => c.minEnergy <= energy);
  const completedCount = filtered.filter(c => completed.has(c.id)).length;
  const totalCount = filtered.length;
  const progressPct = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  return (
    <div className="space-y-4 px-4 pt-4 pb-8" style={{ color: tokens.text }}>
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold">Dagens udfordringer</h1>
          <p className="text-sm mt-0.5" style={{ color: tokens.textMuted }}>Tilpasset dit energiniveau</p>
        </div>
        {totalXp > 0 && (
          <div
            className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm font-bold text-white"
            style={{ backgroundColor: accent }}
          >
            <span>⚡</span>
            <span>+{totalXp} XP</span>
          </div>
        )}
      </div>

      {/* Energy selector */}
      <section
        className="rounded-2xl border p-4"
        style={{ borderColor: tokens.cardBorder, backgroundColor: tokens.cardBg }}
      >
        <p className="mb-3 text-sm font-semibold" style={{ color: tokens.textMuted }}>Hvad er dit energiniveau?</p>
        <div className="flex gap-2">
          {ENERGY_OPTIONS.map(opt => {
            const isOn = energy === opt.value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => handleEnergyChange(opt.value)}
                className="flex flex-1 flex-col items-center gap-1 rounded-xl border py-3 transition-all duration-200 min-h-[60px]"
                style={{
                  backgroundColor: isOn ? `${accent}22` : 'transparent',
                  borderColor: isOn ? accent : tokens.cardBorder,
                  color: isOn ? accent : tokens.textMuted,
                }}
                aria-pressed={isOn}
                title={opt.label}
              >
                <span className="text-xl">{opt.emoji}</span>
                <span className="text-[10px] font-bold">{opt.value}</span>
              </button>
            );
          })}
        </div>
        <p className="mt-2 text-center text-sm font-medium" style={{ color: tokens.textMuted }}>
          {ENERGY_OPTIONS.find(o => o.value === energy)?.label}
        </p>
      </section>

      {/* Progress */}
      {totalCount > 0 && (
        <div>
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs" style={{ color: tokens.textMuted }}>{completedCount} af {totalCount} gennemført</span>
            <span className="text-xs font-bold" style={{ color: accent }}>{Math.round(progressPct)}%</span>
          </div>
          <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: `${accent}22` }}>
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%`, backgroundColor: accent }}
            />
          </div>
        </div>
      )}

      {/* Challenges list */}
      <div className="space-y-2">
        {filtered.map(challenge => {
          const isDone = completed.has(challenge.id);
          const isNew = justCompleted === challenge.id;
          return (
            <button
              key={challenge.id}
              type="button"
              onClick={() => !isDone && handleComplete(challenge.id, challenge.xp)}
              disabled={isDone}
              className="w-full flex items-center gap-3 rounded-2xl border p-4 text-left transition-all duration-200 active:scale-[0.98]"
              style={{
                backgroundColor: isDone ? `${accent}18` : tokens.cardBg,
                borderColor: isDone ? `${accent}55` : tokens.cardBorder,
                transform: isNew ? 'scale(1.01)' : undefined,
              }}
            >
              <span className="text-2xl flex-shrink-0">{challenge.emoji}</span>
              <div className="flex-1 min-w-0">
                <p
                  className="text-sm font-semibold leading-snug"
                  style={{
                    color: isDone ? tokens.textMuted : tokens.text,
                    textDecoration: isDone ? 'line-through' : 'none',
                  }}
                >
                  {challenge.title}
                </p>
                <p className="text-xs mt-0.5" style={{ color: tokens.textMuted }}>{challenge.category}</p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <span
                  className="text-xs font-bold rounded-full px-2 py-0.5"
                  style={{ backgroundColor: `${accent}22`, color: accent }}
                >
                  +{challenge.xp} XP
                </span>
                {isDone && <span className="text-base" style={{ color: accent }}>✓</span>}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
