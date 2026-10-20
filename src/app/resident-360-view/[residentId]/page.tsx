import React, { Suspense } from 'react';
import { notFound, redirect } from 'next/navigation';
import type { SupabaseClient } from '@supabase/supabase-js';
import PortalShell from '@/components/PortalShell';
import { createServerSupabaseClient, getServerAuthUser } from '@/lib/supabase/server';
import { preloadPortalShell } from '@/lib/portalAuth';
import ResidentHeader from '../components/ResidentHeader';
import DagsPlanPortal from './components/DagsPlanPortal';
import ResidentPlanTab from './components/ResidentPlanTab';
import ResidentHavenTab from './components/ResidentHavenTab';
import ResidentOverblikTab from './components/ResidentOverblikTab';
import ContactPersons from '@/components/assistant/ContactPersons';
import ResidentActiveDevices from './components/ResidentActiveDevices';
import ResidentRecoveryTab from './components/ResidentRecoveryTab';
import ResidentMedicinTab from './components/ResidentMedicinTab';
import WriteJournalEntry from './components/WriteJournalEntry';
import ResidentOverflowMenu from './components/ResidentOverflowMenu';
import ResidentLysSamtalerTab from '@/app/care-portal-dashboard/components/ResidentLysSamtalerTab';
import ResidentVumTab from './components/ResidentVumTab';
import ResidentTabs from './components/ResidentTabs';
import ResidentDocumentsTab from './components/ResidentDocumentsTab';
import ResidentForloebTab, { type ForloebProps } from './components/ResidentForloebTab';
import { buildTimeline, dailyMood, medsToday, moodSummary, nextUp, ownWords } from '@/lib/forloeb';
import { getDocumentType } from '@/lib/documents/registry';
import type { DailyPlan, PendingProposal } from './components/DagsPlanPortal';
import type { MedDefinition } from './components/types';
import type { ResidentExportInput } from '@/lib/residentExport/types';
import { copenhagenStartOfTodayUtcIso, copenhagenYmd } from '@/lib/copenhagenDay';
import { formatResidentName, getInitials } from '@/lib/residents/formatName';
import {
  getRecoveryProfile,
  computeRecoveryProfileCompletion,
  getActiveNextSteps,
  getReflectionHistory,
  getCheckinHistory,
} from '@/lib/lys-queries';
import type { LysRecoveryStory } from '@/types/lys';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// ── Helpers ───────────────────────────────────────────────────

type TrafficDb = 'grøn' | 'gul' | 'rød';
type TrafficUi = 'groen' | 'gul' | 'roed';

const DB_TO_UI: Record<TrafficDb, TrafficUi> = {
  grøn: 'groen',
  gul: 'gul',
  rød: 'roed',
};

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

function journalSelectMissingStatus(message: string | undefined): boolean {
  const m = (message ?? '').toLowerCase();
  return (
    m.includes('journal_status') && (m.includes('does not exist') || m.includes('schema cache'))
  );
}

async function fetchResidentData(supabase: SupabaseClient, residentId: string) {
  // Data til alle faner hentes parallelt i samme runde, så faneskift sker uden serverkald.
  const recoveryPromise = Promise.all([
    getRecoveryProfile(residentId, supabase).catch(() => null),
    getActiveNextSteps(residentId, supabase).catch(() => []),
    getReflectionHistory(residentId, 20, supabase).catch(() => []),
    getCheckinHistory(residentId, 30, supabase).catch(() => []),
  ]);

  const today = new Date().toISOString().slice(0, 10);
  const todayStart = copenhagenStartOfTodayUtcIso();

  const exportJournalSince = new Date(Date.now() - 90 * 86400000).toISOString();

  const [
    residentRes,
    checkinRes,
    planRes,
    proposalsRes,
    journalRes,
    journalExportRes,
    medsRes,
    concernRes,
    aiBriefRes,
    plannerRes,
    openDocsRes,
    medGivenRes,
    crisisRes,
  ] = await Promise.all([
    supabase
      .from('care_residents')
      .select('user_id, first_name, last_name, display_name, onboarding_data')
      .eq('user_id', residentId)
      .single(),
    supabase
      .from('park_daily_checkin')
      .select('mood_score, traffic_light, note, created_at, ai_summary, voice_transcript')
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
      .select('id, staff_name, entry_text, category, created_at, journal_status, approved_at')
      .eq('resident_id', residentId)
      .gte('created_at', todayStart)
      .order('created_at', { ascending: false })
      .limit(20),
    supabase
      .from('journal_entries')
      .select('id, staff_name, entry_text, category, created_at, journal_status, approved_at')
      .eq('resident_id', residentId)
      .gte('created_at', exportJournalSince)
      .order('created_at', { ascending: false })
      .limit(80),
    supabase
      .from('resident_medications')
      .select('id, name, dose, frequency, time_label, time_group, prescribed_by, notes, status')
      .eq('resident_id', residentId)
      .order('created_at', { ascending: true }),
    supabase
      .from('care_concern_notes')
      .select('id, note, category, severity, staff_name, created_at')
      .eq('resident_id', residentId)
      .order('created_at', { ascending: false })
      .limit(25),
    supabase
      .from('ai_briefs')
      .select('lead, bullets, actions, brief_type, created_at')
      .eq('resident_id', residentId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    // Til «Forløb»: kommende aftaler, åbne dokumentfrister, dagens udleveringer og kriseplan.
    supabase
      .from('care_planner_entries')
      .select('id, title, starts_at, location')
      .eq('resident_user_id', residentId)
      .gte('starts_at', new Date().toISOString())
      .lt('starts_at', new Date(Date.now() + 14 * 86400000).toISOString())
      .order('starts_at', { ascending: true })
      .limit(10),
    supabase
      .from('resident_documents')
      .select('id, doc_type, title, due_date')
      .eq('resident_id', residentId)
      .in('status', ['kladde', 'til_godkendelse'])
      .not('due_date', 'is', null)
      .lte('due_date', new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10))
      .limit(10),
    supabase
      .from('medication_administrations')
      .select('medication_id')
      .eq('resident_id', residentId)
      .eq('scheduled_date', copenhagenYmd(new Date()))
      .is('cancelled_at', null),
    supabase
      .from('crisis_plans')
      .select('warning_signs, helpful_strategies, steps')
      .eq('resident_id', residentId)
      .maybeSingle(),
  ]);

  for (const [name, res] of Object.entries({
    planner: plannerRes,
    openDocs: openDocsRes,
    medGiven: medGivenRes,
    crisis: crisisRes,
  })) {
    if (res.error) console.error(`[forloeb] ${name}:`, res.error.message);
  }

  type JournalRow = {
    id: string;
    staff_name: string;
    entry_text: string;
    category: string;
    created_at: string;
    journal_status: string;
    approved_at: string | null;
  };

  let journalEntriesResolved: JournalRow[] = (journalRes.data ?? []) as JournalRow[];
  if (journalRes.error) {
    if (journalSelectMissingStatus(journalRes.error.message)) {
      const retry = await supabase
        .from('journal_entries')
        .select('id, staff_name, entry_text, category, created_at, approved_at')
        .eq('resident_id', residentId)
        .gte('created_at', todayStart)
        .order('created_at', { ascending: false })
        .limit(20);
      if (!retry.error && retry.data) {
        journalEntriesResolved = (retry.data as Omit<JournalRow, 'journal_status'>[]).map(
          (row) => ({
            ...row,
            journal_status: 'godkendt',
          })
        );
      } else {
        journalEntriesResolved = [];
      }
    } else {
      journalEntriesResolved = [];
    }
  }

  let journalExportResolved: JournalRow[] = (journalExportRes.data ?? []) as JournalRow[];
  if (journalExportRes.error) {
    if (journalSelectMissingStatus(journalExportRes.error.message)) {
      const retry = await supabase
        .from('journal_entries')
        .select('id, staff_name, entry_text, category, created_at, approved_at')
        .eq('resident_id', residentId)
        .gte('created_at', exportJournalSince)
        .order('created_at', { ascending: false })
        .limit(80);
      if (!retry.error && retry.data) {
        journalExportResolved = (retry.data as Omit<JournalRow, 'journal_status'>[]).map((row) => ({
          ...row,
          journal_status: 'godkendt',
        }));
      } else {
        journalExportResolved = [];
      }
    } else {
      journalExportResolved = [];
    }
  }

  const lysJournalIds = journalEntriesResolved
    .filter((j) => j.category === 'Lys journal')
    .map((j) => j.id);

  const recoveryStoriesByJournalId: Record<string, LysRecoveryStory> = {};
  if (lysJournalIds.length > 0) {
    const { data: stories } = await supabase
      .from('lys_recovery_stories')
      .select('*')
      .in('related_journal_entry_id', lysJournalIds);

    if (stories) {
      for (const s of stories as LysRecoveryStory[]) {
        if (s.related_journal_entry_id) {
          recoveryStoriesByJournalId[s.related_journal_entry_id] = s;
        }
      }
    }
  }

  if (residentRes.error || !residentRes.data) return null;

  const r = residentRes.data;
  const od = (r.onboarding_data as Record<string, string> | null) ?? {};
  const c = checkinRes.data;
  const tl = c ? (DB_TO_UI[c.traffic_light as TrafficDb] ?? null) : null;

  const planItems = (
    (planRes.data?.plan_items ?? []) as {
      id?: string;
      title: string;
      done?: boolean;
      time?: string;
    }[]
  ).map((item, i) => ({
    id: item.id ?? `item-${i}`,
    title: item.title,
    done: item.done ?? false,
    time: item.time,
  }));

  const [recoveryProfile, activeNextSteps, recentReflections, allCheckins] = await recoveryPromise;

  const recentWeeklyCheckins = allCheckins.filter((c) => c.checkin_type === 'weekly').slice(0, 8);

  const profileCompletionPercent = computeRecoveryProfileCompletion(recoveryProfile);

  const firstName =
    ((r.first_name as string | null) ?? '').trim() ||
    ((r.display_name as string | null) ?? '').trim().split(/\s+/)[0] ||
    'Borgeren';
  const now = new Date();
  const todayYmd = copenhagenYmd(now);
  const mood = dailyMood(allCheckins, todayYmd, 14);
  const latestWords = allCheckins.find((ch) => ch.free_text?.trim());
  const crisisRow = crisisRes.data as {
    warning_signs: string[] | null;
    helpful_strategies: string[] | null;
    steps: { title?: string; description?: string }[] | null;
  } | null;
  const crisisSteps = (crisisRow?.steps ?? [])
    .map((st) => [st.title?.trim(), st.description?.trim()].filter(Boolean).join(': '))
    .filter(Boolean);
  const clean = (xs: string[] | null | undefined) =>
    (xs ?? []).map((x) => x.trim()).filter(Boolean);
  const crisis =
    crisisRow &&
    (clean(crisisRow.warning_signs).length > 0 ||
      clean(crisisRow.helpful_strategies).length > 0 ||
      crisisSteps.length > 0)
      ? {
          warningSigns: clean(crisisRow.warning_signs),
          helps: clean(crisisRow.helpful_strategies),
          steps: crisisSteps,
        }
      : null;

  const forloeb: Omit<ForloebProps, 'residentId'> = {
    firstName,
    today: {
      traffic: tl,
      mood: c ? ((c.mood_score as number | null) ?? null) : null,
      when: c ? formatCheckin(c.created_at as string) : null,
      note: c ? ((c.note as string | null) ?? null) : null,
    },
    mood,
    moodSummary: moodSummary(mood),
    goals: activeNextSteps.map((g) => ({
      id: g.id,
      title: g.title,
      description: g.description,
      targetDate: g.target_date,
      byResident: g.created_by_type === 'resident',
      residentNote: g.resident_note,
    })),
    timeline: buildTimeline({
      journal: journalExportResolved,
      concerns: (concernRes.data ?? []) as {
        id: string;
        note: string;
        category: string;
        staff_name: string;
        created_at: string;
      }[],
      checkins: allCheckins,
      limit: 12,
    }),
    ownWords: ownWords(recoveryProfile),
    latestLysWords: latestWords?.free_text
      ? { text: latestWords.free_text.trim(), when: formatCheckin(latestWords.created_at) }
      : null,
    next: nextUp({
      today: todayYmd,
      residentId,
      appointments: (plannerRes.data ?? []) as {
        id: string;
        title: string;
        starts_at: string;
        location: string | null;
      }[],
      documents: (
        (openDocsRes.data ?? []) as {
          id: string;
          doc_type: string;
          title: string | null;
          due_date: string;
        }[]
      ).map((d) => ({
        id: d.id,
        title: d.title?.trim() || getDocumentType(d.doc_type)?.title || 'Dokument',
        due_date: String(d.due_date),
      })),
    }),
    meds: medsToday(
      (medsRes.data ?? []) as MedDefinition[],
      new Set(
        ((medGivenRes.data ?? []) as { medication_id: string }[]).map((g) => g.medication_id)
      ),
      now
    ),
    crisis,
  };

  return {
    resident: {
      id: r.user_id as string,
      name: formatResidentName(
        {
          first_name: (r.first_name as string | null) ?? null,
          last_name: (r.last_name as string | null) ?? null,
          display_name: (r.display_name as string | null) ?? null,
        },
        'full_name'
      ),
      initials:
        typeof od.avatar_initials === 'string' && od.avatar_initials.trim()
          ? od.avatar_initials.toUpperCase()
          : getInitials({
              first_name: (r.first_name as string | null) ?? null,
              last_name: (r.last_name as string | null) ?? null,
              display_name: (r.display_name as string | null) ?? null,
            }),
      room: od.room ?? '—',
      trafficLight: tl,
      moodScore: c ? (c.mood_score as number) : null,
      lastCheckin: c ? formatCheckin(c.created_at as string) : null,
      moveInDate: od.move_in_date ?? null,
      primaryContact: od.primary_contact ?? null,
      primaryContactPhone: od.primary_contact_phone ?? null,
      primaryContactRelation: od.primary_contact_relation ?? null,
    },
    checkinNote: c ? (c.note as string | null) : null,
    checkinAiSummary: c ? ((c.ai_summary as string | null) ?? null) : null,
    checkinVoiceTranscript: c ? ((c.voice_transcript as string | null) ?? null) : null,
    plan: (planRes.data as DailyPlan | null) ?? null,
    proposals: (proposalsRes.data ?? []) as PendingProposal[],
    journalEntries: journalEntriesResolved,
    recoveryStoriesByJournalId,
    journalEntriesForExport: journalExportResolved,
    concernNotesForExport: (concernRes.data ?? []) as {
      id: string;
      note: string;
      category: string;
      severity: number;
      staff_name: string;
      created_at: string;
    }[],
    todayPlanItems: planItems,
    medications: (medsRes.data ?? []) as MedDefinition[],
    recoveryProfile,
    profileCompletionPercent,
    activeNextSteps,
    recentReflections,
    recentWeeklyCheckins,
    aiBrief: aiBriefRes.data ?? null,
    forloeb,
  };
}

// ── Page ──────────────────────────────────────────────────────

type Props = {
  params: Promise<{ residentId: string }>;
  searchParams: Promise<{ tab?: string; writeJournal?: string }>;
};

const ALL_TABS = [
  'forloeb',
  'overblik',
  'recovery',
  'vum',
  'dokumenter',
  'medicin',
  'dagsplan',
  'plan',
  'haven',
  'lys-samtaler',
] as const;
type TabId = (typeof ALL_TABS)[number];

const TAB_LABELS: Record<TabId, string> = {
  forloeb: 'Forløb',
  overblik: 'Overblik',
  recovery: 'Recovery',
  vum: 'VUM 2.0',
  dokumenter: 'Dokumenter',
  medicin: 'Medicin',
  dagsplan: 'Dagsplan',
  plan: 'Plan',
  haven: 'Haven 🌿',
  'lys-samtaler': 'Lys-samtaler',
};

export default async function ResidentDagPage({ params, searchParams }: Props) {
  const { residentId } = await params;
  const { tab = 'forloeb', writeJournal } = (await searchParams) as {
    tab?: string;
    writeJournal?: string;
  };
  const activeTab = (ALL_TABS as readonly string[]).includes(tab) ? (tab as TabId) : 'forloeb';

  preloadPortalShell();
  const supabase = await createServerSupabaseClient();
  if (!supabase) redirect('/care-portal-login?err=config');

  // Login-tjek og data hentes samtidig; RLS sikrer, at intet returneres uden gyldig session.
  const [user, data] = await Promise.all([
    getServerAuthUser(),
    fetchResidentData(supabase, residentId),
  ]);
  if (!user) redirect('/care-portal-login');
  if (!data) notFound();

  const {
    resident,
    checkinNote,
    checkinAiSummary,
    checkinVoiceTranscript,
    plan,
    proposals,
    journalEntries,
    recoveryStoriesByJournalId,
    journalEntriesForExport,
    concernNotesForExport,
    todayPlanItems,
    medications,
    recoveryProfile,
    profileCompletionPercent,
    activeNextSteps,
    recentReflections,
    recentWeeklyCheckins,
    aiBrief,
    forloeb,
  } = data;

  const exportInput: ResidentExportInput = {
    residentId,
    generatedAtIso: new Date().toISOString(),
    resident: {
      name: resident.name,
      room: resident.room,
      trafficLight: resident.trafficLight,
      moodScore: resident.moodScore,
      lastCheckin: resident.lastCheckin,
      moveInDate: resident.moveInDate,
      primaryContact: resident.primaryContact,
      primaryContactPhone: resident.primaryContactPhone,
      primaryContactRelation: resident.primaryContactRelation,
    },
    checkinNote,
    medications,
    journalEntries: journalEntriesForExport.map((e) => ({
      id: e.id,
      staff_name: e.staff_name,
      entry_text: e.entry_text,
      category: e.category,
      created_at: e.created_at,
      journal_status: e.journal_status,
    })),
    concernNotes: concernNotesForExport.map((c) => ({
      id: c.id,
      note: c.note,
      category: c.category,
      severity: c.severity,
      staff_name: c.staff_name ?? '',
      created_at: c.created_at,
    })),
    todayPlanItems: todayPlanItems.map((p) => ({
      title: p.title,
      done: p.done,
      time: p.time,
    })),
    pendingProposalsCount: proposals.length,
  };

  return (
    <PortalShell>
      <div
        className="mx-auto max-w-5xl px-4 py-6 pb-28 sm:px-6 lg:px-8"
        style={{ color: 'var(--cp-text)' }}
      >
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
          moveInDate={resident.moveInDate}
          primaryContact={resident.primaryContact}
          primaryContactPhone={resident.primaryContactPhone}
          primaryContactRelation={resident.primaryContactRelation}
          aiBrief={aiBrief}
        />

        {/* Action bar */}
        <div className="mt-5 flex flex-wrap items-center justify-end gap-2">
          <ContactPersons residentId={residentId} />
          <Suspense fallback={null}>
            <WriteJournalEntry
              residentId={residentId}
              residentName={resident.name}
              carePortalDark
              openFromQueryParam={writeJournal === '1'}
            />
          </Suspense>
          <ResidentOverflowMenu exportInput={exportInput} />
        </div>

        {/* Faner — skifter i browseren uden ny serveranmodning */}
        <ResidentTabs
          tabs={ALL_TABS}
          labels={TAB_LABELS}
          defaultTab={activeTab}
          pendingProposals={proposals.length}
          panels={{
            forloeb: <ResidentForloebTab residentId={residentId} {...forloeb} />,
            overblik: (
              <>
                <ResidentActiveDevices residentUserId={residentId} />
                <ResidentOverblikTab
                  residentId={residentId}
                  residentName={resident.name}
                  trafficLight={resident.trafficLight}
                  moodScore={resident.moodScore}
                  checkinNote={checkinNote}
                  checkinAiSummary={checkinAiSummary}
                  checkinVoiceTranscript={checkinVoiceTranscript}
                  medications={medications}
                  journalEntries={journalEntries}
                  recoveryStoriesByJournalId={recoveryStoriesByJournalId}
                  todayPlanItems={todayPlanItems}
                  pendingProposals={proposals.length}
                />
              </>
            ),
            recovery: (
              <ResidentRecoveryTab
                residentId={residentId}
                recoveryProfile={recoveryProfile}
                profileCompletionPercent={profileCompletionPercent}
                activeNextSteps={activeNextSteps}
                recentReflections={recentReflections}
                recentWeeklyCheckins={recentWeeklyCheckins}
              />
            ),
            vum: <ResidentVumTab residentId={residentId} residentName={resident.name} />,
            dokumenter: (
              <ResidentDocumentsTab residentId={residentId} residentName={resident.name} />
            ),
            medicin: <ResidentMedicinTab residentId={residentId} medications={medications} />,
            dagsplan: (
              <DagsPlanPortal
                residentId={residentId}
                residentName={resident.name}
                initialPlan={plan}
                initialProposals={proposals}
              />
            ),
            plan: <ResidentPlanTab residentId={residentId} residentName={resident.name} />,
            haven: <ResidentHavenTab residentId={residentId} residentName={resident.name} />,
            'lys-samtaler': <ResidentLysSamtalerTab residentId={residentId} />,
          }}
        />
      </div>
    </PortalShell>
  );
}
