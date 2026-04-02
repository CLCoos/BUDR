'use client';
import React, { Suspense, useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import AlertPanel from './AlertPanel';
import BekymringsnotatWidget from './BekymringsnotatWidget';
import KalenderWidget from './KalenderWidget';
import OpgaveWidget from './OpgaveWidget';
import ResidentList from './ResidentList';
import StatCards from './StatCards';
import HurtigJournalModal from './HurtigJournalModal';
import OverrapportModal from './OverrapportModal';
import OverrapportPanel from './OverrapportPanel';
import IndsatsModal from './IndsatsModal';
import TilsynsrapportModal from './TilsynsrapportModal';
import ActionCards from './ActionCards';
import { BookOpen, RefreshCw } from 'lucide-react';

type DashboardClientProps = {
  medicationWidget?: React.ReactNode;
};

function DashboardClientInner({ medicationWidget }: DashboardClientProps) {
  const [lastUpdated, setLastUpdated] = useState(() =>
    new Date().toLocaleString('da-DK', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).replace(',', ' ·'),
  );
  useEffect(() => {
    const t = window.setInterval(() => {
      setLastUpdated(
        new Date().toLocaleString('da-DK', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).replace(',', ' ·'),
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

  return (
    <div className="relative">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1
            className="font-bold"
            style={{ fontFamily: "'DM Serif Display', serif", fontSize: 22, color: 'var(--cp-text)', lineHeight: 1.2 }}
          >
            Dagsoverblik
          </h1>
          <div className="mt-0.5" style={{ fontSize: 13, color: 'var(--cp-muted)' }}>Bosted Nordlys · Dagvagt · Sara K.</div>
        </div>
        <div className="flex items-center gap-2">
          {/* Live pill */}
          <div
            className="flex items-center gap-1.5"
            style={{
              padding: '4px 10px', borderRadius: 20,
              backgroundColor: 'var(--cp-green-dim)',
              border: '1px solid rgba(45,212,160,0.2)',
            }}
          >
            <div style={{
              width: 6, height: 6, borderRadius: '50%',
              backgroundColor: 'var(--cp-green)',
              boxShadow: '0 0 6px var(--cp-green)',
            }} />
            <span style={{ fontSize: 11, color: 'var(--cp-green)', fontWeight: 500 }}>
              Live · {lastUpdated}
            </span>
          </div>
          {[
            { label: 'Overrapport', onClick: () => setOverrapportOpen(true), variant: 'default' },
            { label: 'Indsatsdok.', onClick: () => setIndsatsOpen(true), variant: 'danger' },
            { label: 'Tilsynsrapport', onClick: () => setTilsynsrapportOpen(true), variant: 'default' },
          ].map(btn => (
            <button
              key={btn.label}
              type="button"
              onClick={btn.onClick}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors"
              style={btn.variant === 'danger'
                ? { border: '1px solid var(--cp-red-dim)', color: 'var(--cp-red)', backgroundColor: 'transparent' }
                : { border: '1px solid var(--cp-border)', color: 'var(--cp-muted)', backgroundColor: 'transparent' }
              }
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--cp-bg3)'; (e.currentTarget as HTMLElement).style.color = 'var(--cp-text)'; }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent';
                (e.currentTarget as HTMLElement).style.color = btn.variant === 'danger' ? 'var(--cp-red)' : 'var(--cp-muted)';
              }}
            >
              {btn.label}
            </button>
          ))}
          <button
            type="button"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs transition-colors"
            style={{ border: '1px solid var(--cp-border)', color: 'var(--cp-muted)', backgroundColor: 'transparent' }}
            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--cp-bg3)'; (e.currentTarget as HTMLElement).style.color = 'var(--cp-text)'; }}
            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.backgroundColor = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--cp-muted)'; }}
          >
            <RefreshCw size={12} />
            Opdater
          </button>
        </div>
      </div>

      {/* Action cards */}
      <ActionCards onOpenOverrapport={() => setOverrapportPanelOpen(true)} />

      {/* 2-col fluid widget grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 mb-6">
        {medicationWidget}
        <BekymringsnotatWidget />
        <KalenderWidget />
        <OpgaveWidget />
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
        aria-label="Åbn hurtignotat til journal"
      >
        <BookOpen className="h-5 w-5 shrink-0" aria-hidden />
        <span>Hurtignotat</span>
      </button>

      <HurtigJournalModal open={journalOpen} onClose={closeJournal} />
      <OverrapportModal open={overrapportOpen} onClose={() => setOverrapportOpen(false)} />
      <IndsatsModal open={indsatsOpen} onClose={() => setIndsatsOpen(false)} />
      <TilsynsrapportModal open={tilsynsrapportOpen} onClose={() => setTilsynsrapportOpen(false)} />
      <OverrapportPanel open={overrapportPanelOpen} onClose={() => setOverrapportPanelOpen(false)} />
    </div>
  );
}

export default function DashboardClient({ medicationWidget }: DashboardClientProps) {
  return (
    <Suspense
      fallback={
        <div className="min-h-[40vh] animate-pulse rounded-xl" style={{ backgroundColor: 'var(--cp-bg3)' }} aria-busy aria-label="Indlæser overblik" />
      }
    >
      <DashboardClientInner medicationWidget={medicationWidget} />
    </Suspense>
  );
}
