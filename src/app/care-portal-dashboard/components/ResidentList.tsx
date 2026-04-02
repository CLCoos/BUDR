'use client';
import React, { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

// ── Types ────────────────────────────────────────────────────

type TrafficUi = 'groen' | 'gul' | 'roed';
type TrafficDb = 'grøn' | 'gul' | 'rød';

const DB_TO_UI: Record<TrafficDb, TrafficUi> = {
  'grøn': 'groen',
  'gul':  'gul',
  'rød':  'roed',
};

interface Resident {
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

interface CheckinRow {
  resident_id: string;
  mood_score: number;
  traffic_light: string;
  note: string | null;
  created_at: string;
}

interface CareResidentRow {
  user_id: string;
  display_name: string;
  onboarding_data: Record<string, string> | null;
}

// ── Colour tokens ─────────────────────────────────────────────

/** Dot + progress-bar colours per traffic light */
const TRAFFIC_DOT: Record<TrafficUi, string> = {
  groen: '#1D9E75',
  gul:   '#EF9F27',
  roed:  '#E24B4A',
};

/** Avatar background + text per traffic light */
function avatarStyle(tl: TrafficUi | null): React.CSSProperties {
  if (tl === 'roed') return { backgroundColor: '#FCEBEB', color: '#A32D2D' };
  if (tl === 'gul')  return { backgroundColor: '#FAEEDA', color: '#854F0B' };
  return { backgroundColor: '#9CA3AF', color: '#fff' };
}

// ── Helpers ──────────────────────────────────────────────────

function formatLastCheckin(isoString: string): string {
  const date = new Date(isoString);
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const yesterdayStart = new Date(todayStart.getTime() - 86400000);
  const timeStr = date.toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' });
  if (date >= todayStart) return timeStr;
  if (date >= yesterdayStart) return `I går ${timeStr}`;
  return date.toLocaleDateString('da-DK', { day: 'numeric', month: 'short' }) + ` ${timeStr}`;
}

function isToday(isoString: string): boolean {
  const d = new Date(isoString);
  const n = new Date();
  return d.getFullYear() === n.getFullYear() && d.getMonth() === n.getMonth() && d.getDate() === n.getDate();
}

function applyCheckin(resident: Resident, row: CheckinRow): Resident {
  return {
    ...resident,
    trafficLight: DB_TO_UI[row.traffic_light as TrafficDb] ?? null,
    moodScore: row.mood_score,
    lastCheckin: formatLastCheckin(row.created_at),
    notePreview: row.note?.trim() || 'Ingen note',
    checkinToday: isToday(row.created_at),
  };
}

// ── Component ────────────────────────────────────────────────

export default function ResidentList() {
  const router = useRouter();
  const [residents, setResidents] = useState<Resident[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'alle' | TrafficUi | 'ingen'>('alle');

  const handleRealtimeInsert = useCallback((row: CheckinRow) => {
    setResidents(prev =>
      prev.map(r => (r.id === row.resident_id ? applyCheckin(r, row) : r)),
    );
  }, []);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) {
      setLoading(false);
      return;
    }

    async function load() {
      if (!supabase) return;

      const { data: careResidents, error: resErr } = await supabase
        .from('care_residents')
        .select('user_id, display_name, onboarding_data')
        .order('display_name');

      if (resErr || !careResidents) {
        setLoading(false);
        return;
      }

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const [checkinsResult, proposalsResult] = await Promise.all([
        supabase
          .from('park_daily_checkin')
          .select('resident_id, mood_score, traffic_light, note, created_at')
          .gte('created_at', todayStart.toISOString())
          .order('created_at', { ascending: false }),
        supabase
          .from('plan_proposals')
          .select('resident_id')
          .eq('status', 'pending'),
      ]);

      const checkins = checkinsResult.data;

      const latestByResident = new Map<string, CheckinRow>();
      for (const c of (checkins ?? []) as CheckinRow[]) {
        if (!latestByResident.has(c.resident_id)) {
          latestByResident.set(c.resident_id, c);
        }
      }

      const pendingByResident = new Map<string, number>();
      for (const p of (proposalsResult.data ?? []) as { resident_id: string }[]) {
        pendingByResident.set(p.resident_id, (pendingByResident.get(p.resident_id) ?? 0) + 1);
      }

      const merged: Resident[] = (careResidents as CareResidentRow[]).map(r => {
        const od = r.onboarding_data ?? {};
        const base: Resident = {
          id: r.user_id,
          name: r.display_name,
          initials: od.avatar_initials ?? r.display_name.slice(0, 2).toUpperCase(),
          room: od.room ?? '—',
          trafficLight: null,
          moodScore: null,
          lastCheckin: 'Ingen check-in',
          notePreview: 'Ingen check-in i dag',
          checkinToday: false,
          pendingProposals: pendingByResident.get(r.user_id) ?? 0,
        };
        const checkin = latestByResident.get(r.user_id);
        return checkin ? applyCheckin(base, checkin) : base;
      });

      setResidents(merged);
      setLoading(false);
    }

    void load();

    const channel = supabase
      .channel('dashboard-resident-checkins')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'park_daily_checkin' },
        payload => { handleRealtimeInsert(payload.new as CheckinRow); },
      )
      .subscribe();

    return () => { void supabase.removeChannel(channel); };
  }, [handleRealtimeInsert]);

  // ── Filter + search ────────────────────────────────────────

  const filtered = residents.filter(r => {
    const matchSearch =
      r.name.toLowerCase().includes(search.toLowerCase()) || r.room.includes(search);
    const matchFilter =
      filter === 'alle'  ? true :
      filter === 'ingen' ? !r.trafficLight :
      r.trafficLight === filter;
    return matchSearch && matchFilter;
  });

  const checkinTodayCount = residents.filter(r => r.checkinToday).length;

  // ── Render ─────────────────────────────────────────────────

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
            {loading ? (
              <Loader2 size={12} className="animate-spin inline" />
            ) : (
              `${residents.length} beboere · ${checkinTodayCount} check-in i dag`
            )}
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

      {loading ? (
        <div className="py-16 flex flex-col items-center gap-3 text-gray-400">
          <Loader2 size={20} className="animate-spin" />
          <span className="text-sm">Henter beboeroversigt…</span>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left text-xs font-medium text-gray-500 px-4 py-2.5">Beboer</th>
                <th className="text-left text-xs font-medium text-gray-500 px-3 py-2.5">Værelse</th>
                <th className="text-left text-xs font-medium text-gray-500 px-3 py-2.5">Trafiklys</th>
                <th className="text-left text-xs font-medium text-gray-500 px-3 py-2.5">Stemning</th>
                <th className="text-left text-xs font-medium text-gray-500 px-3 py-2.5">Check-in</th>
                <th className="text-left text-xs font-medium text-gray-500 px-3 py-2.5">Note</th>
                <th className="px-3 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {filtered.map(r => {
                const dotColor = r.trafficLight ? TRAFFIC_DOT[r.trafficLight] : '#D1D5DB';
                const avStyle = avatarStyle(r.trafficLight);

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
                          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                          style={avStyle}
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

                    {/* Værelse */}
                    <td className="px-3 py-3 text-sm text-gray-600">{r.room}</td>

                    {/* Trafiklys — coloured dot */}
                    <td className="px-3 py-3">
                      <div
                        className="rounded-full flex-shrink-0"
                        style={{ width: 10, height: 10, backgroundColor: dotColor }}
                      />
                    </td>

                    {/* Stemning + mini progress bar */}
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
                              style={{
                                width: `${(r.moodScore / 10) * 100}%`,
                                backgroundColor: dotColor,
                              }}
                            />
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400">—</span>
                      )}
                    </td>

                    {/* Check-in tid */}
                    <td className="px-3 py-3 text-xs text-gray-500">{r.lastCheckin}</td>

                    {/* Note */}
                    <td className="px-3 py-3 max-w-[200px]">
                      <span className="text-xs text-gray-500 truncate block">{r.notePreview}</span>
                    </td>

                    {/* Arrow */}
                    <td className="px-3 py-3">
                      <span className="opacity-0 group-hover:opacity-100 w-7 h-7 rounded-lg border border-gray-200 flex items-center justify-center text-gray-400 group-hover:text-[#1D9E75] group-hover:border-[#1D9E75] transition-all">
                        <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 3l4 4-4 4"/></svg>
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filtered.length === 0 && !loading && (
            <div className="py-10 text-center text-sm text-gray-400">
              Ingen beboere matcher søgningen
            </div>
          )}
        </div>
      )}
    </div>
  );
}
