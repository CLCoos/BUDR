import { describe, expect, it } from 'vitest';
import { copenhagenDateString, minutesLate } from './medicationReminders';

describe('copenhagenDateString', () => {
  it('bruger dansk kalenderdag, ikke UTC', () => {
    // 23:30 UTC 13. okt = 01:30 dansk sommertid 14. okt
    expect(copenhagenDateString(new Date('2026-10-13T23:30:00Z'))).toBe('2026-10-14');
  });
});

describe('minutesLate', () => {
  it('regner i dansk tid', () => {
    // 08:45 UTC = 10:45 dansk sommertid
    expect(minutesLate(new Date('2026-10-13T08:45:00Z'), '10:00:00')).toBe(45);
    expect(minutesLate(new Date('2026-10-13T08:45:00Z'), '11:00')).toBe(-15);
  });
  it('returnerer null ved ugyldigt klokkeslæt', () => {
    expect(minutesLate(new Date(), 'x')).toBeNull();
  });
});
