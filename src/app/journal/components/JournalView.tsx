'use client';

import React, { useState, useRef, useEffect } from 'react';
import BottomNav from '@/components/BottomNav';
import MoodScale from './MoodScale';
import ResourceCheckIn from './ResourceCheckIn';
import GoalReview from './GoalReview';
import KrapNotes from './KrapNotes';
import JournalSaveButton from './JournalSaveButton';
import Lys, { LysMood } from '@/components/Lys';
import CompanionAvatar from '@/components/CompanionAvatar';
import { ANTHROPIC_CHAT_MODEL } from '@/lib/ai/anthropicModel';
import { CompanionReaction } from '@/components/CompanionAvatar';

export interface JournalEntry {
  date: string;
  mood: number;
  resources: ResourceState;
  goals: GoalItem[];
  krap: KrapState;
}

export interface ResourceState {
  sleep: number;
  food: number;
  movement: number;
  social: number;
  stress: number;
}

export interface GoalItem {
  id: string;
  text: string;
  done: boolean;
}

export interface KrapState {
  krop: string;
  rolle: string;
  affekt: string;
  plan: string;
}

const defaultGoals: GoalItem[] = [
  { id: 'g1', text: 'Drik 2 liter vand', done: false },
  { id: 'g2', text: 'Gå en tur', done: false },
  { id: 'g3', text: 'Skriv i journalen', done: false },
];

const today = new Date().toLocaleDateString('da-DK', { weekday: 'long', day: 'numeric', month: 'long' });

interface TodayCheckin {
  date: string;
  energy: number;
  mood: string;
  intention?: string;
}

function readTodayCheckin(): TodayCheckin | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem('budr_today_checkin');
    if (!raw) return null;
    const p = JSON.parse(raw) as TodayCheckin;
    const d = new Date().toISOString().slice(0, 10);
    if (p.date !== d) return null;
    return p;
  } catch {
    return null;
  }
}

function miniQuestion(checkin: TodayCheckin | null, moodScore: number): string {
  const m = checkin?.mood;
  if (m === 'overvældet' || moodScore <= 4) {
    return 'Hvad er én lille ting, der ville føles lidt lettere, hvis den blev løst eller sat på pause i dag?';
  }
  if (m === 'trist' || m === 'urolig') {
    return 'Hvad har du mest brug for lige nu — ro, kontakt eller noget helt tredje?';
  }
  if (m === 'glad' || moodScore >= 8) {
    return 'Hvad har givet dig mest energi eller glæde i dag — også de helt små ting?';
  }
  if (m === 'træt' || (checkin?.energy ?? 3) <= 2) {
    return 'Hvad gjorde dagen udholdelig — eller hvad vil du ønske dig til i morgen?';
  }
  return 'Hvad vil du gerne huske om i dag, når du ser tilbage om en uge?';
}

function getMoodLys(mood: number): LysMood {
  if (mood >= 9) return 'happy';
  if (mood >= 7) return 'energized';
  if (mood >= 5) return 'focused';
  if (mood >= 3) return 'calm';
  return 'sad';
}

function getMoodEmoji(mood: number): string {
  if (mood <= 2) return '😔';
  if (mood <= 4) return '😕';
  if (mood <= 6) return '😐';
  if (mood <= 8) return '🙂';
  return '😄';
}

export default function JournalView() {
  const [mood, setMood] = useState<number>(5);
  const [resources, setResources] = useState<ResourceState>({
    sleep: 3, food: 3, movement: 3, social: 3, stress: 3,
  });
  const [goals, setGoals] = useState<GoalItem[]>(defaultGoals);
  const [krap, setKrap] = useState<KrapState>({ krop: '', rolle: '', affekt: '', plan: '' });
  const [saved, setSaved] = useState(false);
  const [eveningSummary, setEveningSummary] = useState('');
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [hasStartedWriting, setHasStartedWriting] = useState(false);
  const [companionReaction, setCompanionReaction] = useState<CompanionReaction>('idle');
  const mountedRef = useRef(true);
  const [journalExpanded, setJournalExpanded] = useState(false);
  const [todayCheckin, setTodayCheckin] = useState<TodayCheckin | null>(null);
  const [miniReflection, setMiniReflection] = useState('');

  // Detect companion from localStorage (set during onboarding)
  const [companion, setCompanion] = useState('bjorn');
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('budr_companion');
      if (saved) setCompanion(saved);
      setTodayCheckin(readTodayCheckin());
    }
  }, []);

  // Show companion wave reaction when page first loads (empty state)
  useEffect(() => {
    if (!hasStartedWriting) {
      const t = setTimeout(() => setCompanionReaction('moodChange'), 800);
      return () => clearTimeout(t);
    }
  }, [hasStartedWriting]);

  const handleKrapChange = (newKrap: KrapState) => {
    setKrap(newKrap);
    if (!hasStartedWriting && Object.values(newKrap).some(v => v.trim().length > 0)) {
      setHasStartedWriting(true);
      setCompanionReaction('taskComplete');
    }
  };

  const handleMoodChange = (newMood: number) => {
    setMood(newMood);
    if (!hasStartedWriting) {
      setHasStartedWriting(true);
      setCompanionReaction('moodChange');
    }
  };

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const handleSave = () => {
    setSaved(true);
    setCompanionReaction('celebrate');
    setTimeout(() => setSaved(false), 2500);

    if (typeof window === 'undefined') return;
    setSummaryLoading(true);

    const mergedKrap =
      !journalExpanded && miniReflection.trim()
        ? { ...krap, plan: miniReflection.trim() }
        : krap;

    const goalsCompleted = goals.filter(g => g.done).length;
    const krapFilled = Object.values(mergedKrap).filter(v => v.trim().length > 0).length;
    const resourceAvg = Math.round((resources.sleep + resources.food + resources.movement + resources.social) / 4);

    if (!journalExpanded && miniReflection.trim()) {
      setKrap(mergedKrap);
    }

    fetch('/api/ai/chat-completion', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        provider: 'ANTHROPIC',
        model: ANTHROPIC_CHAT_MODEL,
        messages: [
          {
            role: 'system',
            content: 'Du er Lys — en varm, empatisk ledsager i en dansk mental sundhedsapp. Du skriver en personlig aftenopsummering til brugeren baseret på deres dagbog. Max 3 sætninger, max 40 ord. Vær varm, anerkendende og konkret. Afslut med ét beroligende emoji.',
          },
          {
            role: 'user',
            content: `Brugerens dagbog for i dag:\n- Humørscore: ${mood}/10\n- Gennemsnitlige ressourcer: ${resourceAvg}/5\n- Mål gennemført: ${goalsCompleted}/${goals.length}\n- KRAP-noter udfyldt: ${krapFilled}/4\n- Krop: ${mergedKrap.krop || 'ikke udfyldt'}\n- Affekt: ${mergedKrap.affekt || 'ikke udfyldt'}\n- Plan: ${mergedKrap.plan || 'ikke udfyldt'}\n${todayCheckin ? `- Morgencheck-in: humør ${todayCheckin.mood}, energi ${todayCheckin.energy}/5\n` : ''}\nSkriv en personlig, varm aftenopsummering.`,
          },
        ],
        stream: false,
        parameters: { max_tokens: 100, temperature: 0.8 },
      }),
    })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        const text = d?.choices?.[0]?.message?.content;
        if (text && mountedRef.current) setEveningSummary(text.trim());
      })
      .catch(() => { /* silently fail */ })
      .finally(() => { if (mountedRef.current) setSummaryLoading(false); });
  };

  const userContext = `humørscore: ${mood}/10, dag: ${today}`;

  const isEmptyState = !hasStartedWriting;

  const dailyMiniPrompt = miniQuestion(todayCheckin, mood);

  const onMiniReflection = (val: string) => {
    setMiniReflection(val);
    if (val.trim() && !hasStartedWriting) {
      setHasStartedWriting(true);
      setCompanionReaction('moodChange');
    }
  };

  return (
    <div className="min-h-screen gradient-midnight pb-32">
      <div className="sticky top-0 z-20 bg-midnight-900/90 backdrop-blur-xl border-b border-midnight-700/50">
        <div className="max-w-lg mx-auto px-4 py-3">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-display text-lg sm:text-xl font-bold text-midnight-50">Journal</h1>
              <p className="text-xs text-midnight-400 mt-0.5 capitalize">{today}</p>
              <p className="text-[11px] text-sunrise-400/90 font-medium mt-1">
                Mini-journal først — tryk «Se mere» for ressourcer, mål og KRAP
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Lys mood={getMoodLys(mood)} size="sm" userContext={userContext} />
              <div className="flex items-center gap-1 bg-midnight-800 border border-midnight-600 rounded-full px-2.5 py-1">
                <span className="text-base">{getMoodEmoji(mood)}</span>
                <span className="text-sm font-bold text-sunrise-300">{mood}/10</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-lg mx-auto px-4 pt-4 space-y-4">
        {/* Companion empty state */}
        {isEmptyState && (
          <div className="flex flex-col items-center text-center py-6 px-4 bg-midnight-800/40 rounded-3xl border border-midnight-700/40 animate-slide-up">
            <div className="relative mb-3">
              <CompanionAvatar
                companion={companion}
                size="lg"
                animate
                mood="happy"
                clickable
                reaction={companionReaction}
                onReactionEnd={() => setCompanionReaction('idle')}
              />
              {/* Gentle sparkles around companion */}
              <span className="absolute -top-2 -right-2 text-lg animate-bounce" style={{ animationDelay: '0.2s' }}>✨</span>
              <span className="absolute -bottom-1 -left-2 text-base animate-bounce" style={{ animationDelay: '0.5s' }}>🌟</span>
            </div>
            <p className="font-display text-sm font-bold text-midnight-100 mb-1">Klar til at skrive i dag?</p>
            <p className="text-xs text-midnight-400 leading-relaxed w-full px-2">
              Jeg er her med dig. Start med dit humør nedenfor — bare ét skridt ad gangen. 🌱
            </p>
          </div>
        )}

        <MoodScale mood={mood} onChange={handleMoodChange} />

        {!journalExpanded ? (
          <>
            <div className="rounded-2xl border border-sunrise-400/25 bg-midnight-800/50 p-4 space-y-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-[10px] font-bold uppercase tracking-wide text-sunrise-400/90">Mini-journal</p>
                {todayCheckin && (
                  <span className="text-[10px] text-midnight-500">Bruger dit check-in fra i dag</span>
                )}
              </div>
              <p className="text-sm text-midnight-100 leading-relaxed font-medium">{dailyMiniPrompt}</p>
              <label htmlFor="mini-journal" className="sr-only">
                Dit svar
              </label>
              <textarea
                id="mini-journal"
                value={miniReflection}
                onChange={(e) => onMiniReflection(e.target.value)}
                rows={4}
                placeholder="Skriv kort her — ét eller to afsnit er rigeligt…"
                className="w-full rounded-xl border border-midnight-600 bg-midnight-900 px-3 py-2.5 text-sm text-midnight-100 placeholder-midnight-600 outline-none focus:border-sunrise-400/80 resize-none"
              />
            </div>
            <button
              type="button"
              onClick={() => setJournalExpanded(true)}
              className="w-full py-3 rounded-2xl text-sm font-semibold border border-midnight-600 bg-midnight-800/40 text-midnight-200 hover:bg-midnight-800/70 transition-colors min-h-[48px]"
            >
              Se mere — fuld journal (ressourcer, mål, KRAP)
            </button>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-midnight-500">Fuld journal</p>
              <button
                type="button"
                onClick={() => setJournalExpanded(false)}
                className="text-xs font-semibold text-sunrise-400 hover:text-sunrise-300 min-h-[44px] px-2"
              >
                Skjul ekstra
              </button>
            </div>
            <ResourceCheckIn resources={resources} onChange={setResources} />
            <GoalReview goals={goals} onChange={setGoals} />
            <KrapNotes krap={krap} onChange={handleKrapChange} />
          </>
        )}

        <JournalSaveButton onSave={handleSave} saved={saved} />

        {(eveningSummary || summaryLoading) && (
          <div className="bg-midnight-800/60 border border-aurora-violet/20 rounded-3xl p-5 animate-slide-up">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-aurora-violet/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-base">🌙</span>
              </div>
              <div className="flex-1">
                <p className="text-xs text-purple-400 font-semibold mb-1.5">Lys&apos; aftenrefleksion:</p>
                {summaryLoading && !eveningSummary ? (
                  <div className="flex items-center gap-1.5 py-1">
                    <span className="inline-block w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="inline-block w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="inline-block w-1.5 h-1.5 bg-purple-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                  </div>
                ) : (
                  <p className="text-sm text-midnight-100 leading-relaxed">{eveningSummary}</p>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <BottomNav />
    </div>
  );
}
