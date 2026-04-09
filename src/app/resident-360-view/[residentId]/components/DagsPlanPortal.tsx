'use client';

import React, { useEffect, useState } from 'react';
import { CheckCircle, XCircle, Loader2, CalendarDays, Clock, Inbox } from 'lucide-react';
import { Toaster, toast } from 'sonner';
import MoodTrendChart from '@/app/resident-360-view/components/MoodTrendChart';
import { createClient } from '@/lib/supabase/client';

// ── Types ─────────────────────────────────────────────────────────────────────

export type PlanItem = {
  id: string;
  time: string;
  title: string;
  description?: string;
  category: 'mad' | 'medicin' | 'aktivitet' | 'hvile' | 'social';
};

export type DailyPlan = {
  id: string;
  resident_id: string;
  plan_date: string;
  plan_items: PlanItem[];
};

export type PendingProposal = {
  id: string;
  resident_id: string;
  plan_date: string;
  user_message: string;
  proposed_items: PlanItem[];
  ai_reasoning: string | null;
  created_at: string;
  status?: string;
};

type Props = {
  residentId: string;
  residentName: string;
  initialPlan: DailyPlan | null;
  initialProposals: PendingProposal[];
};

// ── Constants ─────────────────────────────────────────────────────────────────

const CATEGORY_ICONS: Record<string, string> = {
  mad: '🍽',
  medicin: '💊',
  aktivitet: '⚡',
  hvile: '😌',
  social: '👥',
};

const TEAL = '#1D9E75';

// ── Helpers ───────────────────────────────────────────────────────────────────

function timeToMinutes(time: string): number {
  const [h = 0, m = 0] = time.split(':').map(Number);
  return h * 60 + m;
}

function sortByTime(items: PlanItem[]): PlanItem[] {
  return [...items].sort((a, b) => timeToMinutes(a.time) - timeToMinutes(b.time));
}

function formatTimestamp(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString('da-DK', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ── Compact plan timeline (read-only) ─────────────────────────────────────────

function PlanTimeline({ items, compact = false }: { items: PlanItem[]; compact?: boolean }) {
  const sorted = sortByTime(items);
  const now = new Date();
  const nowMinutes = now.getHours() * 60 + now.getMinutes();

  return (
    <div className="relative">
      <div
        className="absolute bottom-3 left-[62px] top-3 w-px"
        style={{ backgroundColor: 'var(--cp-border)' }}
      />

      <div className={compact ? 'space-y-1' : 'space-y-0.5'}>
        {sorted.map((item, idx) => {
          const start = timeToMinutes(item.time);
          const nextStart = sorted[idx + 1] ? timeToMinutes(sorted[idx + 1]!.time) : 24 * 60;
          const isCurrent = nowMinutes >= start && nowMinutes < nextStart;
          const isPast = nowMinutes >= nextStart;
          const icon = CATEGORY_ICONS[item.category] ?? '📌';

          return (
            <div key={item.id ?? idx} className="flex items-start gap-3 py-2">
              <div
                className="w-14 flex-shrink-0 pt-0.5 text-right text-xs tabular-nums"
                style={{
                  fontWeight: isCurrent ? 700 : 400,
                  color: isCurrent ? TEAL : 'var(--cp-muted2)',
                }}
              >
                {item.time}
              </div>

              <div className="relative z-10 mt-1 flex-shrink-0">
                {isCurrent ? (
                  <div
                    className="h-3 w-3 rounded-full ring-4 ring-[#1D9E7533]"
                    style={{ backgroundColor: TEAL }}
                  />
                ) : (
                  <div
                    className="h-2.5 w-2.5 rounded-full border-2"
                    style={{
                      backgroundColor: isPast ? 'var(--cp-bg3)' : 'var(--cp-bg2)',
                      borderColor: 'var(--cp-border2)',
                    }}
                  />
                )}
              </div>

              <div
                className="min-w-0 flex-1 rounded-lg border px-3 py-2 transition-colors"
                style={{
                  opacity: isPast ? 0.55 : 1,
                  backgroundColor: isCurrent ? 'rgba(45,212,160,0.12)' : 'var(--cp-bg3)',
                  borderColor: isCurrent ? 'rgba(45,212,160,0.35)' : 'var(--cp-border)',
                }}
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-base leading-none">{icon}</span>
                  <span
                    className="truncate text-sm font-medium"
                    style={{ color: isCurrent ? TEAL : 'var(--cp-text)' }}
                  >
                    {item.title}
                    {isCurrent && (
                      <span
                        className="ml-2 rounded-full px-1.5 py-0.5 text-xs font-semibold"
                        style={{
                          backgroundColor: 'rgba(45,212,160,0.2)',
                          color: 'var(--cp-green)',
                        }}
                      >
                        Nu
                      </span>
                    )}
                  </span>
                </div>
                {item.description && !compact && (
                  <p className="mt-0.5 truncate pl-6 text-xs" style={{ color: 'var(--cp-muted)' }}>
                    {item.description}
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

export default function DagsPlanPortal({
  residentId,
  residentName,
  initialPlan,
  initialProposals,
}: Props) {
  const [activePlan, setActivePlan] = useState<DailyPlan | null>(initialPlan);
  const [proposals, setProposals] = useState<PendingProposal[]>(initialProposals);
  const [actioningId, setActioningId] = useState<string | null>(null);
  const [rejectedIds, setRejectedIds] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<Record<string, string>>({});

  // ── Realtime: watch plan_proposals for this resident ──────────────────────
  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;

    const channel = supabase
      .channel(`portal-proposals-${residentId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'plan_proposals',
          filter: `resident_id=eq.${residentId}`,
        },
        (payload) => {
          const row = payload.new as PendingProposal;
          if (row.status !== 'pending') return; // ignore non-pending inserts
          setProposals((prev) => {
            // Deduplicate by id
            if (prev.some((p) => p.id === row.id)) return prev;
            return [row, ...prev];
          });
          toast.info(`Nyt forslag fra ${residentName}`);
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [residentId, residentName]);

  const todayLabel = new Date().toLocaleDateString('da-DK', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  const handleApprove = async (proposal: PendingProposal) => {
    if (actioningId) return;
    setActioningId(proposal.id);
    setErrors((prev) => ({ ...prev, [proposal.id]: '' }));

    try {
      const res = await fetch('/api/portal/approve-proposal', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ proposalId: proposal.id }),
      });

      if (!res.ok) {
        const err = (await res.json()) as { error?: string };
        throw new Error(err.error ?? 'Ukendt fejl');
      }

      const { updatedPlan } = (await res.json()) as { updatedPlan: DailyPlan };

      // Optimistic update: activate new plan, remove proposal
      setActivePlan(updatedPlan);
      setProposals((prev) => prev.filter((p) => p.id !== proposal.id));
      toast.success('Dagsplan godkendt og aktiveret i Lys-appen ✓');
    } catch (e) {
      setErrors((prev) => ({
        ...prev,
        [proposal.id]: e instanceof Error ? e.message : 'Godkendelse fejlede',
      }));
    } finally {
      setActioningId(null);
    }
  };

  const handleReject = async (proposalId: string) => {
    if (actioningId) return;
    setActioningId(proposalId);
    setErrors((prev) => ({ ...prev, [proposalId]: '' }));

    try {
      const res = await fetch('/api/portal/reject-proposal', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ proposalId }),
      });

      if (!res.ok) throw new Error();

      toast.success('Forslag afvist');
      // Show "afvist" feedback, then remove after delay
      setRejectedIds((prev) => new Set([...prev, proposalId]));
      setTimeout(() => {
        setProposals((prev) => prev.filter((p) => p.id !== proposalId));
        setRejectedIds((prev) => {
          const s = new Set(prev);
          s.delete(proposalId);
          return s;
        });
      }, 2000);
    } catch {
      setErrors((prev) => ({ ...prev, [proposalId]: 'Afvisning fejlede' }));
    } finally {
      setActioningId(null);
    }
  };

  return (
    <div className="space-y-6">
      <Toaster position="top-right" richColors />
      {/* ── Section A: Active daily plan ──────────────────────────────────── */}
      <div className="overflow-hidden rounded-xl border border-[var(--cp-border)] bg-[var(--cp-bg2)]">
        <div className="flex items-center justify-between border-b border-[var(--cp-border)] px-5 py-4">
          <div className="flex items-center gap-2">
            <CalendarDays size={16} style={{ color: 'var(--cp-muted2)' }} />
            <span className="text-sm font-semibold" style={{ color: 'var(--cp-text)' }}>
              Aktiv dagsplan
            </span>
            <span className="text-xs capitalize" style={{ color: 'var(--cp-muted)' }}>
              {todayLabel}
            </span>
          </div>
          {activePlan && (
            <span
              className="flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium"
              style={{
                color: 'var(--cp-green)',
                backgroundColor: 'var(--cp-green-dim)',
                borderColor: 'rgba(45,212,160,0.25)',
              }}
            >
              <div className="h-1.5 w-1.5 rounded-full bg-[var(--cp-green)]" />
              Aktiv i Lys-appen
            </span>
          )}
        </div>

        <div className="px-5 py-4">
          {!activePlan || activePlan.plan_items.length === 0 ? (
            <div className="py-8 text-center">
              <Inbox size={32} className="mx-auto mb-3" style={{ color: 'var(--cp-muted2)' }} />
              <p className="text-sm font-medium" style={{ color: 'var(--cp-muted)' }}>
                Ingen godkendt plan for i dag
              </p>
              <p className="mt-1 text-xs" style={{ color: 'var(--cp-muted2)' }}>
                {residentName} ser den samme besked i sin app
              </p>
            </div>
          ) : (
            <PlanTimeline items={activePlan.plan_items} />
          )}
        </div>
      </div>

      {/* ── Section B: Pending proposals ──────────────────────────────────── */}
      <div className="overflow-hidden rounded-xl border border-[var(--cp-border)] bg-[var(--cp-bg2)]">
        <div className="flex items-center justify-between border-b border-[var(--cp-border)] px-5 py-4">
          <div className="flex items-center gap-2">
            <Clock size={16} style={{ color: 'var(--cp-muted2)' }} />
            <span className="text-sm font-semibold" style={{ color: 'var(--cp-text)' }}>
              Afventende forslag
            </span>
            {proposals.length > 0 && (
              <span
                className="flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium"
                style={{
                  color: 'var(--cp-amber)',
                  backgroundColor: 'var(--cp-amber-dim)',
                  borderColor: 'rgba(246,173,85,0.35)',
                }}
              >
                <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--cp-amber)]" />
                {proposals.length} afventer
              </span>
            )}
          </div>
        </div>

        {proposals.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <p className="text-sm" style={{ color: 'var(--cp-muted)' }}>
              Ingen forslag afventer godkendelse
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--cp-border)]">
            {proposals.map((proposal) => {
              const isActioning = actioningId === proposal.id;
              const isRejected = rejectedIds.has(proposal.id);
              const errorMsg = errors[proposal.id];

              return (
                <div
                  key={proposal.id}
                  className={`px-5 py-5 transition-all duration-300 ${isRejected ? 'opacity-60' : ''}`}
                  style={isRejected ? { backgroundColor: 'var(--cp-bg3)' } : undefined}
                >
                  <div className="mb-3 flex items-start justify-between gap-4">
                    <div>
                      <div className="mb-1 flex items-center gap-2">
                        <span
                          className="rounded-full border px-2 py-0.5 text-xs font-semibold"
                          style={{
                            color: 'var(--cp-amber)',
                            backgroundColor: 'var(--cp-amber-dim)',
                            borderColor: 'rgba(246,173,85,0.35)',
                          }}
                        >
                          ⏳ Afventer godkendelse
                        </span>
                        {isRejected && (
                          <span
                            className="rounded-full px-2 py-0.5 text-xs font-semibold"
                            style={{
                              color: 'var(--cp-muted)',
                              backgroundColor: 'var(--cp-bg3)',
                            }}
                          >
                            Afvist
                          </span>
                        )}
                      </div>
                      <p className="text-xs" style={{ color: 'var(--cp-muted2)' }}>
                        Sendt {formatTimestamp(proposal.created_at)}
                      </p>
                    </div>
                  </div>

                  <div
                    className="mb-3 rounded-lg border px-3 py-2.5"
                    style={{
                      backgroundColor: 'var(--cp-bg3)',
                      borderColor: 'var(--cp-border)',
                    }}
                  >
                    <p className="mb-0.5 text-xs font-medium" style={{ color: 'var(--cp-muted)' }}>
                      Borgerens ønske
                    </p>
                    <p className="text-sm" style={{ color: 'var(--cp-text)' }}>
                      {proposal.user_message}
                    </p>
                  </div>

                  {proposal.ai_reasoning && (
                    <div
                      className="mb-3 rounded-lg border px-3 py-2.5"
                      style={{
                        backgroundColor: 'rgba(96,165,250,0.1)',
                        borderColor: 'rgba(96,165,250,0.25)',
                      }}
                    >
                      <p className="mb-0.5 text-xs font-medium text-sky-400">AI-begrundelse</p>
                      <p className="text-sm leading-relaxed text-sky-100/90">
                        {proposal.ai_reasoning}
                      </p>
                    </div>
                  )}

                  <div
                    className="mb-4 overflow-hidden rounded-lg border"
                    style={{ borderColor: 'var(--cp-border)' }}
                  >
                    <div
                      className="border-b border-[var(--cp-border)] px-3 py-2"
                      style={{
                        backgroundColor: 'var(--cp-bg3)',
                      }}
                    >
                      <p className="text-xs font-medium" style={{ color: 'var(--cp-muted)' }}>
                        Foreslået plan
                      </p>
                    </div>
                    <div className="px-3 py-3">
                      <PlanTimeline items={proposal.proposed_items} compact />
                    </div>
                  </div>

                  {errorMsg && (
                    <p className="mb-3 text-xs" style={{ color: 'var(--cp-red)' }}>
                      {errorMsg}
                    </p>
                  )}

                  {!isRejected && (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleApprove(proposal)}
                        disabled={!!actioningId}
                        className="flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-all disabled:opacity-50 active:scale-[0.98]"
                        style={{ backgroundColor: TEAL }}
                      >
                        {isActioning ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <CheckCircle size={14} />
                        )}
                        Godkend
                      </button>
                      <button
                        type="button"
                        onClick={() => handleReject(proposal.id)}
                        disabled={!!actioningId}
                        className="flex items-center gap-1.5 rounded-lg border px-4 py-2 text-sm font-semibold transition-all disabled:opacity-50 active:scale-[0.98]"
                        style={{
                          color: 'var(--cp-muted)',
                          backgroundColor: 'var(--cp-bg3)',
                          borderColor: 'var(--cp-border)',
                        }}
                      >
                        {isActioning ? (
                          <Loader2 size={14} className="animate-spin" />
                        ) : (
                          <XCircle size={14} />
                        )}
                        Afvis
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <MoodTrendChart residentId={residentId} carePortalDark />
    </div>
  );
}
