'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, Check, Stethoscope } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import type { LysThemeTokens } from '../lib/lysTheme';

export type ProgramItemType = 'struktur' | 'aftale' | 'aktivitet' | 'andet';

export type ProgramItem = {
  id: string;
  time: string;
  title: string;
  type: ProgramItemType;
  subtitle?: string;
  elevated?: boolean;
  nyIDag?: boolean;
};

const TYPE_DOT: Record<ProgramItemType, string> = {
  struktur: '🔵',
  aftale: '🟣',
  aktivitet: '🟢',
  andet: '🟡',
};

const TYPE_LABEL: Record<ProgramItemType, string> = {
  struktur: 'Fast struktur',
  aftale: 'Aftale',
  aktivitet: 'Aktivitet',
  andet: 'Andet',
};

// daily_plans.plan_items row shape (from DailyPlanView / propose-plan)
type RawPlanItem = {
  id?: string;
  time: string;
  title: string;
  description?: string;
  category?: string;
};

function categoryToType(cat?: string): ProgramItemType {
  switch (cat) {
    case 'aktivitet': return 'aktivitet';
    case 'social':    return 'aktivitet';
    case 'mad':       return 'struktur';
    case 'medicin':   return 'struktur';
    case 'hvile':     return 'andet';
    default:          return 'struktur';
  }
}

function rawToProgramItem(raw: RawPlanItem, idx: number): ProgramItem {
  return {
    id: raw.id ?? `plan-item-${idx}`,
    time: raw.time,
    title: raw.title,
    type: categoryToType(raw.category),
    subtitle: raw.description,
  };
}

function parseTime(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

export function isSpecialScheduleItem(item: ProgramItem): boolean {
  if (item.elevated) return true;
  if (item.type === 'aktivitet') return true;
  if (item.type === 'aftale') return true;
  return false;
}

type ResponseState =
  | { kind: 'klar' }
  | { kind: 'nervøs' }
  | { kind: 'afmelding' }
  | { kind: 'bekræftet' };

type Props = {
  tokens: LysThemeTokens;
  accent: string;
  now?: Date;
  mode?: 'embedded' | 'focus';
  firstName?: string;
  residentId?: string;
};

export default function LysDagensProgram({
  tokens,
  accent,
  now = new Date(),
  mode = 'embedded',
  firstName = '',
  residentId,
}: Props) {
  const [items, setItems] = useState<ProgramItem[] | null>(null); // null = loading
  const nowMin = now.getHours() * 60 + now.getMinutes();

  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [responses, setResponses] = useState<Record<string, ResponseState>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});

  // Fetch today's approved daily plan from Supabase
  useEffect(() => {
    if (!residentId) {
      setItems([]);
      return;
    }
    const supabase = createClient();
    if (!supabase) {
      setItems([]);
      return;
    }

    const today = new Date().toISOString().slice(0, 10);
    supabase
      .from('daily_plans')
      .select('plan_items')
      .eq('resident_id', residentId)
      .eq('plan_date', today)
      .maybeSingle()
      .then(({ data, error }) => {
        if (error) console.error('LysDagensProgram fetch error', error);
        if (data?.plan_items && Array.isArray(data.plan_items) && data.plan_items.length > 0) {
          const mapped = (data.plan_items as RawPlanItem[])
            .map((raw, idx) => rawToProgramItem(raw, idx))
            .sort((a, b) => parseTime(a.time) - parseTime(b.time));
          setItems(mapped);
        } else {
          setItems([]); // empty — show friendly state
        }
      });
  }, [residentId]);

  const formatter = useMemo(
    () => new Intl.DateTimeFormat('da-DK', { weekday: 'long', day: 'numeric', month: 'long' }),
    [],
  );
  const dateLine = formatter.format(now);
  const dateLineCap = dateLine.charAt(0).toUpperCase() + dateLine.slice(1);

  const displayItems = items ?? [];
  const allPast = displayItems.every(i => parseTime(i.time) < nowMin);
  const nextIdx = displayItems.findIndex(i => parseTime(i.time) >= nowMin);
  const placeholders = nextIdx >= 0 ? Math.min(2, displayItems.length - nextIdx - 1) : 0;

  const isDarkish =
    tokens.bg === '#0F1B2D' || tokens.bg === '#0A1220' || tokens.text.toLowerCase().includes('e2e8f0');

  const toggleExpand = useCallback((id: string) => {
    setExpandedId(cur => (cur === id ? null : id));
  }, []);

  const setNote = useCallback((itemId: string, value: string) => {
    setNotes(n => ({ ...n, [itemId]: value.slice(0, 100) }));
  }, []);

  const confirmRegular = useCallback(
    (item: ProgramItem) => {
      setResponses(r => ({ ...r, [item.id]: { kind: 'bekræftet' } }));
      setExpandedId(null);
      toast.success(`📋 Sendt til portalen: "${firstName} har bekræftet ${item.title} kl. ${item.time}"`);
    },
    [firstName],
  );

  const specialReaction = useCallback(
    (item: ProgramItem, kind: 'klar' | 'nervøs' | 'afmelding') => {
      setResponses(r => ({ ...r, [item.id]: { kind } }));
      setExpandedId(null);
      const tid = item.time;
      const tit = item.title;
      if (kind === 'klar') {
        toast.success(`📋 Sendt til portalen: "${firstName} er klar til ${tit} kl. ${tid}"`);
      } else if (kind === 'nervøs') {
        toast.success(`📋 Sendt til portalen: "${firstName} er nervøs for ${tit} kl. ${tid}"`);
      } else {
        toast.success(`📋 Sendt til portalen: "${firstName} vil afmelde ${tit} kl. ${tid}"`);
      }
    },
    [firstName],
  );

  const sendNote = useCallback(
    (item: ProgramItem) => {
      const n = (notes[item.id] ?? '').trim();
      if (!n) return;
      toast.success(
        `Sendt til personalet ✓ — 📋 Portal: note om "${item.title}" (${n.slice(0, 40)}${n.length > 40 ? '…' : ''})`,
      );
      setNote(item.id, '');
    },
    [notes, setNote],
  );

  const badgeFor = (itemId: string) => {
    const r = responses[itemId];
    if (!r) return null;
    if (r.kind === 'bekræftet' || r.kind === 'klar')
      return (
        <span
          className="rounded-full border border-green-500/30 bg-green-500/20 px-2 py-0.5 text-xs font-semibold"
          style={{ color: isDarkish ? '#86efac' : '#166534' }}
        >
          Bekræftet
        </span>
      );
    if (r.kind === 'nervøs')
      return (
        <span
          className="rounded-full border border-amber-500/30 bg-amber-500/20 px-2 py-0.5 text-xs font-semibold"
          style={{ color: isDarkish ? '#fcd34d' : '#92400e' }}
        >
          Nervøs
        </span>
      );
    if (r.kind === 'afmelding')
      return (
        <span
          className="rounded-full border border-red-500/30 bg-red-500/20 px-2 py-0.5 text-xs font-semibold"
          style={{ color: isDarkish ? '#fca5a5' : '#991b1b' }}
        >
          Afmeldt
        </span>
      );
    return null;
  };

  const interactionPanel = (item: ProgramItem, past: boolean) => {
    const open = expandedId === item.id;
    const special = isSpecialScheduleItem(item);

    return (
      <div
        className={`grid transition-all duration-200 ${open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
        style={{ marginTop: open ? 8 : 0 }}
      >
        <div className="overflow-hidden">
          <div className="space-y-3 border-t pt-3 transition-all duration-200" style={{ borderColor: tokens.cardBorder }}>
            {!special ? (
              <button
                type="button"
                disabled={past || responses[item.id]?.kind === 'bekræftet'}
                onClick={() => confirmRegular(item)}
                className="flex min-h-[44px] items-center justify-center gap-2 rounded-full px-4 py-2 text-sm font-semibold text-white transition-all duration-200 disabled:opacity-40"
                style={{ backgroundColor: '#1D9E75' }}
              >
                <Check className="h-4 w-4" aria-hidden /> Klar
              </button>
            ) : (
              <>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    disabled={past || !!responses[item.id]}
                    onClick={() => specialReaction(item, 'klar')}
                    className="rounded-full border border-green-500/30 bg-green-500/20 px-4 py-2 text-sm font-semibold transition-all duration-200 disabled:opacity-40"
                    style={{ color: isDarkish ? '#86efac' : '#166534' }}
                  >
                    ✓ Jeg er klar
                  </button>
                  <button
                    type="button"
                    disabled={past || !!responses[item.id]}
                    onClick={() => specialReaction(item, 'nervøs')}
                    className="rounded-full border border-amber-500/30 bg-amber-500/20 px-4 py-2 text-sm font-semibold transition-all duration-200 disabled:opacity-40"
                    style={{ color: isDarkish ? '#fcd34d' : '#92400e' }}
                  >
                    😟 Jeg er nervøs
                  </button>
                  <button
                    type="button"
                    disabled={past || !!responses[item.id]}
                    onClick={() => specialReaction(item, 'afmelding')}
                    className="rounded-full border border-red-500/30 bg-red-500/20 px-4 py-2 text-sm font-semibold transition-all duration-200 disabled:opacity-40"
                    style={{ color: isDarkish ? '#fca5a5' : '#991b1b' }}
                  >
                    ✗ Jeg vil afmelde
                  </button>
                </div>
                <label className="block text-sm font-medium opacity-90" style={{ color: tokens.text }}>
                  Skriv en note til personalet
                  <textarea
                    value={notes[item.id] ?? ''}
                    onChange={e => setNote(item.id, e.target.value)}
                    maxLength={100}
                    rows={2}
                    placeholder="Fortæl personalet noget om denne aftale..."
                    className="mt-1 w-full rounded-xl border border-white/20 bg-white/10 p-3 text-sm text-white placeholder:text-white/40 outline-none transition-all duration-200"
                    style={
                      !isDarkish
                        ? { borderColor: tokens.cardBorder, backgroundColor: 'rgba(255,255,255,0.85)', color: tokens.text }
                        : undefined
                    }
                  />
                </label>
                <button
                  type="button"
                  onClick={() => sendNote(item)}
                  disabled={!(notes[item.id] ?? '').trim()}
                  className="min-h-[44px] rounded-full px-5 py-2 text-sm font-semibold text-white transition-all duration-200 disabled:opacity-40"
                  style={{ backgroundColor: accent }}
                >
                  Send
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  const wrap = mode === 'focus' ? 'min-h-0' : '';

  return (
    <section
      className={`rounded-2xl border shadow-sm transition-all duration-200 ${wrap} ${mode === 'focus' ? 'min-h-[calc(100dvh-8rem)] p-6' : 'p-6'}`}
      style={{ backgroundColor: tokens.cardBg, borderColor: tokens.cardBorder, color: tokens.text }}
      aria-labelledby="lys-dagens-program-heading"
    >
      <div className="mb-4 flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <CalendarDays className="h-6 w-6 shrink-0" style={{ color: accent }} aria-hidden />
          <h2 id="lys-dagens-program-heading" className="text-xl font-bold">
            {mode === 'focus' ? 'Min dag' : 'Din dag i dag'}
          </h2>
        </div>
        <p className="text-base opacity-60" style={{ color: tokens.text }}>
          {dateLineCap}
        </p>
      </div>

      {/* Loading state */}
      {items === null && (
        <div className="flex justify-center py-8">
          <div className="flex gap-1.5">
            {[0, 150, 300].map(delay => (
              <div
                key={delay}
                className="w-2 h-2 rounded-full animate-bounce"
                style={{ backgroundColor: accent, animationDelay: `${delay}ms` }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Empty state — no approved plan for today */}
      {items !== null && items.length === 0 && (
        <div className="py-8 text-center space-y-2">
          <p className="text-3xl">📋</p>
          <p className="font-semibold" style={{ color: tokens.text }}>
            Ingen godkendt plan for i dag
          </p>
          <p className="text-sm opacity-60" style={{ color: tokens.text }}>
            Spørg dit personale om din dagsplan.
          </p>
        </div>
      )}

      {/* Timeline */}
      {items !== null && items.length > 0 && (
        <>
          <ol className="relative space-y-0 border-s-2 ps-6" style={{ borderColor: `${accent}40` }}>
            {displayItems.map((item, idx) => {
              const past = parseTime(item.time) < nowMin;
              const isNext = idx === nextIdx && !past;

              if (item.elevated) {
                return (
                  <li key={item.id} className="relative mb-4 ms-2 list-none">
                    <span
                      className="absolute -start-[1.6rem] top-3 h-3 w-3 rounded-full border-2"
                      style={{ borderColor: accent, backgroundColor: tokens.cardBg }}
                      aria-hidden
                    />
                    <button
                      type="button"
                      onClick={() => toggleExpand(item.id)}
                      className="relative w-full overflow-hidden rounded-2xl border-2 bg-white p-4 text-left shadow-sm transition-all duration-200"
                      style={{
                        borderColor: accent,
                        opacity: past ? 0.55 : 1,
                        transform: isNext && !past ? 'scale(1.01)' : undefined,
                      }}
                    >
                      {item.nyIDag ? (
                        <span className="absolute end-3 top-3 rounded-full bg-amber-100 px-2 py-1 text-xs font-semibold text-amber-700">
                          Ny i dag
                        </span>
                      ) : null}
                      <div className="flex flex-wrap items-start gap-3 pe-14">
                        <div
                          className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl"
                          style={{ backgroundColor: tokens.accentSoft }}
                        >
                          <Stethoscope className="h-6 w-6" style={{ color: accent }} aria-hidden />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <p className="mb-1 font-mono text-base font-semibold" style={{ color: accent }}>
                              {item.time}
                            </p>
                            {badgeFor(item.id)}
                          </div>
                          <p className="text-lg font-bold" style={{ color: tokens.text }}>{item.title}</p>
                          {item.subtitle ? (
                            <p className="mt-1 text-base opacity-60" style={{ color: tokens.text }}>{item.subtitle}</p>
                          ) : null}
                          <p className="mt-2 text-base">
                            <span aria-hidden>{TYPE_DOT[item.type]}</span>{' '}
                            <span className="opacity-80">{TYPE_LABEL[item.type]}</span>
                          </p>
                          <p className="mt-1 text-sm opacity-60">Tryk for at svare</p>
                        </div>
                      </div>
                    </button>
                    {interactionPanel(item, past)}
                  </li>
                );
              }

              return (
                <li
                  key={item.id}
                  className="relative mb-4 ms-2 list-none last:mb-0"
                  style={{ opacity: past ? 0.5 : 1 }}
                >
                  <span
                    className="absolute -start-[1.45rem] top-2 h-2.5 w-2.5 rounded-full"
                    style={{ backgroundColor: accent }}
                    aria-hidden
                  />
                  <button
                    type="button"
                    onClick={() => toggleExpand(item.id)}
                    className="w-full rounded-xl py-1 text-left transition-all duration-200"
                  >
                    <div className="flex flex-wrap items-baseline gap-2 gap-y-1">
                      <span
                        className="inline-flex rounded-full px-3 py-1 font-mono text-base font-semibold"
                        style={{ backgroundColor: tokens.accentSoft, color: tokens.accentSoftText }}
                      >
                        {item.time}
                      </span>
                      <span className="text-lg font-semibold" style={{ color: tokens.text }}>{item.title}</span>
                      <span className="text-base" aria-label={TYPE_LABEL[item.type]}>
                        <span aria-hidden>{TYPE_DOT[item.type]}</span>
                      </span>
                      {badgeFor(item.id)}
                    </div>
                    <span className="mt-1 block text-sm opacity-50">Tryk for at svare</span>
                  </button>
                  {interactionPanel(item, past)}
                </li>
              );
            })}

            {!allPast &&
              Array.from({ length: placeholders }).map((_, i) => (
                <li
                  key={`placeholder-${i}`}
                  className="relative mb-3 ms-2 list-none rounded-xl border border-dashed ps-2"
                  style={{ borderColor: `${accent}35`, minHeight: 48 }}
                >
                  <span className="sr-only">Ledig tid senere på dagen</span>
                </li>
              ))}
          </ol>

          {allPast ? (
            <p className="mt-6 text-center text-lg opacity-80" style={{ color: tokens.text }}>
              Det er alt for i dag 🌙
            </p>
          ) : null}
        </>
      )}
    </section>
  );
}
