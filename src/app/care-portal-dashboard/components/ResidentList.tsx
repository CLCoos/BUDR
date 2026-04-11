'use client';
import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Search, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { resolveStaffOrgResidents } from '@/lib/staffOrgScope';

// ── Types ────────────────────────────────────────────────────

type TrafficUi = 'groen' | 'gul' | 'roed';
type TrafficDb = 'grøn' | 'gul' | 'rød';

const DB_TO_UI: Record<TrafficDb, TrafficUi> = {
  grøn: 'groen',
  gul: 'gul',
  rød: 'roed',
};

/** Derives traffic light from a 1–5 mood score per task spec. */
function moodToTrafficLight(score: number): TrafficUi {
  if (score >= 4) return 'groen';
  if (score === 3) return 'gul';
  return 'roed';
}

/** Returns true when a check-in row indicates a red (low-mood) alert. */
function isRedCheckin(row: CheckinRow): boolean {
  if (row.traffic_light) return row.traffic_light === 'rød';
  return typeof row.mood_score === 'number' && row.mood_score <= 2;
}

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
  groen: 'var(--cp-green)',
  gul: 'var(--cp-amber)',
  roed: 'var(--cp-red)',
};

const TRAFFIC_DOT_SHADOW: Record<TrafficUi, string> = {
  groen: '0 0 5px rgba(45,212,160,0.5)',
  gul: '0 0 5px rgba(246,173,85,0.5)',
  roed: '0 0 5px rgba(245,101,101,0.5)',
};

/** Avatar background + text per traffic light */
function avatarStyle(tl: TrafficUi | null): React.CSSProperties {
  if (tl === 'roed') return { backgroundColor: 'var(--cp-red-dim)', color: 'var(--cp-red)' };
  if (tl === 'gul') return { backgroundColor: 'var(--cp-amber-dim)', color: 'var(--cp-amber)' };
  if (tl === 'groen') return { backgroundColor: 'var(--cp-green-dim)', color: 'var(--cp-green)' };
  return { backgroundColor: 'rgba(255,255,255,0.08)', color: 'var(--cp-muted)' };
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
  return (
    d.getFullYear() === n.getFullYear() &&
    d.getMonth() === n.getMonth() &&
    d.getDate() === n.getDate()
  );
}

function applyCheckin(resident: Resident, row: CheckinRow): Resident {
  // Prefer the DB-stored traffic_light; fall back to computing from mood_score.
  const trafficLight: TrafficUi | null = row.traffic_light
    ? (DB_TO_UI[row.traffic_light as TrafficDb] ?? null)
    : typeof row.mood_score === 'number'
      ? moodToTrafficLight(row.mood_score)
      : null;

  return {
    ...resident,
    trafficLight,
    moodScore: row.mood_score,
    lastCheckin: formatLastCheckin(row.created_at),
    notePreview: row.note?.trim() || 'Ingen note',
    checkinToday: isToday(row.created_at),
  };
}

// ── Component ────────────────────────────────────────────────

export default function ResidentList({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const [residents, setResidents] = useState<Resident[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [orgScopeError, setOrgScopeError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'alle' | TrafficUi | 'ingen'>('alle');

  const handleRealtimeInsert = useCallback((row: CheckinRow) => {
    setResidents((prev) => prev.map((r) => (r.id === row.resident_id ? applyCheckin(r, row) : r)));

    if (isRedCheckin(row)) {
      void fetch('/api/portal/mood-alert', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resident_id: row.resident_id }),
        credentials: 'include',
      });
    }
  }, []);

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) {
      setLoadError('Supabase er ikke konfigureret.');
      setLoading(false);
      return;
    }

    async function load() {
      if (!supabase) return;

      setLoadError(null);
      setOrgScopeError(null);

      const {
        orgId,
        residentIds,
        error: orgErr,
        queryMessage,
      } = await resolveStaffOrgResidents(supabase);

      if (orgErr === 'no_session') {
        setLoadError('Du er ikke logget ind.');
        setLoading(false);
        return;
      }

      if (orgErr === 'no_org') {
        setOrgScopeError(
          'Din bruger mangler org_id i profilen. Tilføj organisationens UUID under bruger-metadata i Supabase Auth.'
        );
        setResidents([]);
        setLoading(false);
        return;
      }

      if (orgErr === 'query_failed') {
        setLoadError(queryMessage ?? 'Kunne ikke hente beboere.');
        setLoading(false);
        return;
      }

      if (!orgId || residentIds.length === 0) {
        setResidents([]);
        setLoading(false);
        return;
      }

      const { data: careResidents, error: resErr } = await supabase
        .from('care_residents')
        .select('user_id, display_name, onboarding_data')
        .eq('org_id', orgId)
        .order('display_name');

      if (resErr) {
        setLoadError(resErr.message);
        setLoading(false);
        return;
      }

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const proposalsQuery = supabase
        .from('plan_proposals')
        .select('resident_id')
        .eq('status', 'pending')
        .in('resident_id', residentIds);

      const checkinsResult = await supabase
        .from('park_daily_checkin')
        .select('resident_id, mood_score, traffic_light, note, created_at')
        .gte('created_at', todayStart.toISOString())
        .in('resident_id', residentIds)
        .order('created_at', { ascending: false });

      const proposalsResult = await proposalsQuery;

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

      const merged: Resident[] = ((careResidents ?? []) as CareResidentRow[]).map((r) => {
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
        (payload) => {
          handleRealtimeInsert(payload.new as CheckinRow);
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [handleRealtimeInsert]);

  // ── Filter + search ────────────────────────────────────────

  const filtered = residents.filter((r) => {
    const matchSearch =
      r.name.toLowerCase().includes(search.toLowerCase()) || r.room.includes(search);
    const matchFilter =
      filter === 'alle' ? true : filter === 'ingen' ? !r.trafficLight : r.trafficLight === filter;
    return matchSearch && matchFilter;
  });

  const checkinTodayCount = residents.filter((r) => r.checkinToday).length;

  // ── Render ─────────────────────────────────────────────────

  return (
    <div
      className="overflow-hidden"
      style={{
        backgroundColor: 'var(--cp-bg2)',
        border: '1px solid var(--cp-border)',
        borderRadius: 12,
      }}
    >
      <div className="px-4 py-3" style={{ borderBottom: '1px solid var(--cp-border)' }}>
        {loadError && (
          <div
            className="mb-3 rounded-lg px-3 py-2 text-xs font-medium"
            style={{ backgroundColor: 'var(--cp-red-dim)', color: 'var(--cp-red)' }}
          >
            {loadError}
          </div>
        )}
        {orgScopeError && (
          <div
            className="mb-3 rounded-lg px-3 py-2 text-xs font-medium"
            style={{ backgroundColor: 'var(--cp-amber-dim)', color: 'var(--cp-amber)' }}
          >
            {orgScopeError}
          </div>
        )}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium" style={{ color: 'var(--cp-text)', fontSize: 13 }}>
              Beboere
            </span>
            {/* Live pill */}
            <div
              className="flex items-center gap-1"
              style={{
                padding: '3px 8px',
                borderRadius: 20,
                backgroundColor: 'var(--cp-green-dim)',
                border: '1px solid rgba(45,212,160,0.2)',
              }}
            >
              <div
                style={{
                  width: 5,
                  height: 5,
                  borderRadius: '50%',
                  backgroundColor: 'var(--cp-green)',
                  boxShadow: '0 0 5px var(--cp-green)',
                }}
              />
              <span style={{ fontSize: 10, color: 'var(--cp-green)', fontWeight: 500 }}>Live</span>
            </div>
          </div>
          <span className="text-xs" style={{ color: 'var(--cp-muted)', fontSize: 11 }}>
            {loading ? (
              <Loader2 size={12} className="animate-spin inline" />
            ) : (
              `${residents.length} beboere · ${checkinTodayCount} check-in i dag`
            )}
          </span>
        </div>

        <div className="flex gap-2">
          <div className="flex-1 relative">
            <Search
              size={13}
              className="absolute left-3 top-1/2 -translate-y-1/2"
              style={{ color: 'var(--cp-muted)' }}
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Søg navn eller værelse..."
              className="w-full pl-8 pr-3 py-2 text-sm focus:outline-none transition-colors"
              style={{
                backgroundColor: 'var(--cp-bg3)',
                border: '1px solid var(--cp-border)',
                borderRadius: 8,
                color: 'var(--cp-text)',
                fontSize: 13,
              }}
            />
          </div>
          <div className="flex gap-1">
            {(['alle', 'roed', 'gul', 'groen', 'ingen'] as const).map((f) => (
              <button
                key={`filter-${f}`}
                type="button"
                onClick={() => setFilter(f)}
                className="px-2.5 py-2 rounded-lg text-xs font-medium transition-all"
                style={
                  filter === f
                    ? {
                        backgroundColor: 'var(--cp-bg3)',
                        color: 'var(--cp-text)',
                        border: '1px solid var(--cp-border2)',
                      }
                    : {
                        backgroundColor: 'transparent',
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
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="py-16 flex flex-col items-center gap-3">
          <Loader2 size={20} className="animate-spin" style={{ color: 'var(--cp-muted)' }} />
          <span className="text-sm" style={{ color: 'var(--cp-muted)' }}>
            Henter beboeroversigt…
          </span>
        </div>
      ) : (
        <div
          className="overflow-x-auto"
          style={compact ? { maxHeight: 400, overflowY: 'hidden' } : undefined}
        >
          <table className="w-full">
            <thead>
              <tr style={{ borderBottom: '1px solid var(--cp-border)' }}>
                {['Beboer', 'Værelse', 'Trafiklys', 'Stemning', 'Check-in', 'Note', ''].map(
                  (h, i) => (
                    <th
                      key={h || `h-${i}`}
                      className={`${i === 0 ? 'px-4' : 'px-3'} py-2.5 text-left`}
                      style={{
                        fontSize: 9,
                        fontWeight: 500,
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase',
                        color: 'var(--cp-muted2)',
                      }}
                    >
                      {h}
                    </th>
                  )
                )}
              </tr>
            </thead>
            <tbody>
              {(compact ? filtered.slice(0, 8) : filtered).map((r) => {
                const dotColor = r.trafficLight ? TRAFFIC_DOT[r.trafficLight] : 'var(--cp-muted2)';
                const dotShadow = r.trafficLight ? TRAFFIC_DOT_SHADOW[r.trafficLight] : 'none';
                const avStyle = avatarStyle(r.trafficLight);

                return (
                  <tr
                    key={r.id}
                    onClick={() => router.push(`/resident-360-view/${r.id}`)}
                    className="transition-colors group cursor-pointer"
                    style={{ borderBottom: '1px solid var(--cp-border)' }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--cp-bg3)';
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.backgroundColor = '';
                    }}
                  >
                    {/* Beboer */}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2.5">
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                          style={avStyle}
                        >
                          {r.initials}
                        </div>
                        <div className="flex items-center gap-2">
                          <span
                            className="font-medium"
                            style={{ color: 'var(--cp-text)', fontSize: 12 }}
                          >
                            {r.name}
                          </span>
                          {r.pendingProposals > 0 && (
                            <span
                              className="flex items-center gap-1 text-xs font-medium px-1.5 py-0.5 rounded-full whitespace-nowrap"
                              style={{
                                backgroundColor: 'var(--cp-amber-dim)',
                                color: 'var(--cp-amber)',
                                fontSize: 10,
                              }}
                            >
                              <span
                                className="w-1.5 h-1.5 rounded-full animate-pulse inline-block"
                                style={{ backgroundColor: 'var(--cp-amber)' }}
                              />
                              ⏳ {r.pendingProposals} forslag
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    {/* Værelse */}
                    <td
                      className="px-3 py-3 text-xs"
                      style={{ color: 'var(--cp-muted)', fontSize: 12 }}
                    >
                      {r.room}
                    </td>

                    {/* Trafiklys */}
                    <td className="px-3 py-3">
                      <div
                        className="rounded-full flex-shrink-0"
                        style={{
                          width: 10,
                          height: 10,
                          backgroundColor: dotColor,
                          boxShadow: dotShadow,
                        }}
                      />
                    </td>

                    {/* Stemning + mini bar */}
                    <td className="px-3 py-3">
                      {r.moodScore !== null ? (
                        <div className="flex items-center gap-2">
                          <span
                            className="font-bold tabular-nums"
                            style={{ color: 'var(--cp-text)', fontSize: 12 }}
                          >
                            {r.moodScore}
                            <span
                              style={{ fontSize: 10, color: 'var(--cp-muted)', fontWeight: 400 }}
                            >
                              /10
                            </span>
                          </span>
                          <div
                            className="w-10 h-1 rounded-full overflow-hidden flex-shrink-0"
                            style={{ backgroundColor: 'rgba(255,255,255,0.08)' }}
                          >
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
                        <span style={{ fontSize: 12, color: 'var(--cp-muted2)' }}>—</span>
                      )}
                    </td>

                    {/* Check-in tid */}
                    <td className="px-3 py-3" style={{ fontSize: 12, color: 'var(--cp-muted)' }}>
                      {r.lastCheckin}
                    </td>

                    {/* Note */}
                    <td className="px-3 py-3 max-w-[200px]">
                      <span
                        className="truncate block"
                        style={{ fontSize: 12, color: 'var(--cp-muted)' }}
                      >
                        {r.notePreview}
                      </span>
                    </td>

                    {/* Arrow */}
                    <td className="px-3 py-3">
                      <span
                        className="opacity-0 group-hover:opacity-100 w-6 h-6 rounded-lg flex items-center justify-center transition-all"
                        style={{ border: '1px solid var(--cp-border2)', color: 'var(--cp-green)' }}
                      >
                        <svg
                          width="12"
                          height="12"
                          viewBox="0 0 14 14"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
                          <path d="M5 3l4 4-4 4" />
                        </svg>
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {filtered.length === 0 && !loading && !loadError && (
            <div className="py-10 text-center text-sm" style={{ color: 'var(--cp-muted)' }}>
              {residents.length === 0 && !orgScopeError
                ? 'Ingen beboere registreret for dette bosted endnu.'
                : 'Ingen beboere matcher søgningen'}
            </div>
          )}
        </div>
      )}

      {compact && !loading && residents.length > 0 && (
        <div
          className="px-4 py-2.5"
          style={{ borderTop: '1px solid var(--cp-border)' }}
        >
          <Link
            href="/care-portal-residents"
            className="text-xs font-medium transition-colors hover:underline"
            style={{ color: 'var(--cp-green)' }}
          >
            Se alle {residents.length} beboere →
          </Link>
        </div>
      )}
    </div>
  );
}
