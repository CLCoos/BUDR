'use client';

import dynamic from 'next/dynamic';
import React, { useState, useCallback, useEffect, useRef } from 'react';
import BottomNav from '@/components/BottomNav';
import EnergySelector from './EnergySelector';
import ChallengeTaskList from './ChallengeTaskList';
import CelebrationOverlay from './CelebrationOverlay';
import Lys, { LysMood } from '@/components/Lys';
import CompanionAvatar, { CompanionReaction } from '@/components/CompanionAvatar';
import { createClient } from '@/lib/supabase/client';

export type EnergyLevel = 1 | 2 | 3 | 4 | 5;

export interface Challenge {
  id: string;
  title: string;
  emoji: string;
  category: string;
  categoryIcon: string;
  duration: number;
  xp: number;
  minEnergy: EnergyLevel;
  completed: boolean;
  tags: string[];
}

const ALL_CHALLENGES: Challenge[] = [
  { id: 'ch-001', title: 'Drik et glas vand', emoji: '💧', category: 'Sundhed', categoryIcon: '🩺', duration: 1, xp: 5, minEnergy: 1, completed: false, tags: ['hvile', 'krop'] },
  { id: 'ch-002', title: 'Træk vejret dybt 5 gange', emoji: '🌬️', category: 'Ro', categoryIcon: '🧘', duration: 2, xp: 5, minEnergy: 1, completed: false, tags: ['ro', 'vejrtrækning'] },
  { id: 'ch-003', title: 'Stræk armene over hovedet', emoji: '🙆', category: 'Krop', categoryIcon: '💪', duration: 2, xp: 5, minEnergy: 1, completed: false, tags: ['krop', 'let'] },
  { id: 'ch-004', title: 'Skriv én ting du er taknemmelig for', emoji: '🙏', category: 'Refleksion', categoryIcon: '📓', duration: 3, xp: 10, minEnergy: 1, completed: false, tags: ['refleksion', 'ro'] },
  { id: 'ch-005', title: 'Lyt til en sang du holder af', emoji: '🎵', category: 'Glæde', categoryIcon: '😊', duration: 4, xp: 5, minEnergy: 1, completed: false, tags: ['glæde', 'ro'] },
  { id: 'ch-006', title: 'Spis et stykke frugt', emoji: '🍎', category: 'Mad', categoryIcon: '🥗', duration: 5, xp: 10, minEnergy: 2, completed: false, tags: ['mad', 'sundhed'] },
  { id: 'ch-007', title: 'Ryd op på dit bord', emoji: '🧹', category: 'Struktur', categoryIcon: '📋', duration: 5, xp: 10, minEnergy: 2, completed: false, tags: ['struktur', 'orden'] },
  { id: 'ch-008', title: 'Send en venlig besked til nogen', emoji: '💌', category: 'Social', categoryIcon: '👥', duration: 5, xp: 15, minEnergy: 2, completed: false, tags: ['social', 'forbindelse'] },
  { id: 'ch-009', title: 'Gå ud og få frisk luft i 5 min', emoji: '🌿', category: 'Bevægelse', categoryIcon: '🚶', duration: 5, xp: 10, minEnergy: 2, completed: false, tags: ['bevægelse', 'natur'] },
  { id: 'ch-010', title: 'Gå en tur på 15 minutter', emoji: '🚶', category: 'Bevægelse', categoryIcon: '🚶', duration: 15, xp: 20, minEnergy: 3, completed: false, tags: ['bevægelse', 'krop'] },
  { id: 'ch-011', title: 'Lav 10 squats', emoji: '🏋️', category: 'Krop', categoryIcon: '💪', duration: 5, xp: 15, minEnergy: 3, completed: false, tags: ['krop', 'styrke'] },
  { id: 'ch-012', title: 'Ring til en ven eller familie', emoji: '📞', category: 'Social', categoryIcon: '👥', duration: 15, xp: 20, minEnergy: 3, completed: false, tags: ['social', 'forbindelse'] },
  { id: 'ch-013', title: 'Skriv 3 mål for i dag', emoji: '🎯', category: 'Struktur', categoryIcon: '📋', duration: 10, xp: 15, minEnergy: 3, completed: false, tags: ['struktur', 'planlægning'] },
  { id: 'ch-014', title: 'Lav en kreativ aktivitet', emoji: '🎨', category: 'Kreativitet', categoryIcon: '🎨', duration: 20, xp: 20, minEnergy: 3, completed: false, tags: ['kreativitet', 'glæde'] },
  { id: 'ch-015', title: 'Løb eller cykel i 20 minutter', emoji: '🏃', category: 'Bevægelse', categoryIcon: '🚶', duration: 20, xp: 30, minEnergy: 4, completed: false, tags: ['bevægelse', 'kondition'] },
  { id: 'ch-016', title: 'Lær noget nyt i 15 min', emoji: '📚', category: 'Læring', categoryIcon: '🧠', duration: 15, xp: 25, minEnergy: 4, completed: false, tags: ['læring', 'vækst'] },
  { id: 'ch-017', title: 'Lav en sund middag fra bunden', emoji: '🍳', category: 'Mad', categoryIcon: '🥗', duration: 30, xp: 25, minEnergy: 4, completed: false, tags: ['mad', 'sundhed'] },
  { id: 'ch-018', title: 'Ryd op i et rum', emoji: '🏠', category: 'Struktur', categoryIcon: '📋', duration: 20, xp: 20, minEnergy: 4, completed: false, tags: ['struktur', 'orden'] },
  { id: 'ch-019', title: 'Træn i 30 minutter', emoji: '💪', category: 'Krop', categoryIcon: '💪', duration: 30, xp: 40, minEnergy: 5, completed: false, tags: ['krop', 'styrke'] },
  { id: 'ch-020', title: 'Prøv noget du aldrig har gjort', emoji: '✨', category: 'Vækst', categoryIcon: '🧠', duration: 30, xp: 50, minEnergy: 5, completed: false, tags: ['vækst', 'mod'] },
];

const energyConfig = [
  { value: 1 as EnergyLevel, emoji: '😴', label: 'Meget træt', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20', activeBorder: 'border-blue-400', activeBg: 'bg-blue-500/15' },
  { value: 2 as EnergyLevel, emoji: '😔', label: 'Lidt træt', color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20', activeBorder: 'border-purple-400', activeBg: 'bg-purple-500/15' },
  { value: 3 as EnergyLevel, emoji: '😐', label: 'OK', color: 'text-sunrise-300', bg: 'bg-sunrise-400/10', border: 'border-sunrise-400/20', activeBorder: 'border-sunrise-400', activeBg: 'bg-sunrise-400/15' },
  { value: 4 as EnergyLevel, emoji: '🙂', label: 'God energi', color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', activeBorder: 'border-emerald-400', activeBg: 'bg-emerald-500/15' },
  { value: 5 as EnergyLevel, emoji: '😄', label: 'Fuld energi', color: 'text-sunrise-400', bg: 'bg-sunrise-500/10', border: 'border-sunrise-500/20', activeBorder: 'border-sunrise-400', activeBg: 'bg-sunrise-400/20' },
];

export { energyConfig };

function getLysMood(energy: EnergyLevel): LysMood {
  if (energy >= 5) return 'happy';
  if (energy >= 4) return 'energized';
  if (energy >= 3) return 'focused';
  if (energy >= 2) return 'calm';
  return 'tired';
}

const energyLabels: Record<EnergyLevel, string> = {
  1: 'meget træt',
  2: 'lidt træt',
  3: 'OK',
  4: 'god energi',
  5: 'fuld energi',
};

// Dynamically import the AI motivation strip to avoid SSR issues
const AiMotivationStrip = dynamic(() => import('./AiMotivationStrip'), { ssr: false });

export default function DailyChallengesView() {
  const [energy, setEnergy] = useState<EnergyLevel>(3);
  const [challenges, setChallenges] = useState<Challenge[]>(ALL_CHALLENGES);
  const [celebration, setCelebration] = useState<{ show: boolean; challenge: Challenge | null }>({ show: false, challenge: null });
  const [totalXp, setTotalXp] = useState(0);
  const [companionReaction, setCompanionReaction] = useState<CompanionReaction>('idle');
  const prevEnergyRef = useRef<EnergyLevel>(3);
  const companion = 'bjorn';

  useEffect(() => {
    try {
      const raw = localStorage.getItem('budr_today_checkin');
      if (!raw) return;
      const parsed = JSON.parse(raw) as { date?: string; energy?: number };
      const today = new Date().toISOString().slice(0, 10);
      if (
        parsed.date === today &&
        typeof parsed.energy === 'number' &&
        parsed.energy >= 1 &&
        parsed.energy <= 5
      ) {
        const level = parsed.energy as EnergyLevel;
        setEnergy(level);
        prevEnergyRef.current = level;
      }
    } catch {
      /* ignore */
    }
  }, []);

  const filteredChallenges = challenges.filter((c) => c.minEnergy <= energy);
  const completedCount = filteredChallenges.filter((c) => c.completed).length;
  const totalCount = filteredChallenges.length;

  const handleComplete = useCallback((id: string) => {
    const challenge = challenges.find((c) => c.id === id);
    if (!challenge || challenge.completed) return;
    setChallenges((prev) => prev.map((c) => (c.id === id ? { ...c, completed: true } : c)));
    setTotalXp((prev) => prev + (challenge?.xp ?? 0));
    setCelebration({ show: true, challenge });
    setCompanionReaction('taskComplete');
    setTimeout(() => setCelebration({ show: false, challenge: null }), 2200);

    void (async () => {
      const supabase = createClient();
      if (!supabase) return;
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const today = new Date().toISOString().slice(0, 10);
      const { error } = await supabase.from('care_challenge_completions').insert({
        resident_user_id: user.id,
        challenge_id: id,
        completed_date: today,
      });
      if (error && !String(error.message || '').includes('duplicate')) {
        /* 23505 eller andet — portal bruger data, app fortsætter */
      }
    })();
  }, [challenges]);

  const handleEnergyChange = (level: EnergyLevel) => {
    setEnergy(level);
    setChallenges((prev) => prev.map((c) => ({ ...c, completed: false })));
    setTotalXp(0);
    // Trigger energySwing reaction when energy changes
    if (level !== prevEnergyRef.current) {
      prevEnergyRef.current = level;
      setCompanionReaction('energySwing');
    }
  };

  const getCompanionMood = (): 'happy' | 'excited' | 'neutral' | 'sleepy' => {
    if (energy >= 5) return 'excited';
    if (energy >= 4) return 'happy';
    if (energy >= 3) return 'neutral';
    return 'sleepy';
  };

  return (
    <div className="min-h-screen gradient-midnight pb-28">
      {/* Header */}
      <div className="sticky top-0 z-20 bg-midnight-900/90 backdrop-blur-xl border-b border-midnight-700/50">
        <div className="max-w-lg mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1.5 min-w-0">
              <Lys mood={getLysMood(energy)} size="sm" userContext={`energiniveau: ${energyLabels[energy]}`} />
              <CompanionAvatar
                companion={companion}
                size="sm"
                animate
                mood={getCompanionMood()}
                reaction={companionReaction}
                onReactionEnd={() => setCompanionReaction('idle')}
              />
              <div className="min-w-0">
                <h1 className="font-display text-base sm:text-xl font-bold text-midnight-50 truncate">Udfordringer</h1>
                <p className="text-xs text-midnight-400 mt-0.5 truncate">Tilpasset dit energiniveau</p>
              </div>
            </div>
            {totalXp > 0 && (
              <div className="xp-badge animate-pop-in text-xs px-2 py-0.5 flex-shrink-0">
                <span>⚡</span>
                <span>+{totalXp} XP</span>
              </div>
            )}
          </div>

          {totalCount > 0 && (
            <div className="mt-3">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs text-midnight-500 font-medium">{completedCount} af {totalCount} gennemført</span>
                <span className="text-xs font-bold text-sunrise-400">{Math.round((completedCount / totalCount) * 100)}%</span>
              </div>
              <div className="h-1.5 bg-midnight-700 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-500 ease-out"
                  style={{
                    width: `${(completedCount / totalCount) * 100}%`,
                    background: 'linear-gradient(90deg, #FB923C, #F472B6)',
                  }}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-4">
        <EnergySelector energy={energy} onSelect={handleEnergyChange} />
        {/* AI Motivation strip — client-only */}
        <AiMotivationStrip energy={energy} energyLabel={energyLabels[energy]} challengeCount={totalCount} />
        <ChallengeTaskList challenges={filteredChallenges} onComplete={handleComplete} />
      </div>

      {celebration.show && celebration.challenge && (
        <CelebrationOverlay challenge={celebration.challenge} companion={companion} />
      )}

      <BottomNav />
    </div>
  );
}
