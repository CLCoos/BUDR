'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import AppLogo from '@/components/ui/AppLogo';
import { RefreshCw, BookOpen } from 'lucide-react';
import AlertPanel from '../care-portal-dashboard/components/AlertPanel';
import StatCards from '../care-portal-dashboard/components/StatCards';
import MedicationWidget from '../care-portal-dashboard/components/MedicationWidget';
import BekymringsnotatWidget from '../care-portal-dashboard/components/BekymringsnotatWidget';
import KalenderWidget from '../care-portal-dashboard/components/KalenderWidget';
import OpgaveWidget from '../care-portal-dashboard/components/OpgaveWidget';
import ResidentListDemo from '../care-portal-dashboard/components/ResidentListDemo';
import OverrapportModal from '../care-portal-dashboard/components/OverrapportModal';
import IndsatsModal from '../care-portal-dashboard/components/IndsatsModal';
import TilsynsrapportModal from '../care-portal-dashboard/components/TilsynsrapportModal';
import HurtigJournalModal from '../care-portal-dashboard/components/HurtigJournalModal';

// ── Seed demo indsats records so TilsynsrapportModal has data ─────────────────
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
        beskrivelse: 'Borger forsøgte at forlade bostedet uden afklaring af destination. Fastholdelse var nødvendig af sikkerhedsmæssige årsager.',
        forudgaaende: 'Borger var urolig om aftenen og udtrykte ønske om at gå ud. Personalet forsøgte verbal de-eskalering.',
        handling: 'Kortvarig fastholdelse ved udgangsdøren. Borger beroliget og fulgt tilbage til stuen.',
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
        beskrivelse: 'Borger afslog gentagne gange at vaske sig. Sundhedsmæssig nødvendighed vurderet.',
        forudgaaende: 'Borger har i 3 dage afvist personlig hygiejne trods motivation og tilbud om hjælp.',
        handling: 'Assisteret bad med minimal magtanvendelse. Borger var verbal modstandende men fysisk samarbejdende.',
        borgerens_reaktion: 'Borger roligere efterfølgende. Udtrykte taknemmelighed ved afslutning.',
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
        beskrivelse: 'Borger viste tegn på forøget uro og selvskade-adfærd. Forhøjet observation iværksat.',
        forudgaaende: 'Borger modtog dårlige nyheder fra familie. Personale observerede isolation og selvskade-markeringer.',
        handling: 'Nærværende observation hvert 15. min. Samtale tilbudt og accepteret.',
        borgerens_reaktion: 'Borger åbnede sig gradvist. Kriseplanen gennemgået i fællesskab.',
        opfoelgning: 'Forhøjet opmærksomhed næste 48 timer. Læge kontaktes ved forværring.',
        underskrift: 'Mikkel H.',
      },
    ];
    localStorage.setItem(DEMO_INDSATS_KEY, JSON.stringify(records));
  } catch { /* ignore */ }
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function CarePortalDemoPage() {
  const [lastUpdated, setLastUpdated] = useState(() =>
    new Date().toLocaleString('da-DK', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).replace(',', ' ·'),
  );
  const [overrapportOpen, setOverrapportOpen] = useState(false);
  const [indsatsOpen, setIndsatsOpen] = useState(false);
  const [tilsynsrapportOpen, setTilsynsrapportOpen] = useState(false);
  const [journalOpen, setJournalOpen] = useState(false);

  useEffect(() => {
    seedDemoIndsatsIfEmpty();
    const t = window.setInterval(() => {
      setLastUpdated(
        new Date().toLocaleString('da-DK', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' }).replace(',', ' ·'),
      );
    }, 60_000);
    return () => window.clearInterval(t);
  }, []);

  return (
    <div className="flex h-screen flex-col overflow-hidden bg-gray-50">

      {/* ── Demo nav ─────────────────────────────────────────── */}
      <nav className="fixed top-0 left-0 right-0 z-50 flex h-12 items-center gap-3 border-b border-gray-200 bg-white px-4">
        <div className="flex shrink-0 items-center gap-2 mr-3">
          <AppLogo size={28} />
          <span className="text-sm font-bold tracking-tight text-gray-800">BUDR</span>
        </div>
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
          Demo
        </span>
        <span className="text-xs text-gray-500 hidden sm:block">Care Portal · Bosted Nordlys</span>
        <div className="ml-auto flex items-center gap-2">
          <Link href="/resident-demo" className="text-xs text-[#7F77DD] hover:underline hidden sm:block">
            Prøv borger-app →
          </Link>
          <Link href="/care-portal-login" className="text-xs font-medium px-3 py-1.5 rounded-lg bg-[#1D9E75] text-white hover:bg-[#17875f] transition-colors">
            Log ind
          </Link>
        </div>
      </nav>

      {/* ── Main content ─────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto pt-12">
        <div className="p-6 max-w-screen-2xl mx-auto">

          {/* Page header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-xl font-bold text-gray-900">Dagsoverblik</h1>
              <div className="text-sm text-gray-500 mt-0.5">Bosted Nordlys · Dagvagt · Sara K.</div>
            </div>
            <div className="flex items-center gap-3 flex-wrap justify-end">
              <div className="flex items-center gap-1.5 text-xs text-gray-400">
                <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
                Live · Opdateret {lastUpdated}
              </div>
              <button
                type="button"
                onClick={() => setOverrapportOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-600 hover:bg-gray-100 transition-colors"
              >
                Overrapport
              </button>
              <button
                type="button"
                onClick={() => setIndsatsOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 text-xs text-red-600 hover:bg-red-50 transition-colors"
              >
                Indsatsdok.
              </button>
              <button
                type="button"
                onClick={() => setTilsynsrapportOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-600 hover:bg-gray-100 transition-colors"
              >
                Tilsynsrapport
              </button>
              <button
                type="button"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-600 hover:bg-gray-100 transition-colors"
              >
                <RefreshCw size={12} />
                Opdater
              </button>
            </div>
          </div>

          {/* Widgets */}
          <MedicationWidget />
          <BekymringsnotatWidget />
          <KalenderWidget />
          <OpgaveWidget />
          <StatCards />

          {/* Two-column layout */}
          <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 mt-5">
            <div className="xl:col-span-1">
              <AlertPanel />
            </div>
            <div className="xl:col-span-2">
              <ResidentListDemo />
            </div>
          </div>

          <div className="h-20" />
        </div>
      </div>

      {/* ── FAB ──────────────────────────────────────────────── */}
      <button
        type="button"
        onClick={() => setJournalOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-[#7F77DD] px-4 py-3 text-sm font-medium text-white shadow-lg transition-all duration-200 hover:scale-105"
        aria-label="Åbn hurtignotat til journal"
      >
        <BookOpen className="h-5 w-5 shrink-0" aria-hidden />
        <span>Hurtignotat</span>
      </button>

      {/* ── Modals ───────────────────────────────────────────── */}
      <HurtigJournalModal open={journalOpen} onClose={() => setJournalOpen(false)} />
      <OverrapportModal open={overrapportOpen} onClose={() => setOverrapportOpen(false)} />
      <IndsatsModal open={indsatsOpen} onClose={() => setIndsatsOpen(false)} />
      <TilsynsrapportModal open={tilsynsrapportOpen} onClose={() => setTilsynsrapportOpen(false)} />
    </div>
  );
}
