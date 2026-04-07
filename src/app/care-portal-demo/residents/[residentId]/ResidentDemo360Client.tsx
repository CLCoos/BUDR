'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { toast } from 'sonner';
import {
  ArrowLeft,
  BrainCircuit,
  Calendar,
  CalendarClock,
  CheckCircle2,
  Circle,
  ClipboardList,
  FilePenLine,
  FileText,
  Heart,
  History,
  LayoutTemplate,
  MessageSquare,
  Pill,
  Sparkles,
  Stethoscope,
  Layers,
  Smartphone,
  Sprout,
  Target,
  User,
  Users,
} from 'lucide-react';
import {
  buildUnifiedResidentStatus,
  getResidentDemoDetail,
  SITUATION_TEMPLATES,
} from '@/lib/careDemoResidentDetail';
import { HavenGardenScene } from '@/components/haven/HavenGardenScene';
import { getHavenAmbientPeriod } from '@/components/haven/havenConstants';
import type {
  BorgerAppActivityKind,
  JournalDemo,
  StandardEventDemoKind,
  TrafficDemo,
  UnifiedStatusTone,
} from '@/lib/careDemoResidentDetail';

const STANDARD_EVENT_KIND_LABEL: Record<StandardEventDemoKind, string> = {
  pn_medicin: 'PN medicin',
  kriseplan: 'Kriseplan',
  observation: 'Observation',
  dagsplan_trin: 'Dagsplan',
  neutral: 'Info',
};

const BORGER_APP_KIND_LABEL: Record<BorgerAppActivityKind, string> = {
  checkin: 'Check-in',
  humør: 'Humør',
  mål: 'Mål',
  besked: 'Besked',
  aktivitet: 'Aktivitet',
  dagsplan: 'Dagsplan',
};

/** Query ?tab=… → scroll target (section id uden "section-" præfiks). */
const TAB_TO_SECTION: Record<string, string> = {
  overblik: 'oversigt',
  overview: 'oversigt',
  notes: 'journal',
  goals: 'maal',
  medication: 'medicin',
  medicin: 'medicin',
  aftaler: 'aftaler',
  haven: 'haven',
  dagsplan: 'dagsplan',
  plan: 'planer',
};

const NAV = [
  { id: 'status', label: 'Samlet status' },
  { id: 'borgerapp', label: 'Lys / app' },
  { id: 'oversigt', label: 'Overblik' },
  { id: 'assistent', label: 'Assistent' },
  { id: 'indtjek', label: 'Indtjek' },
  { id: 'dagsplan', label: 'Dagsplan' },
  { id: 'haendelser', label: 'Hændelser' },
  { id: 'skabeloner', label: 'Skabeloner' },
  { id: 'aftaler', label: 'Aftaler' },
  { id: 'medicin', label: 'Medicin' },
  { id: 'planer', label: 'Planer' },
  { id: 'haven', label: 'Haven 🌿' },
  { id: 'maal', label: 'Mål' },
  { id: 'journal', label: 'Journal' },
  { id: 'dokumenter', label: 'Dokumenter' },
] as const;

function trafficStyle(t: TrafficDemo): { bg: string; label: string; border: string } {
  if (t === 'roed')
    return {
      bg: 'rgba(245,101,101,0.12)',
      label: 'Rød',
      border: 'rgba(245,101,101,0.4)',
    };
  if (t === 'gul')
    return {
      bg: 'rgba(246,173,85,0.12)',
      label: 'Gul',
      border: 'rgba(246,173,85,0.4)',
    };
  if (t === 'groen')
    return {
      bg: 'rgba(45,212,160,0.1)',
      label: 'Grøn',
      border: 'rgba(45,212,160,0.35)',
    };
  return {
    bg: 'var(--cp-bg3)',
    label: 'Ikke sat',
    border: 'var(--cp-border)',
  };
}

function unifiedTileSurface(tone: UnifiedStatusTone): React.CSSProperties {
  switch (tone) {
    case 'alert':
      return {
        borderColor: 'rgba(245,101,101,0.42)',
        backgroundColor: 'rgba(245,101,101,0.07)',
      };
    case 'warn':
      return {
        borderColor: 'rgba(246,173,85,0.4)',
        backgroundColor: 'rgba(246,173,85,0.07)',
      };
    case 'ok':
      return {
        borderColor: 'rgba(45,212,160,0.32)',
        backgroundColor: 'rgba(45,212,160,0.07)',
      };
    default:
      return {
        borderColor: 'var(--cp-border)',
        backgroundColor: 'var(--cp-bg3)',
      };
  }
}

function SectionCard({
  id,
  title,
  icon: Icon,
  children,
  className = '',
}: {
  id: string;
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      id={`section-${id}`}
      className={`scroll-mt-[5.5rem] rounded-2xl border p-4 sm:p-5 ${className}`}
      style={{
        borderColor: 'var(--cp-border)',
        backgroundColor: 'var(--cp-bg2)',
      }}
    >
      <h2
        className="mb-4 flex items-center gap-2 text-sm font-semibold tracking-tight sm:text-base"
        style={{ color: 'var(--cp-text)' }}
      >
        <Icon
          className="h-4 w-4 shrink-0 opacity-90"
          style={{ color: 'var(--cp-green)' }}
          aria-hidden
        />
        {title}
      </h2>
      {children}
    </section>
  );
}

export default function ResidentDemo360Client({ residentId }: { residentId: string }) {
  const detail = useMemo(() => getResidentDemoDetail(residentId), [residentId]);
  const unified = useMemo(() => (detail ? buildUnifiedResidentStatus(detail) : null), [detail]);
  const searchParams = useSearchParams();
  const [activeNav, setActiveNav] = useState<string>('status');
  /** Demo: lokalt godkendte kladde-id → flyttes til godkendt journal */
  const [journalApprovedIds, setJournalApprovedIds] = useState<Record<string, true>>({});
  const [havenReducedMotion, setHavenReducedMotion] = useState(false);

  const scrollTo = useCallback((sectionId: string) => {
    document.getElementById(`section-${sectionId}`)?.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
    setActiveNav(sectionId);
  }, []);

  useEffect(() => {
    const tab = searchParams.get('tab');
    const section = tab ? TAB_TO_SECTION[tab] : null;
    if (section) {
      const t = window.setTimeout(() => scrollTo(section), 120);
      return () => clearTimeout(t);
    }
  }, [searchParams, scrollTo, residentId]);

  useEffect(() => {
    setJournalApprovedIds({});
  }, [residentId]);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    setHavenReducedMotion(mq.matches);
    const on = () => setHavenReducedMotion(mq.matches);
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);

  const journalEffective: JournalDemo[] = useMemo(() => {
    if (!detail) return [];
    return detail.journal.map((j) => {
      const id = j.id ?? '';
      if (id && journalApprovedIds[id]) return { ...j, status: 'godkendt' as const };
      return j;
    });
  }, [detail, journalApprovedIds]);

  const journalDrafts = useMemo(
    () => journalEffective.filter((j) => j.status === 'kladde'),
    [journalEffective]
  );
  const journalGodkendt = useMemo(
    () => journalEffective.filter((j) => j.status !== 'kladde'),
    [journalEffective]
  );

  const approveJournalDraft = useCallback((id: string) => {
    setJournalApprovedIds((prev) => ({ ...prev, [id]: true }));
    toast.success('Notat godkendt — nu synlig som journal (demo)');
  }, []);

  if (!detail || !unified) {
    return (
      <div className="mx-auto max-w-lg px-4 py-12 text-center">
        <p className="text-sm" style={{ color: 'var(--cp-muted)' }}>
          Kunne ikke indlæse demo for denne beboer.
        </p>
        <Link
          href="/care-portal-demo/residents"
          className="mt-4 inline-block text-sm font-medium underline-offset-4 hover:underline"
          style={{ color: 'var(--cp-green)' }}
        >
          Tilbage til beboere
        </Link>
      </div>
    );
  }

  const {
    profile,
    traffic,
    checkIn,
    aiBrief,
    dagsplan,
    appointments,
    medications,
    plans,
    borgerApp,
    standardEvents,
    situationRecommendation,
  } = detail;
  const { goalsResident, goalsStaff, agreements, extras, gardenPlots } = detail;

  const ts = trafficStyle(traffic);

  return (
    <div className="pb-24 pt-2 sm:pb-10">
      <div className="mx-auto max-w-5xl px-3 sm:px-6">
        <Link
          href="/care-portal-demo/residents"
          className="mb-4 inline-flex items-center gap-2 text-sm font-medium transition-opacity hover:opacity-80"
          style={{ color: 'var(--cp-muted)' }}
        >
          <ArrowLeft className="h-4 w-4" aria-hidden />
          Tilbage til beboere
        </Link>

        {/* Hero */}
        <header
          className="relative mb-6 overflow-hidden rounded-2xl border p-5 sm:p-7"
          style={{
            borderColor: 'var(--cp-border)',
            background:
              'linear-gradient(145deg, var(--cp-bg2) 0%, rgba(15,23,42,0.5) 45%, var(--cp-bg2) 100%)',
            boxShadow: '0 0 0 1px rgba(45,212,160,0.06), 0 24px 48px rgba(0,0,0,0.2)',
          }}
        >
          <div
            className="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full opacity-[0.12]"
            style={{ background: 'radial-gradient(circle, #2dd4a0, transparent 70%)' }}
            aria-hidden
          />
          <div className="relative flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 items-start gap-4">
              <div
                className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl text-lg font-bold text-white shadow-lg sm:h-[4.5rem] sm:w-[4.5rem] sm:text-xl"
                style={{
                  background:
                    traffic === 'roed'
                      ? 'linear-gradient(135deg,#f56565,#9b2c2c)'
                      : traffic === 'gul'
                        ? 'linear-gradient(135deg,#f6ad55,#b45309)'
                        : traffic === 'groen'
                          ? 'linear-gradient(135deg,#2dd4a0,#0d9488)'
                          : 'linear-gradient(135deg,#64748b,#475569)',
                }}
              >
                {profile.initials}
              </div>
              <div className="min-w-0">
                <p
                  className="text-xs font-medium uppercase tracking-wider"
                  style={{ color: 'var(--cp-muted2)' }}
                >
                  Beboer · Demo
                </p>
                <h1
                  className="mt-0.5 text-2xl font-semibold leading-tight sm:text-3xl"
                  style={{ fontFamily: "'DM Serif Display', serif", color: 'var(--cp-text)' }}
                >
                  {profile.displayName}
                </h1>
                <p
                  className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm"
                  style={{ color: 'var(--cp-muted)' }}
                >
                  <span>Hus {profile.house}</span>
                  <span>·</span>
                  <span>Værelse {profile.room}</span>
                  <span>·</span>
                  <span className="truncate">ID {profile.id}</span>
                </p>
              </div>
            </div>
            <div
              className="flex shrink-0 items-center gap-2 self-start rounded-xl border px-3 py-2 text-xs font-semibold sm:flex-col sm:items-stretch sm:text-sm"
              style={{ backgroundColor: ts.bg, borderColor: ts.border, color: 'var(--cp-text)' }}
            >
              <span style={{ color: 'var(--cp-muted2)' }}>Trafiklys</span>
              <span>{ts.label}</span>
            </div>
          </div>
        </header>

        {/* Samlet status — ét sted (én sandhed, samme data som nedenfor) */}
        <section
          id="section-status"
          className="mb-6 scroll-mt-[5.5rem] rounded-2xl border p-4 sm:p-5"
          style={{
            borderColor: 'rgba(45,212,160,0.22)',
            background:
              'linear-gradient(165deg, rgba(45,212,160,0.07) 0%, var(--cp-bg2) 38%, var(--cp-bg2) 100%)',
            boxShadow: '0 0 0 1px rgba(45,212,160,0.05)',
          }}
          aria-labelledby="samlet-status-heading"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div className="flex min-w-0 items-start gap-3">
              <div
                className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
                style={{
                  backgroundColor: 'rgba(45,212,160,0.12)',
                  border: '1px solid rgba(45,212,160,0.22)',
                }}
              >
                <Layers className="h-5 w-5" style={{ color: 'var(--cp-green)' }} aria-hidden />
              </div>
              <div className="min-w-0">
                <h2
                  id="samlet-status-heading"
                  className="text-base font-semibold sm:text-lg"
                  style={{ color: 'var(--cp-text)' }}
                >
                  Samlet status
                </h2>
                <p
                  className="mt-1 text-xs leading-relaxed sm:text-sm"
                  style={{ color: 'var(--cp-muted)' }}
                >
                  Ét overblik for vagten — alle felter er hentet fra de samme oplysninger som de
                  detaljerede sektioner nedenfor, så du ikke møder modstridende tekster i
                  forskellige vinduer.
                </p>
              </div>
            </div>
          </div>
          <p
            className="mt-4 rounded-xl border px-3 py-2.5 text-sm leading-relaxed sm:text-[15px]"
            style={{
              borderColor: 'var(--cp-border)',
              backgroundColor: 'var(--cp-bg3)',
              color: 'var(--cp-text)',
            }}
          >
            {unified.summary}
          </p>
          <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {unified.tiles.map((tile) => (
              <button
                key={tile.id}
                type="button"
                onClick={() => scrollTo(tile.goToSection)}
                className="flex w-full flex-col rounded-xl border p-3 text-left transition-all hover:brightness-[1.05] active:scale-[0.99]"
                style={unifiedTileSurface(tile.tone)}
              >
                <span
                  className="text-[11px] font-semibold uppercase tracking-wide"
                  style={{ color: 'var(--cp-muted2)' }}
                >
                  {tile.label}
                </span>
                <span
                  className="mt-1 text-sm font-medium leading-snug"
                  style={{ color: 'var(--cp-text)' }}
                >
                  {tile.value}
                </span>
                {tile.hint ? (
                  <span
                    className="mt-1.5 text-xs leading-snug"
                    style={{ color: 'var(--cp-muted)' }}
                  >
                    {tile.hint}
                  </span>
                ) : null}
                <span className="mt-2 text-[11px] font-medium" style={{ color: 'var(--cp-green)' }}>
                  Gå til detaljer →
                </span>
              </button>
            ))}
          </div>
        </section>

        {/* Lys / borger-app — koblet til portalen uden dobbeltindtastning (demo) */}
        <section
          id="section-borgerapp"
          className="mb-6 scroll-mt-[5.5rem] rounded-2xl border p-4 sm:p-5"
          style={{
            borderColor: 'var(--cp-border)',
            backgroundColor: 'var(--cp-bg2)',
          }}
          aria-labelledby="borgerapp-heading"
        >
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
            <div
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl"
              style={{
                backgroundColor: 'var(--cp-bg3)',
                border: '1px solid var(--cp-border)',
              }}
            >
              <Smartphone className="h-5 w-5" style={{ color: 'var(--cp-green)' }} aria-hidden />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2
                  id="borgerapp-heading"
                  className="text-base font-semibold sm:text-lg"
                  style={{ color: 'var(--cp-text)' }}
                >
                  Lys · borger-app
                </h2>
                <span
                  className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                  style={{ backgroundColor: 'var(--cp-green-dim)', color: 'var(--cp-green)' }}
                >
                  Synk (demo)
                </span>
              </div>
              <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--cp-text)' }}>
                {borgerApp.headline}
              </p>
              <p className="mt-2 text-xs leading-relaxed" style={{ color: 'var(--cp-muted2)' }}>
                {borgerApp.sameSourceFootnote}
              </p>

              <div
                className="mt-4 rounded-xl border p-3 sm:p-4"
                style={{ borderColor: 'var(--cp-border)', backgroundColor: 'var(--cp-bg3)' }}
              >
                <div
                  className="text-[11px] font-semibold uppercase tracking-wide"
                  style={{ color: 'var(--cp-muted2)' }}
                >
                  Humør (Lys)
                </div>
                {borgerApp.mood ? (
                  <p className="mt-1 text-sm font-medium" style={{ color: 'var(--cp-text)' }}>
                    {borgerApp.mood.label}
                    <span className="font-normal" style={{ color: 'var(--cp-muted)' }}>
                      {' '}
                      · {borgerApp.mood.at}
                    </span>
                  </p>
                ) : (
                  <p className="mt-1 text-sm" style={{ color: 'var(--cp-muted)' }}>
                    Ikke registreret i dag — samme som under Indtjek.
                  </p>
                )}
              </div>

              <div className="mt-4">
                <div
                  className="mb-2 text-[11px] font-semibold uppercase tracking-wide"
                  style={{ color: 'var(--cp-muted2)' }}
                >
                  Felter der spejles i portalen
                </div>
                <ul className="flex flex-wrap gap-2">
                  {borgerApp.syncedFields.map((f) => (
                    <li
                      key={f}
                      className="rounded-lg border px-2.5 py-1 text-xs font-medium"
                      style={{
                        borderColor: 'rgba(45,212,160,0.25)',
                        color: 'var(--cp-muted)',
                        backgroundColor: 'rgba(45,212,160,0.06)',
                      }}
                    >
                      {f}
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-5">
                <div
                  className="mb-2 text-[11px] font-semibold uppercase tracking-wide"
                  style={{ color: 'var(--cp-muted2)' }}
                >
                  Seneste fra appen
                </div>
                <ul className="space-y-2">
                  {borgerApp.activities.map((a, idx) => (
                    <li
                      key={`${a.kind}-${idx}`}
                      className="flex flex-col gap-1 rounded-xl border px-3 py-2.5 sm:flex-row sm:items-start sm:gap-3"
                      style={{ borderColor: 'var(--cp-border)', backgroundColor: 'var(--cp-bg3)' }}
                    >
                      <span
                        className="shrink-0 text-[11px] font-medium tabular-nums"
                        style={{ color: 'var(--cp-muted2)' }}
                      >
                        {a.when}
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <span
                            className="rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase"
                            style={{
                              backgroundColor: 'var(--cp-bg2)',
                              color: 'var(--cp-green)',
                            }}
                          >
                            {BORGER_APP_KIND_LABEL[a.kind]}
                          </span>
                          <span className="text-sm font-medium" style={{ color: 'var(--cp-text)' }}>
                            {a.title}
                          </span>
                        </div>
                        {a.detail ? (
                          <p
                            className="mt-1 text-xs leading-relaxed"
                            style={{ color: 'var(--cp-muted)' }}
                          >
                            {a.detail}
                          </p>
                        ) : null}
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              <div className="mt-4 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => scrollTo('indtjek')}
                  className="rounded-lg border px-3 py-2 text-xs font-medium transition-colors hover:bg-[rgba(255,255,255,0.04)]"
                  style={{ borderColor: 'var(--cp-border)', color: 'var(--cp-muted)' }}
                >
                  Se indtjek
                </button>
                <button
                  type="button"
                  onClick={() => scrollTo('maal')}
                  className="rounded-lg border px-3 py-2 text-xs font-medium transition-colors hover:bg-[rgba(255,255,255,0.04)]"
                  style={{ borderColor: 'var(--cp-border)', color: 'var(--cp-muted)' }}
                >
                  Se borgermål
                </button>
                <button
                  type="button"
                  onClick={() => scrollTo('dagsplan')}
                  className="rounded-lg border px-3 py-2 text-xs font-medium transition-colors hover:bg-[rgba(255,255,255,0.04)]"
                  style={{ borderColor: 'var(--cp-border)', color: 'var(--cp-muted)' }}
                >
                  Se dagsplan
                </button>
              </div>
            </div>
          </div>
        </section>

        {/* Sticky section nav */}
        <nav
          className="sticky top-0 z-20 -mx-3 mb-6 border-b px-3 py-2 backdrop-blur-md sm:-mx-0 sm:rounded-xl sm:border sm:px-2 sm:py-2"
          style={{
            backgroundColor: 'rgba(15,23,42,0.75)',
            borderColor: 'var(--cp-border)',
          }}
          aria-label="Sektioner"
        >
          <div className="flex gap-1.5 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {NAV.map(({ id, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => scrollTo(id)}
                className="shrink-0 rounded-lg px-3 py-2 text-xs font-medium transition-all sm:text-[13px]"
                style={
                  activeNav === id
                    ? {
                        backgroundColor: 'var(--cp-green-dim)',
                        color: 'var(--cp-green)',
                        boxShadow: '0 0 0 1px rgba(45,212,160,0.2)',
                      }
                    : { color: 'var(--cp-muted)', backgroundColor: 'var(--cp-bg3)' }
                }
              >
                {label}
              </button>
            ))}
          </div>
        </nav>

        <div className="flex flex-col gap-5">
          {/* Overblik */}
          <SectionCard id="oversigt" title="Overblik & nøgleinfo" icon={User}>
            <div className="grid gap-3 sm:grid-cols-2">
              {extras.length === 0 ? (
                <p className="text-sm" style={{ color: 'var(--cp-muted)' }}>
                  Ingen ekstra felter i demo for denne beboer.
                </p>
              ) : (
                extras.map((e) => (
                  <div
                    key={e.label}
                    className="rounded-xl border px-3 py-2.5"
                    style={{ borderColor: 'var(--cp-border)', backgroundColor: 'var(--cp-bg3)' }}
                  >
                    <div
                      className="text-[11px] font-medium uppercase tracking-wide"
                      style={{ color: 'var(--cp-muted2)' }}
                    >
                      {e.label}
                    </div>
                    <div className="mt-0.5 text-sm" style={{ color: 'var(--cp-text)' }}>
                      {e.value}
                    </div>
                  </div>
                ))
              )}
            </div>
          </SectionCard>

          {/* BUDR Assistent */}
          <section
            id="section-assistent"
            className="scroll-mt-[5.5rem] overflow-hidden rounded-2xl border"
            style={{
              borderColor: 'rgba(45,212,160,0.28)',
              background:
                'linear-gradient(135deg, rgba(45,212,160,0.08) 0%, var(--cp-bg2) 40%, var(--cp-bg2) 100%)',
              boxShadow: '0 0 0 1px rgba(45,212,160,0.06)',
            }}
          >
            <div className="flex flex-col gap-4 p-4 sm:flex-row sm:items-start sm:gap-5 sm:p-5">
              <div
                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl"
                style={{
                  background:
                    'linear-gradient(135deg, rgba(110,231,183,0.25), rgba(5,150,105,0.2))',
                  boxShadow: '0 4px 20px rgba(45,212,160,0.15)',
                }}
              >
                <BrainCircuit
                  className="h-6 w-6"
                  style={{ color: 'var(--cp-green)' }}
                  aria-hidden
                />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <h2
                    className="text-base font-semibold sm:text-lg"
                    style={{ color: 'var(--cp-text)' }}
                  >
                    BUDR Assistent
                  </h2>
                  <span
                    className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
                    style={{
                      backgroundColor: 'rgba(45,212,160,0.12)',
                      color: 'var(--cp-green)',
                    }}
                  >
                    Dit overblik i dag
                  </span>
                </div>
                <p
                  className="mt-2 text-sm leading-relaxed sm:text-[15px]"
                  style={{ color: 'var(--cp-text)' }}
                >
                  {aiBrief.lead}
                </p>
                <ul className="mt-3 space-y-2">
                  {aiBrief.bullets.map((b, i) => (
                    <li key={i} className="flex gap-2 text-sm" style={{ color: 'var(--cp-muted)' }}>
                      <Sparkles
                        className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--cp-green)] opacity-80"
                        aria-hidden
                      />
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-4 flex flex-wrap gap-2">
                  {aiBrief.actions.map((a) => (
                    <button
                      key={a.label}
                      type="button"
                      onClick={() => scrollTo(a.sectionId)}
                      className="rounded-lg border px-3 py-2 text-xs font-medium transition-colors hover:bg-[rgba(255,255,255,0.04)] sm:text-sm"
                      style={{ borderColor: 'var(--cp-border)', color: 'var(--cp-green)' }}
                    >
                      {a.label}
                    </button>
                  ))}
                  <Link
                    href="/care-portal-demo/assistant"
                    className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-white transition-opacity hover:opacity-90 sm:text-sm"
                    style={{
                      background: 'linear-gradient(135deg, #2dd4a0 0%, #0d9488 100%)',
                      boxShadow: '0 2px 12px rgba(45,212,160,0.25)',
                    }}
                  >
                    <MessageSquare className="h-3.5 w-3.5" aria-hidden />
                    Fuld assistent
                  </Link>
                </div>
              </div>
            </div>
          </section>

          <div className="grid gap-5 lg:grid-cols-2">
            <SectionCard id="indtjek" title="Indtjek i dag" icon={CheckCircle2}>
              {checkIn.checkedIn ? (
                <div className="space-y-2">
                  <div
                    className="flex flex-wrap items-center gap-2 text-sm"
                    style={{ color: 'var(--cp-text)' }}
                  >
                    <CheckCircle2 className="h-4 w-4 text-[var(--cp-green)]" aria-hidden />
                    <span className="font-medium">Check-in registreret</span>
                    {checkIn.time && (
                      <span style={{ color: 'var(--cp-muted)' }}>kl. {checkIn.time}</span>
                    )}
                  </div>
                  {checkIn.mood && (
                    <p className="text-sm" style={{ color: 'var(--cp-muted)' }}>
                      Stemning: {checkIn.mood}
                    </p>
                  )}
                  {checkIn.note && (
                    <p
                      className="rounded-xl border p-3 text-sm leading-relaxed"
                      style={{
                        borderColor: 'var(--cp-border)',
                        color: 'var(--cp-muted)',
                        backgroundColor: 'var(--cp-bg3)',
                      }}
                    >
                      {checkIn.note}
                    </p>
                  )}
                </div>
              ) : (
                <div className="flex gap-3">
                  <Circle className="h-5 w-5 shrink-0 text-[var(--cp-amber)]" aria-hidden />
                  <div>
                    <p className="font-medium" style={{ color: 'var(--cp-text)' }}>
                      Ikke checket ind endnu
                    </p>
                    {checkIn.note && (
                      <p className="mt-1 text-sm" style={{ color: 'var(--cp-muted)' }}>
                        {checkIn.note}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </SectionCard>

            <SectionCard id="dagsplan" title="Dagsplan" icon={CalendarClock}>
              <ol className="space-y-0">
                {dagsplan.map((slot, i) => (
                  <li
                    key={i}
                    className="flex gap-3 border-l-2 py-2 pl-4 first:pt-0 last:pb-0"
                    style={{ borderColor: slot.done ? 'var(--cp-green)' : 'var(--cp-border)' }}
                  >
                    <span
                      className="w-14 shrink-0 text-xs font-mono font-medium tabular-nums sm:text-sm"
                      style={{ color: slot.done ? 'var(--cp-green)' : 'var(--cp-muted)' }}
                    >
                      {slot.time}
                    </span>
                    <span
                      className={`text-sm sm:text-[15px] ${slot.done ? 'line-through opacity-70' : ''}`}
                      style={{ color: 'var(--cp-text)' }}
                    >
                      {slot.label}
                    </span>
                  </li>
                ))}
              </ol>
            </SectionCard>
          </div>

          <SectionCard id="haendelser" title="Standardhændelser" icon={History}>
            <p className="mb-4 text-sm leading-relaxed" style={{ color: 'var(--cp-muted)' }}>
              Foruddefinerede hændelser (fx kriseplan, PN medicin, observation) logges{' '}
              <strong style={{ color: 'var(--cp-text)' }}>ét sted</strong> og vises automatisk de
              steder i portalen, hvor de giver mening — uden at I skriver det samme tre gange.
            </p>
            <ul className="space-y-3">
              {standardEvents.map((ev) => (
                <li
                  key={ev.id}
                  className="rounded-xl border p-3 sm:p-4"
                  style={{
                    borderColor:
                      ev.kind === 'kriseplan'
                        ? 'rgba(245,101,101,0.35)'
                        : ev.kind === 'pn_medicin'
                          ? 'rgba(246,173,85,0.28)'
                          : 'var(--cp-border)',
                    backgroundColor: 'var(--cp-bg3)',
                  }}
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className="rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase"
                      style={{
                        backgroundColor: 'var(--cp-bg2)',
                        color: 'var(--cp-green)',
                      }}
                    >
                      {STANDARD_EVENT_KIND_LABEL[ev.kind]}
                    </span>
                    <span className="text-sm font-semibold" style={{ color: 'var(--cp-text)' }}>
                      {ev.title}
                    </span>
                    <span className="text-xs tabular-nums" style={{ color: 'var(--cp-muted2)' }}>
                      {ev.when}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--cp-muted)' }}>
                    {ev.summary}
                  </p>
                  {ev.loggedBy ? (
                    <p className="mt-1 text-xs" style={{ color: 'var(--cp-muted2)' }}>
                      Registreret af: {ev.loggedBy}
                    </p>
                  ) : null}
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    <span
                      className="text-[10px] font-medium uppercase tracking-wide"
                      style={{ color: 'var(--cp-muted2)' }}
                    >
                      Vises også under:
                    </span>
                    {ev.visibleIn.map((place) => (
                      <span
                        key={place}
                        className="rounded-md border px-2 py-0.5 text-[11px]"
                        style={{ borderColor: 'var(--cp-border)', color: 'var(--cp-muted)' }}
                      >
                        {place}
                      </span>
                    ))}
                  </div>
                </li>
              ))}
            </ul>
          </SectionCard>

          <SectionCard id="skabeloner" title="Skabeloner pr. situation" icon={LayoutTemplate}>
            <div
              className="mb-4 rounded-xl border px-3 py-3 sm:px-4"
              style={{
                borderColor: 'rgba(45,212,160,0.28)',
                backgroundColor: 'rgba(45,212,160,0.06)',
              }}
            >
              <div
                className="text-[11px] font-semibold uppercase tracking-wide"
                style={{ color: 'var(--cp-green)' }}
              >
                Anbefalet nu (demo)
              </div>
              <p className="mt-1 text-sm font-medium" style={{ color: 'var(--cp-text)' }}>
                {SITUATION_TEMPLATES.find((x) => x.id === situationRecommendation.templateId)
                  ?.label ?? situationRecommendation.templateId}
              </p>
              <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--cp-muted)' }}>
                {situationRecommendation.reason}
              </p>
            </div>
            <p className="mb-4 text-sm leading-relaxed" style={{ color: 'var(--cp-muted)' }}>
              Faste strukturer til typiske situationer — journalhints, tjekliste og
              overleveringspunkter. I produktion kan assistenten foreslå skabelon ud fra vagttype,
              dato og sagsfase.
            </p>
            <div className="grid gap-4 md:grid-cols-2">
              {SITUATION_TEMPLATES.map((tpl) => {
                const recommended = tpl.id === situationRecommendation.templateId;
                return (
                  <article
                    key={tpl.id}
                    className="rounded-xl border p-4"
                    style={{
                      borderColor: recommended ? 'rgba(45,212,160,0.4)' : 'var(--cp-border)',
                      backgroundColor: recommended ? 'rgba(45,212,160,0.05)' : 'var(--cp-bg3)',
                      boxShadow: recommended ? '0 0 0 1px rgba(45,212,160,0.12)' : undefined,
                    }}
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="text-sm font-semibold" style={{ color: 'var(--cp-text)' }}>
                        {tpl.label}
                      </h3>
                      {recommended ? (
                        <span
                          className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase"
                          style={{
                            backgroundColor: 'var(--cp-green-dim)',
                            color: 'var(--cp-green)',
                          }}
                        >
                          Anbefalet
                        </span>
                      ) : null}
                    </div>
                    <p
                      className="mt-2 text-xs leading-relaxed"
                      style={{ color: 'var(--cp-muted)' }}
                    >
                      {tpl.intro}
                    </p>
                    <div className="mt-3">
                      <div
                        className="mb-1 text-[10px] font-semibold uppercase tracking-wide"
                        style={{ color: 'var(--cp-muted2)' }}
                      >
                        Tjekliste
                      </div>
                      <ul
                        className="list-inside list-disc space-y-1 text-xs"
                        style={{ color: 'var(--cp-text)' }}
                      >
                        {tpl.checklist.map((c) => (
                          <li key={c}>{c}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="mt-3">
                      <div
                        className="mb-1 text-[10px] font-semibold uppercase tracking-wide"
                        style={{ color: 'var(--cp-muted2)' }}
                      >
                        Journal — spørgsmål I kan besvare
                      </div>
                      <ul
                        className="list-inside list-disc space-y-1 text-xs"
                        style={{ color: 'var(--cp-muted)' }}
                      >
                        {tpl.journalPrompts.map((c) => (
                          <li key={c}>{c}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="mt-3">
                      <div
                        className="mb-1 text-[10px] font-semibold uppercase tracking-wide"
                        style={{ color: 'var(--cp-muted2)' }}
                      >
                        Vagtoverdragelse
                      </div>
                      <ul
                        className="list-inside list-disc space-y-1 text-xs"
                        style={{ color: 'var(--cp-muted)' }}
                      >
                        {tpl.handoverBullets.map((c) => (
                          <li key={c}>{c}</li>
                        ))}
                      </ul>
                    </div>
                  </article>
                );
              })}
            </div>
            <div className="mt-4 flex flex-wrap gap-2">
              <Link
                href="/care-portal-demo/handover"
                className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors hover:bg-[rgba(255,255,255,0.04)]"
                style={{ borderColor: 'var(--cp-border)', color: 'var(--cp-muted)' }}
              >
                Åbn vagtoverdragelse (demo)
              </Link>
              <button
                type="button"
                onClick={() => scrollTo('journal')}
                className="rounded-lg border px-3 py-2 text-xs font-medium transition-colors hover:bg-[rgba(255,255,255,0.04)]"
                style={{ borderColor: 'var(--cp-border)', color: 'var(--cp-muted)' }}
              >
                Gå til journal
              </button>
            </div>
          </SectionCard>

          <SectionCard id="aftaler" title="Fremtidige aftaler" icon={Calendar}>
            {appointments.length === 0 ? (
              <p className="text-sm" style={{ color: 'var(--cp-muted)' }}>
                Ingen bookede aftaler i demo.
              </p>
            ) : (
              <ul className="space-y-3">
                {appointments.map((a, i) => (
                  <li
                    key={i}
                    className="flex flex-col gap-1 rounded-xl border px-3 py-3 sm:flex-row sm:items-center sm:justify-between"
                    style={{ borderColor: 'var(--cp-border)', backgroundColor: 'var(--cp-bg3)' }}
                  >
                    <div>
                      <div className="font-medium" style={{ color: 'var(--cp-text)' }}>
                        {a.what}
                      </div>
                      <div className="text-sm" style={{ color: 'var(--cp-green)' }}>
                        {a.when}
                      </div>
                    </div>
                    {a.place && (
                      <div className="text-xs sm:text-right" style={{ color: 'var(--cp-muted)' }}>
                        {a.place}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </SectionCard>

          <div className="grid gap-5 lg:grid-cols-2">
            <SectionCard id="medicin" title="Medicin" icon={Pill}>
              <ul className="space-y-3">
                {medications.map((m, i) => (
                  <li
                    key={i}
                    className="rounded-xl border p-3"
                    style={{ borderColor: 'var(--cp-border)', backgroundColor: 'var(--cp-bg3)' }}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <div className="font-medium" style={{ color: 'var(--cp-text)' }}>
                          {m.name} <span className="font-normal opacity-80">{m.dose}</span>
                        </div>
                        <div className="text-xs sm:text-sm" style={{ color: 'var(--cp-muted)' }}>
                          {m.schedule}
                          {m.pn && (
                            <span
                              className="ml-2 rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase"
                              style={{
                                backgroundColor: 'var(--cp-amber-dim)',
                                color: 'var(--cp-amber)',
                              }}
                            >
                              PN
                            </span>
                          )}
                        </div>
                      </div>
                      {m.nextDue && m.nextDue !== '—' && (
                        <div className="text-right text-xs" style={{ color: 'var(--cp-muted2)' }}>
                          Næste: {m.nextDue}
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </SectionCard>

            <SectionCard id="planer" title="Planer & handleplan" icon={ClipboardList}>
              <ul className="space-y-3">
                {plans.map((p, i) => (
                  <li
                    key={i}
                    className="rounded-xl border p-3"
                    style={{ borderColor: 'var(--cp-border)', backgroundColor: 'var(--cp-bg3)' }}
                  >
                    <div className="font-medium" style={{ color: 'var(--cp-text)' }}>
                      {p.title}
                    </div>
                    <p className="mt-1 text-sm" style={{ color: 'var(--cp-muted)' }}>
                      {p.focus}
                    </p>
                    <div
                      className="mt-2 flex flex-wrap gap-x-3 text-xs"
                      style={{ color: 'var(--cp-muted2)' }}
                    >
                      <span>Ansvar: {p.owner}</span>
                      <span>·</span>
                      <span>Næste gennemgang: {p.nextReview}</span>
                    </div>
                  </li>
                ))}
              </ul>
            </SectionCard>
          </div>

          <SectionCard id="haven" title="Haven (Lys)" icon={Sprout}>
            <p className="mb-4 text-sm" style={{ color: 'var(--cp-muted)' }}>
              Samme visuelle have som borgeren ser i Lys — her i demo med animationer, så I kan vise
              stolt frem overfor team og borgere.
            </p>
            {gardenPlots.length === 0 ? (
              <p
                className="rounded-xl border border-dashed p-8 text-center text-sm"
                style={{ color: 'var(--cp-muted)' }}
              >
                Ingen planter i demo for denne profil — i app’en vises haven, når borgeren opretter
                mål/planter.
              </p>
            ) : (
              <HavenGardenScene
                plots={gardenPlots}
                ambient={getHavenAmbientPeriod(new Date().getHours())}
                showcase
                reducedMotion={havenReducedMotion}
                compact
                title={`${profile.displayName.split(/\s+/)[0] || 'Borger'}s have`}
                subtitle="Spejlet fra Lys (demo)"
              />
            )}
          </SectionCard>

          <SectionCard id="maal" title="Mål — borger & personale" icon={Target}>
            <div className="grid gap-5 md:grid-cols-2">
              <div>
                <h3
                  className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide"
                  style={{ color: 'var(--cp-green)' }}
                >
                  <Heart className="h-3.5 w-3.5" aria-hidden />
                  Borgernes egne mål (Lys / app)
                </h3>
                <ul className="space-y-3">
                  {goalsResident.map((g, i) => (
                    <li
                      key={i}
                      className="rounded-xl border p-3"
                      style={{
                        borderColor: 'rgba(45,212,160,0.2)',
                        backgroundColor: 'var(--cp-bg3)',
                      }}
                    >
                      <div className="flex justify-between gap-2">
                        <span className="text-sm font-medium" style={{ color: 'var(--cp-text)' }}>
                          {g.title}
                        </span>
                        {g.progress != null && (
                          <span
                            className="text-xs tabular-nums"
                            style={{ color: 'var(--cp-green)' }}
                          >
                            {g.progress}%
                          </span>
                        )}
                      </div>
                      {g.progress != null && (
                        <div
                          className="mt-2 h-1.5 overflow-hidden rounded-full"
                          style={{ backgroundColor: 'var(--cp-bg)' }}
                        >
                          <div
                            className="h-full rounded-full transition-all"
                            style={{
                              width: `${g.progress}%`,
                              background: 'linear-gradient(90deg, #2dd4a0, #0d9488)',
                            }}
                          />
                        </div>
                      )}
                      {g.note && (
                        <p className="mt-2 text-xs" style={{ color: 'var(--cp-muted)' }}>
                          {g.note}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <h3
                  className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide"
                  style={{ color: 'var(--cp-muted)' }}
                >
                  <Users className="h-3.5 w-3.5" aria-hidden />
                  Personalets mål for beboeren
                </h3>
                <ul className="space-y-3">
                  {goalsStaff.map((g, i) => (
                    <li
                      key={i}
                      className="rounded-xl border p-3"
                      style={{ borderColor: 'var(--cp-border)', backgroundColor: 'var(--cp-bg3)' }}
                    >
                      <div className="flex justify-between gap-2">
                        <span className="text-sm font-medium" style={{ color: 'var(--cp-text)' }}>
                          {g.title}
                        </span>
                        {g.progress != null && (
                          <span
                            className="text-xs tabular-nums"
                            style={{ color: 'var(--cp-muted)' }}
                          >
                            {g.progress}%
                          </span>
                        )}
                      </div>
                      {g.progress != null && (
                        <div
                          className="mt-2 h-1.5 overflow-hidden rounded-full"
                          style={{ backgroundColor: 'var(--cp-bg)' }}
                        >
                          <div
                            className="h-full rounded-full bg-[var(--cp-muted2)] opacity-50"
                            style={{ width: `${g.progress}%` }}
                          />
                        </div>
                      )}
                      {g.note && (
                        <p className="mt-2 text-xs" style={{ color: 'var(--cp-muted2)' }}>
                          {g.note}
                        </p>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </SectionCard>

          <div className="grid gap-5 lg:grid-cols-2">
            <SectionCard id="journal" title="Journal" icon={Stethoscope}>
              <p className="mb-4 text-xs leading-relaxed" style={{ color: 'var(--cp-muted2)' }}>
                Kladder vises her, indtil de godkendes. Før godkendelse tæller et notat ikke som
                officiel journal til dashboard og RAG — efter godkendelse flyttes det til listen
                nedenfor (demo).
              </p>

              {journalDrafts.length > 0 ? (
                <div className="mb-6">
                  <h3
                    className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide"
                    style={{ color: 'var(--cp-amber)' }}
                  >
                    <FilePenLine className="h-3.5 w-3.5 shrink-0" aria-hidden />
                    Kladder
                  </h3>
                  <ul className="space-y-3">
                    {journalDrafts.map((j, i) => (
                      <li
                        key={j.id ?? `kladde-${i}`}
                        className="rounded-xl border border-dashed p-3"
                        style={{
                          borderColor: 'rgba(245,158,11,0.45)',
                          backgroundColor: 'rgba(245,158,11,0.06)',
                        }}
                      >
                        <div
                          className="flex flex-wrap items-center justify-between gap-2 text-xs"
                          style={{ color: 'var(--cp-muted2)' }}
                        >
                          <span>{j.when}</span>
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span
                              className="rounded px-1.5 py-0.5 font-medium uppercase"
                              style={{
                                backgroundColor: 'var(--cp-amber-dim)',
                                color: 'var(--cp-amber)',
                              }}
                            >
                              Kladde
                            </span>
                            <span
                              className="rounded px-1.5 py-0.5 font-medium uppercase"
                              style={{
                                backgroundColor:
                                  j.type === 'bekymring'
                                    ? 'rgba(245,101,101,0.12)'
                                    : 'var(--cp-bg2)',
                                color: j.type === 'bekymring' ? 'var(--cp-red)' : 'var(--cp-muted)',
                              }}
                            >
                              {j.type}
                            </span>
                          </div>
                        </div>
                        <div className="mt-1 text-xs" style={{ color: 'var(--cp-muted)' }}>
                          {j.author}
                        </div>
                        <p
                          className="mt-2 text-sm leading-relaxed"
                          style={{ color: 'var(--cp-text)' }}
                        >
                          {j.excerpt}
                        </p>
                        {j.id ? (
                          <button
                            type="button"
                            onClick={() => approveJournalDraft(j.id!)}
                            className="mt-3 inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-colors hover:bg-[rgba(255,255,255,0.04)]"
                            style={{
                              borderColor: 'var(--cp-amber)',
                              color: 'var(--cp-amber)',
                            }}
                          >
                            <CheckCircle2 className="h-3.5 w-3.5 shrink-0" aria-hidden />
                            Godkend og synliggør (demo)
                          </button>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              <h3
                className="mb-2 text-xs font-semibold uppercase tracking-wide"
                style={{ color: 'var(--cp-muted)' }}
              >
                Godkendt journal
              </h3>
              {journalGodkendt.length === 0 ? (
                <p className="text-sm" style={{ color: 'var(--cp-muted)' }}>
                  Ingen godkendte journalnotater i demo (endnu).
                </p>
              ) : (
                <ul className="space-y-3">
                  {journalGodkendt.map((j, i) => (
                    <li
                      key={j.id ?? `godkendt-${i}`}
                      className="rounded-xl border p-3"
                      style={{
                        borderColor:
                          j.type === 'bekymring' ? 'rgba(245,101,101,0.35)' : 'var(--cp-border)',
                        backgroundColor: 'var(--cp-bg3)',
                      }}
                    >
                      <div
                        className="flex flex-wrap items-center justify-between gap-2 text-xs"
                        style={{ color: 'var(--cp-muted2)' }}
                      >
                        <span>{j.when}</span>
                        <span
                          className="rounded px-1.5 py-0.5 font-medium uppercase"
                          style={{
                            backgroundColor:
                              j.type === 'bekymring' ? 'rgba(245,101,101,0.12)' : 'var(--cp-bg2)',
                            color: j.type === 'bekymring' ? 'var(--cp-red)' : 'var(--cp-muted)',
                          }}
                        >
                          {j.type}
                        </span>
                      </div>
                      <div className="mt-1 text-xs" style={{ color: 'var(--cp-muted)' }}>
                        {j.author}
                      </div>
                      <p
                        className="mt-2 text-sm leading-relaxed"
                        style={{ color: 'var(--cp-text)' }}
                      >
                        {j.excerpt}
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </SectionCard>

            <SectionCard id="dokumenter" title="Aftaler & dokumenter" icon={FileText}>
              <ul className="space-y-2">
                {agreements.map((a, i) => (
                  <li
                    key={i}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-xl border px-3 py-2.5"
                    style={{ borderColor: 'var(--cp-border)', backgroundColor: 'var(--cp-bg3)' }}
                  >
                    <span className="text-sm font-medium" style={{ color: 'var(--cp-text)' }}>
                      {a.title}
                    </span>
                    <div
                      className="flex items-center gap-2 text-xs"
                      style={{ color: 'var(--cp-muted)' }}
                    >
                      <span>{a.updated}</span>
                      <span
                        className="rounded-full px-2 py-0.5 font-medium"
                        style={{
                          backgroundColor:
                            a.status === 'aktiv' ? 'var(--cp-green-dim)' : 'var(--cp-amber-dim)',
                          color: a.status === 'aktiv' ? 'var(--cp-green)' : 'var(--cp-amber)',
                        }}
                      >
                        {a.status}
                      </span>
                    </div>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs leading-relaxed" style={{ color: 'var(--cp-muted2)' }}>
                Demo: Dokumenter er simulerede. I produktion knyttes til journal, samtykker og
                kommunale forløb.
              </p>
            </SectionCard>
          </div>
        </div>
      </div>
    </div>
  );
}
