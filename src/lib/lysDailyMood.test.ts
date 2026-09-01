import { describe, expect, it } from 'vitest';
import {
  LYS_UI_TO_DB_TRAFFIC,
  lysStemningIndexToMoodScore,
  shouldCreateLowMoodAlert,
} from './lysDailyMood';

describe('lysStemningIndexToMoodScore', () => {
  it('maps the six Lys choices onto 1–10 (1 = worst)', () => {
    expect(lysStemningIndexToMoodScore(0)).toBe(10); // Fantastisk
    expect(lysStemningIndexToMoodScore(1)).toBe(8); // Godt
    expect(lysStemningIndexToMoodScore(2)).toBe(6); // Okay
    expect(lysStemningIndexToMoodScore(3)).toBe(4); // Lidt tungt
    expect(lysStemningIndexToMoodScore(4)).toBe(2); // Svært
    expect(lysStemningIndexToMoodScore(5)).toBe(1); // Meget svært
  });

  it('does not treat Fantastisk as 1/10 (the old selected+1 mapping)', () => {
    expect(lysStemningIndexToMoodScore(0)).toBeGreaterThan(7);
    expect(lysStemningIndexToMoodScore(0)).not.toBe(1);
  });

  it('rejects out-of-range indexes', () => {
    expect(lysStemningIndexToMoodScore(-1)).toBeNull();
    expect(lysStemningIndexToMoodScore(6)).toBeNull();
    expect(lysStemningIndexToMoodScore(1.5)).toBeNull();
  });
});

describe('shouldCreateLowMoodAlert', () => {
  it('does not alert on green/yellow Lys choices (Fantastisk–Lidt tungt)', () => {
    const greenYellow = [0, 1, 2, 3].map((i) => ({
      score: lysStemningIndexToMoodScore(i)!,
      traffic: LYS_UI_TO_DB_TRAFFIC[i < 2 ? 'groen' : 'gul'],
    }));
    for (const row of greenYellow) {
      expect(shouldCreateLowMoodAlert(row.score, row.traffic)).toBe(false);
    }
  });

  it('alerts on red Lys choices (Svært / Meget svært)', () => {
    expect(shouldCreateLowMoodAlert(2, 'rød')).toBe(true);
    expect(shouldCreateLowMoodAlert(1, 'rød')).toBe(true);
  });

  it('alerts on a 1–10 score of 3 or below even if traffic is not red', () => {
    expect(shouldCreateLowMoodAlert(3, 'gul')).toBe(true);
    expect(shouldCreateLowMoodAlert(1, 'grøn')).toBe(true);
  });
});
