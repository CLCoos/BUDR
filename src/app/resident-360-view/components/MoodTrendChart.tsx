'use client';
import React, { useEffect, useState } from 'react';
import {
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Area,
  AreaChart,
} from 'recharts';
import type { TooltipProps } from 'recharts';
import type { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent';
import { createClient } from '@/lib/supabase/client';

type TrafficUi = 'groen' | 'gul' | 'roed';
type TrafficDb = 'grøn' | 'gul' | 'rød';

const DB_TO_UI: Record<TrafficDb, TrafficUi> = {
  grøn: 'groen',
  gul: 'gul',
  rød: 'roed',
};

const TRAFFIC_COLORS: Record<TrafficUi, string> = {
  groen: '#22C55E',
  gul: '#EAB308',
  roed: '#EF4444',
};

const WEEKDAYS = ['Søn', 'Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør'];

function formatDayLabel(dateStr: string): string {
  const d = new Date(dateStr);
  return `${WEEKDAYS[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}`;
}

interface MoodRow {
  day: string;
  score: number;
  traffic: TrafficUi;
}

interface RawCheckin {
  mood_score: number;
  traffic_light: string;
  created_at: string;
}

type Props = { residentId: string };

export default function MoodTrendChart({ residentId }: Props) {
  const [chartData, setChartData] = useState<MoodRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!residentId) {
      setLoading(false);
      return;
    }
    const supabase = createClient();
    if (!supabase) {
      setLoading(false);
      return;
    }

    const since = new Date();
    since.setDate(since.getDate() - 6);
    since.setHours(0, 0, 0, 0);

    supabase
      .from('park_daily_checkin')
      .select('mood_score, traffic_light, created_at')
      .eq('resident_id', residentId)
      .gte('created_at', since.toISOString())
      .order('created_at', { ascending: false })
      .then(({ data }) => {
        const rows = (data ?? []) as RawCheckin[];

        // Build last-7-day slots; deduplicate by date (rows are desc so first = latest)
        const days = Array.from({ length: 7 }, (_, i) => {
          const d = new Date();
          d.setDate(d.getDate() - (6 - i));
          return d.toISOString().slice(0, 10);
        });

        const byDate = new Map<string, RawCheckin>();
        for (const row of rows) {
          const dateKey = row.created_at.slice(0, 10);
          if (!byDate.has(dateKey)) byDate.set(dateKey, row);
        }

        const mapped: MoodRow[] = [];
        for (const day of days) {
          const row = byDate.get(day);
          if (!row) continue;
          mapped.push({
            day: formatDayLabel(day),
            score: row.mood_score,
            traffic: DB_TO_UI[row.traffic_light as TrafficDb] ?? 'gul',
          });
        }

        setChartData(mapped);
        setLoading(false);
      });
  }, [residentId]);

  const avg =
    chartData.length > 0
      ? (chartData.reduce((s, d) => s + d.score, 0) / chartData.length).toFixed(1)
      : '—';

  // Tooltip defined as render function — closes over chartData
  const renderTooltip = ({ active, payload, label }: TooltipProps<ValueType, NameType>) => {
    if (!active || !payload?.length) return null;
    const score = payload[0].value as number;
    const item = chartData.find((d) => d.day === label);
    const tc = item ? TRAFFIC_COLORS[item.traffic] : '#6B7280';
    return (
      <div className="bg-white border border-gray-200 rounded-lg px-3 py-2.5 shadow-sm text-xs">
        <div className="font-semibold text-gray-700 mb-1">{label}</div>
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: tc }} />
          <span className="text-gray-600">
            Stemning: <strong className="tabular-nums">{score}/10</strong>
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-lg border border-gray-100 p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <div className="text-sm font-semibold text-gray-800">Stemningstrend · 7 dage</div>
          <div className="text-xs text-gray-500 mt-0.5">Daglig check-in score (1–10)</div>
        </div>
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-green-500" />
            Grøn
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-yellow-400" />
            Gul
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-red-500" />
            Rød
          </div>
        </div>
      </div>

      {loading ? (
        <div className="h-[200px] flex items-center justify-center">
          <div className="flex gap-1.5">
            {[0, 150, 300].map((delay) => (
              <div
                key={delay}
                className="w-2 h-2 rounded-full bg-gray-300 animate-bounce"
                style={{ animationDelay: `${delay}ms` }}
              />
            ))}
          </div>
        </div>
      ) : chartData.length === 0 ? (
        <div className="h-[200px] flex items-center justify-center text-sm text-gray-400">
          Ingen check-in data de seneste 7 dage
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={chartData} margin={{ top: 10, right: 10, bottom: 0, left: -20 }}>
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
              tickFormatter={(v) => (v as string).split(' ')[0]}
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
            <Tooltip content={renderTooltip} />
            <ReferenceLine y={4} stroke="#EF4444" strokeDasharray="4 4" strokeWidth={1} />
            <Area
              type="monotone"
              dataKey="score"
              stroke="#1D9E75"
              strokeWidth={2.5}
              fill="url(#moodGradient)"
              dot={(props: { cx: number; cy: number; index: number }) => {
                const item = chartData[props.index];
                const color = item ? TRAFFIC_COLORS[item.traffic] : '#1D9E75';
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
      )}

      <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
        <div className="text-xs text-gray-500">
          Gns. stemning:{' '}
          <span className="font-bold text-gray-800 tabular-nums">
            {avg}
            {typeof avg === 'string' && avg !== '—' ? '/10' : ''}
          </span>
        </div>
        <div className="text-xs text-gray-500">Rød linje = bekymringsgrænse (4)</div>
      </div>
    </div>
  );
}
