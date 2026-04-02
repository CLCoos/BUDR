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
    color: '#1D9E75',
    bg: '#E6F7F2',
    trend: null,
    stripe: '#1D9E75',
    alertLink: false,
  },
  {
    id: 'stat-checkins',
    label: 'Check-ins i dag',
    value: '8',
    sub: '4 mangler endnu',
    icon: CheckSquare,
    color: '#7F77DD',
    bg: '#F5F4FF',
    trend: '+3 vs. i går',
    stripe: '#378ADD',
    alertLink: false,
  },
  {
    id: 'stat-alerts',
    label: 'Åbne advarsler',
    value: null, // filled dynamically
    sub: null,
    icon: AlertTriangle,
    color: '#E24B4A',
    bg: '#FEF2F2',
    trend: null,
    stripe: '#E24B4A',
    alertLink: true,
  },
  {
    id: 'stat-avg-mood',
    label: 'Gns. stemning',
    value: '6.2',
    sub: 'Af 10 mulige',
    icon: TrendingUp,
    color: '#EAB308',
    bg: '#FEFCE8',
    trend: '-0.4 vs. i går',
    stripe: '#EF9F27',
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
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
      {stats.map(stat => {
        const liveAlertCount = stat.alertLink ? alertCount : 0;
        const valueColor = stat.alertLink && liveAlertCount > 0 ? '#E24B4A' : '#111827';

        return (
          <div
            key={stat.id}
            className="relative overflow-hidden bg-white rounded-lg p-4 border border-gray-100 hover:border-gray-200 transition-all"
          >
            {/* 3px top stripe */}
            <div
              className="absolute inset-x-0 top-0 h-[3px] rounded-t-lg"
              style={{ backgroundColor: stat.stripe }}
            />

            <div className="flex items-start justify-between mb-3 mt-1">
              <div
                className="w-9 h-9 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: stat.bg }}
              >
                <stat.icon size={18} style={{ color: stat.color }} />
              </div>
              {stat.trend && (
                <span
                  className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                    stat.trend.startsWith('+')
                      ? 'bg-green-50 text-green-600'
                      : 'bg-red-50 text-red-500'
                  }`}
                >
                  {stat.trend}
                </span>
              )}
            </div>

            <div
              className="text-2xl font-bold tabular-nums mb-0.5"
              style={{ color: valueColor }}
            >
              {stat.value ?? '—'}
            </div>
            <div className="text-xs font-medium text-gray-600">{stat.label}</div>
            <div className="text-xs text-gray-400 mt-0.5">{stat.sub}</div>

            {stat.alertLink && (
              <div className="mt-3 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => router.push('?tab=alerts')}
                  className="text-xs font-medium text-[#E24B4A] hover:underline transition-colors"
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
