'use client';
import React, { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAlertCount } from '@/hooks/useAlertCount';
import { createClient } from '@/lib/supabase/client';
import { resolveStaffOrgResidents } from '@/lib/staffOrgScope';
import { DEMO_ALERT_PANEL_COUNT } from './AlertPanel';

const demoStats = [
  {
    id: 'stat-residents',
    label: 'Aktive beboere',
    sub: '3 fraværende i dag',
    value: '12',
    stripe: 'var(--cp-green)',
    alertLink: false,
  },
  {
    id: 'stat-checkins',
    label: 'Check-ins i dag',
    sub: '2 mangler endnu',
    value: '10',
    stripe: 'var(--cp-blue)',
    alertLink: false,
  },
  {
    id: 'stat-alerts',
    label: 'Åbne advarsler',
    sub: null as string | null,
    value: null as string | null,
    stripe: 'var(--cp-red)',
    alertLink: true,
  },
  {
    id: 'stat-avg-mood',
    label: 'Gns. stemning',
    sub: 'Af 10 mulige',
    value: '6.2',
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
          },
          {
            ...demoStats[2],
            value: String(alertCount),
            sub: alertCount === 1 ? '1 aktiv advarsel' : `${alertCount} aktive advarsler`,
          },
          {
            ...demoStats[3],
            value: live === null ? '…' : live.avgMood === null ? '—' : live.avgMood.toFixed(1),
            sub: 'Af 10 mulige (dagens check-in)',
          },
        ];

  return (
    <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
      {stats.map((stat) => {
        const liveAlertCount = stat.alertLink ? alertCount : 0;
        const isAlertActive =
          stat.alertLink && (variant === 'demo' ? DEMO_ALERT_PANEL_COUNT > 0 : liveAlertCount > 0);

        const numberColor = isAlertActive
          ? 'var(--cp-red)'
          : stat.id === 'stat-avg-mood'
            ? 'var(--cp-amber)'
            : 'var(--cp-text)';

        return (
          <div key={stat.id} className="cp-card-elevated relative overflow-hidden px-5 py-4">
            {/* Colored top accent stripe */}
            <div
              className="absolute inset-x-0 top-0 rounded-t-[13px]"
              style={{ height: 2, backgroundColor: stat.stripe }}
            />

            {/* Large stat number */}
            <div
              className="mt-2 tabular-nums leading-none"
              style={{
                fontSize: '2.5rem',
                fontWeight: 300,
                color: numberColor,
                letterSpacing: '-0.02em',
              }}
            >
              {stat.value ?? '—'}
            </div>

            {/* Label */}
            <div
              className="mt-2 font-medium"
              style={{ fontSize: '0.75rem', color: 'var(--cp-muted)' }}
            >
              {stat.label}
            </div>

            {/* Sub-label */}
            {stat.sub && (
              <div className="mt-0.5" style={{ fontSize: '0.7rem', color: 'var(--cp-muted2)' }}>
                {stat.sub}
              </div>
            )}

            {/* Alert link */}
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
