import type { GardenPlot } from '@/types/local';

export type HavenStreak = { days: number; lastYmd: string };

const streakKey = (rid: string) => `budr_haven_streak_v1:${rid}`;
const wateredKey = (rid: string, ymd: string) => `budr_haven_watered:${rid}:${ymd}`;

function todayYmd(): string {
  return new Date().toISOString().slice(0, 10);
}

function yesterdayYmd(): string {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().slice(0, 10);
}

export function readHavenStreak(residentId: string): HavenStreak {
  if (!residentId) return { days: 0, lastYmd: '' };
  try {
    const raw = localStorage.getItem(streakKey(residentId));
    if (!raw) return { days: 0, lastYmd: '' };
    const p = JSON.parse(raw) as { days?: number; lastYmd?: string };
    const days = typeof p.days === 'number' && p.days >= 0 ? p.days : 0;
    const lastYmd = typeof p.lastYmd === 'string' ? p.lastYmd : '';
    return { days, lastYmd };
  } catch {
    return { days: 0, lastYmd: '' };
  }
}

/** Kald når borgeren har vandet mindst én gang i dag (succes). */
export function registerHavenWaterStreak(residentId: string): HavenStreak {
  if (!residentId) return { days: 0, lastYmd: '' };
  const t = todayYmd();
  const y = yesterdayYmd();
  const cur = readHavenStreak(residentId);
  let days = cur.days;
  if (cur.lastYmd === t) {
    /* allerede talt i dag */
  } else if (cur.lastYmd === y) {
    days = Math.max(1, cur.days + 1);
  } else if (cur.lastYmd === '') {
    days = 1;
  } else {
    days = 1;
  }
  const next = { days, lastYmd: t };
  try {
    localStorage.setItem(streakKey(residentId), JSON.stringify(next));
  } catch {
    /* ignore */
  }
  return next;
}

export function markWateredToday(residentId: string): void {
  if (!residentId) return;
  try {
    localStorage.setItem(wateredKey(residentId, todayYmd()), '1');
  } catch {
    /* ignore */
  }
}

export function hasWateredToday(residentId: string): boolean {
  if (!residentId) return false;
  try {
    return localStorage.getItem(wateredKey(residentId, todayYmd())) === '1';
  } catch {
    return false;
  }
}

export type HavenQuest = { id: string; label: string; done: boolean; emoji: string };

export function computeHavenQuests(
  residentId: string,
  plots: Pick<GardenPlot, 'plant_type' | 'goal_text'>[]
): HavenQuest[] {
  const watered = hasWateredToday(residentId);
  const types = new Set(plots.map((p) => p.plant_type));
  const hasGoal = plots.some((p) => (p.goal_text ?? '').trim().length > 0);
  return [
    {
      id: 'water',
      emoji: '💧',
      label: 'Vand haven i dag',
      done: watered,
    },
    {
      id: 'goal',
      emoji: '🎯',
      label: 'Giv en plante et mål (navn eller drøm)',
      done: hasGoal,
    },
    {
      id: 'diversity',
      emoji: '🌈',
      label: 'Mindst to slags planter i haven',
      done: types.size >= 2,
    },
  ];
}

const LEVEL_THRESHOLDS = [0, 100, 250, 500, 1000];

export function gardenerTitleForLevel(level: number): { title: string; sub: string } {
  const lv = Math.min(Math.max(level, 1), 5);
  const map: Record<number, { title: string; sub: string }> = {
    1: { title: 'Frøkigger', sub: 'Du er begyndt — hvert frø tæller' },
    2: { title: 'Spirervejleder', sub: 'Du finder formen' },
    3: { title: 'Havekunstner', sub: 'Farver og form — din stil' },
    4: { title: 'Skovvinge', sub: 'Haven følger din rytme' },
    5: { title: 'Lys-mestergartner', sub: 'Du får det til at gro' },
  };
  return map[lv] ?? map[1]!;
}

/** Samme tærskler som `dataService` LEVEL_THRESHOLDS. */
export function xpToNextLevel(totalXp: number): {
  level: number;
  current: number;
  next: number;
  pct: number;
} {
  let level = 1;
  for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
    if (totalXp >= (LEVEL_THRESHOLDS[i] ?? 0)) level = i + 1;
  }
  level = Math.min(level, 5);
  if (level >= 5) {
    return {
      level,
      current: LEVEL_THRESHOLDS[4] ?? 1000,
      next: LEVEL_THRESHOLDS[4] ?? 1000,
      pct: 100,
    };
  }
  const current = LEVEL_THRESHOLDS[level - 1] ?? 0;
  const next = LEVEL_THRESHOLDS[level] ?? current + 100;
  const span = next - current;
  const pct = span > 0 ? Math.min(100, ((totalXp - current) / span) * 100) : 0;
  return { level, current, next, pct };
}
