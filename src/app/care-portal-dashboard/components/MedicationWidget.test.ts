import { describe, expect, it } from 'vitest';
import { careDemoProfileById } from '@/lib/careDemoResidents';
import { createMockEntries } from './MedicationWidget';

describe('createMockEntries', () => {
  it('uses resident ids that exist in the current demo universe', () => {
    const entries = createMockEntries(new Date('2026-05-23T10:30:00+02:00').getTime());

    expect(entries.length).toBeGreaterThan(0);
    expect(entries.map((entry) => entry.residentId)).not.toContain('res-001');
    expect(entries.every((entry) => careDemoProfileById(entry.residentId))).toBe(true);
  });
});
