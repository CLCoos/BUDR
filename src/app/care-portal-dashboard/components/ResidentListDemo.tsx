'use client';
import React, { useState } from 'react';
import { Search, ChevronRight, Clock } from 'lucide-react';
import { toast } from 'sonner';

type TrafficUi = 'groen' | 'gul' | 'roed';

interface DemoResident {
  id: string;
  name: string;
  initials: string;
  room: string;
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

const DEMO_RESIDENTS: DemoResident[] = [
  {
    id: 'demo-001',
    name: 'Finn L.',
    initials: 'FL',
    room: '3',
    trafficLight: 'roed',
    moodScore: 2,
    lastCheckin: '08:12',
    notePreview: 'Åbnede kriseplan kl. 08:12. Meget ked af det.',
    checkinToday: true,
    pendingProposals: 2,
  },
  {
    id: 'demo-002',
    name: 'Kirsten R.',
    initials: 'KR',
    room: '9',
    trafficLight: 'roed',
    moodScore: 3,
    lastCheckin: '07:50',
    notePreview: 'Dårlig nat, klager over mave og angst.',
    checkinToday: true,
    pendingProposals: 1,
  },
  {
    id: 'demo-003',
    name: 'Thomas B.',
    initials: 'TB',
    room: '7',
    trafficLight: null,
    moodScore: null,
    lastCheckin: 'I går 15:30',
    notePreview: 'Ingen check-in i dag endnu',
    checkinToday: false,
    pendingProposals: 0,
  },
  {
    id: 'demo-004',
    name: 'Maja T.',
    initials: 'MT',
    room: '11',
    trafficLight: 'gul',
    moodScore: 4,
    lastCheckin: '09:05',
    notePreview: 'Lidt ked af det, vil gerne snakke.',
    checkinToday: true,
    pendingProposals: 1,
  },
  {
    id: 'demo-005',
    name: 'Anders M.',
    initials: 'AM',
    room: '5',
    trafficLight: 'groen',
    moodScore: 8,
    lastCheckin: '07:45',
    notePreview: 'God morgen! Sov godt og klar til dagen.',
    checkinToday: true,
    pendingProposals: 0,
  },
  {
    id: 'demo-006',
    name: 'Lena P.',
    initials: 'LP',
    room: '4',
    trafficLight: 'groen',
    moodScore: 6,
    lastCheckin: '08:30',
    notePreview: 'OK dag. Glæder mig til haverne.',
    checkinToday: true,
    pendingProposals: 0,
  },
  {
    id: 'demo-007',
    name: 'Henrik S.',
    initials: 'HS',
    room: '12',
    trafficLight: 'groen',
    moodScore: 8,
    lastCheckin: '08:00',
    notePreview: 'Fantastisk — første gang jeg har sovet igennem!',
    checkinToday: true,
    pendingProposals: 0,
  },
  {
    id: 'demo-008',
    name: 'Birgit N.',
    initials: 'BN',
    room: '6',
    trafficLight: 'gul',
    moodScore: 5,
    lastCheckin: '08:45',
    notePreview: 'OK men lidt urolig. Venter på besked fra læge.',
    checkinToday: true,
    pendingProposals: 1,
  },
  {
    id: 'demo-009',
    name: 'Rasmus V.',
    initials: 'RV',
    room: '8',
    trafficLight: 'groen',
    moodScore: 7,
    lastCheckin: '07:30',
    notePreview: 'Klar til gåtur og frokost med gruppen.',
    checkinToday: true,
    pendingProposals: 0,
  },
  {
    id: 'demo-010',
    name: 'Dorthe A.',
    initials: 'DA',
    room: '2',
    trafficLight: 'groen',
    moodScore: 9,
    lastCheckin: '07:15',
    notePreview: 'Super dag! Ser frem til familiebesøg.',
    checkinToday: true,
    pendingProposals: 0,
  },
];

export default function ResidentListDemo() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'alle' | TrafficUi | 'ingen'>('alle');

  const filtered = DEMO_RESIDENTS.filter((r) => {
    const matchSearch =
      r.name.toLowerCase().includes(search.toLowerCase()) || r.room.includes(search);
    const matchFilter =
      filter === 'alle' ? true : filter === 'ingen' ? !r.trafficLight : r.trafficLight === filter;
    return matchSearch && matchFilter;
  });

  const checkinCount = DEMO_RESIDENTS.filter((r) => r.checkinToday).length;

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
            {DEMO_RESIDENTS.length} beboere · {checkinCount} check-in i dag
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
              placeholder="Søg navn eller værelse..."
              className="w-full rounded-[10px] py-2 pl-8 pr-3 text-sm outline-none transition-colors"
              style={{
                backgroundColor: 'var(--cp-bg3)',
                border: '1px solid var(--cp-border)',
                color: 'var(--cp-text)',
              }}
            />
          </div>
          <div className="flex shrink-0 flex-wrap gap-1">
            {(['alle', 'roed', 'gul', 'groen', 'ingen'] as const).map((f) => {
              const active = filter === f;
              return (
                <button
                  key={`filter-${f}`}
                  type="button"
                  onClick={() => setFilter(f)}
                  className="rounded-[10px] px-2.5 py-2 text-xs font-medium transition-all"
                  style={
                    active
                      ? {
                          backgroundColor: 'var(--cp-green-dim)',
                          color: 'var(--cp-green)',
                          border: '1px solid rgba(45,212,160,0.35)',
                        }
                      : {
                          backgroundColor: 'var(--cp-bg3)',
                          color: 'var(--cp-muted)',
                          border: '1px solid var(--cp-border)',
                        }
                  }
                >
                  {f === 'alle'
                    ? 'Alle'
                    : f === 'roed'
                      ? '🔴'
                      : f === 'gul'
                        ? '🟡'
                        : f === 'groen'
                          ? '🟢'
                          : '—'}
                </button>
              );
            })}
          </div>
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
              <th className="px-3 py-2.5" style={{ borderBottom: '1px solid var(--cp-border)' }} />
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => {
              const tc = r.trafficLight ? trafficConfig[r.trafficLight] : null;
              return (
                <tr
                  key={r.id}
                  onClick={() => toast.info(`Demo: ${r.name} — klik tilgængeligt i live-portalen`)}
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
                        style={{
                          backgroundColor: tc?.color ?? 'var(--cp-muted2)',
                          boxShadow: tc ? '0 0 0 2px var(--cp-bg2)' : undefined,
                        }}
                      >
                        {r.initials}
                      </div>
                      <div className="flex min-w-0 flex-wrap items-center gap-2">
                        <span className="text-sm font-medium" style={{ color: 'var(--cp-text)' }}>
                          {r.name}
                        </span>
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
                  <td className="px-3 py-3">
                    <span
                      className="flex h-7 w-7 items-center justify-center rounded-lg opacity-0 transition-all group-hover:opacity-100"
                      style={{
                        border: '1px solid var(--cp-border)',
                        color: 'var(--cp-muted)',
                      }}
                    >
                      <ChevronRight size={14} />
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="py-12 text-center text-sm" style={{ color: 'var(--cp-muted)' }}>
            Ingen beboere matcher søgningen
          </div>
        )}
      </div>
    </div>
  );
}
