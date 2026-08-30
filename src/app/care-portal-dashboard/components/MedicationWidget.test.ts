import { describe, expect, it } from 'vitest';
import { CARE_DEMO_RESIDENT_PROFILES } from '@/lib/careDemoResidents';
import { createMockEntries } from './MedicationWidget';

describe('createMockEntries', () => {
  it('uses resident ids that exist in the current pilot demo universe', () => {
    const knownResidentIds = new Set(CARE_DEMO_RESIDENT_PROFILES.map((resident) => resident.id));

    const entries = createMockEntries(new Date('2026-05-24T12:00:00.000Z').getTime());

    expect(entries.length).toBeGreaterThan(0);
    expect(entries.every((entry) => knownResidentIds.has(entry.residentId))).toBe(true);
  });
});
