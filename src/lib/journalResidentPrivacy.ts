/**
 * Lys journal privacy → persistence fields for journal_entries.
 * Private entries must never enter staff draft/approval queues.
 */
export type LysJournalPrivacy = 'private' | 'shared';

export function normalizeLysJournalPrivacy(value: unknown): LysJournalPrivacy {
  return value === 'shared' ? 'shared' : 'private';
}

export function lysJournalPrivacyPersistFields(
  privacy: LysJournalPrivacy,
  nowIso: string = new Date().toISOString()
): {
  is_resident_private: boolean;
  journal_status: 'kladde' | 'godkendt' | 'resident_private';
  approved_at: string | null;
} {
  if (privacy === 'shared') {
    return {
      is_resident_private: false,
      journal_status: 'godkendt',
      approved_at: nowIso,
    };
  }
  return {
    is_resident_private: true,
    journal_status: 'resident_private',
    approved_at: null,
  };
}
