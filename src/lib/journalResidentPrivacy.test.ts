import { describe, expect, it } from 'vitest';
import {
  lysJournalPrivacyPersistFields,
  normalizeLysJournalPrivacy,
} from './journalResidentPrivacy';

describe('normalizeLysJournalPrivacy', () => {
  it('only treats explicit shared as shared', () => {
    expect(normalizeLysJournalPrivacy('shared')).toBe('shared');
    expect(normalizeLysJournalPrivacy('private')).toBe('private');
    expect(normalizeLysJournalPrivacy(undefined)).toBe('private');
    expect(normalizeLysJournalPrivacy('PUBLIC')).toBe('private');
  });
});

describe('lysJournalPrivacyPersistFields', () => {
  it('marks private Lys journals as resident_private (not staff kladde)', () => {
    expect(lysJournalPrivacyPersistFields('private', '2026-08-01T12:00:00.000Z')).toEqual({
      is_resident_private: true,
      journal_status: 'resident_private',
      approved_at: null,
    });
  });

  it('marks shared Lys journals as approved for staff', () => {
    expect(lysJournalPrivacyPersistFields('shared', '2026-08-01T12:00:00.000Z')).toEqual({
      is_resident_private: false,
      journal_status: 'godkendt',
      approved_at: '2026-08-01T12:00:00.000Z',
    });
  });
});
