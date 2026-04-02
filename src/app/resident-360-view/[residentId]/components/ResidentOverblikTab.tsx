'use client';

import React from 'react';
import Link from 'next/link';
import { Pill, FileText, CheckSquare, AlertTriangle } from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────

type TrafficUi = 'groen' | 'gul' | 'roed' | null;

interface JournalEntry {
  id: string;
  staff_name: string;
  entry_text: string;
  category: string;
  created_at: string;
}

interface PlanItem {
  id: string;
  title: string;
  done: boolean;
  time?: string;
}

interface Props {
  residentId: string;
  trafficLight: TrafficUi;
  moodScore: number | null;
  checkinNote: string | null;
  medicationGivenCount: number;
  medicationTotalCount: number;
  journalEntries: JournalEntry[];
  todayPlanItems: PlanItem[];
  pendingProposals: number;
}

// ── Colour helpers ────────────────────────────────────────────

const TL_CONFIG: Record<
  NonNullable<TrafficUi>,
  { label: string; color: string; bg: string; border: string }
> = {
  groen: { label: 'Grøn',  color: '#1D9E75', bg: '#E1F5EE', border: '#A8DFC9' },
  gul:   { label: 'Gul',   color: '#C78400', bg: '#FAEEDA', border: '#F5CC85' },
  roed:  { label: 'Rød',   color: '#C0392B', bg: '#FCEBEB', border: '#F5AAAA' },
};

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' });
}

// ── Component ────────────────────────────────────────────────

export default function ResidentOverblikTab({
  residentId,
  trafficLight,
  moodScore,
  checkinNote,
  medicationGivenCount,
  medicationTotalCount,
  journalEntries,
  todayPlanItems,
  pendingProposals,
}: Props) {
  const tlCfg = trafficLight ? TL_CONFIG[trafficLight] : null;
  const pendingItems = todayPlanItems.filter(i => !i.done);

  return (
    <div className="space-y-5">
      {/* ── Critical status row ─────────────────────────────── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Traffic light */}
        <div
          className="rounded-xl border p-4 flex flex-col gap-1"
          style={tlCfg ? { backgroundColor: tlCfg.bg, borderColor: tlCfg.border } : { backgroundColor: '#F9FAFB', borderColor: '#E5E7EB' }}
        >
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Trafiklys</span>
          {tlCfg ? (
            <div className="flex items-center gap-2 mt-1">
              <div className="w-4 h-4 rounded-full flex-shrink-0" style={{ backgroundColor: tlCfg.color }} />
              <span className="text-xl font-bold" style={{ color: tlCfg.color }}>{tlCfg.label}</span>
            </div>
          ) : (
            <span className="text-xl font-bold text-gray-400 mt-1">Ingen data</span>
          )}
          {checkinNote && (
            <p className="text-xs mt-1 line-clamp-2" style={{ color: tlCfg?.color ?? '#6B7280' }}>
              &ldquo;{checkinNote}&rdquo;
            </p>
          )}
        </div>

        {/* Mood score */}
        <div className="rounded-xl border border-gray-100 bg-white p-4 flex flex-col gap-1">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Stemning i dag</span>
          {moodScore !== null ? (
            <div className="mt-1">
              <div className="flex items-end gap-1">
                <span className="text-3xl font-extrabold text-gray-900">{moodScore}</span>
                <span className="text-sm text-gray-400 mb-1">/10</span>
              </div>
              <div className="mt-2 h-2 rounded-full bg-gray-100 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{
                    width: `${(moodScore / 10) * 100}%`,
                    backgroundColor: tlCfg?.color ?? '#9CA3AF',
                  }}
                />
              </div>
            </div>
          ) : (
            <span className="text-xl font-bold text-gray-400 mt-1">Ingen check-in</span>
          )}
        </div>

        {/* Medication summary */}
        <Link href={`/resident-360-view/${residentId}?tab=medicin`} className="block">
          <div className={`rounded-xl border p-4 flex flex-col gap-1 transition-colors hover:border-[#1D9E75] cursor-pointer ${
            medicationGivenCount === medicationTotalCount
              ? 'bg-[#E1F5EE] border-[#A8DFC9]'
              : 'bg-amber-50 border-amber-200'
          }`}>
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">Medicin i dag</span>
            <div className="flex items-center gap-2 mt-1">
              <Pill size={18} className={medicationGivenCount === medicationTotalCount ? 'text-[#1D9E75]' : 'text-amber-500'} />
              <span className={`text-xl font-bold ${medicationGivenCount === medicationTotalCount ? 'text-[#1D9E75]' : 'text-amber-600'}`}>
                {medicationGivenCount}/{medicationTotalCount}
              </span>
              <span className="text-xs text-gray-500">givet</span>
            </div>
            <span className="text-xs text-[#1D9E75] mt-1 font-medium">→ Administrer medicin</span>
          </div>
        </Link>
      </div>

      {/* ── Pending proposals alert ───────────────────────────── */}
      {pendingProposals > 0 && (
        <Link href={`/resident-360-view/${residentId}?tab=dagsplan`}>
          <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 cursor-pointer hover:bg-amber-100 transition-colors">
            <AlertTriangle size={15} className="text-amber-500 mt-0.5 flex-shrink-0" />
            <div>
              <span className="text-sm font-semibold text-amber-800">
                {pendingProposals} planforslag afventer godkendelse
              </span>
              <p className="text-xs text-amber-700 mt-0.5">Klik for at åbne Dagsplan og gennemse forslagene.</p>
            </div>
          </div>
        </Link>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
        {/* ── Today's plan items ─────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-100">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <CheckSquare size={15} className="text-[#7F77DD]" />
              <span className="text-sm font-semibold text-gray-800">Dagsplan i dag</span>
            </div>
            <Link
              href={`/resident-360-view/${residentId}?tab=dagsplan`}
              className="text-xs text-[#7F77DD] hover:underline font-medium"
            >
              Åbn →
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {todayPlanItems.length === 0 ? (
              <div className="px-4 py-5 text-xs text-gray-400 text-center">Ingen planpunkter i dag</div>
            ) : (
              todayPlanItems.slice(0, 6).map(item => (
                <div key={item.id} className="px-4 py-2.5 flex items-center gap-3">
                  <div className={`w-4 h-4 rounded flex items-center justify-center flex-shrink-0 ${
                    item.done ? 'bg-[#1D9E75]' : 'border-2 border-gray-200'
                  }`}>
                    {item.done && (
                      <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                        <path d="M2 5l2.5 2.5L8 3" stroke="white" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                      </svg>
                    )}
                  </div>
                  <span className={`text-sm flex-1 ${item.done ? 'text-gray-400 line-through' : 'text-gray-700'}`}>
                    {item.title}
                  </span>
                  {item.time && (
                    <span className="text-xs text-gray-400 flex-shrink-0">{item.time}</span>
                  )}
                </div>
              ))
            )}
            {pendingItems.length > 6 && (
              <div className="px-4 py-2 text-xs text-gray-400 text-center">
                +{pendingItems.length - 6} flere punkter
              </div>
            )}
          </div>
        </div>

        {/* ── Today's journal entries ───────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-100">
          <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <FileText size={15} className="text-[#378ADD]" />
              <span className="text-sm font-semibold text-gray-800">Journalnoter i dag</span>
            </div>
            <span className="text-xs text-gray-400">{journalEntries.length} noter</span>
          </div>
          <div className="divide-y divide-gray-50">
            {journalEntries.length === 0 ? (
              <div className="px-4 py-5 text-xs text-gray-400 text-center">Ingen journalnoter i dag</div>
            ) : (
              journalEntries.slice(0, 4).map(entry => (
                <div key={entry.id} className="px-4 py-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-semibold text-gray-700">{entry.staff_name}</span>
                    <span className="text-xs text-gray-400">{formatTime(entry.created_at)}</span>
                  </div>
                  <p className="text-xs text-gray-600 line-clamp-2">{entry.entry_text}</p>
                  {entry.category && (
                    <span className="inline-block mt-1 text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                      {entry.category}
                    </span>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
