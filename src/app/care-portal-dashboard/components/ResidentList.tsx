'use client';
import React, { useState } from 'react';
import Link from 'next/link';
import { Search, ChevronRight, Clock } from 'lucide-react';

interface Resident {
  id: string;
  name: string;
  initials: string;
  room: string;
  trafficLight: 'groen' | 'gul' | 'roed' | null;
  moodScore: number | null;
  lastCheckin: string;
  notePreview: string;
  checkinToday: boolean;
}

const residents: Resident[] = [
  { id: 'res-001', name: 'Anders M.', initials: 'AM', room: '104', trafficLight: 'groen', moodScore: 7, lastCheckin: '08:30', notePreview: 'Sov godt, god morgen. Spiste morgenmad.', checkinToday: true },
  { id: 'res-002', name: 'Finn L.', initials: 'FL', room: '108', trafficLight: 'roed', moodScore: 2, lastCheckin: '08:12', notePreview: 'Aktiverede kriseplan. Behøver opfølgning.', checkinToday: true },
  { id: 'res-003', name: 'Kirsten R.', initials: 'KR', room: '102', trafficLight: 'roed', moodScore: 2, lastCheckin: '07:55', notePreview: 'Meget urolig nat. Sov ikke.', checkinToday: true },
  { id: 'res-004', name: 'Maja T.', initials: 'MT', room: '106', trafficLight: 'gul', moodScore: 4, lastCheckin: '07:30', notePreview: 'Let angst. Vil gerne tale med personale.', checkinToday: true },
  { id: 'res-005', name: 'Thomas B.', initials: 'TB', room: '110', trafficLight: null, moodScore: null, lastCheckin: 'I går 14:20', notePreview: 'Ingen check-in i dag endnu.', checkinToday: false },
  { id: 'res-006', name: 'Lena P.', initials: 'LP', room: '103', trafficLight: 'groen', moodScore: 8, lastCheckin: '09:10', notePreview: 'God dag. Deltager i morgenaktivitet.', checkinToday: true },
  { id: 'res-007', name: 'Henrik S.', initials: 'HS', room: '107', trafficLight: 'groen', moodScore: 6, lastCheckin: '08:45', notePreview: 'Rolig morgen. Tog medicin til tiden.', checkinToday: true },
  { id: 'res-008', name: 'Birgit N.', initials: 'BN', room: '105', trafficLight: 'gul', moodScore: 5, lastCheckin: '09:00', notePreview: 'Lidt søvnig. Glæder sig til besøg.', checkinToday: true },
  { id: 'res-009', name: 'Rasmus V.', initials: 'RV', room: '109', trafficLight: null, moodScore: null, lastCheckin: 'I går 18:00', notePreview: 'Ingen check-in i dag.', checkinToday: false },
  { id: 'res-010', name: 'Dorthe A.', initials: 'DA', room: '101', trafficLight: 'groen', moodScore: 9, lastCheckin: '08:20', notePreview: 'Meget positiv. Starter nyt mål i dag.', checkinToday: true },
];

const trafficConfig = {
  groen: { label: 'Grøn', color: '#22C55E', bg: '#F0FDF4', textColor: '#15803D' },
  gul: { label: 'Gul', color: '#EAB308', bg: '#FEFCE8', textColor: '#854D0E' },
  roed: { label: 'Rød', color: '#EF4444', bg: '#FEF2F2', textColor: '#B91C1C' },
};

export default function ResidentList() {
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'alle' | 'groen' | 'gul' | 'roed' | 'ingen'>('alle');

  const filtered = residents.filter(r => {
    const matchSearch = r.name.toLowerCase().includes(search.toLowerCase()) || r.room.includes(search);
    const matchFilter =
      filter === 'alle' ? true :
      filter === 'ingen' ? !r.trafficLight :
      r.trafficLight === filter;
    return matchSearch && matchFilter;
  });

  return (
    <div className="bg-white rounded-lg border border-gray-100 overflow-hidden">
      <div className="px-4 py-3 border-b border-gray-100">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm font-semibold text-gray-800">Beboere</span>
          <span className="text-xs text-gray-400">{residents.length} beboere · {residents.filter(r => r.checkinToday).length} check-in i dag</span>
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
                <tr key={r.id} className="border-b border-gray-50 hover:bg-gray-50 transition-colors group">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                        style={{ backgroundColor: tc?.color ?? '#9CA3AF' }}
                      >
                        {r.initials}
                      </div>
                      <span className="text-sm font-medium text-gray-800">{r.name}</span>
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
                      <span className="text-sm font-bold tabular-nums text-gray-700">{r.moodScore}<span className="text-xs text-gray-400 font-normal">/10</span></span>
                    ) : (
                      <span className="text-xs text-gray-400">—</span>
                    )}
                  </td>
                  <td className="px-3 py-3 text-xs text-gray-500">{r.lastCheckin}</td>
                  <td className="px-3 py-3 max-w-[200px]">
                    <span className="text-xs text-gray-500 truncate block">{r.notePreview}</span>
                  </td>
                  <td className="px-3 py-3">
                    <Link href="/resident-360-view">
                      <button className="opacity-0 group-hover:opacity-100 w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 hover:text-[#1D9E75] hover:border-[#1D9E75] transition-all">
                        <ChevronRight size={14} />
                      </button>
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {filtered.length === 0 && (
        <div className="py-10 text-center text-sm text-gray-400">Ingen beboere matcher søgningen</div>
      )}
    </div>
  );
}