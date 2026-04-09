'use client';
import React, { Suspense, useEffect, useState } from 'react';
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
import { BookOpen, RefreshCw } from 'lucide-react';
import { carePortalPilotSimulatedData } from '@/lib/carePortalPilotSimulated';

const OverrapportModal = dynamic(() => import('./OverrapportModal'), { ssr: false });
const OverrapportPanel = dynamic(() => import('./OverrapportPanel'), { ssr: false });
const IndsatsModal = dynamic(() => import('./IndsatsModal'), { ssr: false });
const TilsynsrapportModal = dynamic(() => import('./TilsynsrapportModal'), { ssr: false });
const JournalAiDemoModal = dynamic(() => import('./JournalAiDemoModal'), { ssr: false });

type DashboardClientProps = {
  medicationWidget?: React.ReactNode;
};

function DashboardClientInner({ medicationWidget }: DashboardClientProps) {
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
  const searchParams = useSearchParams();
  const router = useRouter();
  const tab = searchParams.get('tab');

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

      {/* Action cards */}
      <ActionCards onOpenOverrapport={() => setOverrapportPanelOpen(true)} />

      <div className="mb-6 space-y-4">
        <DashboardModule
          id="dash-live-med"
          title="Medicin"
          subtitle="Dagens kurser og opfølgning"
          defaultOpen
        >
          {medicationWidget}
        </DashboardModule>
        <DashboardModule
          id="dash-live-journal"
          title="Journal"
          subtitle="Seneste notater og godkendelse"
          defaultOpen
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
          id="dash-live-plan"
          title="Planlægning og vagt"
          subtitle="Aftaler, vagttelefon og opgaver"
          contentClassName="p-4 pt-3 space-y-5"
        >
          <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
            <KalenderWidget />
            <OnCallStaffWidget />
          </div>
          <OpgaveWidget />
        </DashboardModule>
      </div>

      {/* Stat cards */}
      <StatCards />

      {/* Two-column layout — alert panel | resident table */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_1.4fr] gap-5 mt-5">
        <AlertPanel />
        <ResidentList />
      </div>

      <button
        type="button"
        onClick={() => setJournalOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-budr-purple px-4 py-3 text-sm font-medium text-white shadow-lg transition-all duration-200 hover:scale-105"
        aria-label="Åbn hurtigt stikord (kladde til Dagens dagbog)"
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

export default function DashboardClient({ medicationWidget }: DashboardClientProps) {
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
      <DashboardClientInner medicationWidget={medicationWidget} />
    </Suspense>
  );
}
