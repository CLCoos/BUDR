'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { getLysPhase, lysTheme } from '@/app/park-hub/lib/lysTheme';
import type { LysThemeTokens } from '@/app/park-hub/lib/lysTheme';
import { createClient } from '@/lib/supabase/client';

export type PlanItem = {
  id: string;
  time: string;
  title: string;
  description?: string;
  category: 'mad' | 'medicin' | 'aktivitet' | 'hvile' | 'social';
};

export type DailyPlan = {
  id: string;
  plan_date: string;
  plan_items: PlanItem[];
};

export type PendingProposal = {
  id: string;
  plan_date: string;
  proposed_items: PlanItem[];
  ai_reasoning?: string;
};

type Props = {
  residentId: string;
  plan: DailyPlan | null;
  pendingProposal: PendingProposal | null;
};

type ProposalResult = {
  proposalId: string;
  proposed_items: PlanItem[];
  ai_reasoning: string;
};

const CATEGORY_ICONS: Record<string, string> = {
  mad: '🍽',
  medicin: '💊',
  aktivitet: '⚡',
  hvile: '😌',
  social: '👥',
};

function timeToMinutes(time: string): number {
  const [h = 0, m = 0] = time.split(':').map(Number);
  return h * 60 + m;
}

type ItemStatus = 'past' | 'current' | 'future';

function getItemStatus(items: PlanItem[], index: number, nowMinutes: number): ItemStatus {
  const item = items[index];
  if (!item) return 'future';
  const start = timeToMinutes(item.time);
  const next = items[index + 1];
  const end = next ? timeToMinutes(next.time) : 24 * 60;
  if (nowMinutes < start) return 'future';
  if (nowMinutes >= end) return 'past';
  return 'current';
}

function TimelineItem({
  item,
  status,
  accent,
  tokens,
}: {
  item: PlanItem;
  status: ItemStatus;
  accent: string;
  tokens: LysThemeTokens;
}) {
  const icon = CATEGORY_ICONS[item.category] ?? '📌';
  const isCurrent = status === 'current';
  const isPast = status === 'past';

  return (
    <div className="relative flex gap-4 py-2">
      {/* Time column */}
      <div
        className="w-14 flex-shrink-0 text-right pt-2 tabular-nums"
        style={{
          fontSize: '13px',
          fontWeight: isCurrent ? 700 : 400,
          color: isCurrent ? accent : tokens.textMuted,
        }}
      >
        {item.time}
      </div>

      {/* Dot */}
      <div className="flex flex-col items-center relative z-10 flex-shrink-0 mt-2.5">
        {isCurrent ? (
          <div className="w-4 h-4 rounded-full lys-pulse-dot" style={{ backgroundColor: accent }} />
        ) : (
          <div
            className="w-3 h-3 rounded-full"
            style={{
              backgroundColor: isPast ? tokens.cardBorder : `${accent}44`,
              border: `2px solid ${isPast ? tokens.cardBorder : `${accent}88`}`,
            }}
          />
        )}
      </div>

      {/* Card */}
      <div
        className="flex-1 rounded-2xl px-4 py-3 transition-all duration-200"
        style={{
          backgroundColor: isCurrent ? `${accent}14` : tokens.cardBg,
          border: `1px solid ${isCurrent ? `${accent}44` : tokens.cardBorder}`,
          opacity: isPast ? 0.5 : 1,
        }}
      >
        <div className="flex items-center gap-2">
          <span className="text-xl leading-none">{icon}</span>
          <p
            className="text-sm font-semibold leading-snug"
            style={{ color: isCurrent ? accent : tokens.text }}
          >
            {item.title}
            {isCurrent && (
              <span
                className="ml-2 text-xs font-medium px-1.5 py-0.5 rounded-full"
                style={{ backgroundColor: `${accent}22`, color: accent }}
              >
                Nu
              </span>
            )}
          </p>
        </div>
        {item.description && (
          <p className="text-xs mt-1 pl-7" style={{ color: tokens.textMuted }}>
            {item.description}
          </p>
        )}
      </div>
    </div>
  );
}

function ProposedTimeline({
  items,
  tokens,
  accent: _accent,
}: {
  items: PlanItem[];
  tokens: LysThemeTokens;
  accent: string;
}) {
  return (
    <div className="space-y-2">
      {items.map((item, idx) => {
        const icon = CATEGORY_ICONS[item.category] ?? '📌';
        return (
          <div key={item.id ?? idx} className="flex items-start gap-3">
            <span
              className="text-xs font-mono mt-0.5 w-10 flex-shrink-0"
              style={{ color: tokens.textMuted }}
            >
              {item.time}
            </span>
            <span className="text-base leading-none flex-shrink-0 mt-0.5">{icon}</span>
            <div>
              <p className="text-sm font-semibold leading-snug" style={{ color: tokens.text }}>
                {item.title}
              </p>
              {item.description && (
                <p className="text-xs mt-0.5" style={{ color: tokens.textMuted }}>
                  {item.description}
                </p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function DailyPlanView({ residentId, plan, pendingProposal }: Props) {
  const [now, setNow] = useState(() => new Date());
  const [tokens, setTokens] = useState<LysThemeTokens>(() => lysTheme(getLysPhase(new Date())));
  const accent = tokens.accent;

  const [showModal, setShowModal] = useState(false);
  const [userMessage, setUserMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [proposal, setProposal] = useState<ProposalResult | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [hasPending, setHasPending] = useState(!!pendingProposal);
  // Live plan — updated via Realtime when staff approves a proposal
  const [activePlan, setActivePlan] = useState<DailyPlan | null>(plan);

  useEffect(() => {
    const interval = window.setInterval(() => {
      const d = new Date();
      setNow(d);
      setTokens(lysTheme(getLysPhase(d)));
    }, 60_000);
    return () => window.clearInterval(interval);
  }, []);

  // ── Realtime: watch daily_plans for this resident ─────────────────────────
  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;

    const today = new Date().toISOString().slice(0, 10);

    const channel = supabase
      .channel(`lys-daily-plan-${residentId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'daily_plans',
          filter: `resident_id=eq.${residentId}`,
        },
        (payload) => {
          const row = payload.new as DailyPlan & { plan_date: string };
          if (row.plan_date !== today) return;
          setActivePlan(row);
          // Clear pending banner once the approved plan arrives
          setHasPending(false);
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [residentId]);

  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const items: PlanItem[] = (activePlan?.plan_items ?? [])
    .slice()
    .sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));

  const handleSubmitProposal = useCallback(async () => {
    if (!userMessage.trim() || isSubmitting) return;
    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch('/api/lys/propose-plan', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          residentId,
          userMessage: userMessage.trim(),
          currentPlan: items,
        }),
      });
      if (!res.ok) {
        const err = (await res.json()) as { error?: string };
        throw new Error(err.error ?? 'Fejl');
      }
      const data = (await res.json()) as ProposalResult;
      setProposal(data);
    } catch (e) {
      setSubmitError(e instanceof Error ? e.message : 'Noget gik galt — prøv igen');
    } finally {
      setIsSubmitting(false);
    }
  }, [userMessage, isSubmitting, residentId, items]);

  const handleSendToStaff = () => {
    setSent(true);
    setHasPending(true);
  };

  const closeModal = () => {
    if (!proposal || sent) {
      setShowModal(false);
      setUserMessage('');
      setProposal(null);
      setSubmitError(null);
      setSent(false);
    }
  };

  const todayLabel = now.toLocaleDateString('da-DK', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <div
      className="min-h-dvh font-sans transition-colors duration-300"
      style={{ backgroundColor: tokens.bg, color: tokens.text }}
    >
      <style>{`
        @keyframes lysPulseDot {
          0%   { box-shadow: 0 0 0 0   ${accent}66; }
          60%  { box-shadow: 0 0 0 8px ${accent}00; }
          100% { box-shadow: 0 0 0 0   ${accent}00; }
        }
        .lys-pulse-dot {
          animation: lysPulseDot 1.8s ease-out infinite;
        }
      `}</style>

      <div className="mx-auto max-w-lg px-4 pt-6 pb-28">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <Link
            href="/park-hub"
            className="flex items-center justify-center w-9 h-9 rounded-full text-lg transition-colors"
            style={{
              backgroundColor: tokens.cardBg,
              border: `1px solid ${tokens.cardBorder}`,
              color: tokens.textMuted,
            }}
            aria-label="Tilbage"
          >
            ←
          </Link>
          <div>
            <h1 className="text-xl font-bold leading-tight">Din dagsplan</h1>
            <p className="text-sm capitalize" style={{ color: tokens.textMuted }}>
              {todayLabel}
            </p>
          </div>
        </div>

        {/* Pending proposal banner */}
        {hasPending && (
          <div
            className="rounded-2xl px-4 py-3 mb-5 flex items-center gap-2.5 text-sm"
            style={{
              backgroundColor: `${accent}16`,
              border: `1px solid ${accent}33`,
            }}
          >
            <span className="text-base">⏳</span>
            <p style={{ color: accent }}>Du har et forslag til behandling hos personalet</p>
          </div>
        )}

        {/* Empty state */}
        {items.length === 0 ? (
          <div
            className="rounded-3xl px-8 py-14 text-center"
            style={{
              background: `linear-gradient(160deg, ${accent}12 0%, ${accent}04 100%)`,
              border: `1px solid ${accent}20`,
              boxShadow: tokens.glowShadow,
            }}
          >
            <p className="text-6xl mb-5 leading-none select-none">🌿</p>
            <p className="text-xl font-black mb-3">Din dag er fri</p>
            <p
              className="text-sm leading-relaxed max-w-[220px] mx-auto"
              style={{ color: tokens.textMuted }}
            >
              Personalet arbejder på din plan — den dukker op her
            </p>
          </div>
        ) : (
          /* Timeline */
          <div className="relative">
            {/* Vertical line */}
            <div
              className="absolute top-4 bottom-4 w-px"
              style={{
                left: '70px',
                backgroundColor: tokens.cardBorder,
              }}
            />
            <div className="space-y-0.5">
              {items.map((item, idx) => (
                <TimelineItem
                  key={item.id ?? idx}
                  item={item}
                  status={getItemStatus(items, idx, nowMinutes)}
                  accent={accent}
                  tokens={tokens}
                />
              ))}
            </div>
          </div>
        )}

        {/* Propose change button */}
        {!hasPending && (
          <button
            type="button"
            onClick={() => setShowModal(true)}
            className="mt-8 w-full rounded-2xl py-4 text-sm font-semibold transition-all active:scale-[0.98]"
            style={{
              backgroundColor: `${accent}18`,
              border: `1px solid ${accent}44`,
              color: accent,
            }}
          >
            ✏️ Foreslå en ændring
          </button>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 sm:p-6"
          style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}
          onClick={(e) => {
            if (e.target === e.currentTarget) closeModal();
          }}
        >
          <div
            className="w-full max-w-lg rounded-3xl p-6 shadow-xl"
            style={{
              backgroundColor: tokens.bg,
              border: `1px solid ${tokens.cardBorder}`,
            }}
          >
            {!proposal ? (
              /* Step 1: input */
              <>
                <h2 className="text-lg font-bold mb-1">Foreslå en ændring</h2>
                <p className="text-sm mb-4" style={{ color: tokens.textMuted }}>
                  Hvad vil du gerne ændre?
                </p>
                <textarea
                  value={userMessage}
                  onChange={(e) => setUserMessage(e.target.value)}
                  placeholder={'F.eks. \u201cJeg vil gerne spise morgenmad lidt senere\u201d...'}
                  rows={4}
                  className="w-full rounded-2xl p-4 text-sm resize-none outline-none"
                  style={{
                    backgroundColor: tokens.cardBg,
                    border: `1px solid ${tokens.cardBorder}`,
                    color: tokens.text,
                  }}
                  autoFocus
                />
                {submitError && (
                  <p className="text-xs mt-2" style={{ color: '#EF4444' }}>
                    {submitError}
                  </p>
                )}
                <div className="flex gap-3 mt-4">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="flex-1 rounded-2xl py-3.5 text-sm font-semibold transition-colors"
                    style={{
                      backgroundColor: tokens.cardBg,
                      border: `1px solid ${tokens.cardBorder}`,
                      color: tokens.textMuted,
                    }}
                  >
                    Annuller
                  </button>
                  <button
                    type="button"
                    onClick={handleSubmitProposal}
                    disabled={!userMessage.trim() || isSubmitting}
                    className="flex-1 rounded-2xl py-3.5 text-sm font-semibold text-white transition-all active:scale-[0.98] disabled:opacity-50"
                    style={{ backgroundColor: accent }}
                  >
                    {isSubmitting ? '⏳ Et øjeblik...' : 'Send'}
                  </button>
                </div>
              </>
            ) : (
              /* Step 2: preview + confirm */
              <>
                <h2 className="text-lg font-bold mb-1">Foreslået plan</h2>
                {proposal.ai_reasoning && (
                  <p className="text-sm mb-4 leading-relaxed" style={{ color: tokens.textMuted }}>
                    {proposal.ai_reasoning}
                  </p>
                )}

                <div
                  className="rounded-2xl p-4 mb-5 max-h-72 overflow-y-auto"
                  style={{
                    backgroundColor: tokens.cardBg,
                    border: `1px solid ${tokens.cardBorder}`,
                  }}
                >
                  <ProposedTimeline
                    items={proposal.proposed_items}
                    tokens={tokens}
                    accent={accent}
                  />
                </div>

                {!sent ? (
                  <button
                    type="button"
                    onClick={handleSendToStaff}
                    className="w-full rounded-2xl py-4 text-sm font-semibold text-white transition-all active:scale-[0.98]"
                    style={{ backgroundColor: accent }}
                  >
                    Send til Personalet
                  </button>
                ) : (
                  <div
                    className="rounded-2xl p-5 text-center"
                    style={{
                      backgroundColor: `${accent}16`,
                      border: `1px solid ${accent}33`,
                    }}
                  >
                    <p className="text-3xl mb-2">🌟</p>
                    <p className="font-semibold text-sm leading-relaxed" style={{ color: accent }}>
                      Dit forslag er sendt! Personalet kigger på det og godkender det snart 🌟
                    </p>
                    <button
                      type="button"
                      onClick={closeModal}
                      className="mt-4 text-xs underline underline-offset-2"
                      style={{ color: tokens.textMuted }}
                    >
                      Luk
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
