'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Plus, X } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { getResidentBadgeDef } from '@/lib/residentBadges';
import { logPortalAudit } from '@/lib/auditClient';

type PlanItem = {
  id: string;
  title: string;
  category: string;
  emoji: string | null;
  time_of_day: string;
  recurrence: string;
  recurrence_days: number[] | null;
  notify: boolean;
  notify_minutes_before: number;
  created_by: string;
  staff_suggestion: boolean;
  approved_by_resident: boolean;
  active_from: string;
  created_at: string;
};

type XPRow = { total_xp: number; level: number };
type BadgeRow = { badge_key: string; earned_at: string };
type CrisisStep = { icon: string; title: string; description: string };
type CrisisPlanRow = {
  id: string;
  warning_signs: string[] | null;
  helpful_strategies: string[] | null;
  steps: CrisisStep[] | null;
};

const LEVEL_INFO = [
  { level: 1, name: 'Frø', emoji: '🌱' },
  { level: 2, name: 'Spire', emoji: '🌿' },
  { level: 3, name: 'Plante', emoji: '🌾' },
  { level: 4, name: 'Blomst', emoji: '🌸' },
  { level: 5, name: 'Træ', emoji: '🌳' },
];

const RECURRENCE_LABEL: Record<string, string> = {
  none: 'Engangsevent',
  daily: 'Daglig',
  weekly: 'Ugentlig',
  biweekly: 'Hver 2. uge',
  custom: 'Udvalgte dage',
};

const DAYS = ['Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør', 'Søn'];

const CATEGORY_EMOJI: Record<string, string> = {
  mad: '🍽',
  medicin: '💊',
  aktivitet: '⚡',
  hvile: '😌',
  social: '👥',
};

type Props = { residentId: string; residentName: string };

export default function ResidentPlanTab({ residentId, residentName }: Props) {
  const [items, setItems] = useState<PlanItem[] | null>(null);
  const [xp, setXp] = useState<XPRow | null>(null);
  const [earnedBadges, setEarnedBadges] = useState<BadgeRow[]>([]);
  const [showAdd, setShowAdd] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newTime, setNewTime] = useState('09:00');
  const newCategory = 'aktivitet';
  const [newRecurrence, setNewRecurrence] = useState<'none' | 'daily'>('none');
  const [saving, setSaving] = useState(false);
  const [crisisPlanId, setCrisisPlanId] = useState<string | null>(null);
  const [warningSignsText, setWarningSignsText] = useState('');
  const [helpfulStrategiesText, setHelpfulStrategiesText] = useState('');
  const [crisisSteps, setCrisisSteps] = useState<CrisisStep[]>([]);
  const [savingCrisis, setSavingCrisis] = useState(false);

  const load = useCallback(async () => {
    const supabase = createClient();
    if (!supabase) return;
    const [itemsRes, xpRes, badgesRes, crisisPlanRes] = await Promise.all([
      supabase
        .from('resident_plan_items')
        .select(
          'id, title, category, emoji, time_of_day, recurrence, recurrence_days, notify, notify_minutes_before, created_by, staff_suggestion, approved_by_resident, active_from, created_at'
        )
        .eq('resident_id', residentId)
        .order('time_of_day'),
      supabase
        .from('resident_xp')
        .select('total_xp, level')
        .eq('resident_id', residentId)
        .maybeSingle(),
      supabase.from('resident_badges').select('badge_key, earned_at').eq('resident_id', residentId),
      supabase
        .from('crisis_plans')
        .select('id, warning_signs, helpful_strategies, steps')
        .eq('resident_id', residentId)
        .maybeSingle(),
    ]);
    setItems((itemsRes.data ?? []) as PlanItem[]);
    setXp((xpRes.data as XPRow | null) ?? null);
    setEarnedBadges((badgesRes.data ?? []) as BadgeRow[]);
    const crisis = (crisisPlanRes.data ?? null) as CrisisPlanRow | null;
    setCrisisPlanId(crisis?.id ?? null);
    setWarningSignsText((crisis?.warning_signs ?? []).join('\n'));
    setHelpfulStrategiesText((crisis?.helpful_strategies ?? []).join('\n'));
    setCrisisSteps(
      crisis?.steps && crisis.steps.length > 0
        ? crisis.steps
        : [{ icon: '🌬️', title: '', description: '' }]
    );
  }, [residentId]);

  useEffect(() => {
    void load();
  }, [load]);

  const handleAddSuggestion = async () => {
    if (!newTitle.trim()) return;
    setSaving(true);
    const supabase = createClient();
    await supabase?.from('resident_plan_items').insert({
      resident_id: residentId,
      title: newTitle.trim(),
      category: newCategory,
      emoji: CATEGORY_EMOJI[newCategory] ?? '📌',
      time_of_day: newTime,
      recurrence: newRecurrence,
      recurrence_days: newRecurrence === 'daily' ? [0, 1, 2, 3, 4, 5, 6] : [],
      created_by: 'staff',
      staff_suggestion: true,
      approved_by_resident: false,
      active_from: new Date().toISOString().slice(0, 10),
    });
    setSaving(false);
    setShowAdd(false);
    setNewTitle('');
    setNewTime('09:00');
    void load();
  };

  const handleDelete = async (id: string) => {
    const supabase = createClient();
    await supabase?.from('resident_plan_items').delete().eq('id', id);
    void load();
  };

  const updateStep = (idx: number, patch: Partial<CrisisStep>) => {
    setCrisisSteps((prev) => prev.map((s, i) => (i === idx ? { ...s, ...patch } : s)));
  };

  const addStep = () => {
    setCrisisSteps((prev) => [...prev, { icon: '🧭', title: '', description: '' }]);
  };

  const removeStep = (idx: number) => {
    setCrisisSteps((prev) => prev.filter((_, i) => i !== idx));
  };

  const saveCrisisPlan = async () => {
    const supabase = createClient();
    if (!supabase) {
      toast.error('Forbindelsesfejl');
      return;
    }

    const warningSigns = warningSignsText
      .split('\n')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    const helpfulStrategies = helpfulStrategiesText
      .split('\n')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    const normalizedSteps = crisisSteps
      .map((s) => ({
        icon: s.icon.trim() || '🧭',
        title: s.title.trim(),
        description: s.description.trim(),
      }))
      .filter((s) => s.title.length > 0 || s.description.length > 0);

    setSavingCrisis(true);
    const {
      data: { user },
    } = await supabase.auth.getUser();
    const payload = {
      resident_id: residentId,
      warning_signs: warningSigns,
      helpful_strategies: helpfulStrategies,
      steps: normalizedSteps,
      updated_at: new Date().toISOString(),
      updated_by: user?.id ?? null,
    };
    const { data, error } = await supabase
      .from('crisis_plans')
      .upsert(payload, { onConflict: 'resident_id' })
      .select('id')
      .maybeSingle();
    setSavingCrisis(false);
    if (error) {
      toast.error('Kunne ikke gemme kriseplan');
      return;
    }
    setCrisisPlanId((data?.id as string | undefined) ?? crisisPlanId);
    void logPortalAudit({
      action: 'daily_plan.updated',
      tableName: 'crisis_plans',
      recordId: (data?.id as string | undefined) ?? crisisPlanId,
      metadata: { resident_id: residentId },
    });
    toast.success('Kriseplan gemt');
  };

  const levelInfo = LEVEL_INFO.find((l) => l.level === (xp?.level ?? 1)) ?? LEVEL_INFO[0]!;

  return (
    <div className="space-y-6">
      {/* XP + Level sidebar card */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-1">Niveau</p>
          <p className="text-2xl font-black text-gray-800">
            {levelInfo.emoji} {levelInfo.level} — {levelInfo.name}
          </p>
          <p className="text-sm text-gray-500 mt-1">{xp?.total_xp ?? 0} XP i alt</p>
        </div>
        <div className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm sm:col-span-2">
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-2">Badges</p>
          {earnedBadges.length === 0 ? (
            <p className="text-sm text-gray-400">Ingen badges optjent endnu</p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {earnedBadges.map((b) => {
                const def = getResidentBadgeDef(b.badge_key);
                return (
                  <span
                    key={b.badge_key}
                    className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 border border-violet-200 px-3 py-1 text-xs font-semibold text-violet-700"
                  >
                    {def?.emoji ?? '🏅'} {def?.name ?? b.badge_key}
                  </span>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Plan items */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-base font-bold text-gray-800">Planpunkter</h2>
          <button
            type="button"
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-1.5 rounded-full bg-[#0F1B2D] px-3 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-80"
          >
            <Plus className="h-3.5 w-3.5" />
            Foreslå til {residentName.split(' ')[0]}
          </button>
        </div>

        {/* Add suggestion modal */}
        {showAdd && (
          <div
            className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowAdd(false);
            }}
          >
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-gray-800">Foreslå planpunkt</h3>
                <button
                  type="button"
                  onClick={() => setShowAdd(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div>
                <label className="text-xs font-semibold text-gray-500 block mb-1">Titel</label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="F.eks. Morgengymnastik…"
                  className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-[#0F1B2D]"
                  autoFocus
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-gray-500 block mb-1">
                    Tidspunkt
                  </label>
                  <input
                    type="time"
                    value={newTime}
                    onChange={(e) => setNewTime(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-gray-500 block mb-1">
                    Gentagelse
                  </label>
                  <select
                    value={newRecurrence}
                    onChange={(e) => setNewRecurrence(e.target.value as 'none' | 'daily')}
                    className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none"
                  >
                    <option value="none">Ingen</option>
                    <option value="daily">Daglig</option>
                  </select>
                </div>
              </div>
              <p className="text-xs text-gray-400 bg-amber-50 border border-amber-100 rounded-lg p-3">
                Forslaget vises til borgeren med en lilla kant og skal godkendes af dem.
              </p>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowAdd(false)}
                  className="flex-1 rounded-xl border border-gray-200 py-3 text-sm font-medium text-gray-600"
                >
                  Annuller
                </button>
                <button
                  type="button"
                  onClick={() => void handleAddSuggestion()}
                  disabled={!newTitle.trim() || saving}
                  className="flex-1 rounded-xl bg-[#0F1B2D] py-3 text-sm font-bold text-white disabled:opacity-40"
                >
                  {saving ? 'Sender…' : 'Send forslag'}
                </button>
              </div>
            </div>
          </div>
        )}

        {items === null ? (
          <div className="text-center py-8 text-gray-400 text-sm">Indlæser…</div>
        ) : items.length === 0 ? (
          <div className="rounded-2xl border-2 border-dashed border-gray-200 py-12 text-center">
            <p className="text-gray-400 text-sm">Ingen planpunkter endnu</p>
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((item) => (
              <div
                key={item.id}
                className={`flex items-center gap-3 rounded-2xl border px-4 py-3.5 ${
                  item.staff_suggestion && !item.approved_by_resident
                    ? 'border-violet-300 bg-violet-50'
                    : 'border-gray-100 bg-white'
                }`}
              >
                <div className="h-10 w-10 shrink-0 rounded-xl flex items-center justify-center text-xl bg-gray-50">
                  {item.emoji ?? CATEGORY_EMOJI[item.category] ?? '📌'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-gray-800">{item.title}</p>
                    {item.staff_suggestion && !item.approved_by_resident && (
                      <span className="text-[10px] font-bold rounded-full bg-violet-100 text-violet-700 px-2 py-0.5">
                        Afventer godkendelse
                      </span>
                    )}
                    {item.notify && (
                      <span className="text-[10px] font-bold rounded-full bg-amber-50 text-amber-700 px-2 py-0.5">
                        🔔 {item.notify_minutes_before} min
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">
                    kl. {item.time_of_day.slice(0, 5)}
                    {' · '}
                    {RECURRENCE_LABEL[item.recurrence] ?? item.recurrence}
                    {item.recurrence_days && item.recurrence_days.length > 0 && (
                      <> · {item.recurrence_days.map((d) => DAYS[d]).join(', ')}</>
                    )}
                    {' · '}
                    {item.created_by === 'staff' ? '👩‍⚕️ Personale' : '👤 Borger'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => void handleDelete(item.id)}
                  className="h-8 w-8 rounded-full flex items-center justify-center text-gray-300 hover:text-red-400 transition-colors"
                  aria-label="Slet"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="rounded-2xl border border-gray-100 bg-white p-4 sm:p-5">
        <div className="mb-3">
          <h2 className="text-base font-bold text-gray-800">Kriseplan</h2>
          <p className="text-xs text-gray-500 mt-1">
            Brug én linje pr. punkt. Denne plan vises i Lys-appens kriseflow trin 1.
          </p>
          {crisisPlanId && (
            <p className="text-[11px] text-gray-400 mt-1">Plan-id: {crisisPlanId}</p>
          )}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-600">Advarselstegn</label>
            <textarea
              value={warningSignsText}
              onChange={(e) => setWarningSignsText(e.target.value)}
              rows={6}
              placeholder={'Fx\nSover næsten ikke\nTrækker mig fra andre'}
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-[#0F1B2D]"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-gray-600">
              Hjælpende strategier
            </label>
            <textarea
              value={helpfulStrategiesText}
              onChange={(e) => setHelpfulStrategiesText(e.target.value)}
              rows={6}
              placeholder={'Fx\nGå en kort tur\nRing til kontaktperson'}
              className="w-full rounded-xl border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-[#0F1B2D]"
            />
          </div>
        </div>

        <div className="mt-4">
          <div className="mb-2 flex items-center justify-between">
            <label className="text-xs font-semibold text-gray-600">Kriseskridt</label>
            <button
              type="button"
              onClick={addStep}
              className="rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-semibold text-gray-700"
            >
              + Tilføj skridt
            </button>
          </div>
          <div className="space-y-2">
            {crisisSteps.map((step, idx) => (
              <div key={`crisis-step-${idx}`} className="rounded-xl border border-gray-100 p-3">
                <div className="mb-2 flex items-center justify-between">
                  <p className="text-xs font-semibold text-gray-500">Skridt {idx + 1}</p>
                  {crisisSteps.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeStep(idx)}
                      className="text-xs font-semibold text-red-600"
                    >
                      Fjern
                    </button>
                  )}
                </div>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-[80px_1fr]">
                  <input
                    value={step.icon}
                    onChange={(e) => updateStep(idx, { icon: e.target.value })}
                    placeholder="🌬️"
                    className="rounded-lg border border-gray-200 px-2.5 py-2 text-sm"
                  />
                  <input
                    value={step.title}
                    onChange={(e) => updateStep(idx, { title: e.target.value })}
                    placeholder="Titel"
                    className="rounded-lg border border-gray-200 px-2.5 py-2 text-sm"
                  />
                </div>
                <textarea
                  value={step.description}
                  onChange={(e) => updateStep(idx, { description: e.target.value })}
                  rows={2}
                  placeholder="Beskrivelse"
                  className="mt-2 w-full rounded-lg border border-gray-200 px-2.5 py-2 text-sm"
                />
              </div>
            ))}
          </div>
        </div>

        <div className="mt-4">
          <button
            type="button"
            onClick={() => void saveCrisisPlan()}
            disabled={savingCrisis}
            className="rounded-xl bg-[#0F1B2D] px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-40"
          >
            {savingCrisis ? 'Gemmer…' : 'Gem kriseplan'}
          </button>
        </div>
      </div>
    </div>
  );
}
