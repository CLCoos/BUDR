'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { BookOpen, RefreshCw, Sparkles } from 'lucide-react';
import AlertPanel from '@/app/care-portal-dashboard/components/AlertPanel';
import StatCards from '@/app/care-portal-dashboard/components/StatCards';
import MedicationWidget from '@/app/care-portal-dashboard/components/MedicationWidget';
import BekymringsnotatWidget from '@/app/care-portal-dashboard/components/BekymringsnotatWidget';
import KalenderWidget from '@/app/care-portal-dashboard/components/KalenderWidget';
import OpgaveWidget from '@/app/care-portal-dashboard/components/OpgaveWidget';
import ResidentListDemo from '@/app/care-portal-dashboard/components/ResidentListDemo';
import DemoActionCards from './DemoActionCards';
import DemoWelcomeOverlay from './DemoWelcomeOverlay';

const OverrapportModal = dynamic(
  () => import('@/app/care-portal-dashboard/components/OverrapportModal'),
  { ssr: false }
);
const OverrapportPanel = dynamic(
  () => import('@/app/care-portal-dashboard/components/OverrapportPanel'),
  { ssr: false }
);
const IndsatsModal = dynamic(() => import('@/app/care-portal-dashboard/components/IndsatsModal'), {
  ssr: false,
});
const TilsynsrapportModal = dynamic(
  () => import('@/app/care-portal-dashboard/components/TilsynsrapportModal'),
  { ssr: false }
);
const JournalAiDemoModal = dynamic(
  () => import('@/app/care-portal-dashboard/components/JournalAiDemoModal'),
  { ssr: false }
);

const DEMO_INDSATS_KEY = 'budr_indsats_records_v1';

function seedDemoIndsatsIfEmpty() {
  try {
    const existing = localStorage.getItem(DEMO_INDSATS_KEY);
    if (existing && JSON.parse(existing).length > 0) return;
    const now = new Date();
    const d = (offsetDays: number) => {
      const t = new Date(now);
      t.setDate(t.getDate() - offsetDays);
      return t.toISOString();
    };
    const records = [
      {
        id: 'demo-indsats-1',
        created_at: d(5),
        type: '§136_fastholdelse',
        paragraph: '§136',
        tidspunkt: d(5),
        varighed: '4 min',
        involverede_borgere: 'Finn L.',
        involverede_personale: 'Sara K., Mikkel H.',
        beskrivelse:
          'Borger forsøgte at forlade bostedet uden afklaring af destination. Fastholdelse var nødvendig af sikkerhedsmæssige årsager.',
        forudgaaende:
          'Borger var urolig om aftenen og udtrykte ønske om at gå ud. Personalet forsøgte verbal de-eskalering.',
        handling:
          'Kortvarig fastholdelse ved udgangsdøren. Borger beroliget og fulgt tilbage til stuen.',
        borgerens_reaktion: 'Borger rolignet sig hurtigt og accepterede aftalen om tur næste dag.',
        opfoelgning: 'Primærperson taler med borger næste dag. Hændelsen indberettes til ledelsen.',
        underskrift: 'Sara K.',
      },
      {
        id: 'demo-indsats-2',
        created_at: d(12),
        type: '§141_personlig_hygiejne',
        paragraph: '§141',
        tidspunkt: d(12),
        varighed: '10 min',
        involverede_borgere: 'Kirsten R.',
        involverede_personale: 'Hanne B.',
        beskrivelse:
          'Borger afslog gentagne gange at vaske sig. Sundhedsmæssig nødvendighed vurderet.',
        forudgaaende:
          'Borger har i 3 dage afvist personlig hygiejne trods motivation og tilbud om hjælp.',
        handling:
          'Assisteret bad med minimal magtanvendelse. Borger var verbal modstandende men fysisk samarbejdende.',
        borgerens_reaktion:
          'Borger roligere efterfølgende. Udtrykte taknemmelighed ved afslutning.',
        opfoelgning: 'Psykiater orienteres. Ny strategi for hygiejnerutine udarbejdes.',
        underskrift: 'Hanne B.',
      },
      {
        id: 'demo-indsats-3',
        created_at: d(2),
        type: 'observation',
        paragraph: '',
        tidspunkt: d(2),
        varighed: '2 timer',
        involverede_borgere: 'Thomas B.',
        involverede_personale: 'Mikkel H.',
        beskrivelse:
          'Borger viste tegn på forøget uro og selvskade-adfærd. Forhøjet observation iværksat.',
        forudgaaende:
          'Borger modtog dårlige nyheder fra familie. Personale observerede isolation og selvskade-markeringer.',
        handling: 'Nærværende observation hvert 15. min. Samtale tilbudt og accepteret.',
        borgerens_reaktion: 'Borger åbnede sig gradvist. Kriseplanen gennemgået i fællesskab.',
        opfoelgning: 'Forhøjet opmærksomhed næste 48 timer. Læge kontaktes ved forværring.',
        underskrift: 'Mikkel H.',
      },
    ];
    localStorage.setItem(DEMO_INDSATS_KEY, JSON.stringify(records));
  } catch {
    /* ignore */
  }
}

function ToolbarButton({
  children,
  onClick,
  variant = 'default',
}: {
  children: React.ReactNode;
  onClick?: () => void;
  variant?: 'default' | 'danger';
}) {
  const base =
    variant === 'danger'
      ? {
          border: '1px solid rgba(245,101,101,0.35)',
          color: 'var(--cp-red)',
          backgroundColor: 'transparent',
        }
      : {
          border: '1px solid var(--cp-border)',
          color: 'var(--cp-muted)',
          backgroundColor: 'rgba(30, 37, 53, 0.5)',
        };
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex items-center gap-1.5 rounded-[10px] px-3 py-2 text-xs font-medium transition-all"
      style={base}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--cp-bg3)';
        (e.currentTarget as HTMLElement).style.color =
          variant === 'danger' ? 'var(--cp-red)' : 'var(--cp-text)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.backgroundColor =
          variant === 'danger' ? 'transparent' : 'rgba(30, 37, 53, 0.5)';
        (e.currentTarget as HTMLElement).style.color =
          variant === 'danger' ? 'var(--cp-red)' : 'var(--cp-muted)';
      }}
    >
      {children}
    </button>
  );
}

export default function DashboardDemoMain() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const tab = searchParams.get('tab');

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
  const [overrapportOpen, setOverrapportOpen] = useState(false);
  const [overrapportPanelOpen, setOverrapportPanelOpen] = useState(false);
  const [indsatsOpen, setIndsatsOpen] = useState(false);
  const [tilsynsrapportOpen, setTilsynsrapportOpen] = useState(false);
  const [journalOpen, setJournalOpen] = useState(false);

  useEffect(() => {
    seedDemoIndsatsIfEmpty();
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
      router.replace('/care-portal-demo', { scroll: false });
    }
  };

  return (
    <div className="mx-auto max-w-[1600px] px-4 pb-28 pt-8 sm:px-6 lg:px-10">
      <header className="mb-8 flex flex-col gap-6 lg:mb-10 lg:flex-row lg:items-end lg:justify-between">
        <div className="max-w-xl">
          <p
            className="mb-1.5 text-[11px] font-semibold uppercase tracking-[0.14em]"
            style={{ color: 'var(--cp-muted)' }}
          >
            Care Portal · Bosted Nordlys (fiktivt)
          </p>
          <h1
            className="text-[1.75rem] font-normal leading-tight sm:text-[2rem]"
            style={{
              fontFamily: "'DM Serif Display', serif",
              color: 'var(--cp-text)',
            }}
          >
            Dagsoverblik
          </h1>
          <p className="mt-2 text-sm leading-relaxed" style={{ color: 'var(--cp-muted)' }}>
            Dagvagt · Sara K. — samme overblik som efter login, med demo-data.
          </p>
        </div>

        <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-end">
          <div
            className="inline-flex items-center gap-2 self-start rounded-full px-3 py-1.5 sm:self-auto"
            style={{
              backgroundColor: 'var(--cp-green-dim)',
              border: '1px solid rgba(45,212,160,0.22)',
            }}
          >
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{
                backgroundColor: 'var(--cp-green)',
                boxShadow: '0 0 8px var(--cp-green)',
                animation: 'pulse 2s infinite',
              }}
            />
            <span className="text-[11px] font-medium" style={{ color: 'var(--cp-green)' }}>
              Opdateret {lastUpdated}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/resident-demo"
              className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold transition-colors hover:opacity-90"
              style={{
                borderColor: 'rgba(139, 132, 232, 0.45)',
                color: '#c4bffc',
                backgroundColor: 'rgba(139, 132, 232, 0.12)',
              }}
            >
              <Sparkles size={14} aria-hidden />
              Borger-app
            </Link>
            <ToolbarButton onClick={() => setOverrapportOpen(true)}>Overrapport</ToolbarButton>
            <ToolbarButton onClick={() => setIndsatsOpen(true)} variant="danger">
              Indsatsdok.
            </ToolbarButton>
            <ToolbarButton onClick={() => setTilsynsrapportOpen(true)}>
              Tilsynsrapport
            </ToolbarButton>
            <ToolbarButton onClick={() => window.location.reload()}>
              <RefreshCw size={13} aria-hidden />
              Opdater
            </ToolbarButton>
          </div>
        </div>
      </header>

      <DemoActionCards onOpenOverrapport={() => setOverrapportPanelOpen(true)} />

      <div className="mb-6 grid grid-cols-1 gap-5 xl:grid-cols-2">
        <MedicationWidget />
        <BekymringsnotatWidget demoMode />
        <KalenderWidget />
        <OpgaveWidget />
      </div>

      <div className="mb-6">
        <StatCards variant="demo" />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.45fr)] xl:gap-8">
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
        aria-label="Åbn journaludkast med AI (demo)"
      >
        <BookOpen className="h-5 w-5 shrink-0 opacity-95" aria-hidden />
        <span className="hidden sm:inline">Journal · AI-demo</span>
        <span className="sm:hidden">Journal</span>
      </button>

      <DemoWelcomeOverlay onOpenOverrapport={() => setOverrapportPanelOpen(true)} />
      <JournalAiDemoModal open={journalOpen} onClose={closeJournal} />
      <OverrapportModal
        open={overrapportOpen}
        onClose={() => setOverrapportOpen(false)}
        preferDemoWhenNoResidents
      />
      <OverrapportPanel
        open={overrapportPanelOpen}
        onClose={() => setOverrapportPanelOpen(false)}
      />
      <IndsatsModal open={indsatsOpen} onClose={() => setIndsatsOpen(false)} />
      <TilsynsrapportModal
        open={tilsynsrapportOpen}
        onClose={() => setTilsynsrapportOpen(false)}
        preferDemoWhenNoResidents
      />
    </div>
  );
}
