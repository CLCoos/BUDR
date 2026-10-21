import { describe, expect, it } from 'vitest';
import { buildTimeline, dailyMood, medsToday, moodSummary, nextUp, ownWords } from './forloeb';

describe('dailyMood', () => {
  it('én værdi pr. dansk dag, nyeste vinder, huller er null', () => {
    const days = dailyMood(
      [
        { mood_score: 4, traffic_light: 'gul', created_at: '2026-10-20T06:00:00Z' },
        { mood_score: 7, traffic_light: 'grøn', created_at: '2026-10-20T18:00:00Z' },
        // 22:30 UTC = 00:30 dansk tid næste dag
        { mood_score: 2, traffic_light: 'rød', created_at: '2026-10-18T22:30:00Z' },
      ],
      '2026-10-20',
      3
    );
    expect(days).toEqual([
      { day: '2026-10-18', mood: null, traffic: null },
      { day: '2026-10-19', mood: 2, traffic: 'roed' },
      { day: '2026-10-20', mood: 7, traffic: 'groen' },
    ]);
  });
});

describe('moodSummary', () => {
  it('kræver mindst tre tjek-ind og ser trenden', () => {
    expect(moodSummary([{ day: 'a', mood: 5, traffic: null }])).toBeNull();
    const text = moodSummary([
      { day: 'a', mood: 3, traffic: 'roed' },
      { day: 'b', mood: 4, traffic: 'gul' },
      { day: 'c', mood: 6, traffic: 'groen' },
      { day: 'd', mood: 7, traffic: 'groen' },
    ]);
    expect(text).toBe('Humøret er steget de seneste 4 dage (4 tjek-ind). Én rød dag.');
  });
});

describe('buildTimeline', () => {
  it('blander notater, bekymringer og Lys, nyeste først, uden private notater', () => {
    const items = buildTimeline({
      journal: [
        {
          id: '1',
          entry_text: 'Rolig dag',
          category: 'Døgnnotat',
          created_at: '2026-10-20T10:00:00Z',
          staff_name: 'CC',
          journal_status: 'godkendt',
        },
        {
          id: '2',
          entry_text: 'Privat',
          category: 'Lys journal',
          created_at: '2026-10-20T11:00:00Z',
          staff_name: '',
          journal_status: 'resident_private',
        },
      ],
      concerns: [
        {
          id: '3',
          note: 'Sover dårligt',
          category: 'Søvn',
          staff_name: 'AB',
          created_at: '2026-10-19T10:00:00Z',
        },
      ],
      checkins: [
        {
          id: '4',
          traffic_light: 'grøn',
          free_text: null,
          mood_score: 8,
          created_at: '2026-10-20T12:00:00Z',
        },
        {
          id: '5',
          traffic_light: 'rød',
          free_text: 'Alt er tungt',
          mood_score: 2,
          created_at: '2026-10-20T13:00:00Z',
        },
      ],
    });
    expect(items.map((i) => i.id)).toEqual(['l-5', 'j-1', 'c-3']);
    expect(items[0]!.text).toBe('«Alt er tungt»');
  });
});

describe('ownWords', () => {
  it('tager de første udfyldte felter', () => {
    expect(
      ownWords({
        hope_dreams: ' Eget køkken ',
        hope_small_wishes: '',
        identity_proud_of: 'Min hund',
      })
    ).toEqual([
      { label: 'Drømmer om', text: 'Eget køkken' },
      { label: 'Er stolt af', text: 'Min hund' },
    ]);
    expect(ownWords(null)).toEqual([]);
  });
});

describe('medsToday', () => {
  it('givet, mangler efter 60 min, senere og ved behov', () => {
    const med = (id: string, time_group: string, time_label: string) => ({
      id,
      name: 'Med',
      dose: '1 tbl',
      time_group,
      time_label,
      status: 'aktiv',
    });
    // 12:00 UTC = 14:00 dansk sommertid
    const out = medsToday(
      [
        med('a', 'morgen', 'kl. 8.00'),
        med('b', 'middag', '12:30'),
        med('c', 'aften', ''),
        med('d', 'behoev', ''),
      ],
      new Set(['a']),
      new Date('2026-10-20T12:00:00Z')
    );
    expect(out.map((m) => [m.id, m.time, m.status])).toEqual([
      ['a', '08:00', 'givet'],
      ['b', '12:30', 'mangler'],
      ['c', '20:00', 'senere'],
      ['d', 'Ved behov', 'pn'],
    ]);
  });
});

describe('nextUp', () => {
  it('blander aftaler og frister, tidligste først', () => {
    const items = nextUp({
      today: '2026-10-20',
      residentId: 'r',
      appointments: [
        { id: '1', title: 'Lægetid', starts_at: '2026-10-21T08:30:00Z', location: null },
      ],
      documents: [
        { id: 'd1', title: 'Statusudtalelse', due_date: '2026-10-19' },
        { id: 'd2', title: 'Handleplan', due_date: '2026-11-03' },
      ],
    });
    expect(items.map((i) => [i.when, i.what])).toEqual([
      ['Frist overskredet (i går)', 'Statusudtalelse'],
      ['i morgen kl. 10:30', 'Lægetid'],
      ['Frist 3. nov.', 'Handleplan'],
    ]);
  });
});
