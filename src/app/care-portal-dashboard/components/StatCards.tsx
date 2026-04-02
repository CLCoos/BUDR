'use client';
import React from 'react';
import { useRouter } from 'next/navigation';
import { Users, CheckSquare, AlertTriangle, TrendingUp } from 'lucide-react';
import { useAlertCount } from '@/hooks/useAlertCount';

const staticStats = [
  {
    id: 'stat-residents',
    label: 'Aktive beboere',
    value: '12',
    sub: '2 fraværende i dag',
    icon: Users,
    iconColor: 'var(--cp-green)',
    iconBg: 'var(--cp-green-dim)',
    trend: null,
    stripe: 'var(--cp-green)',
    alertLink: false,
  },
  {
    id: 'stat-checkins',
    label: 'Check-ins i dag',
    value: '8',
    sub: '4 mangler endnu',
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
    value: null,
    sub: null,
    icon: AlertTriangle,
    iconColor: 'var(--cp-red)',
    iconBg: 'var(--cp-red-dim)',
    trend: null,
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

export default function StatCards() {
  const router = useRouter();
  const alertCount = useAlertCount();

  const stats = staticStats.map(s =>
    s.alertLink
      ? { ...s, value: String(alertCount), sub: alertCount === 1 ? '1 aktiv advarsel' : `${alertCount} aktive advarsler` }
      : s,
  );

  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
      {stats.map(stat => {
        const liveAlertCount = stat.alertLink ? alertCount : 0;
        const valueColor = stat.id === 'stat-avg-mood'
          ? 'var(--cp-amber)'
          : stat.alertLink && liveAlertCount > 0
            ? 'var(--cp-red)'
            : 'var(--cp-text)';

        return (
          <div
            key={stat.id}
            className="relative overflow-hidden rounded-xl p-4 transition-all duration-150"
            style={{
              backgroundColor: 'var(--cp-bg2)',
              border: '1px solid var(--cp-border)',
              borderRadius: 10,
            }}
          >
            {/* 2px top stripe */}
            <div
              className="absolute inset-x-0 top-0 rounded-t-xl"
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
                    (stat as { trendPos?: boolean }).trendPos
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
            <div className="text-xs font-medium" style={{ color: 'var(--cp-muted)', fontSize: 11 }}>{stat.label}</div>
            <div className="text-xs mt-0.5" style={{ color: 'var(--cp-muted2)', fontSize: 10 }}>{stat.sub}</div>

            {stat.alertLink && (
              <div
                className="mt-3 pt-2"
                style={{ borderTop: '1px solid var(--cp-border)' }}
              >
                <button
                  type="button"
                  onClick={() => router.push('?tab=alerts')}
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
