'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useResident } from '../context/ResidentContext';
import type { LysThemeTokens } from '../lib/lysTheme';

type PlanItem = {
  id: string;
  time: string;
  title: string;
  description?: string;
  category: string;
};

type TimeGroup = 'morgen' | 'eftermiddag' | 'aften';

const GROUP_LABELS: Record<TimeGroup, string> = {
  morgen: 'Morgen',
  eftermiddag: 'Eftermiddag',
  aften: 'Aften',
};

const CATEGORY_EMOJI: Record<string, string> = {
  mad: '🍽',
  medicin: '💊',
  aktivitet: '⚡',
  hvile: '😌',
  social: '👥',
  struktur: '🔵',
};

function timeToMinutes(t: string): number {
  const [h = 0, m = 0] = t.split(':').map(Number);
  return h * 60 + m;
}

function getGroup(time: string): TimeGroup {
  const min = timeToMinutes(time);
  if (min < 12 * 60) return 'morgen';
  if (min < 18 * 60) return 'eftermiddag';
  return 'aften';
}

type Props = {
  tokens: LysThemeTokens;
  accent: string;
};

export default function LysDagTab({ tokens, accent }: Props) {
  const { residentId } = useResident();
  const [items, setItems] = useState<PlanItem[] | null>(null);
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [xpEarned, setXpEarned] = useState(0);

  // Fetch daily plan from Supabase
  useEffect(() => {
    if (!residentId) { setItems([]); return; }
    const supabase = createClient();
    if (!supabase) { setItems([]); return; }
    const today = new Date().toISOString().slice(0, 10);
    supabase
      .from('daily_plans')
      .select('plan_items')
      .eq('resident_id', residentId)
      .eq('plan_date', today)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.plan_items && Array.isArray(data.plan_items) && data.plan_items.length > 0) {
          const sorted = (data.plan_items as PlanItem[])
            .slice()
            .sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));
          setItems(sorted);
        } else {
          setItems([]);
        }
      })
      .catch(() => setItems([]));
  }, [residentId]);

  // Restore completed from localStorage
  useEffect(() => {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const raw = localStorage.getItem(`budr_dag_completed_${today}`);
      if (raw) setCompleted(new Set(JSON.parse(raw) as string[]));
    } catch { /* ignore */ }
  }, []);

  const handleComplete = useCallback((id: string) => {
    setCompleted(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
        setXpEarned(xp => xp + 5);
        // Award XP in localStorage
        try {
          const raw = localStorage.getItem('budr_xp_v1');
          const xpData = raw ? (JSON.parse(raw) as { total: number }) : { total: 0 };
          localStorage.setItem('budr_xp_v1', JSON.stringify({ total: xpData.total + 5 }));
        } catch { /* ignore */ }
      }
      // Persist
      try {
        const today = new Date().toISOString().slice(0, 10);
        localStorage.setItem(`budr_dag_completed_${today}`, JSON.stringify([...next]));
      } catch { /* ignore */ }
      return next;
    });
  }, []);

  const allItems = items ?? [];
  const completedCount = allItems.filter(i => completed.has(i.id)).length;
  const totalCount = allItems.length;

  const grouped: Record<TimeGroup, PlanItem[]> = { morgen: [], eftermiddag: [], aften: [] };
  for (const item of allItems) {
    grouped[getGroup(item.time)].push(item);
  }

  return (
    <div className="font-sans" style={{ color: tokens.text }}>

      {/* Sticky progress header */}
      <div
        className="sticky top-0 z-10 px-5 py-3 backdrop-blur-xl"
        style={{ backgroundColor: `${tokens.bg}E8`, borderBottom: `1px solid ${accent}14` }}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <div className="h-2 flex-1 max-w-[120px] rounded-full overflow-hidden" style={{ backgroundColor: `${accent}22` }}>
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: totalCount > 0 ? `${(completedCount / totalCount) * 100}%` : '0%', backgroundColor: accent }}
              />
            </div>
            <span className="text-sm font-semibold whitespace-nowrap" style={{ color: tokens.textMuted }}>
              {completedCount} af {totalCount} gennemført
            </span>
          </div>
          <div className="flex items-center gap-3 text-sm font-bold">
            <span>🔥 5</span>
            {xpEarned > 0 && (
              <span style={{ color: accent }}>⚡ +{xpEarned} XP</span>
            )}
          </div>
        </div>
      </div>

      <div className="px-5 pt-4 pb-8 space-y-6">

        {/* Loading */}
        {items === null && (
          <div className="flex justify-center py-12">
            <div className="flex gap-1.5">
              {[0, 150, 300].map(d => (
                <div
                  key={d}
                  className="w-2 h-2 rounded-full animate-bounce"
                  style={{ backgroundColor: accent, animationDelay: `${d}ms` }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {items !== null && items.length === 0 && (
          <div
            className="rounded-3xl px-8 py-14 text-center"
            style={{
              background: `linear-gradient(160deg, ${accent}12 0%, ${accent}04 100%)`,
              border: `1px solid ${accent}20`,
            }}
          >
            <p className="text-5xl mb-4 leading-none select-none">🌿</p>
            <p className="text-xl font-black mb-2">Din dag er fri</p>
            <p className="text-sm leading-relaxed" style={{ color: tokens.textMuted }}>
              Personalet arbejder på din plan — den dukker op her
            </p>
          </div>
        )}

        {/* Grouped plan */}
        {items !== null && items.length > 0 && (
          (Object.entries(grouped) as [TimeGroup, PlanItem[]][])
            .filter(([, grpItems]) => grpItems.length > 0)
            .map(([group, grpItems]) => (
              <div key={group}>
                <p
                  className="text-xs font-bold uppercase tracking-widest mb-3"
                  style={{ color: tokens.textMuted }}
                >
                  {GROUP_LABELS[group]}
                </p>
                <div className="space-y-2">
                  {grpItems.map(item => {
                    const isDone = completed.has(item.id);
                    const emoji = CATEGORY_EMOJI[item.category] ?? '📌';
                    return (
                      <div
                        key={item.id}
                        className="flex items-center gap-3 rounded-2xl px-4 py-3.5 transition-all duration-200"
                        style={{
                          backgroundColor: isDone ? `${accent}10` : tokens.cardBg,
                          boxShadow: isDone ? 'none' : tokens.shadow,
                          opacity: isDone ? 0.55 : 1,
                        }}
                      >
                        {/* Emoji */}
                        <div
                          className="h-10 w-10 shrink-0 rounded-xl flex items-center justify-center text-xl"
                          style={{ backgroundColor: `${accent}18` }}
                          aria-hidden
                        >
                          {emoji}
                        </div>
                        {/* Info */}
                        <div className="flex-1 min-w-0">
                          <p
                            className="text-sm font-semibold leading-snug"
                            style={{
                              color: tokens.text,
                              textDecoration: isDone ? 'line-through' : 'none',
                            }}
                          >
                            {item.title}
                          </p>
                          <p className="text-xs mt-0.5" style={{ color: tokens.textMuted }}>
                            kl. {item.time}
                            {item.description ? ` · ${item.description}` : ''}
                          </p>
                        </div>
                        {/* Checkmark button */}
                        <button
                          type="button"
                          onClick={() => handleComplete(item.id)}
                          className="h-9 w-9 shrink-0 rounded-full flex items-center justify-center transition-all duration-200 active:scale-90"
                          style={{
                            backgroundColor: isDone ? `${accent}22` : `${accent}14`,
                            border: `2px solid ${isDone ? accent : `${accent}44`}`,
                            color: isDone ? accent : tokens.textMuted,
                          }}
                          aria-label={isDone ? 'Fortryd' : 'Marker som færdig'}
                        >
                          {isDone ? (
                            <span className="text-base font-black">✓</span>
                          ) : (
                            <span className="text-base opacity-40">○</span>
                          )}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))
        )}

      </div>
    </div>
  );
}
