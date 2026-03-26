'use client';
import React, { useState } from 'react';
import AlertPanel from './AlertPanel';
import ResidentList from './ResidentList';
import StatCards from './StatCards';
import { RefreshCw } from 'lucide-react';

export default function DashboardClient() {
  const [lastUpdated] = useState('26/03/2026 · 09:47');

  return (
    <div className="p-6 max-w-screen-2xl">
      {/* Page header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Dagsoverblik</h1>
          <div className="text-sm text-gray-500 mt-0.5">Bosted Nordlys · Dagvagt · Sara K.</div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 text-xs text-gray-400">
            <div className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
            Live · Opdateret {lastUpdated}
          </div>
          <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-200 text-xs text-gray-600 hover:bg-gray-100 transition-colors">
            <RefreshCw size={12} />
            Opdater
          </button>
        </div>
      </div>

      {/* Stat cards */}
      <StatCards />

      {/* Two-column layout */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-5 mt-5">
        <div className="xl:col-span-1">
          <AlertPanel />
        </div>
        <div className="xl:col-span-2">
          <ResidentList />
        </div>
      </div>
    </div>
  );
}