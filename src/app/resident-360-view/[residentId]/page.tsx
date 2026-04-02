import React from 'react';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@supabase/supabase-js';
import PortalShell from '@/components/PortalShell';
import ResidentHeader from '../components/ResidentHeader';
import DagsPlanPortal from './components/DagsPlanPortal';
import ResidentPlanTab from './components/ResidentPlanTab';
import ResidentHavenTab from './components/ResidentHavenTab';
import ResidentOverblikTab from './components/ResidentOverblikTab';
import ResidentMedicinTab from './components/ResidentMedicinTab';
import type { DailyPlan, PendingProposal } from './components/DagsPlanPortal';
import type { MedDefinition } from './components/types';

// ── Helpers ───────────────────────────────────────────────────

type TrafficDb = 'grøn' | 'gul' | 'rød';
type TrafficUi = 'groen' | 'gul' | 'roed';

const DB_TO_UI: Record<TrafficDb, TrafficUi> = {
  'grøn': 'groen',
  'gul':  'gul',
  'rød':  'roed',
};

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } },
  );
}

function formatCheckin(iso: string): string {
  const date = new Date(iso);
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const timeStr = date.toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' });
  if (date >= todayStart) return `I dag · ${timeStr}`;
  const yesterdayStart = new Date(todayStart.getTime() - 86400000);
  if (date >= yesterdayStart) return `I går · ${timeStr}`;
  return date.toLocaleDateString('da-DK', { day: 'numeric', month: 'short' }) + ` · ${timeStr}`;
}

// ── Data fetching ─────────────────────────────────────────────

async function fetchResidentData(residentId: string) {
  const supabase = getServiceClient();
  const today = new Date().toISOString().slice(0, 10);
  const todayStart = new Date(new Date().setHours(0, 0, 0, 0)).toISOString();

  const [residentRes, checkinRes, planRes, proposalsRes, journalRes, medsRes] = await Promise.all([
    supabase
      .from('care_residents')
      .select('user_id, display_name, onboarding_data')
      .eq('user_id', residentId)
      .single(),
    supabase
      .from('park_daily_checkin')
      .select('mood_score, traffic_light, note, created_at')
      .eq('resident_id', residentId)
      .gte('created_at', todayStart)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
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
    supabase
      .from('journal_entries')
      .select('id, staff_name, entry_text, category, created_at')
      .eq('resident_id', residentId)
      .gte('created_at', todayStart)
      .order('created_at', { ascending: false })
      .limit(10),
    supabase
      .from('resident_medications')
      .select('id, name, dose, frequency, time_label, time_group, prescribed_by, notes, status')
      .eq('resident_id', residentId)
      .order('created_at', { ascending: true }),
  ]);

  if (!residentRes.data) return null;

  const r  = residentRes.data;
  const od = (r.onboarding_data as Record<string, string> | null) ?? {};
  const c  = checkinRes.data;
  const tl = c ? (DB_TO_UI[c.traffic_light as TrafficDb] ?? null) : null;

  const planItems = ((planRes.data?.plan_items ?? []) as { id?: string; title: string; done?: boolean; time?: string }[]).map(
    (item, i) => ({ id: item.id ?? `item-${i}`, title: item.title, done: item.done ?? false, time: item.time }),
  );

  return {
    resident: {
      id:           r.user_id as string,
      name:         r.display_name as string,
      initials:     od.avatar_initials ?? (r.display_name as string).slice(0, 2).toUpperCase(),
      room:         od.room ?? '—',
      trafficLight: tl,
      moodScore:    c ? (c.mood_score as number) : null,
      lastCheckin:  c ? formatCheckin(c.created_at as string) : null,
    },
    checkinNote:  c ? (c.note as string | null) : null,
    plan:         (planRes.data as DailyPlan | null) ?? null,
    proposals:    (proposalsRes.data ?? []) as PendingProposal[],
    journalEntries: (journalRes.data ?? []) as {
      id: string; staff_name: string; entry_text: string; category: string; created_at: string;
    }[],
    todayPlanItems: planItems,
    medications: (medsRes.data ?? []) as MedDefinition[],
  };
}

// ── Page ──────────────────────────────────────────────────────

type Props = {
  params: Promise<{ residentId: string }>;
  searchParams: Promise<{ tab?: string }>;
};

const ALL_TABS = ['overblik', 'medicin', 'dagsplan', 'plan', 'haven'] as const;
type TabId = typeof ALL_TABS[number];

const TAB_LABELS: Record<TabId, string> = {
  overblik: 'Overblik',
  medicin:  'Medicin',
  dagsplan: 'Dagsplan',
  plan:     'Plan',
  haven:    'Haven 🌿',
};

export default async function ResidentDagPage({ params, searchParams }: Props) {
  const { residentId }    = await params;
  const { tab = 'overblik' } = await searchParams as { tab?: string };
  const activeTab = (ALL_TABS as readonly string[]).includes(tab) ? (tab as TabId) : 'overblik';

  const data = await fetchResidentData(residentId);
  if (!data) notFound();

  const { resident, checkinNote, plan, proposals, journalEntries, todayPlanItems, medications } = data;

  return (
    <PortalShell>
      <div className="p-6 max-w-screen-lg">
        {/* Dynamic header */}
        <ResidentHeader
          residentId={residentId}
          name={resident.name}
          initials={resident.initials}
          room={resident.room}
          trafficLight={resident.trafficLight}
          moodScore={resident.moodScore}
          lastCheckin={resident.lastCheckin}
          pendingProposals={proposals.length}
        />

        {/* Tabs */}
        <div className="flex gap-0.5 mt-5 mb-5 border-b border-gray-200 overflow-x-auto">
          {ALL_TABS.map(t => (
            <Link
              key={t}
              href={`/resident-360-view/${residentId}?tab=${t}`}
              className={`px-4 py-2.5 text-sm font-semibold border-b-2 -mb-px transition-colors whitespace-nowrap ${
                activeTab === t
                  ? 'border-[#0F1B2D] text-[#0F1B2D]'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {TAB_LABELS[t]}
              {t === 'dagsplan' && proposals.length > 0 && (
                <span className="ml-1.5 w-4 h-4 rounded-full bg-amber-400 text-white text-[10px] font-bold inline-flex items-center justify-center">
                  {proposals.length}
                </span>
              )}
            </Link>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === 'overblik' && (
          <ResidentOverblikTab
            residentId={residentId}
            trafficLight={resident.trafficLight}
            moodScore={resident.moodScore}
            checkinNote={checkinNote}
            medications={medications}
            journalEntries={journalEntries}
            todayPlanItems={todayPlanItems}
            pendingProposals={proposals.length}
          />
        )}

        {activeTab === 'medicin' && (
          <ResidentMedicinTab residentId={residentId} medications={medications} />
        )}

        {activeTab === 'dagsplan' && (
          <DagsPlanPortal
            residentId={residentId}
            residentName={resident.name}
            initialPlan={plan}
            initialProposals={proposals}
          />
        )}

        {activeTab === 'plan' && (
          <ResidentPlanTab
            residentId={residentId}
            residentName={resident.name}
          />
        )}

        {activeTab === 'haven' && (
          <ResidentHavenTab
            residentId={residentId}
            residentName={resident.name}
          />
        )}
      </div>
    </PortalShell>
  );
}
