'use client';
import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import ResidentHeader from './ResidentHeader';
import MoodTrendChart from './MoodTrendChart';
import GoalProgress from './GoalProgress';
import MedicationList from './MedicationList';
import ShiftNotesFeed from './ShiftNotesFeed';
import ParkSummary from './ParkSummary';
import OpgaveWidget from '@/app/care-portal-dashboard/components/OpgaveWidget';

const tabs = [
  { id: 'overview', label: 'Overblik' },
  { id: 'park', label: 'PARK-data' },
  { id: 'goals', label: 'Mål' },
  { id: 'medication', label: 'Medicin' },
  { id: 'notes', label: 'Vagtnotat' },
];

export default function Resident360Client() {
  const searchParams = useSearchParams();
  const residentIdFromUrl = searchParams.get('id');
  const [activeTab, setActiveTab] = useState('overview');

  useEffect(() => {
    const t = searchParams.get('tab');
    if (t && tabs.some(tab => tab.id === t)) {
      setActiveTab(t);
    }
  }, [searchParams]);

  return (
    <div className="p-6 max-w-screen-2xl">
      <ResidentHeader />
      {/* Tab nav */}
      <div className="flex gap-1 bg-white border border-gray-200 rounded-lg p-1 mt-5 mb-5 w-fit">
        {tabs?.map(tab => (
          <button
            key={`tab360-${tab?.id}`}
            onClick={() => setActiveTab(tab?.id)}
            className={`px-4 py-2 rounded text-sm font-medium transition-all ${
              activeTab === tab?.id
                ? 'bg-[#0F1B2D] text-white'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {tab?.label}
          </button>
        ))}
      </div>
      {activeTab === 'overview' && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-5">
          <div className="xl:col-span-2 space-y-5">
            <MoodTrendChart />
            <ParkSummary />
          </div>
          <div className="space-y-5">
            <GoalProgress compact />
            <MedicationList compact />
            <OpgaveWidget residentIdFilter={residentIdFromUrl ?? 'res-001'} />
          </div>
        </div>
      )}
      {activeTab === 'park' && (
        <div className="space-y-5">
          <MoodTrendChart />
          <ParkSummary />
        </div>
      )}
      {activeTab === 'goals' && <GoalProgress />}
      {activeTab === 'medication' && <MedicationList />}
      {activeTab === 'notes' && <ShiftNotesFeed />}
    </div>
  );
}