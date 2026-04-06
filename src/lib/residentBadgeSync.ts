/**
 * Centraliseret optjening af badges ud fra aktivitet (kaldes efter relevante handlinger).
 */
import type { StorageMode } from '@/types/local';
import * as dataService from '@/lib/dataService';

/** Matcher `saveCheckin` i dataService (`toISOString().slice(0,10)`). */
function todayYmdForCheckins(): string {
  return new Date().toISOString().slice(0, 10);
}

function prevYmd(ymd: string): string {
  const [y, mo, da] = ymd.split('-').map((n) => Number(n));
  const dt = new Date(y, mo - 1, da);
  dt.setDate(dt.getDate() - 1);
  const yy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, '0');
  const dd = String(dt.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

/** Antal på hinanden følgende kalenderdage med tjek-ind, regnet baglæns fra `todayYmd`. */
function checkinStreakFrom(byDay: Map<string, number>, todayYmd: string): number {
  let n = 0;
  let cur = todayYmd;
  while (byDay.has(cur)) {
    n++;
    cur = prevYmd(cur);
  }
  return n;
}

/** Seneste 7 kalenderdage (inkl. i dag) har alle tjek-ind med energi >= minEnergy. */
function lastSevenDaysAllAtLeast(
  byDay: Map<string, number>,
  todayYmd: string,
  minEnergy: number
): boolean {
  let cur = todayYmd;
  for (let i = 0; i < 7; i++) {
    const e = byDay.get(cur);
    if (e === undefined || e < minEnergy) return false;
    cur = prevYmd(cur);
  }
  return true;
}

export async function syncBadgesAfterCheckin(mode: StorageMode, activeId: string): Promise<void> {
  if (!activeId) return;
  try {
    const rows = await dataService.getCheckins(mode, activeId);
    const byDay = new Map<string, number>();
    for (const c of rows) {
      if (!byDay.has(c.check_in_date)) byDay.set(c.check_in_date, c.energy_level);
    }
    const today = todayYmdForCheckins();
    const streak = checkinStreakFrom(byDay, today);
    const distinct = byDay.size;

    if (distinct >= 1) await dataService.earnBadge(mode, activeId, 'first_checkin');
    if (streak >= 3) await dataService.earnBadge(mode, activeId, 'checkin_streak_3');
    if (streak >= 7) {
      await dataService.earnBadge(mode, activeId, 'week_streak');
      await dataService.earnBadge(mode, activeId, 'consistent_7');
    }
    if (streak >= 14) await dataService.earnBadge(mode, activeId, 'fortnight_fire');
    if (distinct >= 10) await dataService.earnBadge(mode, activeId, 'checkin_10_days');
    if (distinct >= 30) await dataService.earnBadge(mode, activeId, 'checkin_30_days');
    if (lastSevenDaysAllAtLeast(byDay, today, 4)) {
      await dataService.earnBadge(mode, activeId, 'calm_week');
    }

    await syncXpMilestoneBadges(mode, activeId);
  } catch {
    /* ignore */
  }
}

export async function syncBadgesAfterJournal(
  mode: StorageMode,
  activeId: string,
  totalEntries: number,
  lastEntryLength: number
): Promise<void> {
  if (!activeId) return;
  try {
    if (totalEntries >= 1) {
      await dataService.earnBadge(mode, activeId, 'journal_debut');
      await dataService.earnBadge(mode, activeId, 'first_journal');
    }
    if (totalEntries >= 5) await dataService.earnBadge(mode, activeId, 'journal_5');
    if (totalEntries >= 25) await dataService.earnBadge(mode, activeId, 'journal_25');
    if (lastEntryLength >= 220) await dataService.earnBadge(mode, activeId, 'brave');
    await syncXpMilestoneBadges(mode, activeId);
  } catch {
    /* ignore */
  }
}

export async function syncBadgesAfterGardenPlots(
  mode: StorageMode,
  activeId: string,
  plotCount: number
): Promise<void> {
  if (!activeId) return;
  try {
    if (plotCount >= 1) await dataService.earnBadge(mode, activeId, 'garden_first');
    await syncXpMilestoneBadges(mode, activeId);
  } catch {
    /* ignore */
  }
}

export async function syncBadgesAfterHavenWaterStreak(
  mode: StorageMode,
  activeId: string,
  streakDays: number
): Promise<void> {
  if (!activeId) return;
  try {
    if (streakDays >= 3) await dataService.earnBadge(mode, activeId, 'haven_water_streak_3');
    if (streakDays >= 7) await dataService.earnBadge(mode, activeId, 'haven_water_streak_7');
  } catch {
    /* ignore */
  }
}

export async function syncPlannerBadgeProgress(mode: StorageMode, activeId: string): Promise<void> {
  if (!activeId) return;
  try {
    const items = await dataService.getPlanItems(mode, activeId);
    const own = items.filter((i) => i.created_by === 'resident');
    const n = own.length;
    if (n >= 1) await dataService.earnBadge(mode, activeId, 'planner_first');
    if (n >= 5) await dataService.earnBadge(mode, activeId, 'planner_5');
    if (n >= 10) await dataService.earnBadge(mode, activeId, 'planner_10');
    await syncXpMilestoneBadges(mode, activeId);
  } catch {
    /* ignore */
  }
}

export async function syncXpMilestoneBadges(mode: StorageMode, activeId: string): Promise<void> {
  if (!activeId) return;
  try {
    const { total_xp } = await dataService.getXp(mode, activeId);
    if (total_xp >= 100) await dataService.earnBadge(mode, activeId, 'xp_100');
    if (total_xp >= 250) await dataService.earnBadge(mode, activeId, 'xp_250');
    if (total_xp >= 500) await dataService.earnBadge(mode, activeId, 'xp_500');
    if (total_xp >= 1000) await dataService.earnBadge(mode, activeId, 'xp_1000');
  } catch {
    /* ignore */
  }
}

/** Efter vellykket svar fra Lys-chat (undgår gentagne upserts hvis allerede optjent). */
export async function tryEarnFirstChatBadge(mode: StorageMode, activeId: string): Promise<void> {
  if (!activeId) return;
  try {
    const badges = await dataService.getBadges(mode, activeId);
    if (!badges.some((b) => b.badge_key === 'first_chat')) {
      await dataService.earnBadge(mode, activeId, 'first_chat');
    }
    await syncXpMilestoneBadges(mode, activeId);
  } catch {
    /* ignore */
  }
}

export async function tryEarnKrapMasterBadge(mode: StorageMode, activeId: string): Promise<void> {
  if (!activeId) return;
  try {
    const badges = await dataService.getBadges(mode, activeId);
    if (!badges.some((b) => b.badge_key === 'krap_master')) {
      await dataService.earnBadge(mode, activeId, 'krap_master');
    }
    await syncXpMilestoneBadges(mode, activeId);
  } catch {
    /* ignore */
  }
}
