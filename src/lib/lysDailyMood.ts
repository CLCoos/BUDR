/**
 * Lys daglig stemning: UI har 6 valg, databasen bruger 1–10
 * (1 = værst, 10 = bedst). `POST /api/lys/daily-checkin` opretter
 * `lav_stemning` når score ≤ 3 eller trafiklys er rødt.
 */

export type LysTrafficUi = 'groen' | 'gul' | 'roed';
export type LysTrafficDb = 'grøn' | 'gul' | 'rød';

/** Index 0 = Fantastisk … 5 = Meget svært. Matcher `LysStemningskort` MOODS. */
export const LYS_STEMNING_MOOD_SCORES = [10, 8, 6, 4, 2, 1] as const;

export const LYS_UI_TO_DB_TRAFFIC: Record<LysTrafficUi, LysTrafficDb> = {
  groen: 'grøn',
  gul: 'gul',
  roed: 'rød',
};

export function lysStemningIndexToMoodScore(index: number): number | null {
  if (!Number.isInteger(index) || index < 0 || index >= LYS_STEMNING_MOOD_SCORES.length) {
    return null;
  }
  return LYS_STEMNING_MOOD_SCORES[index]!;
}

/** True når check-in skal oprette en ubekræftet lav_stemning-notifikation. */
export function shouldCreateLowMoodAlert(moodScore: number, trafficDb: string): boolean {
  return moodScore <= 3 || trafficDb === 'rød';
}
