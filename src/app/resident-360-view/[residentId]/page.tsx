import React from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import PortalShell from '@/components/PortalShell';
import DagsPlanPortal from './components/DagsPlanPortal';
import ResidentPlanTab from './components/ResidentPlanTab';
import ResidentHavenTab from './components/ResidentHavenTab';
import type { DailyPlan, PendingProposal } from './components/DagsPlanPortal';

// ── Data fetching ─────────────────────────────────────────────────────────────

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } },
  );
}

async function fetchResident(residentId: string) {
  const supabase = getServiceClient();
  const { data } = await supabase
    .from('care_residents')
    .select('user_id, display_name, onboarding_data')
    .eq('user_id', residentId)
    .single();
  if (!data) return null;
  const od = (data.onboarding_data as Record<string, string> | null) ?? {};
  return {
    id: data.user_id as string,
    name: data.display_name as string,
    initials: od.avatar_initials ?? (data.display_name as string).slice(0, 2).toUpperCase(),
    room: od.room ?? '—',
  };
}

async function fetchTodayData(residentId: string): Promise<{
  plan: DailyPlan | null;
  proposals: PendingProposal[];
}> {
  const supabase = getServiceClient();
  const today = new Date().toISOString().slice(0, 10);

  const [planRes, proposalsRes] = await Promise.all([
    supabase
      .from('daily_plans')
      .select('id, resident_id, plan_date, plan_items')
      .eq('resident_id', residentId)
      .eq('plan_date', today)
      .maybeSingle(),
    supabase
      .from('plan_proposals')
      .select('id, resident_id, plan_date, user_message, proposed_items, ai_reasoning, created_at')
      .eq('resident_id', residentId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false }),
  ]);

  return {
    plan: (planRes.data as DailyPlan | null) ?? null,
    proposals: ((proposalsRes.data ?? []) as PendingProposal[]),
  };
}

// ── Page ──────────────────────────────────────────────────────────────────────

type Props = {
  params: Promise<{ residentId: string }>;
  searchParams: Promise<{ tab?: string }>;
};

export default async function ResidentDagPage({ params, searchParams }: Props) {
  const { residentId } = await params;
  const { tab = 'dagsplan' } = await searchParams as { tab?: string };

  const [resident, dayData] = await Promise.all([
    fetchResident(residentId),
    fetchTodayData(residentId),
  ]);

  if (!resident) notFound();

  const todayLabel = new Date().toLocaleDateString('da-DK', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  return (
    <PortalShell>
      <div className="p-6 max-w-screen-lg">
        {/* Header */}
        <div className="flex items-start gap-4 mb-6">
          <Link
            href={`/resident-360-view?id=${residentId}`}
            className="mt-0.5 text-sm text-gray-500 hover:text-gray-700 transition-colors flex items-center gap-1"
          >
            ← Tilbage
          </Link>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-[#0F1B2D] flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                {resident.initials}
              </div>
              <div>
                <h1 className="text-lg font-bold text-gray-900">{resident.name}</h1>
                <p className="text-sm text-gray-500">
                  Værelse {resident.room} · <span className="capitalize">{todayLabel}</span>
                </p>
              </div>
            </div>
          </div>
          {dayData.proposals.length > 0 && (
            <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-full">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse inline-block" />
              {dayData.proposals.length} {dayData.proposals.length === 1 ? 'forslag' : 'forslag'} afventer
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="flex gap-1 mb-6 border-b border-gray-200">
          {[
            { key: 'dagsplan', label: 'Dagsplan' },
            { key: 'plan',     label: 'Plan' },
            { key: 'haven',    label: 'Haven 🌿' },
          ].map(t => (
            <Link
              key={t.key}
              href={`/resident-360-view/${residentId}?tab=${t.key}`}
              className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors ${
                tab === t.key
                  ? 'border-[#0F1B2D] text-[#0F1B2D]'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.label}
            </Link>
          ))}
        </div>

        {/* Tab content */}
        {tab === 'dagsplan' && (
          <DagsPlanPortal
            residentId={residentId}
            residentName={resident.name}
            initialPlan={dayData.plan}
            initialProposals={dayData.proposals}
          />
        )}

        {tab === 'plan' && (
          <ResidentPlanTab
            residentId={residentId}
            residentName={resident.name}
          />
        )}

        {tab === 'haven' && (
          <ResidentHavenTab
            residentId={residentId}
            residentName={resident.name}
          />
        )}
      </div>
    </PortalShell>
  );
}
