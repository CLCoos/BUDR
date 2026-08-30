import { describe, expect, it } from 'vitest';
import {
  lysVoiceJournalInsertFields,
  missingJournalColumn,
  parseVoiceJournalAiJson,
  voiceJournalClientPayload,
} from './voiceJournalDraft';

describe('parseVoiceJournalAiJson', () => {
  it('parses a bare JSON object', () => {
    const parsed = parseVoiceJournalAiJson(
      '{"journal_note":"Sara gik en tur.","recovery_story":"Jeg gik en tur."}'
    );
    expect(parsed).toEqual({
      journal_note: 'Sara gik en tur.',
      recovery_story: 'Jeg gik en tur.',
    });
  });

  it('strips markdown fences and trims', () => {
    const parsed = parseVoiceJournalAiJson(
      '```json\n{"journal_note":"  note  ","recovery_story":"  story  "}\n```'
    );
    expect(parsed?.journal_note).toBe('note');
    expect(parsed?.recovery_story).toBe('story');
  });

  it('rejects incomplete or invalid payloads', () => {
    expect(parseVoiceJournalAiJson('')).toBeNull();
    expect(parseVoiceJournalAiJson('not json')).toBeNull();
    expect(parseVoiceJournalAiJson('{"journal_note":"x"}')).toBeNull();
    expect(parseVoiceJournalAiJson('{"journal_note":"","recovery_story":"y"}')).toBeNull();
  });
});

describe('voiceJournalClientPayload', () => {
  it('aliases journal_note as content so the Lys preview is not blank', () => {
    const payload = voiceJournalClientPayload({
      journal_note: 'CHIME-notat',
      recovery_story: 'egne ord',
    });
    expect(payload.content).toBe('CHIME-notat');
    expect(payload.journal_note).toBe('CHIME-notat');
    expect(payload.recovery_story).toBe('egne ord');
  });
});

describe('lysVoiceJournalInsertFields', () => {
  it('stores PARK drafts as kladde, not silently godkendt', () => {
    const row = lysVoiceJournalInsertFields({
      residentId: '550e8400-e29b-41d4-a716-446655440000',
      staffName: 'Beboer (Lys AI): Sara',
      entryText: 'CHIME-notat',
      orgId: 'org-1',
    });
    expect(row.journal_status).toBe('kladde');
    expect(row.approved_at).toBeNull();
    expect(row.approved_by).toBeNull();
    expect(row.category).toBe('Lys journal');
    expect(row.entry_text).toBe('CHIME-notat');
  });
});

describe('missingJournalColumn', () => {
  it('detects PostgREST missing-column errors', () => {
    expect(missingJournalColumn('column journal_status does not exist', 'journal_status')).toBe(
      true
    );
    expect(
      missingJournalColumn(
        'Could not find the journal_status column in the schema cache',
        'journal_status'
      )
    ).toBe(true);
    expect(missingJournalColumn('row-level security', 'journal_status')).toBe(false);
  });
});
