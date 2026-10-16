import { describe, expect, it } from 'vitest';
import {
  cleanNoteText,
  fagsystemDateTime,
  formatNoteForFagsystem,
  formatNotesForFagsystem,
  groupNotesByResident,
  type FagsystemNote,
} from './format';

const note = (over: Partial<FagsystemNote>): FagsystemNote => ({
  id: 'n1',
  resident_id: 'r1',
  staff_name: 'Anna Jensen',
  entry_text: 'Lars var til lægen.',
  category: 'Sundhed',
  created_at: '2026-10-15T12:32:00Z',
  ...over,
});

describe('fagsystem-format', () => {
  it('dato og tid i dansk tid, også om vinteren', () => {
    expect(fagsystemDateTime('2026-10-15T12:32:00Z')).toBe('15.10.2026 kl. 14.32');
    expect(fagsystemDateTime('2026-12-01T07:05:00Z')).toBe('01.12.2026 kl. 08.05');
  });

  it('med og uden overskrift', () => {
    expect(formatNoteForFagsystem(note({}), true)).toBe(
      '15.10.2026 kl. 14.32 · Sundhed · Skrevet af Anna Jensen\nLars var til lægen.'
    );
    expect(formatNoteForFagsystem(note({}), false)).toBe('Lars var til lægen.');
    expect(formatNoteForFagsystem(note({ category: null, staff_name: ' ' }), true)).toBe(
      '15.10.2026 kl. 14.32\nLars var til lægen.'
    );
  });

  it('rydder tekst uden at fjerne afsnit', () => {
    expect(cleanNoteText('  Første  \r\n\r\n\r\n\r\nAnden\t\n')).toBe('Første\n\nAnden');
  });

  it('flere notater ældste først', () => {
    const text = formatNotesForFagsystem(
      [
        note({ id: 'b', entry_text: 'Aften', created_at: '2026-10-15T18:00:00Z' }),
        note({ id: 'a', entry_text: 'Morgen', created_at: '2026-10-15T06:00:00Z' }),
      ],
      false
    );
    expect(text).toBe('Morgen\n\nAften');
  });

  it('grupperer pr. borger sorteret efter navn', () => {
    const groups = groupNotesByResident(
      [note({ id: '1', resident_id: 'r2' }), note({ id: '2', resident_id: 'r1' })],
      (id) => (id === 'r1' ? 'Åse' : 'Bo')
    );
    expect(groups.map((g) => g.name)).toEqual(['Bo', 'Åse']);
  });
});
