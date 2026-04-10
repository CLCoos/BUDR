'use client';
import React, { Suspense, useEffect, useMemo, useState } from 'react';
import dynamic from 'next/dynamic';
import { useSearchParams, useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { parseStaffOrgId } from '@/lib/staffOrgScope';
import AlertPanel from './AlertPanel';
import BekymringsnotatWidget from './BekymringsnotatWidget';
import KalenderWidget from './KalenderWidget';
import OpgaveWidget from './OpgaveWidget';
import OnCallStaffWidget from './OnCallStaffWidget';
import ResidentList from './ResidentList';
import StatCards from './StatCards';
import HurtigJournalModal from './HurtigJournalModal';
import JournalOverblikWidget from './JournalOverblikWidget';
import ActionCards from './ActionCards';
import DashboardModule from './DashboardModule';
import ResidentListDemo from './ResidentListDemo';
import { ArrowDown, ArrowUp, BookOpen, Plus, RefreshCw, Settings2, X } from 'lucide-react';
import { carePortalPilotSimulatedData } from '@/lib/carePortalPilotSimulated';

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

type DashboardWidgetState = { key: DashboardWidgetKey; enabled: boolean };
type DashboardWidgetMeta = {
  id: string;
  title: string;
  subtitle?: string;
  defaultOpen?: boolean;
  content: React.ReactNode;
  contentClassName?: string;
};

const DASHBOARD_WIDGETS_KEY = 'budr_dashboard_widgets_v1';

const DEFAULT_WIDGETS: DashboardWidgetState[] = [
  { key: 'medicin', enabled: true },
  { key: 'journal', enabled: true },
  { key: 'bekymring', enabled: true },
  { key: 'planlaegning', enabled: true },
  { key: 'status', enabled: true },
  { key: 'advarsler', enabled: true },
  { key: 'beboere', enabled: true },
];

function loadDashboardWidgets(): DashboardWidgetState[] {
  if (typeof window === 'undefined') return DEFAULT_WIDGETS;
  try {
    const raw = window.localStorage.getItem(DASHBOARD_WIDGETS_KEY);
    if (!raw) return DEFAULT_WIDGETS;
    const parsed = JSON.parse(raw) as DashboardWidgetState[];
    if (!Array.isArray(parsed) || parsed.length === 0) return DEFAULT_WIDGETS;
    const known = new Set(DEFAULT_WIDGETS.map((x) => x.key));
    const valid = parsed.filter((x) => x && known.has(x.key));
    const missing = DEFAULT_WIDGETS.filter((d) => !valid.some((v) => v.key === d.key));
    return [...valid, ...missing];
  } catch {
    return DEFAULT_WIDGETS;
  }
}

function saveDashboardWidgets(w: DashboardWidgetState[]) {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(DASHBOARD_WIDGETS_KEY, JSON.stringify(w));
  } catch {
    // ignore
  }
}

function DashboardClientInner({
  medicationWidget,
  mode = 'dashboard',
  singleWidget,
}: DashboardClientProps) {
  const pilotSim = carePortalPilotSimulatedData();
  const [headerSubtitle, setHeaderSubtitle] = useState('Care Portal');
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
  const [overrapportOpen, setOverrapportOpen] = useState(false);
  const [overrapportPanelOpen, setOverrapportPanelOpen] = useState(false);
  const [indsatsOpen, setIndsatsOpen] = useState(false);
  const [tilsynsrapportOpen, setTilsynsrapportOpen] = useState(false);
  const [editDashboard, setEditDashboard] = useState(false);
  const [widgetState, setWidgetState] = useState<DashboardWidgetState[]>(DEFAULT_WIDGETS);
  const searchParams = useSearchParams();
  const router = useRouter();
  const tab = searchParams.get('tab');

  useEffect(() => {
    const loaded = loadDashboardWidgets();
    setWidgetState(loaded);
  }, []);

  useEffect(() => {
    saveDashboardWidgets(widgetState);
  }, [widgetState]);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) return;
    void (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) {
        setHeaderSubtitle('Care Portal');
        return;
      }
      const staffLabel =
        (typeof user.user_metadata?.display_name === 'string' &&
        user.user_metadata.display_name.trim().length > 0
          ? user.user_metadata.display_name.trim()
          : null) ??
        user.email?.split('@')[0] ??
        'Team';
      const orgId = parseStaffOrgId(user.user_metadata?.org_id);
      if (!orgId) {
        setHeaderSubtitle(`${staffLabel} · angiv organisation (org_id) på brugeren`);
        return;
      }
      const { data: org } = await supabase
        .from('organisations')
        .select('name')
        .eq('id', orgId)
        .maybeSingle();
      const orgName =
        typeof org?.name === 'string' && org.name.trim() ? org.name.trim() : 'Organisation';
      setHeaderSubtitle(`${orgName} · ${staffLabel}`);
    })();
  }, []);

  useEffect(() => {
    if (tab === 'journal') {
      setJournalOpen(true);
    }
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
    if (searchParams.get('tab') === 'journal') {
      router.replace('/care-portal-dashboard', { scroll: false });
    }
  };

  const facilityLabel = headerSubtitle.split('·')[0]?.trim().replace(/\s+/g, ' ') || 'Organisation';
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
          content: <ResidentList />,
        },
      }) as Record<DashboardWidgetKey, DashboardWidgetMeta>,
    [medicationWidget]
  );

  const visibleWidgets =
    mode === 'single' && singleWidget
      ? [{ key: singleWidget, enabled: true }]
      : widgetState.filter((w) => w.enabled);

  if (pilotSim) {
    return (
      <div className="relative">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1
              className="font-bold"
              style={{
                fontFamily: "'DM Serif Display', serif",
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
                border: '1px solid rgba(45,212,160,0.2)',
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
            <OpgaveWidget />
          </DashboardModule>
        </div>

        <div className="mb-6">
          <StatCards variant="demo" />
        </div>

        <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-[1fr_1.4fr]">
          <AlertPanel variant="demo" />
          <ResidentListDemo />
        </div>

        <button
          type="button"
          onClick={() => setJournalOpen(true)}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full px-5 py-3.5 text-sm font-semibold text-white transition-all duration-200 hover:scale-[1.03] hover:brightness-110 active:scale-[0.98]"
          style={{
            background: 'linear-gradient(135deg, #8b84e8 0%, #5E56C0 55%, #4c3d91 100%)',
            boxShadow: '0 8px 32px rgba(94, 86, 192, 0.45), 0 0 0 1px rgba(255,255,255,0.08)',
          }}
          aria-label="Åbn journaludkast med AI (pilot)"
        >
          <BookOpen className="h-5 w-5 shrink-0 opacity-95" aria-hidden />
          <span className="hidden sm:inline">Journal · AI-demo</span>
          <span className="sm:hidden">Journal</span>
        </button>

        <JournalAiDemoModal open={journalOpen} onClose={closeJournal} />
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

  return (
    <div className="relative">
      {/* Page header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1
            className="font-bold"
            style={{
              fontFamily: "'DM Serif Display', serif",
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
        <div className="flex items-center gap-2">
          {/* Live pill */}
          <div
            className="flex items-center gap-1.5"
            style={{
              padding: '4px 10px',
              borderRadius: 20,
              backgroundColor: 'var(--cp-green-dim)',
              border: '1px solid rgba(45,212,160,0.2)',
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
              Live · {lastUpdated}
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
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors"
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
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors"
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

      {mode === 'dashboard' && (
        <ActionCards onOpenOverrapport={() => setOverrapportPanelOpen(true)} />
      )}

      <div className="mb-6 space-y-4">
        {mode === 'dashboard' && (
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setEditDashboard((v) => !v)}
              className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium"
              style={{
                borderColor: 'var(--cp-border)',
                color: 'var(--cp-text)',
                backgroundColor: 'var(--cp-bg3)',
              }}
            >
              <Settings2 size={13} />
              {editDashboard ? 'Afslut redigering' : 'Redigér dashboard'}
            </button>
          </div>
        )}

        {visibleWidgets.map((w, idx) => {
          const meta = widgetLookup[w.key];
          return (
            <div key={w.key}>
              {mode === 'dashboard' && editDashboard && (
                <div className="mb-2 flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      setWidgetState((prev) => {
                        if (idx === 0) return prev;
                        const all = [...prev];
                        const i = all.findIndex((x) => x.key === w.key);
                        if (i <= 0) return prev;
                        const tmp = all[i - 1];
                        all[i - 1] = all[i]!;
                        all[i] = tmp!;
                        return all;
                      })
                    }
                    className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px]"
                    style={{ borderColor: 'var(--cp-border)', color: 'var(--cp-muted)' }}
                  >
                    <ArrowUp size={12} />
                    Op
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setWidgetState((prev) => {
                        const all = [...prev];
                        const i = all.findIndex((x) => x.key === w.key);
                        if (i < 0 || i >= all.length - 1) return prev;
                        const tmp = all[i + 1];
                        all[i + 1] = all[i]!;
                        all[i] = tmp!;
                        return all;
                      })
                    }
                    className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px]"
                    style={{ borderColor: 'var(--cp-border)', color: 'var(--cp-muted)' }}
                  >
                    <ArrowDown size={12} />
                    Ned
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setWidgetState((prev) =>
                        prev.map((x) => (x.key === w.key ? { ...x, enabled: false } : x))
                      )
                    }
                    className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-[11px]"
                    style={{ borderColor: 'var(--cp-border)', color: 'var(--cp-red)' }}
                  >
                    <X size={12} />
                    Fjern
                  </button>
                </div>
              )}
              <DashboardModule
                id={meta.id}
                title={meta.title}
                subtitle={meta.subtitle}
                defaultOpen={meta.defaultOpen}
                contentClassName={meta.contentClassName}
              >
                {meta.content}
              </DashboardModule>
            </div>
          );
        })}

        {mode === 'dashboard' && editDashboard && (
          <div className="rounded-xl border p-3" style={{ borderColor: 'var(--cp-border)' }}>
            <p className="mb-2 text-xs font-semibold" style={{ color: 'var(--cp-muted)' }}>
              Tilføj til dashboard
            </p>
            <div className="flex flex-wrap gap-2">
              {widgetState
                .filter((w) => !w.enabled)
                .map((w) => (
                  <button
                    key={`add-${w.key}`}
                    type="button"
                    onClick={() =>
                      setWidgetState((prev) =>
                        prev.map((x) => (x.key === w.key ? { ...x, enabled: true } : x))
                      )
                    }
                    className="inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs"
                    style={{ borderColor: 'var(--cp-border)', color: 'var(--cp-text)' }}
                  >
                    <Plus size={12} />
                    {widgetLookup[w.key].title}
                  </button>
                ))}
            </div>
          </div>
        )}
      </div>

      {mode === 'single' && singleWidget && (
        <div className="mb-4">
          <button
            type="button"
            onClick={() => {
              setWidgetState((prev) =>
                prev.map((x) => (x.key === singleWidget ? { ...x, enabled: true } : x))
              );
              router.push('/care-portal-dashboard');
            }}
            className="inline-flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-white"
            style={{ backgroundColor: 'var(--cp-green)' }}
          >
            <Plus size={14} />
            Tilføj til Dashboard
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={() => setJournalOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-budr-purple px-4 py-3 text-sm font-medium text-white shadow-lg transition-all duration-200 hover:scale-105"
        aria-label="Åbn hurtigt stikord (kladde til Aftenopsamling)"
      >
        <BookOpen className="h-5 w-5 shrink-0" aria-hidden />
        <span>Hurtigt stikord</span>
      </button>

      <HurtigJournalModal open={journalOpen} onClose={closeJournal} />
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
