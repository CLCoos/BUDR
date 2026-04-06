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
      {/* Vertical rule */}
      <div className="absolute left-[62px] top-3 bottom-3 w-px bg-gray-100" />

      <div className={compact ? 'space-y-1' : 'space-y-0.5'}>
        {sorted.map((item, idx) => {
          const start = timeToMinutes(item.time);
          const nextStart = sorted[idx + 1] ? timeToMinutes(sorted[idx + 1]!.time) : 24 * 60;
          const isCurrent = nowMinutes >= start && nowMinutes < nextStart;
          const isPast = nowMinutes >= nextStart;
          const icon = CATEGORY_ICONS[item.category] ?? '📌';

          return (
            <div key={item.id ?? idx} className="flex gap-3 items-start py-2">
              {/* Time */}
              <div
                className="w-14 flex-shrink-0 text-right text-xs tabular-nums pt-0.5"
                style={{
                  fontWeight: isCurrent ? 700 : 400,
                  color: isCurrent ? TEAL : '#9CA3AF',
                }}
              >
                {item.time}
              </div>

              {/* Dot */}
              <div className="flex-shrink-0 mt-1 relative z-10">
                {isCurrent ? (
                  <div
                    className="w-3 h-3 rounded-full ring-4 ring-[#1D9E7522]"
                    style={{ backgroundColor: TEAL }}
                  />
                ) : (
                  <div
                    className="w-2.5 h-2.5 rounded-full border-2"
                    style={{
                      backgroundColor: isPast ? '#E5E7EB' : 'white',
                      borderColor: isPast ? '#D1D5DB' : '#E5E7EB',
                    }}
                  />
                )}
              </div>

              {/* Content */}
              <div
                className={`flex-1 min-w-0 rounded-lg px-3 py-2 transition-colors ${
                  isCurrent
                    ? 'bg-emerald-50 border border-emerald-100'
                    : 'bg-gray-50 border border-gray-100'
                }`}
                style={{ opacity: isPast ? 0.55 : 1 }}
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-base leading-none">{icon}</span>
                  <span
                    className="text-sm font-medium truncate"
                    style={{ color: isCurrent ? TEAL : '#374151' }}
                  >
                    {item.title}
                    {isCurrent && (
                      <span className="ml-2 text-xs font-semibold px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700">
                        Nu
                      </span>
                    )}
                  </span>
                </div>
                {item.description && !compact && (
                  <p className="text-xs text-gray-500 mt-0.5 pl-6 truncate">{item.description}</p>
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
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <CalendarDays size={16} className="text-gray-400" />
            <span className="text-sm font-semibold text-gray-800">Aktiv dagsplan</span>
            <span className="text-xs text-gray-400 capitalize">{todayLabel}</span>
          </div>
          {activePlan && (
            <span className="flex items-center gap-1.5 text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 px-2.5 py-1 rounded-full font-medium">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              Aktiv i Lys-appen
            </span>
          )}
        </div>

        <div className="px-5 py-4">
          {!activePlan || activePlan.plan_items.length === 0 ? (
            <div className="py-8 text-center">
              <Inbox size={32} className="mx-auto text-gray-300 mb-3" />
              <p className="text-sm font-medium text-gray-500">Ingen godkendt plan for i dag</p>
              <p className="text-xs text-gray-400 mt-1">
                {residentName} ser den samme besked i sin app
              </p>
            </div>
          ) : (
            <PlanTimeline items={activePlan.plan_items} />
          )}
        </div>
      </div>

      {/* ── Section B: Pending proposals ──────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <div className="flex items-center gap-2">
            <Clock size={16} className="text-gray-400" />
            <span className="text-sm font-semibold text-gray-800">Afventende forslag</span>
            {proposals.length > 0 && (
              <span className="flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse inline-block" />
                {proposals.length} afventer
              </span>
            )}
          </div>
        </div>

        {proposals.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <p className="text-sm text-gray-400">Ingen forslag afventer godkendelse</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-100">
            {proposals.map((proposal) => {
              const isActioning = actioningId === proposal.id;
              const isRejected = rejectedIds.has(proposal.id);
              const errorMsg = errors[proposal.id];

              return (
                <div
                  key={proposal.id}
                  className={`px-5 py-5 transition-all duration-300 ${isRejected ? 'bg-gray-50 opacity-60' : ''}`}
                >
                  {/* Proposal header */}
                  <div className="flex items-start justify-between gap-4 mb-3">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                          ⏳ Afventer godkendelse
                        </span>
                        {isRejected && (
                          <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                            Afvist
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-gray-400">
                        Sendt {formatTimestamp(proposal.created_at)}
                      </p>
                    </div>
                  </div>

                  {/* Borger's request */}
                  <div className="mb-3 rounded-lg bg-gray-50 border border-gray-100 px-3 py-2.5">
                    <p className="text-xs font-medium text-gray-500 mb-0.5">Borgerens ønske</p>
                    <p className="text-sm text-gray-700">{proposal.user_message}</p>
                  </div>

                  {/* AI reasoning */}
                  {proposal.ai_reasoning && (
                    <div className="mb-3 rounded-lg bg-blue-50 border border-blue-100 px-3 py-2.5">
                      <p className="text-xs font-medium text-blue-600 mb-0.5">AI-begrundelse</p>
                      <p className="text-sm text-blue-800 leading-relaxed">
                        {proposal.ai_reasoning}
                      </p>
                    </div>
                  )}

                  {/* Proposed timeline */}
                  <div className="rounded-lg border border-gray-100 overflow-hidden mb-4">
                    <div className="px-3 py-2 bg-gray-50 border-b border-gray-100">
                      <p className="text-xs font-medium text-gray-500">Foreslået plan</p>
                    </div>
                    <div className="px-3 py-3">
                      <PlanTimeline items={proposal.proposed_items} compact />
                    </div>
                  </div>

                  {/* Error */}
                  {errorMsg && <p className="text-xs text-red-600 mb-3">{errorMsg}</p>}

                  {/* Actions */}
                  {!isRejected && (
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => handleApprove(proposal)}
                        disabled={!!actioningId}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-all disabled:opacity-50 active:scale-[0.98]"
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
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-semibold text-gray-600 bg-white border border-gray-200 hover:border-red-300 hover:text-red-600 transition-all disabled:opacity-50 active:scale-[0.98]"
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

      {/* ── Section C: Mood trend ──────────────────────────────────────────── */}
      <MoodTrendChart residentId={residentId} />
    </div>
  );
}
