'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import DailyCheckin from './DailyCheckin';
import ThoughtCatcher from './ThoughtCatcher';
import GoalLadder from './GoalLadder';
import ResourceFlower from './ResourceFlower';
import { Heart, Brain, Target, Flower2, LogOut } from 'lucide-react';

const tabs = [
  { id: 'checkin', label: 'Daglig check-in', icon: Heart },
  { id: 'thought', label: 'Tankefanger', icon: Brain },
  { id: 'goals', label: 'Mål', icon: Target },
  { id: 'flower', label: 'Ressourceblomst', icon: Flower2 },
];

interface Props {
  residentName?: string;
  residentInitials?: string;
  residentId?: string;
}

export default function ParkHubClient({ residentName = 'Beboer', residentInitials = '?', residentId = '' }: Props) {
  const [activeTab, setActiveTab] = useState('checkin');
  const router = useRouter();

  async function handleLogout() {
    await fetch('/api/resident-session', { method: 'DELETE' });
    router.replace(`/login/${residentId || 'unknown'}`);
  }

  return (
    <div className="max-w-md mx-auto px-4 pb-8">
      {/* Header */}
      <div className="pt-6 pb-4">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-full bg-[#7F77DD] flex items-center justify-center text-white font-bold text-sm">{residentInitials}</div>
          <div>
            <div className="text-xs text-gray-500">God morgen,</div>
            <div className="font-semibold text-gray-800 text-sm">{residentName}</div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <div className="flex items-center gap-1 bg-[#7F77DD]/10 rounded-full px-3 py-1">
              <span className="text-[#7F77DD] text-xs font-semibold">🔥 7 dage</span>
            </div>
            <button
              onClick={handleLogout}
              className="flex items-center justify-center w-8 h-8 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              aria-label="Log ud"
              title="Log ud"
            >
              <LogOut size={15} />
            </button>
          </div>
        </div>
        <div className="text-xs text-gray-500 mt-1">Torsdag 26. marts 2026 · Bosted Nordlys</div>
      </div>
      {/* PARK label */}
      <div className="bg-[#7F77DD] rounded-lg px-4 py-3 mb-4">
        <div className="text-white text-xs font-semibold tracking-widest uppercase mb-0.5">PARK</div>
        <div className="text-white/80 text-xs">Plan · Aktivitet · Ressourcer · Krop</div>
      </div>
      {/* Tab nav */}
      <div className="grid grid-cols-4 gap-1 bg-white rounded-lg p-1 mb-5 border border-gray-100">
        {tabs?.map(tab => {
          const active = activeTab === tab?.id;
          return (
            <button
              key={`tab-${tab?.id}`}
              onClick={() => setActiveTab(tab?.id)}
              className={`flex flex-col items-center gap-1 py-2 px-1 rounded-md text-xs font-medium transition-all ${
                active
                  ? 'bg-[#7F77DD] text-white'
                  : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'
              }`}
            >
              <tab.icon size={14} />
              <span className="leading-tight text-center" style={{ fontSize: 10 }}>
                {tab?.label?.split(' ')?.[0]}
              </span>
            </button>
          );
        })}
      </div>
      {/* Tab content */}
      <div>
        {activeTab === 'checkin' && <DailyCheckin />}
        {activeTab === 'thought' && <ThoughtCatcher />}
        {activeTab === 'goals' && <GoalLadder />}
        {activeTab === 'flower' && <ResourceFlower />}
      </div>
    </div>
  );
}