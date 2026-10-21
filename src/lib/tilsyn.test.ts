import { describe, expect, it } from 'vitest';
import { buildTilsynSignals, tilsynHeadline, type TilsynInput } from './tilsyn';

const NOW = new Date('2026-10-20T12:00:00Z');
const base: TilsynInput = {
  today: '2026-10-20',
  journalDrafts: [],
  openDocuments: [],
  forceReports: [],
  residentsLastNote: [],
  lysRed: [],
  untransferredNotes: 0,
  now: NOW,
};

const tone = (input: Partial<TilsynInput>, key: string) =>
  buildTilsynSignals({ ...base, ...input }).find((s) => s.key === key)!.tone;

describe('buildTilsynSignals', () => {
  it('alt grønt uden data, og overskriften siger klar', () => {
    const signals = buildTilsynSignals(base);
    expect(signals.every((s) => s.tone === 'ok')).toBe(true);
    expect(tilsynHeadline(signals)).toEqual({
      tone: 'ok',
      text: 'I er klar. Intet kræver handling.',
    });
  });

  it('kun kladder over et døgn tæller som ventende godkendelse', () => {
    expect(tone({ journalDrafts: [{ createdAt: '2026-10-20T08:00:00Z' }] }, 'godkendelser')).toBe(
      'ok'
    );
    expect(tone({ journalDrafts: [{ createdAt: '2026-10-18T08:00:00Z' }] }, 'godkendelser')).toBe(
      'obs'
    );
  });

  it('overskredne frister er kritiske, frister inden for 14 dage er obs', () => {
    const doc = (dueDate: string) => ({
      id: 'd',
      residentId: 'r',
      residentName: 'Lars H.',
      title: 'Statusudtalelse',
      status: 'kladde',
      dueDate,
    });
    expect(tone({ openDocuments: [doc('2026-10-19')] }, 'frister')).toBe('kritisk');
    expect(tone({ openDocuments: [doc('2026-11-01')] }, 'frister')).toBe('obs');
    expect(tone({ openDocuments: [doc('2026-12-01')] }, 'frister')).toBe('ok');
  });

  it('ikke-godkendte magtanvendelser er kritiske', () => {
    const f = (status: string) => ({
      id: 'f',
      residentId: 'r',
      residentName: 'Mia H.',
      status,
      createdAt: '2026-10-10T10:00:00Z',
    });
    expect(tone({ forceReports: [f('kladde')] }, 'magtanvendelser')).toBe('kritisk');
    expect(tone({ forceReports: [f('godkendt')] }, 'magtanvendelser')).toBe('ok');
  });

  it('borgere uden notat i 7 dage', () => {
    const signals = buildTilsynSignals({
      ...base,
      residentsLastNote: [
        { residentId: 'a', name: 'A', lastNoteAt: '2026-10-19T10:00:00Z' },
        { residentId: 'b', name: 'B', lastNoteAt: '2026-10-01T10:00:00Z' },
        { residentId: 'c', name: 'C', lastNoteAt: null },
      ],
    });
    const notater = signals.find((s) => s.key === 'notater')!;
    expect(notater.tone).toBe('obs');
    expect(notater.items.map((i) => i.label)).toEqual(['B', 'C']);
    expect(tilsynHeadline(signals).tone).toBe('obs');
  });
});
