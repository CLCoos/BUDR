'use client';
import React from 'react';
import { Users, CheckSquare, AlertTriangle, TrendingUp } from 'lucide-react';

const stats = [
  {
    id: 'stat-residents',
    label: 'Aktive beboere',
    value: '12',
    sub: '2 fraværende i dag',
    icon: Users,
    color: '#1D9E75',
    bg: '#E6F7F2',
    trend: null,
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
  },
  {
    id: 'stat-alerts',
    label: 'Åbne advarsler',
    value: '3',
    sub: '1 kritisk (rød)',
    icon: AlertTriangle,
    color: '#EF4444',
    bg: '#FEF2F2',
    trend: null,
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
  },
];

export default function StatCards() {
  return (
    <div className="grid grid-cols-2 xl:grid-cols-4 gap-4">
      {stats?.map(stat => (
        <div
          key={stat?.id}
          className="bg-white rounded-lg p-4 border border-gray-100 hover:border-gray-200 transition-all"
        >
          <div className="flex items-start justify-between mb-3">
            <div
              className="w-9 h-9 rounded-lg flex items-center justify-center"
              style={{ backgroundColor: stat?.bg }}
            >
              <stat.icon size={18} style={{ color: stat?.color }} />
            </div>
            {stat?.trend && (
              <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${
                stat?.trend?.startsWith('+') ? 'bg-green-50 text-green-600' : 'bg-red-50 text-red-500'
              }`}>
                {stat?.trend}
              </span>
            )}
          </div>
          <div className="text-2xl font-bold tabular-nums text-gray-900 mb-0.5">{stat?.value}</div>
          <div className="text-xs font-medium text-gray-600">{stat?.label}</div>
          <div className="text-xs text-gray-400 mt-0.5">{stat?.sub}</div>
        </div>
      ))}
    </div>
  );
}