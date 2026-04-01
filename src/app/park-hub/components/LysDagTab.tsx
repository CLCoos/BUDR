'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Plus, X } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useResident } from '../context/ResidentContext';
import type { LysThemeTokens } from '../lib/lysTheme';

// ── Types ────────────────────────────────────────────────────────────────────

type PlanItem = {
  id: string;
  time: string;   // HH:MM
  title: string;
  description?: string;
  category: string;
  emoji?: string;
  source: 'daily_plan' | 'resident';
  staff_suggestion?: boolean;
  approved_by_resident?: boolean;
};

type NewItemForm = {
  title: string;
  time: string;
  category: string;
  recurrence: 'none' | 'daily' | 'custom';
  notify: boolean;
  notify_minutes_before: number;
};

const CATEGORY_EMOJI: Record<string, string> = {
  mad: '🍽', medicin: '💊', aktivitet: '⚡',
  hvile: '😌', social: '👥', struktur: '🔵',
};

const CATEGORIES = [
  { key: 'aktivitet', label: 'Aktivitet', emoji: '⚡' },
  { key: 'mad',       label: 'Mad',       emoji: '🍽' },
  { key: 'medicin',   label: 'Medicin',   emoji: '💊' },
  { key: 'hvile',     label: 'Hvile',     emoji: '😌' },
  { key: 'social',    label: 'Social',    emoji: '👥' },
];

function timeToMin(t: string) {
  const [h = 0, m = 0] = t.split(':').map(Number);
  return h * 60 + m;
}

function addDays(base: Date, n: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + n);
  return d;
}

function toDateStr(d: Date) { return d.toISOString().slice(0, 10); }

function isoWeekNumber(d: Date): number {
  const date = new Date(Date.UTC(d.getFullYear(), d.getMonth(), d.getDate()));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  return Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
}

// Determine if a resident_plan_item is active on a given date
function isItemActiveOnDate(item: {
  time_of_day: string;
  recurrence: string;
  recurrence_days: number[] | null;
  recurrence_week_parity: string | null;
  active_from: string;
  active_until: string | null;
}, date: Date): boolean {
  const dateStr = toDateStr(date);
  if (item.active_from > dateStr) return false;
  if (item.active_until && item.active_until < dateStr) return false;
  if (item.recurrence === 'none') return item.active_from === dateStr;
  if (item.recurrence === 'daily') return true;
  const dow = date.getDay() === 0 ? 6 : date.getDay() - 1; // 0=Mon..6=Sun
  const days = item.recurrence_days ?? [];
  if (!days.includes(dow)) return false;
  if (item.recurrence === 'weekly' || item.recurrence === 'custom') return true;
  // biweekly
  const parity = item.recurrence_week_parity ?? 'all';
  if (parity === 'all') return true;
  const week = isoWeekNumber(date);
  if (parity === 'odd') return week % 2 === 1;
  return week % 2 === 0;
}

// ── Props ────────────────────────────────────────────────────────────────────

type Props = {
  tokens: LysThemeTokens;
  accent: string;
};

export default function LysDagTab({ tokens, accent }: Props) {
  const { residentId } = useResident();

  const [selectedDate, setSelectedDate] = useState(() => new Date());
  const [items, setItems] = useState<PlanItem[] | null>(null);
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [xpEarned, setXpEarned] = useState(0);
  const [showFab, setShowFab] = useState(false);
  const [approving, setApproving] = useState<string | null>(null);

  // New item form
  const [form, setForm] = useState<NewItemForm>({
    title: '', time: '09:00', category: 'aktivitet',
    recurrence: 'none', notify: false, notify_minutes_before: 10,
  });
  const [saving, setSaving] = useState(false);

  const dateStr = toDateStr(selectedDate);
  const dayLabel = selectedDate.toLocaleDateString('da-DK', { weekday: 'long', day: 'numeric', month: 'long' });
  const isToday = dateStr === toDateStr(new Date());

  // ── Load items for selected date ────────────────────────────────────────
  const loadItems = useCallback(async () => {
    if (!residentId) { setItems([]); return; }
    const supabase = createClient();
    if (!supabase) { setItems([]); return; }

    setItems(null);

    const [planRes, residentItemsRes] = await Promise.all([
      // From daily_plans (staff-approved plans)
      supabase
        .from('daily_plans')
        .select('plan_items')
        .eq('resident_id', residentId)
        .eq('plan_date', dateStr)
        .maybeSingle(),
      // From resident_plan_items (recurring personal plan)
      supabase
        .from('resident_plan_items')
        .select('id, title, category, emoji, time_of_day, recurrence, recurrence_days, recurrence_week_parity, active_from, active_until, staff_suggestion, approved_by_resident')
        .eq('resident_id', residentId),
    ]);

    type RawPlanItem = { id?: string; time: string; title: string; description?: string; category?: string };
    const fromPlan: PlanItem[] = ((planRes.data?.plan_items ?? []) as RawPlanItem[]).map((r, i) => ({
      id: r.id ?? `plan-${i}`,
      time: r.time,
      title: r.title,
      description: r.description,
      category: r.category ?? 'struktur',
      source: 'daily_plan',
    }));

    type ResidentItemRow = {
      id: string; title: string; category: string; emoji: string | null;
      time_of_day: string; recurrence: string; recurrence_days: number[] | null;
      recurrence_week_parity: string | null; active_from: string; active_until: string | null;
      staff_suggestion: boolean; approved_by_resident: boolean;
    };
    const fromResident: PlanItem[] = ((residentItemsRes.data ?? []) as ResidentItemRow[])
      .filter(r => isItemActiveOnDate(r, selectedDate))
      .map(r => ({
        id: r.id,
        time: r.time_of_day.slice(0, 5),
        title: r.title,
        category: r.category,
        emoji: r.emoji ?? undefined,
        source: 'resident',
        staff_suggestion: r.staff_suggestion,
        approved_by_resident: r.approved_by_resident,
      }));

    const all = [...fromPlan, ...fromResident].sort((a, b) => timeToMin(a.time) - timeToMin(b.time));
    setItems(all);
  }, [residentId, dateStr, selectedDate]);

  useEffect(() => { void loadItems(); }, [loadItems]);

  // Restore completed from localStorage
  useEffect(() => {
    try {
      const raw = localStorage.getItem(`budr_dag_completed_${dateStr}`);
      if (raw) setCompleted(new Set(JSON.parse(raw) as string[]));
      else setCompleted(new Set());
    } catch { /* ignore */ }
  }, [dateStr]);

  // ── Complete item ─────────────────────────────────────────────────────────
  const handleComplete = useCallback((id: string) => {
    setCompleted(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
        setXpEarned(xp => xp + 5);
        const supabase = createClient();
        if (supabase && residentId) {
          void supabase.from('resident_plan_completions').upsert(
            { resident_id: residentId, plan_item_id: id, completion_date: dateStr },
            { onConflict: 'resident_id,plan_item_id,completion_date' },
          );
          void supabase.rpc('award_xp', { p_resident_id: residentId, p_activity: 'plan_completion', p_xp: 5 });
        }
        try {
          const raw = localStorage.getItem('budr_xp_v1');
          const xpData = raw ? (JSON.parse(raw) as { total: number }) : { total: 0 };
          localStorage.setItem('budr_xp_v1', JSON.stringify({ total: xpData.total + 5 }));
        } catch { /* ignore */ }
      }
      try { localStorage.setItem(`budr_dag_completed_${dateStr}`, JSON.stringify([...next])); } catch { /* ignore */ }
      return next;
    });
  }, [residentId, dateStr]);

  // ── Approve staff suggestion ──────────────────────────────────────────────
  const handleApprove = async (itemId: string, approve: boolean) => {
    setApproving(itemId);
    const supabase = createClient();
    if (supabase) {
      if (approve) {
        await supabase.from('resident_plan_items').update({ approved_by_resident: true }).eq('id', itemId);
      } else {
        await supabase.from('resident_plan_items').delete().eq('id', itemId);
      }
    }
    setApproving(null);
    void loadItems();
  };

  // ── Create new item ───────────────────────────────────────────────────────
  const handleCreateItem = async () => {
    if (!form.title.trim() || !residentId) return;
    setSaving(true);
    const supabase = createClient();
    if (supabase) {
      await supabase.from('resident_plan_items').insert({
        resident_id: residentId,
        title: form.title.trim(),
        category: form.category,
        emoji: CATEGORY_EMOJI[form.category] ?? '📌',
        time_of_day: form.time,
        recurrence: form.recurrence,
        recurrence_days: form.recurrence === 'daily' ? [0,1,2,3,4,5,6] : [],
        notify: form.notify,
        notify_minutes_before: form.notify_minutes_before,
        created_by: 'resident',
        active_from: dateStr,
      });
    }
    setSaving(false);
    setShowFab(false);
    setForm({ title: '', time: '09:00', category: 'aktivitet', recurrence: 'none', notify: false, notify_minutes_before: 10 });
    void loadItems();
  };

  const allItems = items ?? [];
  const completedCount = allItems.filter(i => completed.has(i.id)).length;
  const totalCount = allItems.length;
  const pendingSuggestions = allItems.filter(i => i.staff_suggestion && !i.approved_by_resident);
  const approvedItems = allItems.filter(i => !i.staff_suggestion || i.approved_by_resident);

  return (
    <div className="font-sans min-h-screen relative" style={{ color: tokens.text }}>

      {/* Date header with navigation */}
      <div
        className="sticky top-0 z-10 px-5 py-3 backdrop-blur-xl"
        style={{ backgroundColor: `${tokens.bg}E8`, borderBottom: `1px solid ${accent}14` }}
      >
        <div className="flex items-center gap-3 mb-2">
          <button
            type="button"
            onClick={() => setSelectedDate(d => addDays(d, -1))}
            className="h-8 w-8 rounded-full flex items-center justify-center transition-all active:scale-90"
            style={{ backgroundColor: tokens.cardBg, color: tokens.textMuted }}
            aria-label="Forrige dag"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <div className="flex-1 text-center">
            <p className="text-base font-black capitalize">{dayLabel}</p>
            {isToday && (
              <p className="text-xs font-semibold" style={{ color: accent }}>I dag</p>
            )}
          </div>
          <button
            type="button"
            onClick={() => setSelectedDate(d => addDays(d, 1))}
            className="h-8 w-8 rounded-full flex items-center justify-center transition-all active:scale-90"
            style={{ backgroundColor: tokens.cardBg, color: tokens.textMuted }}
            aria-label="Næste dag"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
        {totalCount > 0 && (
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-1">
              <div className="h-1.5 flex-1 rounded-full overflow-hidden" style={{ backgroundColor: `${accent}22` }}>
                <div
                  className="h-full rounded-full transition-all duration-500"
                  style={{ width: `${(completedCount / totalCount) * 100}%`, backgroundColor: accent }}
                />
              </div>
              <span className="text-xs font-semibold whitespace-nowrap" style={{ color: tokens.textMuted }}>
                {completedCount}/{totalCount}
              </span>
            </div>
            <div className="flex items-center gap-3 text-sm font-bold">
              <span>🔥 5</span>
              {xpEarned > 0 && <span style={{ color: accent }}>⚡ +{xpEarned}</span>}
            </div>
          </div>
        )}
      </div>

      <div className="px-5 pt-4 pb-32 space-y-4">

        {/* Loading */}
        {items === null && (
          <div className="flex justify-center py-12">
            <div className="flex gap-1.5">
              {[0, 150, 300].map(d => (
                <div key={d} className="w-2 h-2 rounded-full animate-bounce" style={{ backgroundColor: accent, animationDelay: `${d}ms` }} />
              ))}
            </div>
          </div>
        )}

        {/* Staff suggestions */}
        {pendingSuggestions.length > 0 && (
          <div>
            <p className="text-xs font-bold uppercase tracking-widest mb-2" style={{ color: tokens.textMuted }}>
              Foreslået af personalet
            </p>
            <div className="space-y-2">
              {pendingSuggestions.map(item => (
                <div
                  key={item.id}
                  className="rounded-2xl px-4 py-4"
                  style={{ backgroundColor: 'rgba(127,119,221,0.08)', border: '1.5px solid rgba(127,119,221,0.35)' }}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <div
                      className="h-10 w-10 shrink-0 rounded-xl flex items-center justify-center text-xl"
                      style={{ backgroundColor: 'rgba(127,119,221,0.15)' }}
                    >
                      {item.emoji ?? CATEGORY_EMOJI[item.category] ?? '📌'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold">{item.title}</p>
                      <p className="text-xs mt-0.5" style={{ color: tokens.textMuted }}>kl. {item.time}</p>
                    </div>
                  </div>
                  <p className="text-xs mb-3" style={{ color: 'rgba(127,119,221,0.9)' }}>
                    Foreslået af personalet — vil du tilføje det?
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={approving === item.id}
                      onClick={() => void handleApprove(item.id, true)}
                      className="flex-1 rounded-xl py-2 text-xs font-bold text-white transition-all active:scale-95 disabled:opacity-50"
                      style={{ backgroundColor: '#7F77DD' }}
                    >
                      Ja, tilføj
                    </button>
                    <button
                      type="button"
                      disabled={approving === item.id}
                      onClick={() => void handleApprove(item.id, false)}
                      className="flex-1 rounded-xl py-2 text-xs font-semibold transition-all active:scale-95 disabled:opacity-50"
                      style={{ backgroundColor: tokens.cardBg, color: tokens.textMuted }}
                    >
                      Nej tak
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Empty state */}
        {items !== null && approvedItems.length === 0 && (
          <div
            className="rounded-3xl px-8 py-14 text-center"
            style={{
              background: `linear-gradient(160deg, ${accent}12 0%, ${accent}04 100%)`,
              border: `1px solid ${accent}20`,
            }}
          >
            <p className="text-5xl mb-4 leading-none select-none">📋</p>
            <p className="text-xl font-black mb-2">Plan mangler</p>
            <p className="text-sm leading-relaxed mb-4" style={{ color: tokens.textMuted }}>
              Tryk + for at tilføje din første aktivitet
            </p>
          </div>
        )}

        {/* Items list */}
        {approvedItems.length > 0 && (
          <div className="space-y-2">
            {approvedItems.map(item => {
              const isDone = completed.has(item.id);
              const emoji = item.emoji ?? CATEGORY_EMOJI[item.category] ?? '📌';
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
                  <div
                    className="h-10 w-10 shrink-0 rounded-xl flex items-center justify-center text-xl"
                    style={{ backgroundColor: `${accent}18` }}
                    aria-hidden
                  >
                    {emoji}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p
                      className="text-sm font-semibold leading-snug"
                      style={{ color: tokens.text, textDecoration: isDone ? 'line-through' : 'none' }}
                    >
                      {item.title}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: tokens.textMuted }}>
                      kl. {item.time}
                      {item.description ? ` · ${item.description}` : ''}
                    </p>
                  </div>
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
                    {isDone ? <span className="text-base font-black">✓</span> : <span className="text-base opacity-40">○</span>}
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* FAB */}
      <button
        type="button"
        onClick={() => setShowFab(true)}
        className="fixed z-30 flex items-center justify-center rounded-full text-white shadow-lg transition-all duration-200 active:scale-90"
        style={{
          bottom: 'calc(5rem + max(1.25rem, env(safe-area-inset-bottom, 0px)))',
          right: '72px',
          width: '44px',
          height: '44px',
          background: `linear-gradient(135deg, ${accent}, ${accent}cc)`,
          boxShadow: `0 4px 16px ${accent}44`,
        }}
        aria-label="Tilføj aktivitet"
      >
        <Plus className="h-5 w-5" />
      </button>

      {/* New item modal */}
      {showFab && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
          onClick={e => { if (e.target === e.currentTarget) setShowFab(false); }}
        >
          <div
            className="w-full max-w-lg rounded-3xl p-6 space-y-4"
            style={{ backgroundColor: tokens.bg, border: `1px solid ${tokens.cardBorder}` }}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-black">Ny aktivitet</h2>
              <button
                type="button"
                onClick={() => setShowFab(false)}
                className="flex h-9 w-9 items-center justify-center rounded-full"
                style={{ backgroundColor: tokens.cardBg, color: tokens.textMuted }}
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Title */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wide mb-1.5 block" style={{ color: tokens.textMuted }}>
                Hvad vil du gøre?
              </label>
              <input
                type="text"
                value={form.title}
                onChange={e => setForm(f => ({ ...f, title: e.target.value }))}
                placeholder="F.eks. Morgentur, Kaffe med Sara …"
                className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                style={{ backgroundColor: tokens.cardBg, border: `1.5px solid ${accent}22`, color: tokens.text, caretColor: accent }}
                autoFocus
              />
            </div>

            {/* Time */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wide mb-1.5 block" style={{ color: tokens.textMuted }}>
                Tidspunkt
              </label>
              <input
                type="time"
                value={form.time}
                onChange={e => setForm(f => ({ ...f, time: e.target.value }))}
                className="w-full rounded-xl px-4 py-3 text-sm outline-none"
                style={{ backgroundColor: tokens.cardBg, border: `1.5px solid ${accent}22`, color: tokens.text }}
              />
            </div>

            {/* Category */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wide mb-1.5 block" style={{ color: tokens.textMuted }}>
                Kategori
              </label>
              <div className="flex gap-2 flex-wrap">
                {CATEGORIES.map(cat => (
                  <button
                    key={cat.key}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, category: cat.key }))}
                    className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-all duration-150 active:scale-95"
                    style={{
                      backgroundColor: form.category === cat.key ? `${accent}22` : tokens.cardBg,
                      border: `1.5px solid ${form.category === cat.key ? accent : `${accent}20`}`,
                      color: form.category === cat.key ? accent : tokens.textMuted,
                    }}
                  >
                    <span>{cat.emoji}</span>
                    {cat.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Recurrence */}
            <div>
              <label className="text-xs font-bold uppercase tracking-wide mb-1.5 block" style={{ color: tokens.textMuted }}>
                Gentagelse
              </label>
              <div className="flex gap-2">
                {([['none', 'Ingen'], ['daily', 'Hver dag']] as const).map(([v, l]) => (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setForm(f => ({ ...f, recurrence: v }))}
                    className="flex-1 rounded-xl py-2.5 text-xs font-semibold transition-all active:scale-95"
                    style={{
                      backgroundColor: form.recurrence === v ? `${accent}22` : tokens.cardBg,
                      border: `1.5px solid ${form.recurrence === v ? accent : `${accent}20`}`,
                      color: form.recurrence === v ? accent : tokens.textMuted,
                    }}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>

            {/* Notify toggle */}
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold">Påmindelse</p>
                <p className="text-xs" style={{ color: tokens.textMuted }}>
                  {form.notify ? `${form.notify_minutes_before} min. før` : 'Ingen'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setForm(f => ({ ...f, notify: !f.notify }))}
                className="h-7 w-12 rounded-full transition-all duration-200"
                style={{ backgroundColor: form.notify ? accent : `${accent}22` }}
                aria-pressed={form.notify}
              >
                <span
                  className="block h-5 w-5 rounded-full bg-white shadow transition-all duration-200"
                  style={{ transform: form.notify ? 'translateX(22px)' : 'translateX(2px)', marginTop: '4px' }}
                />
              </button>
            </div>

            {/* Save */}
            <button
              type="button"
              onClick={() => void handleCreateItem()}
              disabled={!form.title.trim() || saving}
              className="w-full rounded-2xl py-4 text-sm font-bold text-white transition-all duration-150 active:scale-[0.98] disabled:opacity-40"
              style={{ background: `linear-gradient(135deg, ${accent}, ${accent}cc)` }}
            >
              {saving ? 'Gemmer…' : 'Gem aktivitet'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
