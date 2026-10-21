import { describe, expect, it } from 'vitest';
import {
  administrationYmd,
  doseOccasion,
  findNotGivenDoses,
  parseHhMmFromTimeLabel,
  scheduledHhMm,
  type ScheduledMedication,
} from './medicationSchedule';

const med = (id: string, time_group: string, time_label: string): ScheduledMedication => ({
  id,
  resident_id: 'r1',
  name: 'Quetiapin',
  dose: '50 mg',
  time_group,
  time_label,
});

describe('scheduledHhMm', () => {
  it('bruger klokkeslæt fra time_label, ellers tidsgruppens standard', () => {
    expect(parseHhMmFromTimeLabel('kl. 7.30')).toBe('07:30');
    expect(scheduledHhMm('morgen', 'Morgen')).toBe('08:00');
    expect(scheduledHhMm('aften', 'kl. 21:15')).toBe('21:15');
  });
});

describe('findNotGivenDoses', () => {
  // 08:45 UTC = 10:45 dansk sommertid, 13. okt
  const now = new Date('2026-10-13T08:45:00Z');

  it('finder faste doser 60–240 min over tid uden kvittering', () => {
    const result = findNotGivenDoses(
      [
        med('a', 'morgen', 'kl. 10:00'), // 45 min: for tidligt
        med('b', 'morgen', 'kl. 09:45'), // 60 min: alarm
        med('c', 'morgen', 'Morgen'), // 08:00, 165 min: alarm
        med('d', 'morgen', 'kl. 06:45'), // 240 min: for gammel
        med('e', 'behoev', 'kl. 09:00'), // PN: aldrig alarm
        med('f', 'middag', 'Middag'), // fremtid
      ],
      new Set(),
      now
    );
    expect(result.map((r) => r.medication.id)).toEqual(['b', 'c']);
    expect(result[0]).toMatchObject({ scheduledDate: '2026-10-13', hhmm: '09:45' });
  });

  it('springer doser over, der er registreret udleveret', () => {
    const result = findNotGivenDoses(
      [med('b', 'morgen', 'kl. 09:45')],
      new Set(['b|2026-10-13']),
      now
    );
    expect(result).toEqual([]);
  });

  it('lægger en aftendosis registreret efter midnat på gårsdagen', () => {
    // 22:45 UTC 13. okt = 00:45 dansk sommertid 14. okt
    const afterMidnight = new Date('2026-10-13T22:45:00Z');
    expect(administrationYmd(afterMidnight, '23:30')).toBe('2026-10-13');
    expect(administrationYmd(afterMidnight, '20:00')).toBe('2026-10-13');
    expect(doseOccasion(afterMidnight, 'aften', 'Aften')).toEqual({
      ymd: '2026-10-13',
      hhmm: '20:00',
    });
    // Morgen- og middagsdoser samme nat hører til den nye dag.
    expect(administrationYmd(afterMidnight, '08:00')).toBe('2026-10-14');
    expect(administrationYmd(afterMidnight, '12:30')).toBe('2026-10-14');

    // 21:00 UTC 13. okt = 23:00 dansk: aftendosis samme aften er i dag.
    const sameEvening = new Date('2026-10-13T21:00:00Z');
    expect(administrationYmd(sameEvening, '20:00')).toBe('2026-10-13');
    expect(administrationYmd(sameEvening, '23:30')).toBe('2026-10-13');

    // 05:59 UTC 14. okt = 07:59 dansk: overleveringen kan stadig kvittere gårsdagens aftendosis.
    expect(administrationYmd(new Date('2026-10-14T05:59:00Z'), '23:30')).toBe('2026-10-13');
    // 06:00 UTC 14. okt = 08:00 dansk: morgenmedicinen er nået, næste aftendosis er i dag.
    expect(administrationYmd(new Date('2026-10-14T06:00:00Z'), '23:30')).toBe('2026-10-14');
    expect(administrationYmd(new Date('2026-10-14T05:30:00Z'), '08:00')).toBe('2026-10-14');
  });

  it('fanger gårsdagens sene aftendosis efter midnat', () => {
    // 22:45 UTC 13. okt = 00:45 dansk tid 14. okt
    const result = findNotGivenDoses(
      [med('sen', 'aften', 'kl. 23:30'), med('tidlig', 'aften', 'Aften')],
      new Set(),
      new Date('2026-10-13T22:45:00Z')
    );
    expect(result.map((r) => [r.medication.id, r.scheduledDate])).toEqual([['sen', '2026-10-13']]);
  });
});
