'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search } from 'lucide-react';
import type { ResidentItem } from '../page';

// ── Colour tokens ─────────────────────────────────────────────

type TrafficUi = 'groen' | 'gul' | 'roed';

const TRAFFIC_DOT: Record<TrafficUi, string> = {
  groen: '#1D9E75',
  gul:   '#EF9F27',
  roed:  '#E24B4A',
};

const TRAFFIC_LABEL: Record<TrafficUi, string> = {
  groen: 'Grøn',
  gul:   'Gul',
  roed:  'Rød',
};

function avatarStyle(tl: TrafficUi | null): React.CSSProperties {
  if (tl === 'roed') return { backgroundColor: '#FCEBEB', color: '#A32D2D' };
  if (tl === 'gul')  return { backgroundColor: '#FAEEDA', color: '#854F0B' };
  return { backgroundColor: '#E5E7EB', color: '#374151' };
}

function formatCheckin(iso: string | null): string {
  if (!iso) return '—';
  const date = new Date(iso);
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterdayStart = new Date(todayStart.getTime() - 86400000);
  const timeStr = date.toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' });
  if (date >= todayStart) return timeStr;
  if (date >= yesterdayStart) return `I går ${timeStr}`;
  return date.toLocaleDateString('da-DK', { day: 'numeric', month: 'short' });
}

// ── Component ────────────────────────────────────────────────

type Props = { residents: ResidentItem[] };

export default function ResidentOverviewGrid({ residents }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'alle' | TrafficUi | 'ingen'>('alle');

  const filtered = residents.filter(r => {
    const matchSearch =
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.room.toLowerCase().includes(search.toLowerCase());
    const matchFilter =
      filter === 'alle'  ? true :
      filter === 'ingen' ? !r.trafficLight :
      r.trafficLight === filter;
    return matchSearch && matchFilter;
  });

  const checkinCount = residents.filter(r => r.checkinToday).length;
  const alertCount   = residents.filter(r => r.trafficLight === 'roed').length;

  return (
    <div className="p-6 max-w-screen-xl">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Beboere</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {residents.length} beboere · {checkinCount} check-in i dag
          {alertCount > 0 && (
            <span className="ml-2 text-red-600 font-medium">· {alertCount} rød trafiklys</span>
          )}
        </p>
      </div>

      {/* Search + filter bar */}
      <div className="bg-white rounded-lg border border-gray-100 overflow-hidden">
        <div className="px-4 py-3 border-b border-gray-100 flex items-center gap-3">
          <div className="relative flex-1 max-w-xs">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Søg navn eller værelse…"
              className="w-full pl-8 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-[#1D9E75] transition-colors"
            />
          </div>
          <div className="flex gap-1">
            {(['alle', 'roed', 'gul', 'groen', 'ingen'] as const).map(f => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  filter === f
                    ? 'bg-[#0F1B2D] text-white'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {f === 'alle' ? 'Alle' : f === 'roed' ? '🔴 Rød' : f === 'gul' ? '🟡 Gul' : f === 'groen' ? '🟢 Grøn' : '— Ingen'}
              </button>
            ))}
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-2.5 w-[220px]">Beboer</th>
                <th className="text-left text-xs font-medium text-gray-500 px-3 py-2.5 w-[90px]">Værelse</th>
                <th className="text-left text-xs font-medium text-gray-500 px-3 py-2.5 w-[110px]">Trafiklys</th>
                <th className="text-left text-xs font-medium text-gray-500 px-3 py-2.5 w-[120px]">Stemning</th>
                <th className="text-left text-xs font-medium text-gray-500 px-3 py-2.5 w-[120px]">Check-in</th>
                <th className="text-left text-xs font-medium text-gray-500 px-3 py-2.5">Note</th>
                <th className="w-10 px-3 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => {
                const dotColor = r.trafficLight ? TRAFFIC_DOT[r.trafficLight] : '#D1D5DB';
                const avStyle  = avatarStyle(r.trafficLight);
                return (
                  <tr
                    key={r.id}
                    onClick={() => router.push(`/resident-360-view/${r.id}`)}
                    className="border-b border-gray-50 hover:bg-gray-50 transition-colors group cursor-pointer"
                  >
                    {/* Beboer */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                          style={avStyle}
                        >
                          {r.initials}
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium text-gray-800">{r.name}</span>
                            {r.pendingProposals > 0 && (
                              <span className="text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full whitespace-nowrap">
                                ⏳ {r.pendingProposals}
                              </span>
                            )}
                          </div>
                          {!r.checkinToday && (
                            <span className="text-xs text-gray-400">Ingen check-in i dag</span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Værelse */}
                    <td className="px-3 py-3 text-sm text-gray-600">{r.room}</td>

                    {/* Trafiklys */}
                    <td className="px-3 py-3">
                      {r.trafficLight ? (
                        <div className="flex items-center gap-1.5">
                          <div
                            className="rounded-full flex-shrink-0"
                            style={{ width: 10, height: 10, backgroundColor: dotColor }}
                          />
                          <span className="text-xs text-gray-600">{TRAFFIC_LABEL[r.trafficLight]}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>

                    {/* Stemning */}
                    <td className="px-3 py-3">
                      {r.moodScore !== null ? (
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold tabular-nums text-gray-700">
                            {r.moodScore}
                            <span className="text-xs text-gray-400 font-normal">/10</span>
                          </span>
                          <div className="w-10 h-1 rounded-full bg-gray-100 overflow-hidden flex-shrink-0">
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${(r.moodScore / 10) * 100}%`, backgroundColor: dotColor }}
                            />
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>

                    {/* Check-in */}
                    <td className="px-3 py-3 text-xs text-gray-500">
                      {r.checkinToday ? (
                        <span className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                          {formatCheckin(r.lastCheckinIso)}
                        </span>
                      ) : (
                        formatCheckin(r.lastCheckinIso)
                      )}
                    </td>

                    {/* Note */}
                    <td className="px-3 py-3 max-w-[240px]">
                      <span className="text-xs text-gray-500 truncate block">{r.notePreview}</span>
                    </td>

                    {/* Arrow */}
                    <td className="px-3 py-3">
                      <div className="opacity-0 group-hover:opacity-100 w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 group-hover:text-[#1D9E75] group-hover:border-[#1D9E75] transition-all">
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M5 3l4 4-4 4" />
                        </svg>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filtered.length === 0 && (
            <div className="py-12 text-center text-sm text-gray-400">
              Ingen beboere matcher søgningen
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
