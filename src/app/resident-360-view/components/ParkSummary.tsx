'use client';
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from 'recharts';

const checkInHistory = [
  { day: 'Man', score: 5 },
  { day: 'Tir', score: 7 },
  { day: 'Ons', score: 4 },
  { day: 'Tor', score: 3 },
  { day: 'Fre', score: 6 },
  { day: 'Lør', score: 8 },
  { day: 'Søn', score: 7 },
];

const resourceData = [
  { label: 'Krop', score: 3 },
  { label: 'Familie', score: 4 },
  { label: 'Venner', score: 2 },
  { label: 'Fritid', score: 4 },
  { label: 'Arbejde', score: 1 },
  { label: 'Økonomi', score: 2 },
  { label: 'Bolig', score: 5 },
  { label: 'Andet', score: 3 },
];

const latestThought = {
  situation: 'Var til gruppesamtale og sagde noget jeg fortrød',
  thought: 'Alle synes jeg er mærkelig',
  emotion: 'Skam',
  intensityBefore: 7,
  intensityAfter: 4,
  counterThought: 'En enkelt kommentar definerer ikke hvem du er. De andre tænker formentlig ikke på det.',
  date: '25/03/2026',
};

export default function ParkSummary() {
  return (
    <div className="space-y-4">
      {/* PARK framework overview */}
      <div className="bg-white rounded-lg border border-gray-100 p-5">
        <div className="text-sm font-semibold text-gray-800 mb-4">PARK-overblik · Seneste 7 dage</div>
        <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 mb-5">
          {[
            { label: 'Plan', value: '3 aktive mål', sub: '2 trin gennemført', color: '#7F77DD' },
            { label: 'Aktivitet', value: '7/7 check-in', sub: 'Fuld stribe!', color: '#1D9E75' },
            { label: 'Ressourcer', value: 'Gns. 3.1/5', sub: 'Bolig stærkest', color: '#F59E0B' },
            { label: 'Krop', value: '3/5', sub: 'Stabil', color: '#EC4899' },
          ]?.map(item => (
            <div key={`park-${item?.label}`} className="bg-gray-50 rounded-lg p-3">
              <div className="text-xs font-semibold mb-1" style={{ color: item?.color }}>{item?.label}</div>
              <div className="text-sm font-bold text-gray-800">{item?.value}</div>
              <div className="text-xs text-gray-500 mt-0.5">{item?.sub}</div>
            </div>
          ))}
        </div>

        {/* Check-in bar chart */}
        <div className="mb-1">
          <div className="text-xs font-medium text-gray-600 mb-2">Stemningsscore pr. dag</div>
          <ResponsiveContainer width="100%" height={80}>
            <BarChart data={checkInHistory} margin={{ top: 0, right: 0, bottom: 0, left: -30 }}>
              <XAxis dataKey="day" tick={{ fontSize: 10, fill: '#9CA3AF' }} axisLine={false} tickLine={false} />
              <YAxis domain={[0, 10]} tick={false} axisLine={false} tickLine={false} />
              <Tooltip
                content={({ active, payload, label }) =>
                  active && payload?.length ? (
                    <div className="bg-white border border-gray-200 rounded px-2 py-1 text-xs shadow-sm">
                      {label}: <strong>{payload?.[0]?.value}/10</strong>
                    </div>
                  ) : null
                }
              />
              <Bar dataKey="score" fill="#1D9E75" radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
      {/* Resource profile */}
      <div className="bg-white rounded-lg border border-gray-100 p-5">
        <div className="text-sm font-semibold text-gray-800 mb-3">Ressourceprofil</div>
        <div className="space-y-2">
          {resourceData?.map(r => (
            <div key={`res-${r?.label}`} className="flex items-center gap-3">
              <div className="w-16 text-xs text-gray-600 flex-shrink-0">{r?.label}</div>
              <div className="flex-1 h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{ width: `${(r?.score / 5) * 100}%`, backgroundColor: '#7F77DD' }}
                />
              </div>
              <div className="w-6 text-xs font-bold tabular-nums text-right" style={{ color: '#7F77DD' }}>{r?.score}</div>
            </div>
          ))}
        </div>
      </div>
      {/* Latest thought catch */}
      <div className="bg-white rounded-lg border border-gray-100 p-5">
        <div className="text-sm font-semibold text-gray-800 mb-3">Seneste tankefanger · {latestThought?.date}</div>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-xs font-medium text-gray-500 mb-1">Situation</div>
              <div className="text-sm text-gray-700">{latestThought?.situation}</div>
            </div>
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-xs font-medium text-gray-500 mb-1">Automatisk tanke</div>
              <div className="text-sm text-gray-700">{latestThought?.thought}</div>
            </div>
          </div>
          <div className="bg-[#F5F4FF] rounded-lg p-3">
            <div className="text-xs font-medium text-[#7F77DD] mb-1">AI-modtanke (Lys)</div>
            <div className="text-sm text-gray-700">{latestThought?.counterThought}</div>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-xs text-gray-500">
              Intensitet: <span className="font-bold text-red-500">{latestThought?.intensityBefore}</span> → <span className="font-bold text-green-600">{latestThought?.intensityAfter}</span>
            </div>
            <div className="text-xs text-green-600 font-medium">↓ {latestThought?.intensityBefore - latestThought?.intensityAfter} point reduktion</div>
          </div>
        </div>
      </div>
    </div>
  );
}