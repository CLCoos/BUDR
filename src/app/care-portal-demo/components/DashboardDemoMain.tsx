'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { BookOpen, ChevronDown, MoreHorizontal } from 'lucide-react';
import AlertPanel from '@/app/care-portal-dashboard/components/AlertPanel';
import StatCards from '@/app/care-portal-dashboard/components/StatCards';
import MedicationWidget from '@/app/care-portal-dashboard/components/MedicationWidget';
import BekymringsnotatWidget from '@/app/care-portal-dashboard/components/BekymringsnotatWidget';
import KalenderWidget from '@/app/care-portal-dashboard/components/KalenderWidget';
import OnCallStaffWidget from '@/app/care-portal-dashboard/components/OnCallStaffWidget';
import OpgaveWidget from '@/app/care-portal-dashboard/components/OpgaveWidget';
import ResidentListDemo from '@/app/care-portal-dashboard/components/ResidentListDemo';
import DemoAssistant from './DemoAssistant';
import DemoSidePanels from './DemoSidePanels';
import { DemoNextTask, DemoRoleSwitch, DemoShiftChecklist } from './DemoShiftPlan';
import { demoRole, readDemoRole, saveDemoRole, type DemoRole } from './demoRoles';
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

function NewJournalButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="hidden min-h-[44px] items-center gap-2 whitespace-nowrap rounded-xl px-5 text-sm font-semibold transition-opacity hover:opacity-90 sm:inline-flex"
      style={{ backgroundColor: 'var(--cp-green)', color: 'var(--cp-on-green)' }}
    >
      <BookOpen size={16} aria-hidden />
      Ny journal
    </button>
  );
}

function DemoMoreMenu({ items }: { items: { label: string; onSelect: () => void }[] }) {
  const [open, setOpen] = useState(false);
  const ref = React.useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent) => {
      if (!ref.current?.contains(e.target as Node)) setOpen(false);
    };
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', esc);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', esc);
    };
  }, [open]);
  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex min-h-[44px] items-center gap-2 whitespace-nowrap rounded-xl border px-4 text-sm font-medium transition-colors hover:bg-[var(--cp-bg3)]"
        style={{
          borderColor: 'var(--cp-border2)',
          backgroundColor: 'var(--cp-bg2)',
          color: 'var(--cp-text)',
        }}
      >
        <MoreHorizontal size={16} aria-hidden />
        Rapporter
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+6px)] z-50 w-[240px] overflow-hidden rounded-xl border py-1 shadow-xl max-sm:left-0 max-sm:right-auto"
          style={{ borderColor: 'var(--cp-border)', backgroundColor: 'var(--cp-bg2)' }}
        >
          {items.map((it) => (
            <button
              key={it.label}
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                it.onSelect();
              }}
              className="flex min-h-[44px] w-full items-center px-4 text-left text-sm transition-colors hover:bg-[var(--cp-bg3)]"
              style={{ color: 'var(--cp-text)' }}
            >
              {it.label}
            </button>
          ))}
        </div>
      )}
    </div>
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
  const [role, setRole] = useState<DemoRole>('medarbejder');
  useEffect(() => setRole(readDemoRole()), []);
  const profile = demoRole(role);
  const changeRole = (r: DemoRole) => {
    setRole(r);
    saveDemoRole(r);
  };
  const [moreOpen, setMoreOpen] = useState(false);

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
    if (tab !== 'planner' && tab !== 'alerts' && tab !== 'medicin') return;
    setMoreOpen(true);
    const id =
      tab === 'planner'
        ? 'budr-planlaegger'
        : tab === 'medicin'
          ? 'demo-medicin'
          : 'budr-advarsler';
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
      className="mx-auto max-w-[1320px] px-4 pb-28 pt-6 sm:px-6 sm:pt-8 lg:px-8"
    >
      <header className="mb-5 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex min-w-0 flex-col gap-1">
          <p className="text-[13px]" style={{ color: 'var(--cp-muted)' }}>
            {now ? `${demoTodayLabel(now)} · ` : ''}
            {CARE_PORTAL_DEMO_FACILITY_NAME}
            <span className="hidden sm:inline">
              {' '}
              · Opdateret {lastUpdated.split('·')[1]?.trim() ?? lastUpdated}
            </span>
          </p>
          <h1
            className="m-0"
            style={{
              fontSize: 'clamp(26px, 3.2vw, 34px)',
              fontWeight: 600,
              letterSpacing: '-0.02em',
              lineHeight: 1.15,
              color: 'var(--cp-text)',
            }}
          >
            {now ? demoGreeting(now) : 'Velkommen'}, {profile.person}.
          </h1>
          <p className="max-w-[56ch] text-[15px]" style={{ color: 'var(--cp-muted)' }}>
            {profile.intro}
          </p>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <DemoRoleSwitch role={role} onChange={changeRole} />
          <div className="flex items-center gap-2">
            {role !== 'vikar' && (
              <DemoMoreMenu
                items={[
                  { label: 'Overrapport', onSelect: () => setOverrapportOpen(true) },
                  { label: 'Indsatsdokumentation', onSelect: () => setIndsatsOpen(true) },
                  { label: 'Tilsynsrapport', onSelect: () => setTilsynsrapportOpen(true) },
                  { label: 'Guidet tour (5 min)', onSelect: startGuidedTour },
                ]}
              />
            )}
            <NewJournalButton onClick={() => setJournalOpen(true)} />
          </div>
        </div>
      </header>

      <div className="mb-6 flex flex-col gap-6">
        <DemoNextTask profile={profile} />

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
          <DemoShiftChecklist profile={profile} />
          <div className="min-w-0 [&>section]:mb-0">
            <DemoAssistant role={role} />
          </div>
        </div>
      </div>

      {role !== 'vikar' && (
        <>
          <h2
            className="mb-3 mt-10 text-[13px] font-semibold uppercase tracking-[0.08em]"
            style={{ color: 'var(--cp-muted)' }}
          >
            Bostedet lige nu
          </h2>
          <div className="mb-6">
            <StatCards variant="demo" />
          </div>
          <div className="mb-6">
            <DemoSidePanels />
          </div>
        </>
      )}

      <details
        className="group mb-6 rounded-2xl border"
        style={{ borderColor: 'var(--cp-border)', backgroundColor: 'var(--cp-card-bg)' }}
        open={moreOpen}
        onToggle={(e) => setMoreOpen((e.currentTarget as HTMLDetailsElement).open)}
      >
        <summary
          className="flex min-h-[56px] cursor-pointer list-none items-center justify-between gap-3 px-5 text-[15px] font-semibold [&::-webkit-details-marker]:hidden"
          style={{ color: 'var(--cp-text)' }}
        >
          <span>
            Alt overblik
            <span className="ml-2 text-xs font-normal" style={{ color: 'var(--cp-muted)' }}>
              Medicin, kalender, opgaver, advarsler og beboere
            </span>
          </span>
          <ChevronDown
            size={18}
            className="shrink-0 transition-transform group-open:rotate-180"
            style={{ color: 'var(--cp-muted)' }}
            aria-hidden
          />
        </summary>
        <div className="border-t p-4 sm:p-5" style={{ borderColor: 'var(--cp-border)' }}>
          <div className="mb-6 grid grid-cols-1 gap-5 xl:grid-cols-2">
            <div id="demo-medicin" className="min-w-0">
              <MedicationWidget demoMode />
            </div>
            <BekymringsnotatWidget demoMode />
            <KalenderWidget variant="demo" />
            <OnCallStaffWidget demoMode />
            <OpgaveWidget demoMode />
          </div>
          <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1.45fr)] xl:gap-8">
            <AlertPanel variant="demo" />
            <div id="demo-tour-beboerliste">
              <ResidentListDemo />
            </div>
          </div>
        </div>
      </details>

      <div className="mb-4 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <DemoWhyBox
          title="Hvorfor AI-udkast og godkendelse?"
          storageKey="budr_demo_why_ai_godkendelse"
        >
          Andre systemer kan lade AI skrive direkte ind i journalen. I BUDR er AI et{' '}
          <strong style={{ color: 'var(--cp-text)' }}>hjælpeværktøj</strong>: udkast og forslag.
          Intet går ud til teamet som endelig journal, før personalet godkender. Fagligt ansvar
          ligger hos jer, ikke i modellen.
        </DemoWhyBox>
        <DemoWhyBox
          title="Hvorfor advarsler og krisehåndtering?"
          storageKey="budr_demo_why_advarsler"
        >
          Varsler samler signaler (humør, beskeder, mønstre), så vagten kan prioritere. Kriseflow
          understøtter <strong style={{ color: 'var(--cp-text)' }}>strukturerede trin</strong> og
          dokumentation. Det erstatter ikke 112, lægevurdering eller jeres egne procedurer.
        </DemoWhyBox>
      </div>

      {/* Mobil: én stor knap til journal, altid inden for rækkevidde */}
      <div
        className="fixed inset-x-0 bottom-[64px] z-[10040] flex justify-end px-4 pb-3 sm:hidden"
        style={{ pointerEvents: 'none' }}
      >
        <button
          type="button"
          onClick={() => setJournalOpen(true)}
          className="inline-flex min-h-[52px] items-center gap-2 rounded-full px-5 text-[15px] font-semibold shadow-lg"
          style={{
            backgroundColor: 'var(--cp-green)',
            color: 'var(--cp-on-green)',
            pointerEvents: 'auto',
            boxShadow: '0 8px 24px color-mix(in srgb, var(--cp-ink) 25%, transparent)',
          }}
        >
          <BookOpen size={18} aria-hidden />
          Ny journal
        </button>
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
