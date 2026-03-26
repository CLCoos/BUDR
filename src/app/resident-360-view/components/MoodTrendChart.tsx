'use client';
import React from 'react';
import { XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine, Area, AreaChart,  } from 'recharts';

const moodData = [
  { day: 'Man 20/3', score: 5, traffic: 'gul', checkin: true },
  { day: 'Tir 21/3', score: 7, traffic: 'groen', checkin: true },
  { day: 'Ons 22/3', score: 4, traffic: 'gul', checkin: true },
  { day: 'Tor 23/3', score: 3, traffic: 'roed', checkin: true },
  { day: 'Fre 24/3', score: 6, traffic: 'groen', checkin: true },
  { day: 'Lør 25/3', score: 8, traffic: 'groen', checkin: true },
  { day: 'Søn 26/3', score: 7, traffic: 'groen', checkin: true },
];

const trafficColors = { groen: '#22C55E', gul: '#EAB308', roed: '#EF4444' };

function CustomTooltip({ active, payload, label }: { active?: boolean; payload?: { value: number }[]; label?: string }) {
  if (!active || !payload?.length) return null;
  const score = payload[0].value;
  const item = moodData.find(d => d.day === label);
  const tc = item ? trafficColors[item.traffic as keyof typeof trafficColors] : '#6B7280';
  return (
    <div className="bg-white border border-gray-200 rounded-lg px-3 py-2.5 shadow-sm text-xs">
      <div className="font-semibold text-gray-700 mb-1">{label}</div>
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full" style={{ backgroundColor: tc }} />
        <span className="text-gray-600">Stemning: <strong className="tabular-nums">{score}/10</strong></span>
      </div>
    </div>
  );
}

export default function MoodTrendChart() {
  return (
    <div className="bg-white rounded-lg border border-gray-100 p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-sm font-semibold text-gray-800">Stemningstrend · 7 dage</div>
          <div className="text-xs text-gray-500 mt-0.5">Daglig check-in score (1–10)</div>
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-green-500" />Grøn</div>
          <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-yellow-400" />Gul</div>
          <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-red-500" />Rød</div>
        </div>
      </div>

      <ResponsiveContainer width="100%" height={200}>
        <AreaChart data={moodData} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
          <defs>
            <linearGradient id="moodGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="#1D9E75" stopOpacity={0.15} />
              <stop offset="95%" stopColor="#1D9E75" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" />
          <XAxis
            dataKey="day"
            tick={{ fontSize: 10, fill: '#9CA3AF', fontFamily: 'DM Sans' }}
            tickFormatter={v => v.split(' ')[0]}
            axisLine={false}
            tickLine={false}
          />
          <YAxis
            domain={[1, 10]}
            tick={{ fontSize: 10, fill: '#9CA3AF', fontFamily: 'DM Sans' }}
            axisLine={false}
            tickLine={false}
            ticks={[1, 3, 5, 7, 10]}
          />
          <Tooltip content={<CustomTooltip />} />
          <ReferenceLine y={4} stroke="#EF4444" strokeDasharray="4 4" strokeWidth={1} />
          <Area
            type="monotone"
            dataKey="score"
            stroke="#1D9E75"
            strokeWidth={2.5}
            fill="url(#moodGradient)"
            dot={(props) => {
              const item = moodData[props.index];
              const color = item ? trafficColors[item.traffic as keyof typeof trafficColors] : '#1D9E75';
              return (
                <circle
                  key={`dot-${props.index}`}
                  cx={props.cx}
                  cy={props.cy}
                  r={5}
                  fill={color}
                  stroke="white"
                  strokeWidth={2}
                />
              );
            }}
          />
        </AreaChart>
      </ResponsiveContainer>

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
        <div className="text-xs text-gray-500">Gns. stemning: <span className="font-bold text-gray-800 tabular-nums">5.7/10</span></div>
        <div className="text-xs text-gray-500">Rød linje = bekymringsgrænse (4)</div>
      </div>
    </div>
  );
}