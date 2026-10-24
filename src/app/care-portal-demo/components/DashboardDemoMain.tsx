'use client';

import React, { useEffect, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import { ChevronDown, Mic, MoreHorizontal } from 'lucide-react';
import { useDemoFortael } from '@/components/demo/DemoFortael';
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
import {
  DemoGaaHjem,
  DemoMoedInd,
  DemoMomentSwitch,
  DemoNextTask,
  DemoRoleSwitch,
  DemoShiftChecklist,
  type ShiftMoment,
} from './DemoShiftPlan';
import { demoRole, readDemoRole, saveDemoRole, type DemoRole } from './demoRoles';
import DemoWhyBox from '@/components/demo/DemoWhyBox';
import { CARE_PORTAL_DEMO_FACILITY_NAME } from '@/lib/carePortalDemoBranding';
import { loadDemoIndsatsRecords } from '@/lib/indsatsRecords';
import { useDemoGuidedTour } from '@/components/demo/DemoGuidedTourProvider';

const OverrapportModal = dynamic(
  () => import('@/app/care-portal-dashboard/components/OverrapportModal'),
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

function FortaelButton() {
  const { openFortael } = useDemoFortael();
  return (
    <button
      type="button"
      onClick={openFortael}
      className="hidden min-h-[44px] items-center gap-2 whitespace-nowrap rounded-xl px-5 text-sm font-semibold transition-opacity hover:opacity-90 sm:inline-flex"
      style={{ backgroundColor: 'var(--cp-green)', color: 'var(--cp-on-green)' }}
    >
      <Mic size={16} aria-hidden />
      Fortæl
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
  const [moment, setMoment] = useState<ShiftMoment>('nu');
  const { openFortael } = useDemoFortael();

  useEffect(() => {
    loadDemoIndsatsRecords();
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
    // Demoen viser altid demoens borgere, aldrig den indloggede brugers egne.
    setOverrapportOpen(true);
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
          <div className="flex flex-wrap items-center justify-between gap-x-3.5 gap-y-2 sm:justify-start">
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
            <DemoRoleSwitch role={role} onChange={changeRole} />
          </div>
          <p className="max-w-[56ch] text-[15px]" style={{ color: 'var(--cp-muted)' }}>
            {profile.intro}
          </p>
        </div>

        <div className="hidden flex-col gap-3 sm:flex sm:flex-row sm:items-end">
          <div className="flex items-center gap-2">
            {role !== 'vikar' && (
              <div className="hidden sm:block">
                <DemoMoreMenu
                  items={[
                    { label: 'Overrapport', onSelect: () => setOverrapportOpen(true) },
                    { label: 'Indsatsdokumentation', onSelect: () => setIndsatsOpen(true) },
                    { label: 'Tilsynsrapport', onSelect: () => setTilsynsrapportOpen(true) },
                    { label: 'Guidet tour (5 min)', onSelect: startGuidedTour },
                  ]}
                />
              </div>
            )}
            <FortaelButton />
          </div>
        </div>
      </header>

      <div className="mb-6 flex flex-col gap-6">
        <DemoMomentSwitch moment={moment} onChange={setMoment} />

        {moment === 'moed' && <DemoMoedInd onReady={() => setMoment('nu')} />}

        {moment === 'nu' && (
          <>
            <DemoNextTask profile={profile} />
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.25fr)]">
              <DemoShiftChecklist profile={profile} />
              <div className="min-w-0 [&>section]:mb-0">
                <DemoAssistant role={role} />
              </div>
            </div>
          </>
        )}

        {moment === 'hjem' && <DemoGaaHjem person={profile.person} onFortael={openFortael} />}

        <DemoWhyBox
          title="Hvorfor godkender man alt, AI skriver?"
          storageKey="budr_demo_why_ai_godkendelse"
          className="-mt-2"
        >
          <p className="m-0">
            Andre systemer kan lade AI skrive direkte ind i journalen. I BUDR er AI et{' '}
            <strong style={{ color: 'var(--cp-text)' }}>hjælpeværktøj</strong>: udkast og forslag.
            Intet går ud til teamet som endelig journal, før personalet godkender. Fagligt ansvar
            ligger hos jer, ikke i modellen.
          </p>
          <p className="m-0 mt-3">
            Varsler samler signaler (humør, beskeder, mønstre), så vagten kan prioritere. Kriseflow
            understøtter <strong style={{ color: 'var(--cp-text)' }}>strukturerede trin</strong> og
            dokumentation. Det erstatter ikke 112, lægevurdering eller jeres egne procedurer.
          </p>
        </DemoWhyBox>
      </div>

      {role === 'leder' && (
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
      <OverrapportModal open={overrapportOpen} onClose={() => setOverrapportOpen(false)} demoOnly />
      <IndsatsModal open={indsatsOpen} onClose={() => setIndsatsOpen(false)} useDemoData />
      <TilsynsrapportModal
        open={tilsynsrapportOpen}
        onClose={() => setTilsynsrapportOpen(false)}
        demoOnly
        facilityName={`${CARE_PORTAL_DEMO_FACILITY_NAME} (DEMO)`}
      />
    </div>
  );
}
