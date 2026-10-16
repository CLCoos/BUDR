'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { BookOpen, Sparkles } from 'lucide-react';
import AlertPanel from '@/app/care-portal-dashboard/components/AlertPanel';
import StatCards from '@/app/care-portal-dashboard/components/StatCards';
import MedicationWidget from '@/app/care-portal-dashboard/components/MedicationWidget';
import BekymringsnotatWidget from '@/app/care-portal-dashboard/components/BekymringsnotatWidget';
import KalenderWidget from '@/app/care-portal-dashboard/components/KalenderWidget';
import OnCallStaffWidget from '@/app/care-portal-dashboard/components/OnCallStaffWidget';
import OpgaveWidget from '@/app/care-portal-dashboard/components/OpgaveWidget';
import ResidentListDemo from '@/app/care-portal-dashboard/components/ResidentListDemo';
import DemoActionCards from './DemoActionCards';
import DemoAssistant from './DemoAssistant';
import DemoSidePanels from './DemoSidePanels';
import DemoWhyBox from '@/components/demo/DemoWhyBox';
import { CARE_PORTAL_DEMO_FACILITY_NAME } from '@/lib/carePortalDemoBranding';
import { useDemoGuidedTour } from '@/components/demo/DemoGuidedTourProvider';

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

function demoGreeting(now: Date): string {
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

function demoTodayLabel(now: Date): string {
  const s = new Intl.DateTimeFormat('da-DK', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    timeZone: 'Europe/Copenhagen',
  }).format(now);
  return s.charAt(0).toUpperCase() + s.slice(1);
}

function formatDemoLastUpdated(): string {
  return new Date()
    .toLocaleString('da-DK', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
    .replace(',', ' ·');
}

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
        involverede_borgere: 'Sara K.',
        involverede_personale: 'Lars N., Peter N.',
        beskrivelse:
          'Borger forsøgte at forlade bostedet uden afklaring af destination. Fastholdelse var nødvendig af sikkerhedsmæssige årsager.',
        forudgaaende:
          'Borger var urolig om aftenen og udtrykte ønske om at gå ud. Personalet forsøgte verbal de-eskalering.',
        handling:
          'Kortvarig fastholdelse ved udgangsdøren. Borger beroliget og fulgt tilbage til stuen.',
        borgerens_reaktion: 'Borger rolignet sig hurtigt og accepterede aftalen om tur næste dag.',
        opfoelgning: 'Primærperson taler med borger næste dag. Hændelsen indberettes til ledelsen.',
        underskrift: 'Lars N.',
      },
      {
        id: 'demo-indsats-2',
        created_at: d(12),
        type: '§141_personlig_hygiejne',
        paragraph: '§141',
        tidspunkt: d(12),
        varighed: '10 min',
        involverede_borgere: 'Camilla B.',
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
        involverede_personale: 'Lars N.',
        beskrivelse:
          'Borger viste tegn på forøget uro og selvskade-adfærd. Forhøjet observation iværksat.',
        forudgaaende:
          'Borger modtog dårlige nyheder fra familie. Personale observerede isolation og selvskade-markeringer.',
        handling: 'Nærværende observation hvert 15. min. Samtale tilbudt og accepteret.',
        borgerens_reaktion: 'Borger åbnede sig gradvist. Kriseplanen gennemgået i fællesskab.',
        opfoelgning: 'Forhøjet opmærksomhed næste 48 timer. Læge kontaktes ved forværring.',
        underskrift: 'Lars N.',
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
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-h-[40px] items-center gap-1.5 rounded-[10px] px-4 text-[13px] font-medium transition-colors hover:bg-[var(--cp-bg3)]"
      style={{
        border: '1px solid var(--cp-border2)',
        color: variant === 'danger' ? 'var(--cp-red)' : 'var(--cp-text)',
        backgroundColor: 'var(--cp-bg2)',
      }}
    >
      {children}
    </button>
  );
}

export default function DashboardDemoMain() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { startGuidedTour } = useDemoGuidedTour();
  const tab = searchParams.get('tab');
  const openOverrapport = searchParams.get('openOverrapport');

  const [lastUpdated, setLastUpdated] = useState(() => formatDemoLastUpdated());
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => setNow(new Date()), []);
  const [overrapportOpen, setOverrapportOpen] = useState(false);
  const [overrapportPanelOpen, setOverrapportPanelOpen] = useState(false);
  const [indsatsOpen, setIndsatsOpen] = useState(false);
  const [tilsynsrapportOpen, setTilsynsrapportOpen] = useState(false);
  const [journalOpen, setJournalOpen] = useState(false);

  useEffect(() => {
    seedDemoIndsatsIfEmpty();
  }, []);

  useEffect(() => {
    const t = window.setInterval(() => {
      setLastUpdated((prev) => {
        const next = formatDemoLastUpdated();
        return prev === next ? prev : next;
      });
    }, 60_000);
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
    if (tab !== 'journal') return;
    setJournalOpen((open) => (open ? open : true));
  }, [tab]);

  useEffect(() => {
    if (tab !== 'planner' && tab !== 'alerts') return;
    const id = tab === 'planner' ? 'budr-planlaegger' : 'budr-advarsler';
    const frame = requestAnimationFrame(() => {
      document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
    return () => cancelAnimationFrame(frame);
  }, [tab]);

  useEffect(() => {
    if (openOverrapport !== '1') return;
    setOverrapportPanelOpen((open) => (open ? open : true));
    router.replace('/care-portal-demo', { scroll: false });
  }, [openOverrapport, router]);

  const closeJournal = () => {
    setJournalOpen(false);
    if (searchParams.get('tab') === 'journal') {
      router.replace('/care-portal-demo', { scroll: false });
    }
  };

  return (
    <div
      id="demo-tour-dashboard"
      className="mx-auto max-w-[1600px] px-4 pb-28 pt-8 sm:px-6 lg:px-10"
    >
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div className="flex min-w-0 flex-col gap-1.5">
          <p className="text-[13px]" style={{ color: 'var(--cp-muted)' }}>
            {now ? `${demoTodayLabel(now)} · ` : ''}Dagvagt · {CARE_PORTAL_DEMO_FACILITY_NAME}
          </p>
          <h1
            className="m-0"
            style={{
              fontSize: 'clamp(24px, 3.2vw, 32px)',
              fontWeight: 600,
              letterSpacing: '-0.02em',
              lineHeight: 1.2,
              color: 'var(--cp-text)',
            }}
          >
            {now ? demoGreeting(now) : 'Velkommen'}, Lars.
          </h1>
          <p className="text-sm" style={{ color: 'var(--cp-muted)' }}>
            Samme overblik som efter login, med fiktive borgere.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span
            className="inline-flex h-[30px] items-center gap-2 rounded-full px-3 text-xs font-medium"
            style={{ backgroundColor: 'var(--cp-green-dim)', color: 'var(--cp-green)' }}
          >
            <span
              className="h-1.5 w-1.5 rounded-full"
              style={{ backgroundColor: 'var(--cp-green)' }}
              aria-hidden
            />
            Opdateret {lastUpdated.split('·')[1]?.trim() ?? lastUpdated}
          </span>
          <ToolbarButton onClick={startGuidedTour}>
            <Sparkles size={14} aria-hidden />
            Guidet tour
          </ToolbarButton>
          <ToolbarButton onClick={() => setOverrapportOpen(true)}>Overrapport</ToolbarButton>
          <ToolbarButton onClick={() => setIndsatsOpen(true)} variant="danger">
            Indsatsdok.
          </ToolbarButton>
          <ToolbarButton onClick={() => setTilsynsrapportOpen(true)}>Tilsynsrapport</ToolbarButton>
          <button
            type="button"
            onClick={() => setJournalOpen(true)}
            className="inline-flex min-h-[40px] items-center gap-1.5 rounded-[10px] px-4 text-[13px] font-semibold transition-opacity hover:opacity-90"
            style={{ backgroundColor: 'var(--cp-green)', color: 'var(--cp-on-green)' }}
          >
            <BookOpen size={15} aria-hidden />
            Ny journal
          </button>
        </div>
      </header>

      <div className="mb-6">
        <StatCards variant="demo" />
      </div>

      <div className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <div className="min-w-0 [&>section]:mb-0">
          <DemoAssistant />
        </div>
        <DemoSidePanels />
      </div>

      <div id="demo-tour-handlinger" className="mb-6 space-y-4">
        <DemoActionCards onOpenOverrapport={() => setOverrapportPanelOpen(true)} />
        <DemoWhyBox
          title="Hvorfor AI-udkast og godkendelse?"
          storageKey="budr_demo_why_ai_godkendelse"
        >
          Andre systemer kan lade AI skrive direkte ind i journalen. I BUDR er AI et{' '}
          <strong style={{ color: 'var(--cp-text)' }}>hjælpeværktøj</strong>: udkast og forslag —
          intet går ud til teamet som endelig journal før personalet godkender. Fagligt ansvar
          ligger hos jer, ikke i modellen.
        </DemoWhyBox>
      </div>

      <div className="mb-6 grid grid-cols-1 gap-5 xl:grid-cols-2">
        <MedicationWidget demoMode />
        <BekymringsnotatWidget demoMode />
        <KalenderWidget variant="demo" />
        <OnCallStaffWidget demoMode />
        <OpgaveWidget demoMode />
      </div>

      <div className="mb-4">
        <DemoWhyBox
          title="Hvorfor advarsler og krisehåndtering?"
          storageKey="budr_demo_why_advarsler"
        >
          Varsler samler signaler (humør, beskeder, mønstre), så vagten kan prioritere. Kriseflow
          understøtter <strong style={{ color: 'var(--cp-text)' }}>strukturerede trin</strong> og
          dokumentation — det erstatter ikke 112, lægevurdering eller jeres egne procedurer.
        </DemoWhyBox>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.45fr)] xl:gap-8">
        <AlertPanel variant="demo" />
        <div id="demo-tour-beboerliste">
          <ResidentListDemo />
        </div>
      </div>

      <section
        id="demo-tour-cta"
        className="mt-14 rounded-2xl border p-6 sm:p-8"
        style={{
          borderColor: 'color-mix(in srgb, var(--cp-green) 28%, transparent)',
          backgroundColor: 'var(--cp-green-dim)',
        }}
      >
        <h2
          className="text-lg font-normal sm:text-xl"
          style={{ fontFamily: 'var(--cp-font)', color: 'var(--cp-text)' }}
        >
          Vil du se BUDR med jeres egne data?
        </h2>
        <p className="mt-2 max-w-xl text-sm leading-relaxed" style={{ color: 'var(--cp-muted)' }}>
          Denne demo bruger fiktive beboere. I en pilot kobles Care Portal og Lys på jeres
          organisation — med uddannelse og løbende sparring.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href="/institutioner#kontakt"
            className="inline-flex items-center justify-center rounded-xl px-5 py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-95"
            style={{
              background: 'var(--cp-green)',
              boxShadow: '0 2px 14px color-mix(in srgb, var(--cp-green) 35%, transparent)',
            }}
          >
            Kontakt BUDR
          </Link>
          <Link
            href="/care-portal-demo/om-demo"
            className="inline-flex items-center justify-center rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors"
            style={{ borderColor: 'var(--cp-border)', color: 'var(--cp-text)' }}
          >
            Om demoen
          </Link>
        </div>
      </section>

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
      <IndsatsModal open={indsatsOpen} onClose={() => setIndsatsOpen(false)} useDemoData />
      <TilsynsrapportModal
        open={tilsynsrapportOpen}
        onClose={() => setTilsynsrapportOpen(false)}
        preferDemoWhenNoResidents
        facilityName={`${CARE_PORTAL_DEMO_FACILITY_NAME} (DEMO)`}
      />
    </div>
  );
}
