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
import { BookOpen, RefreshCw } from 'lucide-react';

type DashboardClientProps = {
  medicationWidget?: React.ReactNode;
};

function DashboardClientInner({ medicationWidget }: DashboardClientProps) {
  const [lastUpdated] = useState('26/03/2026 · 09:47');
  const [journalOpen, setJournalOpen] = useState(false);
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
          <h1 className="text-xl font-bold text-gray-900">Dagsoverblik</h1>
          <div className="text-sm text-gray-500 mt-0.5">Bosted Nordlys · Dagvagt · Sara K.</div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            Live · Opdateret {lastUpdated}
          </div>
          <button
            type="button"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-600 hover:bg-gray-100 transition-colors"
          >
            <RefreshCw size={12} />
            Opdater
          </button>
        </div>
      </div>

      {medicationWidget}

      <BekymringsnotatWidget />

      <KalenderWidget />

      <OpgaveWidget />

      {/* Stat cards */}
      <StatCards />

      {/* Two-column layout */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 mt-5">
        <div className="xl:col-span-1">
          <AlertPanel />
        </div>
        <div className="xl:col-span-2">
          <ResidentList />
        </div>
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
    </div>
  );
}

export default function DashboardClient({ medicationWidget }: DashboardClientProps) {
  return (
    <Suspense
      fallback={
        <div className="min-h-[40vh] animate-pulse rounded-xl bg-gray-100" aria-busy aria-label="Indlæser overblik" />
      }
    >
      <DashboardClientInner medicationWidget={medicationWidget} />
    </Suspense>
  );
}
