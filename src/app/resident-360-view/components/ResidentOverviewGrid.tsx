'use client';

import React, { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Search } from 'lucide-react';
import type { ResidentItem } from '../page';

// ── Colour tokens ─────────────────────────────────────────────

type TrafficUi = 'groen' | 'gul' | 'roed';

function trafficDotColor(tl: TrafficUi): string {
  const style = getComputedStyle(document.documentElement);
  if (tl === 'groen') return style.getPropertyValue('--cp-green').trim();
  if (tl === 'gul') return style.getPropertyValue('--cp-amber').trim();
  if (tl === 'roed') return style.getPropertyValue('--cp-red').trim();
  return style.getPropertyValue('--cp-muted').trim();
}

const TRAFFIC_LABEL: Record<TrafficUi, string> = {
  groen: 'Grøn',
  gul: 'Gul',
  roed: 'Rød',
};

function avatarStyle(tl: TrafficUi | null): React.CSSProperties {
  if (tl === 'roed') return { backgroundColor: 'var(--cp-red-dim)', color: 'var(--cp-red)' };
  if (tl === 'gul') return { backgroundColor: 'var(--cp-amber-dim)', color: 'var(--cp-amber)' };
  return { backgroundColor: 'var(--cp-bg3)', color: 'var(--cp-muted)' };
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

const HOUSE_ORDER = ['Hus A', 'Hus B', 'Hus C', 'Hus D', 'TLS', '—'];

function houseRank(h: string): number {
  const i = HOUSE_ORDER.indexOf(h);
  return i === -1 ? 99 : i;
}

type Props = { residents: ResidentItem[] };

export default function ResidentOverviewGrid({ residents }: Props) {
  const router = useRouter();
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'alle' | TrafficUi | 'ingen'>('alle');
  const [houseFilter, setHouseFilter] = useState<string>('alle');

  const houseOptions = useMemo(() => {
    const set = new Set(residents.map((r) => r.house || '—'));
    return [...set].sort((a, b) => houseRank(a) - houseRank(b) || a.localeCompare(b, 'da'));
  }, [residents]);

  const sorted = useMemo(
    () =>
      [...residents].sort(
        (a, b) =>
          houseRank(a.house) - houseRank(b.house) ||
          a.name.localeCompare(b.name, 'da', { sensitivity: 'base' })
      ),
    [residents]
  );

  const filtered = sorted.filter((r) => {
    const matchSearch =
      r.name.toLowerCase().includes(search.toLowerCase()) ||
      r.room.toLowerCase().includes(search.toLowerCase()) ||
      r.initials.toLowerCase().includes(search.toLowerCase()) ||
      r.house.toLowerCase().includes(search.toLowerCase());
    const matchFilter =
      filter === 'alle' ? true : filter === 'ingen' ? !r.trafficLight : r.trafficLight === filter;
    const matchHouse = houseFilter === 'alle' || r.house === houseFilter;
    return matchSearch && matchFilter && matchHouse;
  });

  const checkinCount = residents.filter((r) => r.checkinToday).length;
  const missingCheckin = residents.length - checkinCount;
  const alertCount = residents.filter((r) => r.trafficLight === 'roed').length;

  const cardStyle: React.CSSProperties = {
    backgroundColor: 'var(--cp-bg2)',
    borderColor: 'var(--cp-border)',
  };

  const miniStatCard: React.CSSProperties = {
    background: 'var(--cp-bg2)',
    border: '1px solid var(--cp-border)',
    borderRadius: '12px',
    padding: '14px 20px',
    display: 'flex',
    alignItems: 'center',
    gap: '14px',
    boxShadow: 'var(--cp-card-shadow)',
  };

  const statLabel: React.CSSProperties = {
    fontSize: '0.75rem',
    color: 'var(--cp-muted)',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
  };

  return (
    <div className="p-6 max-w-screen-xl">
      <div className="mb-6 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--cp-text)' }}>
            Beboere
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--cp-muted)' }}>
            {residents.length} beboere · {checkinCount} check-in i dag
            {alertCount > 0 && (
              <span className="ml-2 font-medium" style={{ color: 'var(--cp-red)' }}>
                · {alertCount} rød trafiklys
              </span>
            )}
          </p>
        </div>
        <Link
          href="/resident-360-view/dagbog"
          className="text-sm font-semibold shrink-0 hover:underline"
          style={{ color: 'var(--cp-green)' }}
        >
          Aftenopsamling →
        </Link>
      </div>

      {/* ── Stat-bar ─────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', flexWrap: 'wrap' }}>
        {/* Total beboere */}
        <div style={miniStatCard}>
          <span style={{ fontSize: '1.4rem', lineHeight: 1 }}>👥</span>
          <div>
            <div
              style={{
                fontSize: '1.6rem',
                fontWeight: 300,
                color: 'var(--cp-text)',
                lineHeight: 1,
              }}
            >
              {residents.length}
            </div>
            <div style={statLabel}>Beboere i alt</div>
          </div>
        </div>

        {/* Check-in i dag */}
        <div style={miniStatCard}>
          <span style={{ fontSize: '1.4rem', lineHeight: 1 }}>✅</span>
          <div>
            <div
              style={{
                fontSize: '1.6rem',
                fontWeight: 300,
                color: 'var(--cp-green)',
                lineHeight: 1,
              }}
            >
              {checkinCount}
            </div>
            <div style={statLabel}>Check-in i dag</div>
          </div>
        </div>

        {/* Mangler check-in */}
        <div style={miniStatCard}>
          <span style={{ fontSize: '1.4rem', lineHeight: 1 }}>⚠️</span>
          <div>
            <div
              style={{
                fontSize: '1.6rem',
                fontWeight: 300,
                color: 'var(--cp-amber)',
                lineHeight: 1,
              }}
            >
              {missingCheckin}
            </div>
            <div style={statLabel}>Mangler check-in</div>
          </div>
        </div>
      </div>

      <div className="rounded-lg border overflow-hidden" style={cardStyle}>
        {/* ── Søg + trafiklys-filter ────────────────────────── */}
        <div
          className="px-4 py-3 flex flex-wrap items-center gap-3 border-b"
          style={{ borderColor: 'var(--cp-border)' }}
        >
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search
              size={14}
              className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none"
              style={{ color: 'var(--cp-muted2)' }}
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Søg navn eller værelse…"
              className="w-full pl-8 pr-3 py-2 text-sm rounded-lg focus:outline-none transition-colors"
              style={{
                border: '1px solid var(--cp-border)',
                backgroundColor: 'var(--cp-bg)',
                color: 'var(--cp-text)',
              }}
            />
          </div>
          <div className="flex flex-wrap gap-1">
            {(['alle', 'roed', 'gul', 'groen', 'ingen'] as const).map((f) => (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className="px-3 py-2 rounded-lg text-xs font-medium transition-all"
                style={
                  filter === f
                    ? {
                        backgroundColor: 'var(--cp-green-dim)',
                        color: 'var(--cp-green)',
                        boxShadow: '0 0 0 1px rgba(45,212,160,0.2)',
                      }
                    : {
                        backgroundColor: 'var(--cp-bg3)',
                        color: 'var(--cp-muted)',
                      }
                }
              >
                {f === 'alle'
                  ? 'Alle'
                  : f === 'roed'
                    ? '🔴 Rød'
                    : f === 'gul'
                      ? '🟡 Gul'
                      : f === 'groen'
                        ? '🟢 Grøn'
                        : '— Ingen'}
              </button>
            ))}
          </div>
        </div>

        {/* ── Hus-filter ───────────────────────────────────── */}
        {houseOptions.length > 0 && (
          <div
            className="px-4 py-2.5 flex flex-wrap items-center gap-2 border-b"
            style={{ borderColor: 'var(--cp-border)' }}
          >
            <span className="text-xs font-medium" style={{ color: 'var(--cp-muted2)' }}>
              Afdeling
            </span>
            <select
              value={houseFilter}
              onChange={(e) => setHouseFilter(e.target.value)}
              className="text-xs rounded-lg px-2 py-1.5 focus:outline-none"
              style={{
                border: '1px solid var(--cp-border)',
                backgroundColor: 'var(--cp-bg)',
                color: 'var(--cp-text)',
              }}
            >
              <option value="alle">Alle huse</option>
              {houseOptions.map((h) => (
                <option key={h} value={h}>
                  {h}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* ── Tabel ────────────────────────────────────────── */}
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr
                style={{
                  background: 'var(--cp-bg3)',
                  borderBottom: '2px solid var(--cp-border2)',
                  position: 'sticky',
                  top: 0,
                  zIndex: 1,
                }}
              >
                {[
                  { label: 'Beboer', w: '200px', px: '16px' },
                  { label: 'Hus', w: '88px', px: '12px' },
                  { label: 'Værelse', w: '90px', px: '12px' },
                  { label: 'Trafiklys', w: '110px', px: '12px' },
                  { label: 'Stemning', w: '120px', px: '12px' },
                  { label: 'Check-in', w: '120px', px: '12px' },
                  { label: 'Note', w: undefined, px: '12px' },
                  { label: '', w: '40px', px: '12px' },
                ].map(({ label, w, px }) => (
                  <th
                    key={label || 'arrow'}
                    className="text-left"
                    style={{
                      width: w,
                      padding: `10px ${px}`,
                      fontSize: '0.7rem',
                      fontWeight: 600,
                      letterSpacing: '0.08em',
                      textTransform: 'uppercase',
                      color: 'var(--cp-muted)',
                    }}
                  >
                    {label}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {filtered.map((r, index) => {
                const dotColor = r.trafficLight
                  ? trafficDotColor(r.trafficLight)
                  : 'var(--cp-muted2)';
                const avStyle = avatarStyle(r.trafficLight);
                const zebraColor = index % 2 === 0 ? 'var(--cp-bg)' : 'var(--cp-bg2)';
                return (
                  <tr
                    key={r.id}
                    onClick={() => router.push(`/resident-360-view/${r.id}`)}
                    className="border-b transition-colors group cursor-pointer"
                    style={{ borderColor: 'var(--cp-border)', backgroundColor: zebraColor }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = 'var(--cp-sidebar-hover-bg)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = zebraColor;
                    }}
                  >
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
                            <span
                              className="text-sm font-medium"
                              style={{ color: 'var(--cp-text)' }}
                            >
                              {r.name}
                            </span>
                            {r.pendingProposals > 0 && (
                              <span
                                className="text-xs font-medium px-1.5 py-0.5 rounded-full whitespace-nowrap border"
                                style={{
                                  color: 'var(--cp-amber)',
                                  borderColor: 'rgba(245,158,11,0.35)',
                                  backgroundColor: 'var(--cp-amber-dim)',
                                }}
                              >
                                ⏳ {r.pendingProposals}
                              </span>
                            )}
                          </div>
                          {!r.checkinToday && (
                            <span className="text-xs" style={{ color: 'var(--cp-muted2)' }}>
                              Ingen check-in i dag
                            </span>
                          )}
                        </div>
                      </div>
                    </td>

                    <td
                      className="px-3 py-3 text-xs font-medium"
                      style={{ color: 'var(--cp-muted)' }}
                    >
                      {r.house}
                    </td>

                    <td className="px-3 py-3 text-sm" style={{ color: 'var(--cp-muted)' }}>
                      {r.room}
                    </td>

                    <td className="px-3 py-3">
                      {r.trafficLight ? (
                        <div className="flex items-center gap-1.5">
                          <div
                            className="rounded-full flex-shrink-0"
                            style={{ width: 10, height: 10, backgroundColor: dotColor }}
                          />
                          <span className="text-xs" style={{ color: 'var(--cp-muted)' }}>
                            {TRAFFIC_LABEL[r.trafficLight]}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs" style={{ color: 'var(--cp-muted2)' }}>
                          —
                        </span>
                      )}
                    </td>

                    <td className="px-3 py-3">
                      {r.moodScore !== null ? (
                        <div className="flex items-center gap-2">
                          <span
                            className="text-sm font-bold tabular-nums"
                            style={{ color: 'var(--cp-text)' }}
                          >
                            {r.moodScore}
                            <span
                              className="text-xs font-normal"
                              style={{ color: 'var(--cp-muted2)' }}
                            >
                              /10
                            </span>
                          </span>
                          <div
                            className="w-10 h-1 rounded-full overflow-hidden flex-shrink-0"
                            style={{ backgroundColor: 'var(--cp-bg3)' }}
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
                        <span className="text-xs" style={{ color: 'var(--cp-muted2)' }}>
                          —
                        </span>
                      )}
                    </td>

                    <td className="px-3 py-3 text-xs" style={{ color: 'var(--cp-muted)' }}>
                      {r.checkinToday ? (
                        <span className="flex items-center gap-1">
                          <span
                            className="w-1.5 h-1.5 rounded-full inline-block"
                            style={{ backgroundColor: 'var(--cp-green)' }}
                          />
                          {formatCheckin(r.lastCheckinIso)}
                        </span>
                      ) : (
                        formatCheckin(r.lastCheckinIso)
                      )}
                    </td>

                    <td className="px-3 py-3 max-w-[240px]">
                      <span className="text-xs truncate block" style={{ color: 'var(--cp-muted)' }}>
                        {r.notePreview}
                      </span>
                    </td>

                    <td className="px-3 py-3">
                      <div
                        className="opacity-0 group-hover:opacity-100 w-7 h-7 rounded-lg flex items-center justify-center transition-all border"
                        style={{
                          borderColor: 'var(--cp-border)',
                          color: 'var(--cp-muted2)',
                        }}
                      >
                        <svg
                          width="14"
                          height="14"
                          viewBox="0 0 14 14"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        >
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
            <div className="py-12 text-center text-sm" style={{ color: 'var(--cp-muted2)' }}>
              Ingen beboere matcher søgningen
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
