import { describe, expect, it } from 'vitest';
import {
  addCalendarDays,
  moodBarsFromLocalCheckins,
  moodBarsFromLysCheckins,
  moodScoresByCopenhagenDay,
} from './lysCheckinHistory';

describe('addCalendarDays', () => {
  it('steps across month boundaries', () => {
    expect(addCalendarDays('2026-09-01', -1)).toBe('2026-08-31');
    expect(addCalendarDays('2026-02-28', 1)).toBe('2026-03-01');
  });
});

describe('moodScoresByCopenhagenDay', () => {
  it('places a late-UTC check-in on the Copenhagen civil day', () => {
    // 2026-09-02 22:30 UTC = 2026-09-03 00:30 in Europe/Copenhagen (CEST).
    const map = moodScoresByCopenhagenDay([
      { created_at: '2026-09-02T22:30:00.000Z', mood_score: 8 },
    ]);
    expect(map.get('2026-09-03')).toBe(8);
    expect(map.has('2026-09-02')).toBe(false);
  });

  it('keeps the latest mood when two check-ins share a civil day', () => {
    const map = moodScoresByCopenhagenDay([
      { created_at: '2026-09-03T08:00:00.000Z', mood_score: 4 },
      { created_at: '2026-09-03T14:00:00.000Z', mood_score: 9 },
    ]);
    expect(map.get('2026-09-03')).toBe(9);
  });

  it('skips null scores', () => {
    const map = moodScoresByCopenhagenDay([
      { created_at: '2026-09-03T10:00:00.000Z', mood_score: null },
    ]);
    expect(map.size).toBe(0);
  });
});

describe('moodBarsFromLysCheckins', () => {
  const noonCph = new Date('2026-09-03T10:00:00.000Z'); // 12:00 Copenhagen

  it('fills 14 days ending today and leaves empty days null', () => {
    const bars = moodBarsFromLysCheckins(
      [{ created_at: '2026-09-03T08:00:00.000Z', mood_score: 7 }],
      { days: 14, now: noonCph }
    );
    expect(bars).toHaveLength(14);
    expect(bars[0]?.date).toBe('2026-08-21');
    expect(bars[13]?.date).toBe('2026-09-03');
    expect(bars[13]?.value).toBe(7);
    expect(bars[12]?.value).toBeNull();
  });
});

describe('moodBarsFromLocalCheckins', () => {
  it('uses seeded check_in_date / energy_level for demo storage', () => {
    const bars = moodBarsFromLocalCheckins(
      [
        { check_in_date: '2026-09-03', energy_level: 8 },
        { check_in_date: '2026-09-01', energy_level: 5 },
      ],
      { days: 3, now: new Date('2026-09-03T10:00:00.000Z') }
    );
    expect(bars.map((b) => b.date)).toEqual(['2026-09-01', '2026-09-02', '2026-09-03']);
    expect(bars.map((b) => b.value)).toEqual([5, null, 8]);
  });
});
