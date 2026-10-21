/**
 * Lys «I dag»: rene funktioner til forsiden (hurtigt tjek-ind, det næste, hvem er på arbejde,
 * kvittering fra personalet). Holdes uden React, så de kan testes.
 */
import type { LysTrafficUi } from '@/lib/lysDailyMood';

export type QuickMood = { label: string; score: number; traffic: LysTrafficUi };

/**
 * Fem valg på forsiden. Scorerne følger de eksisterende 1–10-værdier, så «Svært» og
 * «Meget svært» stadig giver personalet en alarm (score ≤ 3 eller rødt).
 */
export const LYS_QUICK_MOODS: readonly QuickMood[] = [
  { label: 'Rigtig godt', score: 10, traffic: 'groen' },
  { label: 'Godt', score: 8, traffic: 'groen' },
  { label: 'Okay', score: 6, traffic: 'gul' },
  { label: 'Svært', score: 2, traffic: 'roed' },
  { label: 'Meget svært', score: 1, traffic: 'roed' },
] as const;

/** Ord til en score fra både det nye og det gamle tjek-ind (6 valg). */
export function moodLabelFromScore(score: number): string {
  if (score >= 9) return 'Rigtig godt';
  if (score >= 7) return 'Godt';
  if (score >= 5) return 'Okay';
  if (score >= 3) return 'Lidt tungt';
  if (score >= 2) return 'Svært';
  return 'Meget svært';
}

export type PlanPoint = { id: string; title: string; time: string };

function toMinutes(hhmm: string): number {
  const [h, m] = hhmm.split(':').map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

/**
 * Det næste punkt i dagens plan: første ikke-klarede punkt, der ikke er mere end 30 minutter
 * forbi. Er alle de tidlige punkter sprunget over, vises det første ikke-klarede alligevel.
 */
export function nextPlanPoint(
  items: PlanPoint[],
  done: Set<string>,
  nowHhmm: string
): { next: PlanPoint | null; left: number; total: number } {
  const sorted = [...items].sort((a, b) => a.time.localeCompare(b.time));
  const open = sorted.filter((i) => !done.has(i.id));
  const now = toMinutes(nowHhmm);
  const next = open.find((i) => toMinutes(i.time) >= now - 30) ?? null;
  return { next, left: open.length, total: sorted.length };
}

export type OnCallItem = {
  shift: 'day' | 'evening' | 'night';
  staffName: string | null;
};

const SHIFT_END: Record<OnCallItem['shift'], string> = { day: '14', evening: '22', night: '6' };

/** «Mette er her til kl. 22» for den aktuelle vagt, eller null når ingen er sat på. */
export function onShiftLine(items: OnCallItem[], shift: OnCallItem['shift']): string | null {
  const names = items
    .filter((i) => i.shift === shift && i.staffName?.trim())
    .map((i) => i.staffName!.trim().split(/\s+/)[0]!);
  if (names.length === 0) return null;
  const who = names.length === 1 ? names[0] : `${names.slice(0, -1).join(', ')} og ${names.at(-1)}`;
  return `${who} er her til kl. ${SHIFT_END[shift]}`;
}

export type StaffMessageStatus = {
  sentAt: string;
  seenAt: string | null;
  seenBy: string | null;
};

function hhmm(iso: string): string {
  return new Date(iso)
    .toLocaleTimeString('da-DK', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Copenhagen',
    })
    .replace(':', '.');
}

/** Kvitteringen borgeren ser i Lys efter en besked til personalet. */
export function receiptText(s: StaffMessageStatus): { text: string; seen: boolean } {
  if (s.seenAt) {
    return {
      text: `${s.seenBy ?? 'Personalet'} har set din besked kl. ${hhmm(s.seenAt)}`,
      seen: true,
    };
  }
  return {
    text: `Din besked fra kl. ${hhmm(s.sentAt)} er sendt. Personalet ser den snart.`,
    seen: false,
  };
}
