'use client';

import React, { useState, useRef, useEffect } from 'react';
import type { LysThemeTokens } from '../lib/lysTheme';
import MoodScale from '@/app/journal/components/MoodScale';
import ResourceCheckIn from '@/app/journal/components/ResourceCheckIn';
import GoalReview from '@/app/journal/components/GoalReview';
import KrapNotes from '@/app/journal/components/KrapNotes';
import JournalSaveButton from '@/app/journal/components/JournalSaveButton';
import { ANTHROPIC_CHAT_MODEL } from '@/lib/ai/anthropicModel';
import type { ResourceState, GoalItem, KrapState } from '@/app/journal/components/JournalView';

const today = new Date().toLocaleDateString('da-DK', { weekday: 'long', day: 'numeric', month: 'long' });

const defaultGoals: GoalItem[] = [
  { id: 'g1', text: 'Drik 2 liter vand', done: false },
  { id: 'g2', text: 'Gå en tur', done: false },
  { id: 'g3', text: 'Skriv i journalen', done: false },
];

type Props = {
  tokens: LysThemeTokens;
  accent: string;
};

export default function LysJournalTab({ tokens, accent }: Props) {
  const [mood, setMood] = useState(5);
  const [resources, setResources] = useState<ResourceState>({ sleep: 3, food: 3, movement: 3, social: 3, stress: 3 });
  const [goals, setGoals] = useState<GoalItem[]>(defaultGoals);
  const [krap, setKrap] = useState<KrapState>({ krop: '', rolle: '', affekt: '', plan: '' });
  const [saved, setSaved] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [miniReflection, setMiniReflection] = useState('');
  const [eveningSummary, setEveningSummary] = useState('');
  const [summaryLoading, setSummaryLoading] = useState(false);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);

    const mergedKrap = !expanded && miniReflection.trim()
      ? { ...krap, plan: miniReflection.trim() }
      : krap;
    const goalsCompleted = goals.filter(g => g.done).length;
    const krapFilled = Object.values(mergedKrap).filter(v => v.trim().length > 0).length;
    const resourceAvg = Math.round((resources.sleep + resources.food + resources.movement + resources.social) / 4);

    setSummaryLoading(true);
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
            content: `Brugerens dagbog:\n- Humørscore: ${mood}/10\n- Gennemsnitlige ressourcer: ${resourceAvg}/5\n- Mål gennemført: ${goalsCompleted}/${goals.length}\n- KRAP-noter: ${krapFilled}/4\n- Krop: ${mergedKrap.krop || 'ikke udfyldt'}\n- Affekt: ${mergedKrap.affekt || 'ikke udfyldt'}\n- Plan: ${mergedKrap.plan || 'ikke udfyldt'}\nSkriv en personlig, varm aftenopsummering.`,
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

  return (
    <div
      className="min-h-full pb-8"
      style={{ backgroundColor: tokens.bg }}
    >
      {/* Header — token-themed */}
      <div
        className="sticky top-0 z-10 border-b px-4 py-3"
        style={{ backgroundColor: tokens.bg, borderColor: tokens.cardBorder }}
      >
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold" style={{ color: tokens.text }}>Journal</h1>
            <p className="text-xs capitalize mt-0.5" style={{ color: tokens.textMuted }}>{today}</p>
          </div>
          <div
            className="flex items-center gap-2 rounded-full border px-3 py-1"
            style={{ borderColor: tokens.cardBorder, backgroundColor: tokens.cardBg }}
          >
            <span className="text-sm font-bold" style={{ color: accent }}>{mood}/10</span>
          </div>
        </div>
      </div>

      {/* Dark content area — journal sub-components use midnight classes */}
      <div className="bg-midnight-900 space-y-4 px-4 pt-4">
        <MoodScale mood={mood} onChange={setMood} />

        {!expanded ? (
          <>
            <div className="rounded-2xl border border-sunrise-400/25 bg-midnight-800/50 p-4 space-y-3">
              <p className="text-[10px] font-bold uppercase tracking-wide text-sunrise-400/90">Mini-journal</p>
              <p className="text-sm text-midnight-100 font-medium leading-relaxed">
                Hvad vil du gerne huske om i dag, når du ser tilbage om en uge?
              </p>
              <label htmlFor="lys-mini-journal" className="sr-only">Dit svar</label>
              <textarea
                id="lys-mini-journal"
                value={miniReflection}
                onChange={e => setMiniReflection(e.target.value)}
                rows={4}
                placeholder="Skriv kort her — ét eller to afsnit er rigeligt…"
                className="w-full rounded-xl border border-midnight-600 bg-midnight-900 px-3 py-2.5 text-sm text-midnight-100 placeholder-midnight-600 outline-none focus:border-sunrise-400/80 resize-none"
              />
            </div>
            <button
              type="button"
              onClick={() => setExpanded(true)}
              className="w-full py-3 rounded-2xl text-sm font-semibold border border-midnight-600 bg-midnight-800/40 text-midnight-200 hover:bg-midnight-800/70 transition-colors min-h-[48px]"
            >
              Se mere — ressourcer, mål og KRAP
            </button>
          </>
        ) : (
          <>
            <div className="flex items-center justify-between">
              <p className="text-xs text-midnight-500">Fuld journal</p>
              <button
                type="button"
                onClick={() => setExpanded(false)}
                className="text-xs font-semibold text-sunrise-400 hover:text-sunrise-300 min-h-[44px] px-2"
              >
                Skjul ekstra
              </button>
            </div>
            <ResourceCheckIn resources={resources} onChange={setResources} />
            <GoalReview goals={goals} onChange={setGoals} />
            <KrapNotes krap={krap} onChange={setKrap} />
          </>
        )}

        <JournalSaveButton onSave={handleSave} saved={saved} />

        {(eveningSummary || summaryLoading) && (
          <div className="bg-midnight-800/60 border border-aurora-violet/20 rounded-3xl p-5 pb-6">
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-aurora-violet/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <span className="text-base">🌙</span>
              </div>
              <div className="flex-1">
                <p className="text-xs text-purple-400 font-semibold mb-1.5">Lys&apos; refleksion:</p>
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

        {/* bottom padding for nav */}
        <div className="h-4" />
      </div>
    </div>
  );
}
