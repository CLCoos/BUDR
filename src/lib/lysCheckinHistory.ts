import { copenhagenYmd } from '@/lib/copenhagenDay';

export type LysCheckinHistoryRow = {
  created_at: string;
  mood_score: number | null;
};

export type LocalCheckinHistoryRow = {
  check_in_date: string;
  energy_level: number;
};

export type MoodHistoryBar = {
  date: string;
  label: string;
  value: number | null;
  dayName: string;
};

/** YYYY-MM-DD + hele kalenderdage (UTC-datoaritmetik, ikke lokal TZ). */
export function addCalendarDays(ymd: string, delta: number): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return ymd;
  const [y, m, d] = ymd.split('-').map((n) => Number(n));
  const dt = new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1));
  dt.setUTCDate(dt.getUTCDate() + delta);
  return dt.toISOString().slice(0, 10);
}

function daDayLabel(ymd: string): { label: string; dayName: string } {
  const dt = new Date(`${ymd}T12:00:00.000Z`);
  return {
    label: dt.toLocaleDateString('da-DK', {
      day: 'numeric',
      month: 'short',
      timeZone: 'Europe/Copenhagen',
    }),
    dayName: dt.toLocaleDateString('da-DK', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      timeZone: 'Europe/Copenhagen',
    }),
  };
}

export function buildMoodHistoryBars(
  byDate: Map<string, number>,
  options?: { days?: number; now?: Date }
): MoodHistoryBar[] {
  const days = options?.days ?? 14;
  const today = copenhagenYmd(options?.now ?? new Date());
  const result: MoodHistoryBar[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const key = addCalendarDays(today, -i);
    const labels = daDayLabel(key);
    result.push({
      date: key,
      label: labels.label,
      dayName: labels.dayName,
      value: byDate.get(key) ?? null,
    });
  }
  return result;
}

/** Seneste `mood_score` pr. københavnsk kalenderdag. */
export function moodScoresByCopenhagenDay(rows: LysCheckinHistoryRow[]): Map<string, number> {
  const sorted = [...rows].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );
  const map = new Map<string, number>();
  for (const row of sorted) {
    if (typeof row.mood_score !== 'number') continue;
    const created = new Date(row.created_at);
    if (Number.isNaN(created.getTime())) continue;
    map.set(copenhagenYmd(created), row.mood_score);
  }
  return map;
}

export function moodBarsFromLysCheckins(
  rows: LysCheckinHistoryRow[],
  options?: { days?: number; now?: Date }
): MoodHistoryBar[] {
  return buildMoodHistoryBars(moodScoresByCopenhagenDay(rows), options);
}

export function moodBarsFromLocalCheckins(
  rows: LocalCheckinHistoryRow[],
  options?: { days?: number; now?: Date }
): MoodHistoryBar[] {
  const map = new Map<string, number>();
  for (const row of rows) {
    if (!row.check_in_date || typeof row.energy_level !== 'number') continue;
    map.set(row.check_in_date, row.energy_level);
  }
  return buildMoodHistoryBars(map, options);
}
