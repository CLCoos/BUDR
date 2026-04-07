'use client';
import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Users, CheckSquare, AlertTriangle, TrendingUp } from 'lucide-react';
import { useAlertCount } from '@/hooks/useAlertCount';
import { createClient } from '@/lib/supabase/client';
import { resolveStaffOrgResidents } from '@/lib/staffOrgScope';
import { DEMO_ALERT_PANEL_COUNT } from './AlertPanel';

const demoStats = [
  {
    id: 'stat-residents',
    label: 'Aktive beboere',
    value: '12',
    sub: '3 fraværende i dag (ferie / sygdom)',
    icon: Users,
    iconColor: 'var(--cp-green)',
    iconBg: 'var(--cp-green-dim)',
    trend: null as string | null,
    trendPos: undefined as boolean | undefined,
    stripe: 'var(--cp-green)',
    alertLink: false,
  },
  {
    id: 'stat-checkins',
    label: 'Check-ins i dag',
    value: '10',
    sub: '2 mangler endnu · 1 uden Lys i 24 t.',
    icon: CheckSquare,
    iconColor: 'var(--cp-blue)',
    iconBg: 'var(--cp-blue-dim)',
    trend: '+3 vs. i går',
    trendPos: true,
    stripe: 'var(--cp-blue)',
    alertLink: false,
  },
  {
    id: 'stat-alerts',
    label: 'Åbne advarsler',
    value: null as string | null,
    sub: null as string | null,
    icon: AlertTriangle,
    iconColor: 'var(--cp-red)',
    iconBg: 'var(--cp-red-dim)',
    trend: null as string | null,
    trendPos: undefined as boolean | undefined,
    stripe: 'var(--cp-red)',
    alertLink: true,
  },
  {
    id: 'stat-avg-mood',
    label: 'Gns. stemning',
    value: '6.2',
    sub: 'Af 10 mulige',
    icon: TrendingUp,
    iconColor: 'var(--cp-amber)',
    iconBg: 'var(--cp-amber-dim)',
    trend: '-0.4 vs. i går',
    trendPos: false,
    stripe: 'var(--cp-amber)',
    alertLink: false,
  },
];

type Props = { variant?: 'demo' | 'live' };

export default function StatCards({ variant = 'live' }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const alertCount = useAlertCount(variant !== 'demo');
  const [live, setLive] = useState<{
    total: number;
    checkinToday: number;
    avgMood: number | null;
  } | null>(null);

  useEffect(() => {
    if (variant !== 'live') return;

    let cancelled = false;

    (async () => {
      const supabase = createClient();
      if (!supabase || cancelled) {
        if (!cancelled) setLive({ total: 0, checkinToday: 0, avgMood: null });
        return;
      }

      const { orgId, residentIds, error: orgErr } = await resolveStaffOrgResidents(supabase);
      if (cancelled) return;

      if (orgErr || !orgId || residentIds.length === 0) {
        setLive({ total: 0, checkinToday: 0, avgMood: null });
        return;
      }

      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);

      const { data: checkins } = await supabase
        .from('park_daily_checkin')
        .select('resident_id, mood_score, created_at')
        .gte('created_at', todayStart.toISOString())
        .in('resident_id', residentIds)
        .order('created_at', { ascending: false });

      if (cancelled) return;

      const latestByResident = new Map<string, { mood_score: number }>();
      for (const row of checkins ?? []) {
        const r = row as { resident_id: string; mood_score: number };
        if (!latestByResident.has(r.resident_id)) {
          latestByResident.set(r.resident_id, { mood_score: r.mood_score });
        }
      }

      const moods = [...latestByResident.values()]
        .map((c) => c.mood_score)
        .filter((n) => typeof n === 'number');
      const avgMood = moods.length > 0 ? moods.reduce((a, b) => a + b, 0) / moods.length : null;

      setLive({
        total: residentIds.length,
        checkinToday: latestByResident.size,
        avgMood,
      });
    })();

    return () => {
      cancelled = true;
    };
  }, [variant]);

  const stats =
    variant === 'demo'
      ? demoStats.map((s) =>
          s.alertLink
            ? {
                ...s,
                value: String(DEMO_ALERT_PANEL_COUNT),
                sub:
                  DEMO_ALERT_PANEL_COUNT === 1
                    ? '1 aktiv advarsel'
                    : `${DEMO_ALERT_PANEL_COUNT} aktive advarsler`,
              }
            : s
        )
      : [
          {
            ...demoStats[0],
            value: live === null ? '…' : String(live.total),
            sub:
              live === null
                ? 'Henter…'
                : live.total === 0
                  ? 'Ingen beboere i organisationen'
                  : `${Math.max(0, live.total - live.checkinToday)} uden check-in i dag`,
            trend: null,
            trendPos: undefined,
          },
          {
            ...demoStats[1],
            value: live === null ? '…' : String(live.checkinToday),
            sub:
              live === null
                ? 'Henter…'
                : live.total === 0
                  ? '—'
                  : `${Math.max(0, live.total - live.checkinToday)} mangler endnu`,
            trend: null,
            trendPos: undefined,
          },
          {
            ...demoStats[2],
            value: String(alertCount),
            sub: alertCount === 1 ? '1 aktiv advarsel' : `${alertCount} aktive advarsler`,
            trend: null,
            trendPos: undefined,
          },
          {
            ...demoStats[3],
            value: live === null ? '…' : live.avgMood === null ? '—' : live.avgMood.toFixed(1),
            sub: 'Af 10 mulige (dagens check-in)',
            trend: null,
            trendPos: undefined,
          },
        ];

  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
      {stats.map((stat) => {
        const liveAlertCount = stat.alertLink ? alertCount : 0;
        const valueColor =
          stat.id === 'stat-avg-mood'
            ? 'var(--cp-amber)'
            : stat.alertLink &&
                (variant === 'demo' ? DEMO_ALERT_PANEL_COUNT > 0 : liveAlertCount > 0)
              ? 'var(--cp-red)'
              : 'var(--cp-text)';

        return (
          <div
            key={stat.id}
            className="cp-card-elevated relative overflow-hidden p-4 transition-all duration-150 hover:border-[var(--cp-border2)]"
          >
            <div
              className="absolute inset-x-0 top-0 rounded-t-[13px]"
              style={{ height: 2, backgroundColor: stat.stripe }}
            />

            <div className="flex items-start justify-between mb-3 mt-1">
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: stat.iconBg }}
              >
                <stat.icon size={17} style={{ color: stat.iconColor }} />
              </div>
              {stat.trend && (
                <span
                  className="text-xs font-medium px-1.5 py-0.5 rounded"
                  style={
                    stat.trendPos
                      ? { backgroundColor: 'var(--cp-green-dim)', color: 'var(--cp-green)' }
                      : { backgroundColor: 'var(--cp-red-dim)', color: 'var(--cp-red)' }
                  }
                >
                  {stat.trend}
                </span>
              )}
            </div>

            <div className="text-2xl font-bold tabular-nums mb-0.5" style={{ color: valueColor }}>
              {stat.value ?? '—'}
            </div>
            <div className="text-xs font-medium" style={{ color: 'var(--cp-muted)', fontSize: 11 }}>
              {stat.label}
            </div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--cp-muted2)', fontSize: 10 }}>
              {stat.sub}
            </div>

            {stat.alertLink && (
              <div className="mt-3 pt-2" style={{ borderTop: '1px solid var(--cp-border)' }}>
                <button
                  type="button"
                  onClick={() => {
                    if (pathname === '/care-portal-demo') {
                      document
                        .getElementById('budr-advarsler')
                        ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                    } else {
                      router.push('?tab=alerts');
                    }
                  }}
                  className="text-xs font-medium transition-colors hover:underline"
                  style={{ color: 'var(--cp-green)', fontSize: 10 }}
                >
                  → Åbn advarsler
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
