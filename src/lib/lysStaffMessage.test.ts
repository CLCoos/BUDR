import { describe, expect, it } from 'vitest';
import {
  buildStaffMessageJournalRow,
  isDemoResidentId,
  omitMissingJournalInsertColumn,
  staffMessageNotificationRow,
} from './lysStaffMessage';

describe('isDemoResidentId', () => {
  it('treats demo cookie ids as demo', () => {
    expect(isDemoResidentId('demo-resident-001')).toBe(true);
  });

  it('treats live UUIDs as real residents', () => {
    expect(isDemoResidentId('550e8400-e29b-41d4-a716-446655440000')).toBe(false);
  });
});

describe('buildStaffMessageJournalRow', () => {
  it('writes an approved beboer message with org scope', () => {
    const row = buildStaffMessageJournalRow({
      residentId: '550e8400-e29b-41d4-a716-446655440000',
      displayName: 'Sara K.',
      entryText: 'Jeg har brug for hjælp til noget',
      orgId: '11111111-1111-1111-1111-111111111111',
      nowIso: '2026-08-22T11:00:00.000Z',
    });
    expect(row).toMatchObject({
      resident_id: '550e8400-e29b-41d4-a716-446655440000',
      staff_id: null,
      staff_name: 'Beboer: Sara K.',
      entry_text: 'Jeg har brug for hjælp til noget',
      category: 'Besked fra beboer',
      journal_status: 'godkendt',
      approved_at: '2026-08-22T11:00:00.000Z',
      approved_by: null,
      org_id: '11111111-1111-1111-1111-111111111111',
    });
  });
});

describe('omitMissingJournalInsertColumn', () => {
  it('drops journal_status when the column is missing on the live schema', () => {
    const payload = {
      entry_text: 'hjælp',
      journal_status: 'godkendt',
      approved_at: '2026-08-22T11:00:00.000Z',
    };
    const result = omitMissingJournalInsertColumn(
      payload,
      'column journal_entries.journal_status does not exist'
    );
    expect(result.omitted).toBe('journal_status');
    expect(result.payload).not.toHaveProperty('journal_status');
    expect(result.payload.approved_at).toBe('2026-08-22T11:00:00.000Z');
  });

  it('does not strip unrelated errors', () => {
    const payload = { journal_status: 'godkendt' };
    const result = omitMissingJournalInsertColumn(payload, 'insert or update on table violates FK');
    expect(result.omitted).toBeNull();
    expect(result.payload).toEqual(payload);
  });
});

describe('staffMessageNotificationRow', () => {
  it('uses CHECK-allowed type besked so AlertPanel can show the message', () => {
    const row = staffMessageNotificationRow({
      residentId: '550e8400-e29b-41d4-a716-446655440000',
      displayName: 'Sara K.',
      entryText: 'Jeg har brug for hjælp til noget',
      orgId: '11111111-1111-1111-1111-111111111111',
    });
    expect(row.type).toBe('besked');
    expect(row.severity).toBe('gul');
    expect(row.detail).toContain('Sara K.');
    expect(row.detail).toContain('Jeg har brug for hjælp til noget');
  });

  it('truncates long excerpts', () => {
    const long = 'x'.repeat(90);
    const row = staffMessageNotificationRow({
      residentId: '550e8400-e29b-41d4-a716-446655440000',
      displayName: null,
      entryText: long,
      orgId: null,
    });
    expect(row.detail).toContain('En beboer');
    expect(row.detail.length).toBeLessThan(long.length + 40);
  });
});
