import { describe, expect, it } from 'vitest';
import {
  givenAtByMedicationId,
  isMissingMedicationAdministrationsRelation,
  liveMedicationTaskId,
  parseLiveMedicationTaskId,
} from './medicationAdministration';

describe('liveMedicationTaskId / parseLiveMedicationTaskId', () => {
  const medId = '550e8400-e29b-41d4-a716-446655440000';

  it('round-trips medication id and Copenhagen civil date', () => {
    const id = liveMedicationTaskId(medId, '2026-08-23');
    expect(id).toBe(`live-${medId}-2026-08-23`);
    expect(parseLiveMedicationTaskId(id)).toEqual({
      medicationId: medId,
      ymd: '2026-08-23',
    });
  });

  it('rejects demo/mock ids so they stay local-only', () => {
    expect(parseLiveMedicationTaskId('mw-d1')).toBeNull();
    expect(parseLiveMedicationTaskId(`live-not-a-uuid-2026-08-23`)).toBeNull();
  });
});

describe('givenAtByMedicationId', () => {
  it('maps valid timestamps and skips invalid ones', () => {
    const medA = '550e8400-e29b-41d4-a716-446655440000';
    const medB = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';
    const map = givenAtByMedicationId([
      { medication_id: medA, given_at: '2026-08-23T07:15:00.000Z' },
      { medication_id: medB, given_at: 'not-a-date' },
    ]);
    expect(map.get(medA)?.toISOString()).toBe('2026-08-23T07:15:00.000Z');
    expect(map.has(medB)).toBe(false);
  });
});

describe('isMissingMedicationAdministrationsRelation', () => {
  it('detects a missing-table PostgREST error', () => {
    expect(
      isMissingMedicationAdministrationsRelation(
        "Could not find the table 'public.medication_administrations' in the schema cache"
      )
    ).toBe(true);
    expect(isMissingMedicationAdministrationsRelation('permission denied')).toBe(false);
  });
});
