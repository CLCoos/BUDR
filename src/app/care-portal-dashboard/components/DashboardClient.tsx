'use client';
import React, { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { useSearchParams, useRouter } from 'next/navigation';
import AlertPanel from './AlertPanel';
import BekymringsnotatWidget from './BekymringsnotatWidget';
import KalenderWidget from './KalenderWidget';
import OpgaveWidget from './OpgaveWidget';
import DocumentInboxWidget from './DocumentInboxWidget';
import AssistantWidget from '@/components/assistant/AssistantWidget';
import VagtPanel from './VagtPanel';
import OnCallStaffWidget from './OnCallStaffWidget';
import ResidentList from './ResidentList';
import StatCards from './StatCards';
import HurtigJournalModal from './HurtigJournalModal';
import JournalOverblikWidget from './JournalOverblikWidget';
import ActionCards from './ActionCards';
import DashboardModule from './DashboardModule';
import OnboardingChecklist from './OnboardingChecklist';
import ResidentListDemo from './ResidentListDemo';
import { Plus, RefreshCw } from 'lucide-react';
import { useStaffOrgIsBingbong } from '@/hooks/useStaffOrgIsBingbong';
import { carePortalPilotSimulatedData } from '@/lib/carePortalPilotSimulated';
import { useAlertCount } from '@/hooks/useAlertCount';
import { useCarePortalDepartment } from '@/contexts/CarePortalDepartmentContext';
import { getWidgetStatus, widgetStatusVar } from '@/lib/widgetStatus';
import { useAuthenticatedUser } from '@/lib/auth/useAuthenticatedUser';

const OverrapportModal = dynamic(() => import('./OverrapportModal'), { ssr: false });
const OverrapportPanel = dynamic(() => import('./OverrapportPanel'), { ssr: false });
const IndsatsModal = dynamic(() => import('./IndsatsModal'), { ssr: false });
const TilsynsrapportModal = dynamic(() => import('./TilsynsrapportModal'), { ssr: false });
const JournalAiDemoModal = dynamic(() => import('./JournalAiDemoModal'), { ssr: false });

type DashboardClientProps = {
  medicationWidget?: React.ReactNode;
  mode?: 'dashboard' | 'single';
  singleWidget?: DashboardWidgetKey;
};

type DashboardWidgetKey =
  | 'medicin'
  | 'journal'
  | 'bekymring'
  | 'planlaegning'
  | 'status'
  | 'advarsler'
  | 'beboere';

type DashboardWidgetMeta = {
  id: string;
  title: string;
  subtitle?: string;
  defaultOpen?: boolean;
  content: React.ReactNode;
  contentClassName?: string;
};

// ── Zone 2 accent wrapper ─────────────────────────────────────
// Adds a 2px colored top-border accent to a widget card. Uses
// overflow:hidden + border-radius so the inner card's corners are clipped flush.
function Zone2Card({ accent, children }: { accent: string; children: React.ReactNode }) {
  return (
    <div className="overflow-hidden rounded-xl" style={{ borderTop: `2px solid ${accent}` }}>
      {children}
    </div>
  );
}

// ── Shared header pill / button styles ────────────────────────

function LivePill({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex items-center gap-1.5"
      style={{
        padding: '0 10px',
        height: 30,
        borderRadius: 999,
        backgroundColor: 'var(--cp-green-dim)',
      }}
    >
      <div
        style={{
          width: 6,
          height: 6,
          borderRadius: '50%',
          backgroundColor: 'var(--cp-green)',
        }}
      />
      <span style={{ fontSize: 12, color: 'var(--cp-green)', fontWeight: 500 }}>
        Opdateret {children}
      </span>
    </div>
  );
}

function PillButton({
  onClick,
  danger = false,
  children,
}: {
  onClick: () => void;
  danger?: boolean;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-[40px] items-center gap-1.5 rounded-[10px] px-4 text-[13px] font-medium transition-colors hover:bg-[var(--cp-bg3)]"
      style={{
        border: '1px solid var(--cp-border2)',
        color: danger ? 'var(--cp-red)' : 'var(--cp-text)',
        backgroundColor: 'var(--cp-bg2)',
      }}
    >
      {children}
    </button>
  );
}

/** "God morgen" osv. efter dansk tid. */
function greetingFor(now: Date): string {
  const h = Number(
    new Intl.DateTimeFormat('da-DK', {
      hour: '2-digit',
      hour12: false,
      timeZone: 'Europe/Copenhagen',
    })
      .format(now)
      .slice(0, 2)
  );
  if (h >= 5 && h < 10) return 'God morgen';
  if (h >= 10 && h < 17) return 'God dag';
  if (h >= 17 && h < 23) return 'God aften';
  return 'God nat';
}

function todayLabel(now: Date): string {
  const s = new Intl.DateTimeFormat('da-DK', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'Europe/Copenhagen',
  }).format(now);
  return s.charAt(0).toUpperCase() + s.slice(1);
}

// ── Inner component ───────────────────────────────────────────

function DashboardClientInner({
  medicationWidget,
  mode = 'dashboard',
  singleWidget,
}: DashboardClientProps) {
  const { department } = useCarePortalDepartment();
  const authState = useAuthenticatedUser();
  const pilotSim = carePortalPilotSimulatedData();
  const { isBingbong, ready: bingbongReady } = useStaffOrgIsBingbong();
  const [headerSubtitle, setHeaderSubtitle] = useState('Care Portal');
  const [firstName, setFirstName] = useState<string | null>(null);
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => setNow(new Date()), []);
  const [lastUpdated, setLastUpdated] = useState(() =>
    new Date()
      .toLocaleString('da-DK', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      })
      .replace(',', ' ·')
  );

  useEffect(() => {
    const t = window.setInterval(() => {
      setLastUpdated(
        new Date()
          .toLocaleString('da-DK', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })
          .replace(',', ' ·')
      );
    }, 60_000);
    return () => window.clearInterval(t);
  }, []);

  const [journalOpen, setJournalOpen] = useState(false);
  const [journalResidentPrefill, setJournalResidentPrefill] = useState<string | null>(null);
  const alertCountZone = useAlertCount(true, department);
  const [overrapportOpen, setOverrapportOpen] = useState(false);
  const [overrapportPanelOpen, setOverrapportPanelOpen] = useState(false);
  const [indsatsOpen, setIndsatsOpen] = useState(false);
  const [tilsynsrapportOpen, setTilsynsrapportOpen] = useState(false);

  const searchParams = useSearchParams();
  const router = useRouter();
  const tab = searchParams.get('tab');

  useEffect(() => {
    if (authState.status === 'authenticated') {
      const staffLabel =
        (typeof authState.user.user_metadata?.display_name === 'string' &&
        authState.user.user_metadata.display_name.trim().length > 0
          ? authState.user.user_metadata.display_name.trim()
          : null) ??
        authState.user.email?.split('@')[0] ??
        'Team';
      const orgName = authState.org.name?.trim() || 'Organisation';
      setHeaderSubtitle(`${orgName} · ${staffLabel}`);
      const displayName =
        typeof authState.user.user_metadata?.display_name === 'string'
          ? authState.user.user_metadata.display_name.trim()
          : '';
      setFirstName(displayName ? (displayName.split(/\s+/)[0] ?? null) : null);
      return;
    }
    if (authState.status === 'authenticated-incomplete') {
      setHeaderSubtitle('Kontoopsaetning mangler');
      return;
    }
    if (authState.status === 'unauthenticated') {
      setHeaderSubtitle('Care Portal');
    }
  }, [authState]);

  useEffect(() => {
    if (tab === 'journal') setJournalOpen(true);
  }, [tab]);

  useEffect(() => {
    if (tab !== 'planner' && tab !== 'alerts') return;
    const id = tab === 'planner' ? 'budr-planlaegger' : 'budr-advarsler';
    const frame = requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    return () => cancelAnimationFrame(frame);
  }, [tab]);

  const closeJournal = () => {
    setJournalOpen(false);
    setJournalResidentPrefill(null);
    if (searchParams.get('tab') === 'journal') {
      router.replace('/care-portal-dashboard', { scroll: false });
    }
  };

  const openJournalComposer = useCallback(() => {
    setJournalResidentPrefill(null);
    setJournalOpen(true);
  }, []);

  const openJournalForResident = useCallback((residentId: string) => {
    setJournalResidentPrefill(residentId);
    setJournalOpen(true);
  }, []);

  const facilityLabel = headerSubtitle.split('·')[0]?.trim().replace(/\s+/g, ' ') || 'Organisation';

  // widgetLookup — used by pilotSim path and single-widget mode
  const widgetLookup = useMemo(
    () =>
      ({
        medicin: {
          id: 'dash-live-med',
          title: 'Medicin',
          subtitle: 'Dagens kurser og opfølgning',
          defaultOpen: true,
          content: medicationWidget,
        },
        journal: {
          id: 'dash-live-journal',
          title: 'Journal',
          subtitle: 'Seneste notater og godkendelse',
          defaultOpen: true,
          content: <JournalOverblikWidget />,
        },
        bekymring: {
          id: 'dash-live-bek',
          title: 'Bekymringsnotater',
          subtitle: 'Hurtige observationer · synligt på 360°',
          content: <BekymringsnotatWidget />,
        },
        planlaegning: {
          id: 'dash-live-plan',
          title: 'Planlægning og vagt',
          subtitle: 'Aftaler, vagttelefon og opgaver',
          contentClassName: 'p-4 pt-3 space-y-5',
          content: (
            <>
              <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
                <KalenderWidget />
                <OnCallStaffWidget />
              </div>
              <OpgaveWidget />
            </>
          ),
        },
        status: {
          id: 'dash-live-status',
          title: 'Status',
          subtitle: 'Nøgletal i dag',
          content: <StatCards />,
        },
        advarsler: {
          id: 'dash-live-alerts',
          title: 'Advarsler',
          subtitle: 'Aktive alarmer',
          content: <AlertPanel />,
        },
        beboere: {
          id: 'dash-live-residents',
          title: 'Beboere',
          subtitle: 'Check-ins og overblik',
          content: <ResidentList onNewJournal={openJournalForResident} />,
        },
      }) as Record<DashboardWidgetKey, DashboardWidgetMeta>,
    [medicationWidget, openJournalForResident]
  );

  // ── Pilot-sim path (skip for BingBong org: real residents + live widgets) ──
  if (pilotSim && !bingbongReady) {
    return (
      <div
        className="relative min-h-[50vh] rounded-xl animate-pulse"
        style={{ backgroundColor: 'var(--cp-bg3)' }}
        aria-busy
        aria-label="Indlæser organisation"
      />
    );
  }

  if (pilotSim && !isBingbong) {
    return (
      <div className="relative">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1
              className="font-bold"
              style={{
                fontFamily: 'var(--cp-font)',
                fontSize: 22,
                color: 'var(--cp-text)',
                lineHeight: 1.2,
              }}
            >
              Dagsoverblik
            </h1>
            <div className="mt-0.5" style={{ fontSize: 13, color: 'var(--cp-muted)' }}>
              {headerSubtitle}
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div
              className="flex items-center gap-1.5"
              style={{
                padding: '4px 10px',
                borderRadius: 20,
                backgroundColor: 'var(--cp-green-dim)',
                border: '1px solid color-mix(in srgb, var(--cp-green) 20%, transparent)',
              }}
            >
              <div
                style={{
                  width: 6,
                  height: 6,
                  borderRadius: '50%',
                  backgroundColor: 'var(--cp-green)',
                  boxShadow: '0 0 6px var(--cp-green)',
                }}
              />
              <span style={{ fontSize: 11, color: 'var(--cp-green)', fontWeight: 500 }}>
                Pilot · simuleret · {lastUpdated}
              </span>
            </div>
            {[
              { label: 'Overrapport', onClick: () => setOverrapportOpen(true), variant: 'default' },
              { label: 'Indsatsdok.', onClick: () => setIndsatsOpen(true), variant: 'danger' },
              {
                label: 'Tilsynsrapport',
                onClick: () => setTilsynsrapportOpen(true),
                variant: 'default',
              },
            ].map((btn) => (
              <button
                key={btn.label}
                type="button"
                onClick={btn.onClick}
                className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs transition-colors"
                style={
                  btn.variant === 'danger'
                    ? {
                        border: '1px solid var(--cp-red-dim)',
                        color: 'var(--cp-red)',
                        backgroundColor: 'transparent',
                      }
                    : {
                        border: '1px solid var(--cp-border)',
                        color: 'var(--cp-muted)',
                        backgroundColor: 'transparent',
                      }
                }
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--cp-bg3)';
                  (e.currentTarget as HTMLElement).style.color = 'var(--cp-text)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                  (e.currentTarget as HTMLElement).style.color =
                    btn.variant === 'danger' ? 'var(--cp-red)' : 'var(--cp-muted)';
                }}
              >
                {btn.label}
              </button>
            ))}
            <button
              type="button"
              onClick={openJournalComposer}
              className="flex items-center gap-1.5 rounded-lg px-3.5 py-1.5 text-xs font-semibold text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: 'var(--cp-green)' }}
            >
              <Plus size={14} aria-hidden />
              Ny journal
            </button>
            <button
              type="button"
              className="flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs transition-colors"
              style={{
                border: '1px solid var(--cp-border)',
                color: 'var(--cp-muted)',
                backgroundColor: 'transparent',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--cp-bg3)';
                (e.currentTarget as HTMLElement).style.color = 'var(--cp-text)';
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                (e.currentTarget as HTMLElement).style.color = 'var(--cp-muted)';
              }}
            >
              <RefreshCw size={12} />
              Opdater
            </button>
          </div>
        </div>

        <ActionCards onOpenOverrapport={() => setOverrapportPanelOpen(true)} showPilotBorgerCard />

        <div className="mb-6 space-y-4">
          <DashboardModule
            id="dash-pilot-med"
            title="Medicin"
            subtitle="Dagens kurser og opfølgning"
            defaultOpen
          >
            {medicationWidget}
          </DashboardModule>
          <DashboardModule
            id="dash-pilot-bek"
            title="Bekymringsnotater"
            subtitle="Hurtige observationer"
          >
            <BekymringsnotatWidget demoMode />
          </DashboardModule>
          <DashboardModule
            id="dash-pilot-plan"
            title="Plan og opgaver"
            subtitle="Kalender og opgaver"
            contentClassName="p-4 pt-3 space-y-5"
          >
            <KalenderWidget variant="demo" />
            <OpgaveWidget demoMode />
          </DashboardModule>
        </div>

        <div className="mb-6">
          <StatCards variant="demo" />
        </div>

        <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-[1fr_1.4fr]">
          <AlertPanel variant="demo" />
          <ResidentListDemo onNewJournal={openJournalForResident} />
        </div>

        <JournalAiDemoModal
          open={journalOpen}
          onClose={closeJournal}
          initialResidentId={journalResidentPrefill}
        />
        <OverrapportModal
          open={overrapportOpen}
          onClose={() => setOverrapportOpen(false)}
          preferDemoWhenNoResidents
        />
        <IndsatsModal open={indsatsOpen} onClose={() => setIndsatsOpen(false)} />
        <TilsynsrapportModal
          open={tilsynsrapportOpen}
          onClose={() => setTilsynsrapportOpen(false)}
          preferDemoWhenNoResidents
          facilityName={`${facilityLabel} (pilot)`}
        />
        <OverrapportPanel
          open={overrapportPanelOpen}
          onClose={() => setOverrapportPanelOpen(false)}
        />
      </div>
    );
  }

  // ── Single-widget mode (journal, advarsler, etc.) ─────────
  if (mode === 'single' && singleWidget) {
    const meta = widgetLookup[singleWidget];
    return (
      <>
        <DashboardModule
          id={meta.id}
          title={meta.title}
          subtitle={meta.subtitle}
          defaultOpen
          contentClassName={meta.contentClassName}
        >
          {meta.content}
        </DashboardModule>
        <HurtigJournalModal
          open={journalOpen}
          onClose={closeJournal}
          initialResidentId={journalResidentPrefill}
        />
        <OverrapportModal open={overrapportOpen} onClose={() => setOverrapportOpen(false)} />
        <IndsatsModal open={indsatsOpen} onClose={() => setIndsatsOpen(false)} />
        <TilsynsrapportModal
          open={tilsynsrapportOpen}
          onClose={() => setTilsynsrapportOpen(false)}
        />
        <OverrapportPanel
          open={overrapportPanelOpen}
          onClose={() => setOverrapportPanelOpen(false)}
        />
      </>
    );
  }

  // ── Main cockpit dashboard layout ─────────────────────────
  const alertZoneAccent = widgetStatusVar(
    getWidgetStatus('widget_alert_list', { openAlertCount: alertCountZone })
  );
  const residentsZoneAccent = widgetStatusVar(getWidgetStatus('widget_residents_list', {}));

  return (
    <div className="relative">
      {/* ── Page header ─────────────────────────────────────── */}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1.5">
          <div style={{ fontSize: 13, color: 'var(--cp-muted)' }}>
            {now ? `${todayLabel(now)} · ` : ''}
            {facilityLabel}
          </div>
          <h1
            style={{
              fontSize: 'clamp(24px, 3.2vw, 32px)',
              fontWeight: 600,
              letterSpacing: '-0.02em',
              color: 'var(--cp-text)',
              lineHeight: 1.2,
              margin: 0,
            }}
          >
            {now ? greetingFor(now) : 'Velkommen'}
            {firstName ? `, ${firstName}` : ''}.
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <LivePill>{lastUpdated.split('·')[1]?.trim() ?? lastUpdated}</LivePill>
          <PillButton onClick={() => setOverrapportOpen(true)}>Overrapport</PillButton>
          <PillButton onClick={() => setIndsatsOpen(true)} danger>
            Indsatsdok.
          </PillButton>
          <PillButton onClick={() => setTilsynsrapportOpen(true)}>Tilsynsrapport</PillButton>
          <button
            type="button"
            onClick={openJournalComposer}
            className="flex min-h-[40px] items-center gap-1.5 rounded-[10px] px-4 text-[13px] font-semibold transition-opacity hover:opacity-90"
            style={{ backgroundColor: 'var(--cp-green)', color: 'var(--cp-on-green)' }}
          >
            <Plus size={15} aria-hidden />
            Ny journal
          </button>
          <PillButton onClick={() => window.location.reload()}>
            <RefreshCw size={12} aria-hidden />
            Opdater
          </PillButton>
        </div>
      </div>

      <OnboardingChecklist />

      {/* ── Vagten: Mød ind, Nu, Gå hjem ─────────────────────── */}
      <VagtPanel assistant={<AssistantWidget hideIntake />} />

      {/* ── Alt overblik: de klassiske moduler, foldet sammen ── */}
      <details
        id="alt-overblik"
        open={tab === 'alerts' || tab === 'planner' || tab === 'medicin' ? true : undefined}
        className="group rounded-2xl border"
        style={{ borderColor: 'var(--cp-border)', backgroundColor: 'var(--cp-bg2)' }}
      >
        <summary
          className="flex min-h-[56px] cursor-pointer list-none items-center gap-2 px-5 text-[15px] font-semibold"
          style={{ color: 'var(--cp-text)' }}
        >
          Alt overblik
          <span className="text-sm font-normal" style={{ color: 'var(--cp-muted)' }}>
            Nøgletal, advarsler, borgere, medicin, kalender og journal
          </span>
          <span
            className="ml-auto transition-transform group-open:rotate-180"
            style={{ color: 'var(--cp-muted)' }}
            aria-hidden
          >
            ▾
          </span>
        </summary>
        <div className="px-3 pb-4 sm:px-5">
          <div className="mb-6">
            <StatCards />
          </div>

          <ActionCards onOpenOverrapport={() => setOverrapportOpen(true)} />

          {/* ── Zone 2: Hero grid (3 cols → 2 → 1) ───────────────
          md: medicin lå i én kolonne (halv bredde) — fuld række md, min. 280px tredje spor lg+. */}
          <div
            className="mb-5 grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(280px,1fr)]"
            style={{ alignItems: 'start' }}
          >
            <div className="min-w-0">
              <Zone2Card accent={alertZoneAccent}>
                <AlertPanel />
              </Zone2Card>
            </div>

            <div className="min-w-0">
              <Zone2Card accent={residentsZoneAccent}>
                <ResidentList compact onNewJournal={openJournalForResident} />
              </Zone2Card>
            </div>

            <div className="min-w-0 md:col-span-2 lg:col-span-1">
              <div className="overflow-hidden rounded-xl">{medicationWidget}</div>
            </div>
          </div>

          <DocumentInboxWidget />

          {/* ── Zone 3: Mid grid (2 cols → 1) ────────────────────── */}
          <div className="mb-5 grid grid-cols-1 gap-5 md:grid-cols-2">
            <KalenderWidget />
            <OnCallStaffWidget />
          </div>

          {/* ── Zone 4: Bottom — collapsed secondary sections ─────── */}
          <div className="space-y-3">
            <DashboardModule
              id="dash-live-journal"
              title="Journal"
              subtitle="7 dages notater og godkendelse"
            >
              <JournalOverblikWidget />
            </DashboardModule>

            <DashboardModule
              id="dash-live-bek"
              title="Bekymringsnotater"
              subtitle="Hurtige observationer · synligt på 360°"
            >
              <BekymringsnotatWidget />
            </DashboardModule>

            <DashboardModule
              id="dash-live-opgaver"
              title="Opgaver"
              subtitle="Åbne og igangværende opgaver"
            >
              <OpgaveWidget />
            </DashboardModule>
          </div>
        </div>
      </details>

      {/* ── Modals ─────────────────────────────────────────────── */}
      <HurtigJournalModal
        open={journalOpen}
        onClose={closeJournal}
        initialResidentId={journalResidentPrefill}
      />
      <OverrapportModal open={overrapportOpen} onClose={() => setOverrapportOpen(false)} />
      <IndsatsModal open={indsatsOpen} onClose={() => setIndsatsOpen(false)} />
      <TilsynsrapportModal open={tilsynsrapportOpen} onClose={() => setTilsynsrapportOpen(false)} />
      <OverrapportPanel
        open={overrapportPanelOpen}
        onClose={() => setOverrapportPanelOpen(false)}
      />
    </div>
  );
}

export default function DashboardClient({
  medicationWidget,
  mode = 'dashboard',
  singleWidget,
}: DashboardClientProps) {
  return (
    <Suspense
      fallback={
        <div
          className="min-h-[40vh] animate-pulse rounded-xl"
          style={{ backgroundColor: 'var(--cp-bg3)' }}
          aria-busy
          aria-label="Indlæser overblik"
        />
      }
    >
      <DashboardClientInner
        medicationWidget={medicationWidget}
        mode={mode}
        singleWidget={singleWidget}
      />
    </Suspense>
  );
}
