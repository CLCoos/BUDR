'use client';
import React, { useMemo, useState } from 'react';
import { Search, ChevronRight, Clock, Plus } from 'lucide-react';
import { toast } from 'sonner';
import { CARE_DEMO_RESIDENT_PROFILES, type CareHouse } from '@/lib/careDemoResidents';
import { useCarePortalDepartment } from '@/contexts/CarePortalDepartmentContext';
import {
  TrafficLightFilter,
  type TrafficFilterValue,
} from '@/components/patterns/TrafficLightFilter';

type TrafficUi = 'groen' | 'gul' | 'roed';

interface DemoResident {
  id: string;
  name: string;
  initials: string;
  room: string;
  house: CareHouse;
  trafficLight: TrafficUi | null;
  moodScore: number | null;
  lastCheckin: string;
  notePreview: string;
  checkinToday: boolean;
  pendingProposals: number;
}

const trafficConfig: Record<
  TrafficUi,
  { label: string; color: string; bg: string; textColor: string }
> = {
  groen: {
    label: 'Grøn',
    color: 'var(--cp-green)',
    bg: 'var(--cp-green-dim)',
    textColor: 'var(--cp-green)',
  },
  gul: {
    label: 'Gul',
    color: 'var(--cp-amber)',
    bg: 'var(--cp-amber-dim)',
    textColor: 'var(--cp-amber)',
  },
  roed: {
    label: 'Rød',
    color: 'var(--cp-red)',
    bg: 'var(--cp-red-dim)',
    textColor: 'var(--cp-red)',
  },
};

/** Stemning og trafiklys pr. beboer (fiktiv demo). */
const ROWS: Record<
  string,
  Pick<
    DemoResident,
    | 'trafficLight'
    | 'moodScore'
    | 'lastCheckin'
    | 'notePreview'
    | 'checkinToday'
    | 'pendingProposals'
  >
> = {
  'res-001': {
    trafficLight: 'groen',
    moodScore: 8,
    lastCheckin: '07:45',
    notePreview: 'God morgen! Sov godt og klar til dagen.',
    checkinToday: true,
    pendingProposals: 0,
  },
  'res-002': {
    trafficLight: 'roed',
    moodScore: 2,
    lastCheckin: '08:12',
    notePreview: 'Åbnede kriseplan kl. 08:12. Meget ked af det.',
    checkinToday: true,
    pendingProposals: 2,
  },
  'res-003': {
    trafficLight: 'roed',
    moodScore: 3,
    lastCheckin: '07:50',
    notePreview: 'Dårlig nat, klager over mave og angst.',
    checkinToday: true,
    pendingProposals: 1,
  },
  'res-004': {
    trafficLight: 'gul',
    moodScore: 4,
    lastCheckin: '09:05',
    notePreview: 'Lidt ked af det, vil gerne snakke.',
    checkinToday: true,
    pendingProposals: 1,
  },
  'res-005': {
    trafficLight: null,
    moodScore: null,
    lastCheckin: 'I går 15:30',
    notePreview: 'Ingen check-in i dag endnu',
    checkinToday: false,
    pendingProposals: 0,
  },
  'res-006': {
    trafficLight: 'groen',
    moodScore: 6,
    lastCheckin: '08:30',
    notePreview: 'OK dag. Glæder mig til haverne.',
    checkinToday: true,
    pendingProposals: 0,
  },
  'res-007': {
    trafficLight: 'groen',
    moodScore: 8,
    lastCheckin: '08:00',
    notePreview: 'Fantastisk — første gang jeg har sovet igennem!',
    checkinToday: true,
    pendingProposals: 0,
  },
  'res-008': {
    trafficLight: 'gul',
    moodScore: 5,
    lastCheckin: '08:45',
    notePreview: 'OK men lidt urolig. Venter på besked fra læge.',
    checkinToday: true,
    pendingProposals: 1,
  },
  'res-009': {
    trafficLight: 'groen',
    moodScore: 7,
    lastCheckin: '07:30',
    notePreview: 'Klar til gåtur og frokost med gruppen.',
    checkinToday: true,
    pendingProposals: 0,
  },
  'res-010': {
    trafficLight: 'groen',
    moodScore: 9,
    lastCheckin: '07:15',
    notePreview: 'Super dag! Ser frem til familiebesøg.',
    checkinToday: true,
    pendingProposals: 0,
  },
  'res-011': {
    trafficLight: 'groen',
    moodScore: 7,
    lastCheckin: '08:20',
    notePreview: 'Rolig morgen, vil gerne male i eftermiddag.',
    checkinToday: true,
    pendingProposals: 0,
  },
  'res-012': {
    trafficLight: 'gul',
    moodScore: 5,
    lastCheckin: '09:10',
    notePreview: 'Lidt træt efter nattevagt-støj. Vil have ro.',
    checkinToday: true,
    pendingProposals: 0,
  },
};

const DEMO_RESIDENTS: DemoResident[] = CARE_DEMO_RESIDENT_PROFILES.map((p) => {
  const row = ROWS[p.id] ?? {
    trafficLight: null as TrafficUi | null,
    moodScore: null,
    lastCheckin: '—',
    notePreview: '—',
    checkinToday: false,
    pendingProposals: 0,
  };
  return {
    id: p.id,
    name: p.displayName,
    initials: p.initials,
    room: p.room,
    house: p.house,
    ...row,
  };
});

type ResidentListDemoProps = {
  onNewJournal?: (residentId: string) => void;
};

export default function ResidentListDemo({ onNewJournal }: ResidentListDemoProps) {
  const { department: houseFilter } = useCarePortalDepartment();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<TrafficFilterValue>('all');

  const residentsInDept = useMemo(() => {
    if (houseFilter === 'alle') return DEMO_RESIDENTS;
    return DEMO_RESIDENTS.filter((r) => r.house === houseFilter);
  }, [houseFilter]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return residentsInDept.filter((r) => {
      const matchSearch =
        !q ||
        r.name.toLowerCase().includes(q) ||
        r.initials.toLowerCase().includes(q) ||
        r.room.toLowerCase().includes(q) ||
        r.house.toLowerCase().includes(q);
      const matchFilter =
        filter === 'all'
          ? true
          : filter === 'none'
            ? !r.trafficLight
            : (filter === 'red' ? 'roed' : filter === 'yellow' ? 'gul' : 'groen') ===
              r.trafficLight;
      return matchSearch && matchFilter;
    });
  }, [search, filter, residentsInDept]);

  const checkinCount = residentsInDept.filter((r) => r.checkinToday).length;
  const trafficCounts = useMemo(
    () => ({
      all: residentsInDept.length,
      red: residentsInDept.filter((r) => r.trafficLight === 'roed').length,
      yellow: residentsInDept.filter((r) => r.trafficLight === 'gul').length,
      green: residentsInDept.filter((r) => r.trafficLight === 'groen').length,
      none: residentsInDept.filter((r) => !r.trafficLight).length,
    }),
    [residentsInDept]
  );

  return (
    <div className="cp-card-elevated overflow-hidden">
      <div className="border-b px-4 py-3.5" style={{ borderColor: 'var(--cp-border)' }}>
        <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <h2
              className="text-sm font-semibold tracking-tight"
              style={{ color: 'var(--cp-text)', fontFamily: "'DM Sans', sans-serif" }}
            >
              Beboere
            </h2>
            <span
              className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium"
              style={{
                backgroundColor: 'var(--cp-green-dim)',
                color: 'var(--cp-green)',
                border: '1px solid rgba(45,212,160,0.2)',
              }}
            >
              <span
                className="inline-block h-1.5 w-1.5 animate-pulse rounded-full"
                style={{ backgroundColor: 'var(--cp-green)', boxShadow: '0 0 6px var(--cp-green)' }}
              />
              Demo
            </span>
          </div>
          <span className="text-xs tabular-nums" style={{ color: 'var(--cp-muted)' }}>
            {residentsInDept.length} beboere · {checkinCount} check-in i dag
          </span>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:gap-2">
          <div className="relative min-w-0 flex-1">
            <Search
              size={14}
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: 'var(--cp-muted2)' }}
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Søg initialer, navn (internt), værelse eller hus…"
              className="w-full rounded-[10px] py-2 pl-8 pr-3 text-sm outline-none transition-colors"
              style={{
                backgroundColor: 'var(--cp-bg3)',
                border: '1px solid var(--cp-border)',
                color: 'var(--cp-text)',
              }}
            />
          </div>
          <TrafficLightFilter
            value={filter}
            onChange={setFilter}
            size="sm"
            showLabels={false}
            counts={trafficCounts}
          />
        </div>
      </div>

      <div className="cp-scroll max-h-[min(520px,55vh)] overflow-x-auto overflow-y-auto">
        <table className="w-full min-w-[720px]">
          <thead>
            <tr className="sticky top-0 z-[1]" style={{ backgroundColor: 'var(--cp-bg2)' }}>
              <th
                className="px-4 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide"
                style={{ color: 'var(--cp-muted)', borderBottom: '1px solid var(--cp-border)' }}
              >
                Beboer
              </th>
              <th
                className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide"
                style={{ color: 'var(--cp-muted)', borderBottom: '1px solid var(--cp-border)' }}
              >
                Hus
              </th>
              <th
                className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide"
                style={{ color: 'var(--cp-muted)', borderBottom: '1px solid var(--cp-border)' }}
              >
                Vær.
              </th>
              <th
                className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide"
                style={{ color: 'var(--cp-muted)', borderBottom: '1px solid var(--cp-border)' }}
              >
                Trafiklys
              </th>
              <th
                className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide"
                style={{ color: 'var(--cp-muted)', borderBottom: '1px solid var(--cp-border)' }}
              >
                Stemning
              </th>
              <th
                className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide"
                style={{ color: 'var(--cp-muted)', borderBottom: '1px solid var(--cp-border)' }}
              >
                Sidst set
              </th>
              <th
                className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide"
                style={{ color: 'var(--cp-muted)', borderBottom: '1px solid var(--cp-border)' }}
              >
                Note
              </th>
              <th
                className="px-3 py-2.5 text-left text-[11px] font-semibold uppercase tracking-wide"
                style={{ color: 'var(--cp-muted)', borderBottom: '1px solid var(--cp-border)' }}
              >
                {onNewJournal ? '\u00A0' : ''}
              </th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => {
              const tc = r.trafficLight ? trafficConfig[r.trafficLight] : null;
              return (
                <tr
                  key={r.id}
                  onClick={() =>
                    toast.info(`Demo: ${r.initials} — fuld profil i live-portalen efter login`)
                  }
                  className="group cursor-pointer transition-colors"
                  style={{ borderBottom: '1px solid var(--cp-border)' }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLTableRowElement).style.backgroundColor =
                      'var(--cp-bg3)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLTableRowElement).style.backgroundColor = '';
                  }}
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold text-white"
                        title={r.name}
                        style={{
                          backgroundColor: tc?.color ?? 'var(--cp-muted2)',
                          boxShadow: tc ? '0 0 0 2px var(--cp-bg2)' : undefined,
                        }}
                      >
                        {r.initials}
                      </div>
                      <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <abbr
                          title={r.name}
                          className="text-sm font-semibold tracking-wide"
                          style={{
                            color: 'var(--cp-text)',
                            cursor: 'help',
                            textDecoration: 'none',
                            borderBottom: '1px dotted rgba(148,163,184,0.5)',
                          }}
                        >
                          {r.initials}
                        </abbr>
                        {r.pendingProposals > 0 && (
                          <span
                            className="inline-flex items-center gap-1 whitespace-nowrap rounded-full px-1.5 py-0.5 text-[11px] font-medium"
                            style={{
                              backgroundColor: 'var(--cp-amber-dim)',
                              color: 'var(--cp-amber)',
                              border: '1px solid rgba(246,173,85,0.25)',
                            }}
                          >
                            <span
                              className="inline-block h-1.5 w-1.5 animate-pulse rounded-full"
                              style={{ backgroundColor: 'var(--cp-amber)' }}
                            />
                            {r.pendingProposals} forslag
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td
                    className="px-3 py-3 text-xs font-medium tabular-nums"
                    style={{ color: 'var(--cp-muted)' }}
                  >
                    {r.house}
                  </td>
                  <td
                    className="px-3 py-3 text-sm tabular-nums"
                    style={{ color: 'var(--cp-muted)' }}
                  >
                    {r.room}
                  </td>
                  <td className="px-3 py-3">
                    {tc ? (
                      <span
                        className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium"
                        style={{ backgroundColor: tc.bg, color: tc.textColor }}
                      >
                        <span
                          className="h-1.5 w-1.5 rounded-full"
                          style={{ backgroundColor: tc.color }}
                        />
                        {tc.label}
                      </span>
                    ) : (
                      <span
                        className="flex items-center gap-1 text-xs"
                        style={{ color: 'var(--cp-muted2)' }}
                      >
                        <Clock size={10} /> Mangler
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    {r.moodScore !== null ? (
                      <span
                        className="text-sm font-bold tabular-nums"
                        style={{ color: 'var(--cp-text)' }}
                      >
                        {r.moodScore}
                        <span className="text-xs font-normal" style={{ color: 'var(--cp-muted)' }}>
                          /10
                        </span>
                      </span>
                    ) : (
                      <span className="text-xs" style={{ color: 'var(--cp-muted2)' }}>
                        —
                      </span>
                    )}
                  </td>
                  <td
                    className="px-3 py-3 text-xs tabular-nums"
                    style={{ color: 'var(--cp-muted)' }}
                  >
                    {r.lastCheckin}
                  </td>
                  <td className="max-w-[220px] px-3 py-3">
                    <span className="block truncate text-xs" style={{ color: 'var(--cp-muted)' }}>
                      {r.notePreview}
                    </span>
                  </td>
                  <td className="px-3 py-3" onClick={(e) => e.stopPropagation()}>
                    {onNewJournal ? (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onNewJournal(r.id);
                        }}
                        className="flex h-8 w-8 items-center justify-center rounded-lg border opacity-0 transition-opacity duration-150 group-hover:opacity-100 [@media(hover:none)]:opacity-100"
                        style={{
                          borderColor: 'var(--cp-border2)',
                          color: 'var(--cp-green)',
                          backgroundColor: 'var(--cp-bg3)',
                        }}
                        aria-label={`Ny journal for ${r.name}`}
                      >
                        <Plus className="h-4 w-4" strokeWidth={2.5} aria-hidden />
                      </button>
                    ) : (
                      <span
                        className="flex h-7 w-7 items-center justify-center rounded-lg opacity-0 transition-all group-hover:opacity-100"
                        style={{
                          border: '1px solid var(--cp-border)',
                          color: 'var(--cp-muted)',
                        }}
                      >
                        <ChevronRight size={14} />
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="py-12 text-center text-sm" style={{ color: 'var(--cp-muted)' }}>
            Ingen beboere matcher filtrene
          </div>
        )}
      </div>
    </div>
  );
}
