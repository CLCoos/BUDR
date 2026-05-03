'use client';

import React, { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import {
  CheckCircle2,
  FilePenLine,
  Pill,
  FileText,
  CheckSquare,
  AlertTriangle,
  Mic,
} from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { copenhagenStartOfTodayUtcIso } from '@/lib/copenhagenDay';
import type { MedDefinition } from './types';
import WriteJournalEntry from './WriteJournalEntry';
import GoalProgress from '../../components/GoalProgress';
import ShiftNotesFeed from '../../components/ShiftNotesFeed';

// ── Types ─────────────────────────────────────────────────────

type TrafficUi = 'groen' | 'gul' | 'roed' | null;

interface JournalEntry {
  id: string;
  staff_name: string;
  entry_text: string;
  category: string;
  created_at: string;
  journal_status?: string;
  approved_at?: string | null;
}

interface PlanItem {
  id: string;
  title: string;
  done: boolean;
  time?: string;
}

type ConcernNoteRow = {
  id: string;
  note: string;
  category: string;
  severity: number;
  staff_name: string;
  created_at: string;
};

interface Props {
  residentId: string;
  residentName: string;
  trafficLight: TrafficUi;
  moodScore: number | null;
  checkinNote: string | null;
  checkinAiSummary: string | null;
  checkinVoiceTranscript: string | null;
  medications: MedDefinition[];
  journalEntries: JournalEntry[];
  todayPlanItems: PlanItem[];
  pendingProposals: number;
}

// ── Colour helpers ────────────────────────────────────────────

const TL_CONFIG: Record<
  NonNullable<TrafficUi>,
  { label: string; color: string; bg: string; border: string }
> = {
  groen: {
    label: 'Grøn',
    color: 'var(--cp-green)',
    bg: 'rgba(45,212,160,0.12)',
    border: 'rgba(45,212,160,0.35)',
  },
  gul: {
    label: 'Gul',
    color: 'var(--cp-amber)',
    bg: 'rgba(246,173,85,0.12)',
    border: 'rgba(246,173,85,0.4)',
  },
  roed: {
    label: 'Rød',
    color: 'var(--cp-red)',
    bg: 'rgba(245,101,101,0.12)',
    border: 'rgba(245,101,101,0.4)',
  },
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' });
}

// ── Component ────────────────────────────────────────────────

export default function ResidentOverblikTab({
  residentId,
  residentName,
  trafficLight,
  moodScore,
  checkinNote,
  checkinAiSummary,
  checkinVoiceTranscript,
  medications,
  journalEntries,
  todayPlanItems,
  pendingProposals,
}: Props) {
  const router = useRouter();
  const tlCfg = trafficLight ? TL_CONFIG[trafficLight] : null;
  const pendingItems = todayPlanItems.filter((i) => !i.done);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [concernNotes, setConcernNotes] = useState<ConcernNoteRow[]>([]);
  const [showVoiceTranscript, setShowVoiceTranscript] = useState(false);
  const [journalList, setJournalList] = useState<JournalEntry[]>(journalEntries);

  useEffect(() => {
    setJournalList(journalEntries);
  }, [journalEntries]);

  const refetchJournalToday = useCallback(async () => {
    const supabase = createClient();
    if (!supabase) return;
    const todayStart = copenhagenStartOfTodayUtcIso();
    const fullSelect =
      'id, staff_name, entry_text, category, created_at, journal_status, approved_at';
    const first = await supabase
      .from('journal_entries')
      .select(fullSelect)
      .eq('resident_id', residentId)
      .gte('created_at', todayStart)
      .order('created_at', { ascending: false })
      .limit(20);

    const errMsg = first.error?.message?.toLowerCase() ?? '';
    if (first.error && errMsg.includes('journal_status')) {
      const r2 = await supabase
        .from('journal_entries')
        .select('id, staff_name, entry_text, category, created_at, approved_at')
        .eq('resident_id', residentId)
        .gte('created_at', todayStart)
        .order('created_at', { ascending: false })
        .limit(20);
      if (!r2.error && r2.data) {
        setJournalList(
          (r2.data as Omit<JournalEntry, 'journal_status'>[]).map((row) => ({
            ...row,
            journal_status: 'godkendt',
          }))
        );
      }
      return;
    }

    if (!first.error && first.data) {
      setJournalList(first.data as JournalEntry[]);
    }
  }, [residentId]);

  useEffect(() => {
    const onJournalUpdated = (event: Event) => {
      const detail = (event as CustomEvent<{ residentId?: string }>).detail;
      if (detail?.residentId !== undefined && detail.residentId !== residentId) return;
      void refetchJournalToday();
    };
    window.addEventListener('portal-journal-updated', onJournalUpdated);
    return () => window.removeEventListener('portal-journal-updated', onJournalUpdated);
  }, [residentId, refetchJournalToday]);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const supabase = createClient();
      if (!supabase) return;
      const { data, error } = await supabase
        .from('care_concern_notes')
        .select('id, note, category, severity, staff_name, created_at')
        .eq('resident_id', residentId)
        .order('created_at', { ascending: false })
        .limit(5);
      if (cancelled) return;
      if (!error && data) setConcernNotes(data as ConcernNoteRow[]);
      else setConcernNotes([]);
    })();
    return () => {
      cancelled = true;
    };
  }, [residentId]);

  const journalDrafts = journalList.filter((e) => e.journal_status === 'kladde');
  const journalGodkendt = journalList.filter((e) => e.journal_status !== 'kladde');
  const maxJournalLines = 4;
  const shownDrafts = journalDrafts.slice(0, maxJournalLines);
  const shownGodkendt = journalGodkendt.slice(0, maxJournalLines - shownDrafts.length);

  async function approveJournalDraft(entryId: string) {
    const supabase = createClient();
    if (!supabase) {
      toast.error('Forbindelsesfejl');
      return;
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id) {
      toast.error('Du skal være logget ind');
      return;
    }
    setApprovingId(entryId);
    const nowIso = new Date().toISOString();
    const { error } = await supabase
      .from('journal_entries')
      .update({
        journal_status: 'godkendt',
        approved_at: nowIso,
        approved_by: user.id,
      })
      .eq('id', entryId)
      .eq('resident_id', residentId)
      .eq('journal_status', 'kladde');
    setApprovingId(null);
    if (error) {
      toast.error('Kunne ikke godkende — tjek rettigheder eller prøv igen');
      return;
    }
    toast.success('Notat godkendt og synlig som journal');
    void refetchJournalToday();
    router.refresh();
  }

  // Read given count from localStorage (same key as ResidentMedicinTab)
  const [givenCount, setGivenCount] = useState(0);
  const activeMeds = medications.filter((m) => m.status === 'aktiv');

  useEffect(() => {
    try {
      const today = new Date().toISOString().slice(0, 10);
      const raw = localStorage.getItem(`budr_med_v1_${residentId}_${today}`);
      if (raw) {
        const parsed = JSON.parse(raw) as Record<string, { given: boolean }>;
        const count = activeMeds.filter((m) => parsed[m.id]?.given).length;
        setGivenCount(count);
      }
    } catch {
      // ignore
    }
  }, [residentId, activeMeds]);

  const medicationGivenCount = givenCount;
  const medicationTotalCount = activeMeds.length;

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (window.location.hash !== '#resident-park-checkin') return;
    const el = document.getElementById('resident-park-checkin');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, []);

  return (
    <div className="space-y-5">
      {/* ── Critical status row ─────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Traffic light + dagens PARK check-in */}
        <div
          id="resident-park-checkin"
          className="flex flex-col gap-1 rounded-xl border"
          style={{
            padding: '1rem',
            minHeight: 'unset',
            backgroundColor: tlCfg ? tlCfg.bg : 'var(--cp-bg3)',
            borderColor: tlCfg ? tlCfg.border : 'var(--cp-border)',
          }}
        >
          <span
            className="text-xs font-medium uppercase tracking-wide"
            style={{ color: 'var(--cp-muted2)' }}
          >
            Trafiklys
          </span>
          {tlCfg ? (
            <div className="mt-1 flex items-center gap-2">
              <div
                className="h-4 w-4 flex-shrink-0 rounded-full"
                style={{ backgroundColor: tlCfg.color }}
              />
              <span className="text-xl font-bold" style={{ color: tlCfg.color }}>
                {tlCfg.label}
              </span>
            </div>
          ) : (
            <span
              className="mt-1"
              style={{ color: 'var(--cp-muted)', fontSize: '0.8rem', fontStyle: 'italic' }}
            >
              Ingen check-in endnu
            </span>
          )}
          {checkinNote && (
            <p
              className="mt-1 line-clamp-2 text-xs"
              style={{ color: tlCfg?.color ?? 'var(--cp-muted)' }}
            >
              &ldquo;{checkinNote}&rdquo;
            </p>
          )}
          {checkinAiSummary && (
            <div
              className="mt-2 rounded-lg border px-2.5 py-2"
              style={{
                borderColor: 'rgba(45,212,160,0.35)',
                backgroundColor: 'var(--cp-green-dim)',
              }}
            >
              <p className="text-[11px] font-semibold text-[var(--cp-green)]">AI-opsummering</p>
              <p className="mt-0.5 text-xs italic text-[var(--cp-green)]">{checkinAiSummary}</p>
              {checkinVoiceTranscript && (
                <button
                  type="button"
                  onClick={() => setShowVoiceTranscript((v) => !v)}
                  className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--cp-green)]"
                >
                  <Mic size={12} aria-hidden />
                  {showVoiceTranscript ? 'Skjul transskription' : 'Vis stemmejournal'}
                </button>
              )}
              {showVoiceTranscript && checkinVoiceTranscript && (
                <p
                  className="mt-1.5 whitespace-pre-wrap text-xs"
                  style={{ color: 'var(--cp-text)' }}
                >
                  {checkinVoiceTranscript}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Mood score */}
        <div
          className="flex flex-col gap-1 rounded-xl border"
          style={{
            padding: '1rem',
            minHeight: 'unset',
            backgroundColor: 'var(--cp-bg2)',
            borderColor: 'var(--cp-border)',
          }}
        >
          <span
            className="text-xs font-medium uppercase tracking-wide"
            style={{ color: 'var(--cp-muted2)' }}
          >
            Stemning i dag
          </span>
          {moodScore !== null ? (
            <div className="mt-1">
              <div className="flex items-end gap-1">
                <span className="text-3xl font-extrabold" style={{ color: 'var(--cp-text)' }}>
                  {moodScore}
                </span>
                <span className="mb-1 text-sm" style={{ color: 'var(--cp-muted)' }}>
                  /10
                </span>
              </div>
              <div
                className="mt-2 h-2 overflow-hidden rounded-full"
                style={{ backgroundColor: 'var(--cp-bg3)' }}
              >
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${(moodScore / 10) * 100}%`,
                    backgroundColor: tlCfg?.color ?? 'var(--cp-muted2)',
                  }}
                />
              </div>
            </div>
          ) : (
            <span
              className="mt-1"
              style={{ color: 'var(--cp-muted)', fontSize: '0.8rem', fontStyle: 'italic' }}
            >
              Ingen check-in endnu
            </span>
          )}
        </div>

        {/* Medication summary */}
        <Link href={`/resident-360-view/${residentId}?tab=medicin`} className="block">
          <div
            className="flex cursor-pointer flex-col gap-1 rounded-xl border p-4 transition-colors hover:opacity-95"
            style={
              medicationGivenCount === medicationTotalCount
                ? {
                    borderColor: 'rgba(45,212,160,0.35)',
                    backgroundColor: 'rgba(45,212,160,0.08)',
                  }
                : {
                    borderColor: 'rgba(246,173,85,0.4)',
                    backgroundColor: 'rgba(246,173,85,0.08)',
                  }
            }
          >
            <span
              className="text-xs font-medium uppercase tracking-wide"
              style={{ color: 'var(--cp-muted2)' }}
            >
              Medicin i dag
            </span>
            <div className="mt-1 flex items-center gap-2">
              <Pill
                size={18}
                className={
                  medicationGivenCount === medicationTotalCount
                    ? 'text-[var(--cp-green)]'
                    : 'text-[var(--cp-amber)]'
                }
              />
              <span
                className="text-xl font-bold"
                style={{
                  color:
                    medicationGivenCount === medicationTotalCount
                      ? 'var(--cp-green)'
                      : 'var(--cp-amber)',
                }}
              >
                {medicationGivenCount}/{medicationTotalCount}
              </span>
              <span className="text-xs" style={{ color: 'var(--cp-muted)' }}>
                givet
              </span>
            </div>
            <span className="mt-1 text-xs font-medium text-[var(--cp-green)]">
              → Administrer medicin
            </span>
          </div>
        </Link>
      </div>

      {/* ── Pending proposals alert ───────────────────────────── */}
      {pendingProposals > 0 && (
        <Link href={`/resident-360-view/${residentId}?tab=dagsplan`}>
          <div
            className="flex cursor-pointer items-start gap-2.5 rounded-xl border px-4 py-3 transition-opacity hover:opacity-95"
            style={{
              borderColor: 'rgba(246,173,85,0.4)',
              backgroundColor: 'rgba(246,173,85,0.1)',
            }}
          >
            <AlertTriangle size={15} className="mt-0.5 flex-shrink-0 text-[var(--cp-amber)]" />
            <div>
              <span className="text-sm font-semibold text-[var(--cp-amber)]">
                {pendingProposals} planforslag afventer godkendelse
              </span>
              <p className="mt-0.5 text-xs" style={{ color: 'var(--cp-muted)' }}>
                Klik for at åbne Dagsplan og gennemse forslagene.
              </p>
            </div>
          </div>
        </Link>
      )}

      {concernNotes.length > 0 && (
        <div
          className="rounded-xl border px-4 py-3"
          style={{
            borderColor: 'rgba(246,173,85,0.4)',
            backgroundColor: 'rgba(246,173,85,0.08)',
          }}
        >
          <div className="mb-2 flex items-center gap-2">
            <AlertTriangle size={15} className="flex-shrink-0 text-[var(--cp-amber)]" aria-hidden />
            <span className="text-sm font-semibold" style={{ color: 'var(--cp-text)' }}>
              Bekymringsnotater (hurtige)
            </span>
          </div>
          <p className="mb-2 text-[11px]" style={{ color: 'var(--cp-muted)' }}>
            Adskilt fra journal — oprettes fra dashboard. Ved formel dokumentation brug journal
            nedenfor.
          </p>
          <ul className="space-y-2">
            {concernNotes.map((c) => (
              <li
                key={c.id}
                className="rounded-lg border px-3 py-2 text-xs"
                style={{
                  borderColor: 'var(--cp-border)',
                  backgroundColor: 'var(--cp-bg2)',
                  color: 'var(--cp-text)',
                }}
              >
                <div className="mb-0.5 flex flex-wrap items-center justify-between gap-1">
                  <span className="font-semibold text-[var(--cp-amber)]">{c.category}</span>
                  <span className="tabular-nums text-[var(--cp-muted)]">Alvor {c.severity}/10</span>
                </div>
                <p className="line-clamp-3">{c.note}</p>
                <p className="mt-1 text-[10px]" style={{ color: 'var(--cp-muted2)' }}>
                  {formatTime(c.created_at)} · {c.staff_name || 'Personale'}
                </p>
              </li>
            ))}
          </ul>
          <Link
            href="/care-portal-dashboard"
            className="mt-2 inline-block text-[11px] font-medium text-[var(--cp-green)] underline-offset-2 hover:underline"
          >
            Åbn dashboard for at tilføje eller fjerne
          </Link>
        </div>
      )}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        {/* ── Today's plan items ─────────────────────────────── */}
        <div
          className="rounded-xl border"
          style={{
            backgroundColor: 'var(--cp-bg2)',
            borderColor: 'var(--cp-border)',
          }}
        >
          <div
            className="flex items-center justify-between border-b px-4 py-3"
            style={{ borderColor: 'var(--cp-border)' }}
          >
            <div className="flex items-center gap-2">
              <CheckSquare size={15} className="text-[#a89ff7]" />
              <span className="text-sm font-semibold" style={{ color: 'var(--cp-text)' }}>
                Dagsplan i dag
              </span>
            </div>
            <Link
              href={`/resident-360-view/${residentId}?tab=dagsplan`}
              className="text-xs font-medium text-[#a89ff7] hover:underline"
            >
              Åbn →
            </Link>
          </div>
          <div className="divide-y divide-[var(--cp-border)]">
            {todayPlanItems.length === 0 ? (
              <div className="px-4 py-5 text-center text-xs" style={{ color: 'var(--cp-muted)' }}>
                Ingen planpunkter i dag
              </div>
            ) : (
              todayPlanItems.slice(0, 6).map((item) => (
                <div key={item.id} className="flex items-center gap-3 px-4 py-2.5">
                  <div
                    className={`flex h-4 w-4 flex-shrink-0 items-center justify-center rounded ${
                      item.done ? 'bg-[var(--cp-green)]' : 'border-2'
                    }`}
                    style={!item.done ? { borderColor: 'var(--cp-border)' } : undefined}
                  >
                    {item.done && (
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <path
                          d="M2 5l2.5 2.5L8 3"
                          stroke="white"
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </div>
                  <span
                    className="flex-1 text-sm"
                    style={{
                      color: item.done ? 'var(--cp-muted2)' : 'var(--cp-text)',
                      textDecoration: item.done ? 'line-through' : undefined,
                    }}
                  >
                    {item.title}
                  </span>
                  {item.time && (
                    <span className="flex-shrink-0 text-xs" style={{ color: 'var(--cp-muted)' }}>
                      {item.time}
                    </span>
                  )}
                </div>
              ))
            )}
            {pendingItems.length > 6 && (
              <div className="px-4 py-2 text-center text-xs" style={{ color: 'var(--cp-muted)' }}>
                +{pendingItems.length - 6} flere punkter
              </div>
            )}
          </div>
        </div>

        {/* ── Today's journal entries ───────────────────────── */}
        <div
          className="rounded-xl border"
          style={{
            backgroundColor: 'var(--cp-bg2)',
            borderColor: 'var(--cp-border)',
          }}
        >
          <div
            className="flex items-center justify-between border-b px-4 py-3"
            style={{ borderColor: 'var(--cp-border)' }}
          >
            <div className="flex items-center gap-2">
              <FileText size={15} className="text-[#6cb8f5]" />
              <span className="text-sm font-semibold" style={{ color: 'var(--cp-text)' }}>
                Journal i dag
              </span>
              {journalList.length > 0 && (
                <span className="text-xs" style={{ color: 'var(--cp-muted)' }}>
                  {journalList.length} noter
                </span>
              )}
            </div>
            <Suspense fallback={null}>
              <WriteJournalEntry
                residentId={residentId}
                residentName={residentName}
                carePortalDark
              />
            </Suspense>
          </div>
          <div className="divide-y divide-[var(--cp-border)]">
            {journalList.length === 0 ? (
              <div className="px-4 py-5 text-center text-xs" style={{ color: 'var(--cp-muted)' }}>
                Ingen journalnoter i dag
              </div>
            ) : (
              <>
                {shownDrafts.length > 0 && (
                  <div
                    className="border-b px-4 py-2"
                    style={{
                      borderColor: 'rgba(246,173,85,0.25)',
                      backgroundColor: 'rgba(246,173,85,0.08)',
                    }}
                  >
                    <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--cp-amber)]">
                      <FilePenLine size={12} aria-hidden />
                      Kladder
                    </span>
                  </div>
                )}
                {shownDrafts.map((entry) => (
                  <div
                    key={entry.id}
                    className="border-l-2 border-[var(--cp-amber)] px-4 py-3"
                    style={{ backgroundColor: 'rgba(246,173,85,0.06)' }}
                  >
                    <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
                      <span className="text-xs font-semibold" style={{ color: 'var(--cp-text)' }}>
                        {entry.staff_name}
                      </span>
                      <div className="flex items-center gap-2">
                        <span
                          className="rounded px-1.5 py-0.5 text-[10px] font-medium uppercase"
                          style={{
                            backgroundColor: 'var(--cp-amber-dim)',
                            color: 'var(--cp-amber)',
                          }}
                        >
                          Kladde
                        </span>
                        <span className="text-xs" style={{ color: 'var(--cp-muted)' }}>
                          {formatTime(entry.created_at)}
                        </span>
                      </div>
                    </div>
                    <p className="line-clamp-3 text-xs" style={{ color: 'var(--cp-muted)' }}>
                      {entry.entry_text}
                    </p>
                    {entry.category && (
                      <span
                        className="mt-1 inline-block rounded border px-1.5 py-0.5 text-[10px]"
                        style={{
                          borderColor: 'var(--cp-border)',
                          backgroundColor: 'var(--cp-bg3)',
                          color: 'var(--cp-muted)',
                        }}
                      >
                        {entry.category}
                      </span>
                    )}
                    <button
                      type="button"
                      disabled={approvingId === entry.id}
                      onClick={() => void approveJournalDraft(entry.id)}
                      className="mt-2 inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition-opacity hover:opacity-90 disabled:opacity-50"
                      style={{
                        borderColor: 'rgba(246,173,85,0.5)',
                        color: 'var(--cp-amber)',
                      }}
                    >
                      <CheckCircle2 size={12} aria-hidden />
                      {approvingId === entry.id ? 'Godkender…' : 'Godkend journal'}
                    </button>
                  </div>
                ))}
                {shownGodkendt.length > 0 && shownDrafts.length > 0 && (
                  <div
                    className="border-b px-4 py-2"
                    style={{
                      borderColor: 'var(--cp-border)',
                      backgroundColor: 'var(--cp-bg3)',
                    }}
                  >
                    <span
                      className="text-[10px] font-semibold uppercase tracking-wide"
                      style={{ color: 'var(--cp-muted2)' }}
                    >
                      Godkendt journal
                    </span>
                  </div>
                )}
                {shownGodkendt.map((entry) => (
                  <div key={entry.id} className="px-4 py-3">
                    <div className="mb-1 flex items-center justify-between">
                      <span className="text-xs font-semibold" style={{ color: 'var(--cp-text)' }}>
                        {entry.staff_name}
                      </span>
                      <span className="text-xs" style={{ color: 'var(--cp-muted)' }}>
                        {formatTime(entry.created_at)}
                      </span>
                    </div>
                    <p className="line-clamp-2 text-xs" style={{ color: 'var(--cp-muted)' }}>
                      {entry.entry_text}
                    </p>
                    {entry.category && (
                      <span
                        className="mt-1 inline-block rounded px-1.5 py-0.5 text-[10px]"
                        style={{
                          backgroundColor: 'var(--cp-bg3)',
                          color: 'var(--cp-muted)',
                        }}
                      >
                        {entry.category}
                      </span>
                    )}
                  </div>
                ))}
              </>
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
        <GoalProgress compact variant="live" residentId={residentId} carePortalDark />
        <ShiftNotesFeed variant="live" residentId={residentId} carePortalDark />
      </div>
    </div>
  );
}
