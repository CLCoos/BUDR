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

const trafficConfig: Record<TrafficUi, { label: string; color: string; bg: string; textColor: string }> = {
  groen: { label: 'Grøn', color: '#22C55E', bg: '#F0FDF4', textColor: '#15803D' },
  gul:   { label: 'Gul',  color: '#EAB308', bg: '#FEFCE8', textColor: '#854D0E' },
  roed:  { label: 'Rød',  color: '#EF4444', bg: '#FEF2F2', textColor: '#B91C1C' },
};

const DEMO_RESIDENTS: DemoResident[] = [
  { id: 'demo-001', name: 'Finn L.',    initials: 'FL', room: '3',  trafficLight: 'roed',  moodScore: 2,  lastCheckin: '08:12', notePreview: 'Åbnede kriseplan kl. 08:12. Meget ked af det.', checkinToday: true,  pendingProposals: 2 },
  { id: 'demo-002', name: 'Kirsten R.', initials: 'KR', room: '9',  trafficLight: 'roed',  moodScore: 3,  lastCheckin: '07:50', notePreview: 'Dårlig nat, klager over mave og angst.', checkinToday: true,  pendingProposals: 1 },
  { id: 'demo-003', name: 'Thomas B.',  initials: 'TB', room: '7',  trafficLight: null,    moodScore: null, lastCheckin: 'I går 15:30', notePreview: 'Ingen check-in i dag endnu',          checkinToday: false, pendingProposals: 0 },
  { id: 'demo-004', name: 'Maja T.',    initials: 'MT', room: '11', trafficLight: 'gul',   moodScore: 4,  lastCheckin: '09:05', notePreview: 'Lidt ked af det, vil gerne snakke.',           checkinToday: true,  pendingProposals: 1 },
  { id: 'demo-005', name: 'Anders M.',  initials: 'AM', room: '5',  trafficLight: 'groen', moodScore: 8,  lastCheckin: '07:45', notePreview: 'God morgen! Sov godt og klar til dagen.',       checkinToday: true,  pendingProposals: 0 },
  { id: 'demo-006', name: 'Lena P.',    initials: 'LP', room: '4',  trafficLight: 'groen', moodScore: 6,  lastCheckin: '08:30', notePreview: 'OK dag. Glæder mig til haverne.',               checkinToday: true,  pendingProposals: 0 },
  { id: 'demo-007', name: 'Henrik S.',  initials: 'HS', room: '12', trafficLight: 'groen', moodScore: 8,  lastCheckin: '08:00', notePreview: 'Fantastisk — første gang jeg har sovet igennem!', checkinToday: true, pendingProposals: 0 },
  { id: 'demo-008', name: 'Birgit N.',  initials: 'BN', room: '6',  trafficLight: 'gul',   moodScore: 5,  lastCheckin: '08:45', notePreview: 'OK men lidt urolig. Venter på besked fra læge.', checkinToday: true, pendingProposals: 1 },
  { id: 'demo-009', name: 'Rasmus V.',  initials: 'RV', room: '8',  trafficLight: 'groen', moodScore: 7,  lastCheckin: '07:30', notePreview: 'Klar til gåtur og frokost med gruppen.',        checkinToday: true,  pendingProposals: 0 },
  { id: 'demo-010', name: 'Dorthe A.',  initials: 'DA', room: '2',  trafficLight: 'groen', moodScore: 9,  lastCheckin: '07:15', notePreview: 'Super dag! Ser frem til familiebesøg.',          checkinToday: true,  pendingProposals: 0 },
];

export default function ResidentListDemo() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'alle' | TrafficUi | 'ingen'>('alle');

  const filtered = DEMO_RESIDENTS.filter(r => {
    const matchSearch = r.name.toLowerCase().includes(search.toLowerCase()) || r.room.includes(search);
    const matchFilter =
      filter === 'alle'  ? true :
      filter === 'ingen' ? !r.trafficLight :
      r.trafficLight === filter;
    return matchSearch && matchFilter;
  });

  const checkinCount = DEMO_RESIDENTS.filter(r => r.checkinToday).length;

  return (
    <div className="bg-white rounded-lg border border-gray-100 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-gray-800">Beboere</span>
            <span className="flex items-center gap-1 text-xs text-emerald-600 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse inline-block" />
              Live
            </span>
          </div>
          <span className="text-xs text-gray-400">
            {DEMO_RESIDENTS.length} beboere · {checkinCount} check-in i dag
          </span>
        </div>
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Søg navn eller værelse..."
              className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[#1D9E75] transition-colors"
            />
          </div>
          <div className="flex gap-1">
            {(['alle', 'roed', 'gul', 'groen', 'ingen'] as const).map(f => (
              <button
                key={`filter-${f}`}
                type="button"
                onClick={() => setFilter(f)}
                className={`px-2.5 py-2 rounded-lg text-xs font-medium transition-all ${
                  filter === f ? 'bg-gray-800 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {f === 'alle' ? 'Alle' : f === 'roed' ? '🔴' : f === 'gul' ? '🟡' : f === 'groen' ? '🟢' : '—'}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left text-xs font-medium text-gray-500 px-4 py-2.5">Beboer</th>
              <th className="text-left text-xs font-medium text-gray-500 px-3 py-2.5">Værelse</th>
              <th className="text-left text-xs font-medium text-gray-500 px-3 py-2.5">Trafiklys</th>
              <th className="text-left text-xs font-medium text-gray-500 px-3 py-2.5">Stemning</th>
              <th className="text-left text-xs font-medium text-gray-500 px-3 py-2.5">Sidst set</th>
              <th className="text-left text-xs font-medium text-gray-500 px-3 py-2.5">Note</th>
              <th className="px-3 py-2.5" />
            </tr>
          </thead>
          <tbody>
            {filtered.map(r => {
              const tc = r.trafficLight ? trafficConfig[r.trafficLight] : null;
              return (
                <tr
                  key={r.id}
                  onClick={() => toast.info(`Demo: ${r.name} — klik tilgængeligt i live-portalen`)}
                  className="border-b border-gray-50 hover:bg-gray-50 transition-colors group cursor-pointer"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                        style={{ backgroundColor: tc?.color ?? '#9CA3AF' }}
                      >
                        {r.initials}
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-800">{r.name}</span>
                        {r.pendingProposals > 0 && (
                          <span className="flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full whitespace-nowrap">
                            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse inline-block" />
                            ⏳ {r.pendingProposals} forslag
                          </span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-3 text-sm text-gray-600">{r.room}</td>
                  <td className="px-3 py-3">
                    {tc ? (
                      <span
                        className="inline-flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium"
                        style={{ backgroundColor: tc.bg, color: tc.textColor }}
                      >
                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: tc.color }} />
                        {tc.label}
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400 flex items-center gap-1">
                        <Clock size={10} /> Mangler
                      </span>
                    )}
                  </td>
                  <td className="px-3 py-3">
                    {r.moodScore !== null ? (
                      <span className="text-sm font-bold tabular-nums text-gray-700">
                        {r.moodScore}
                        <span className="text-xs text-gray-400 font-normal">/10</span>
                      </span>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-xs text-gray-500">{r.lastCheckin}</td>
                  <td className="px-3 py-3 max-w-[200px]">
                    <span className="text-xs text-gray-500 truncate block">{r.notePreview}</span>
                  </td>
                  <td className="px-3 py-3">
                    <span className="opacity-0 group-hover:opacity-100 w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 group-hover:text-[#1D9E75] group-hover:border-[#1D9E75] transition-all">
                      <ChevronRight size={14} />
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div className="py-10 text-center text-sm text-gray-400">
            Ingen beboere matcher søgningen
          </div>
        )}
      </div>
    </div>
  );
}
