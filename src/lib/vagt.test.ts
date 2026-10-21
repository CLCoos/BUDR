import { describe, expect, it } from 'vitest';
import { defaultMoment, lysConcerns, minutesIntoShift, previousHandovers } from './vagt';

// Oktober 2026 er sommertid: dansk tid = UTC + 2.
const dk = (hhmm: string, day = '2026-10-20') => {
  const [h, m] = hhmm.split(':').map(Number);
  return new Date(Date.UTC(2026, 9, Number(day.slice(8)), h! - 2, m!));
};

describe('vagtens øjeblik', () => {
  it('Mød ind i første time, Gå hjem i sidste', () => {
    expect(defaultMoment('dag', dk('07:20'))).toBe('moed');
    expect(defaultMoment('dag', dk('11:00'))).toBe('nu');
    expect(defaultMoment('dag', dk('14:10'))).toBe('hjem');
    expect(defaultMoment('aften', dk('15:05'))).toBe('moed');
    expect(defaultMoment('nat', dk('06:30'))).toBe('hjem');
    expect(defaultMoment('nat', dk('02:00'))).toBe('nu');
  });

  it('natten går over midnat', () => {
    expect(minutesIntoShift('nat', dk('23:30'))).toBe(30);
    expect(minutesIntoShift('nat', dk('01:00'))).toBe(120);
  });
});

describe('previousHandovers', () => {
  const row = (
    resident: string,
    label: string,
    date: string,
    at: string,
    flag: string | null = null
  ) => ({
    resident_id: resident,
    shift_label: label,
    shift_date: date,
    body: `${resident} ${label}`,
    flag_color: flag,
    updated_at: at,
  });

  it('springer den aktuelle vagt over og tager nyeste pr. borger, røde først', () => {
    const out = previousHandovers(
      [
        row('a', 'dag', '2026-10-20', '2026-10-20T08:00:00Z'),
        row('a', 'nat', '2026-10-20', '2026-10-20T04:00:00Z'),
        row('a', 'aften', '2026-10-19', '2026-10-19T20:00:00Z'),
        row('b', 'nat', '2026-10-20', '2026-10-20T03:00:00Z', 'roed'),
        { ...row('c', 'nat', '2026-10-20', '2026-10-20T03:00:00Z'), body: '  ' },
      ],
      { shiftDate: '2026-10-20', shiftLabel: 'dag' }
    );
    expect(out.map((r) => `${r.resident_id}:${r.shift_label}`)).toEqual(['b:nat', 'a:nat']);
  });

  it('dagvagten ser hele nattevagten, også linjen der blev stemplet efter midnat', () => {
    const out = previousHandovers(
      [
        row('a', 'nat', '2026-10-20', '2026-10-20T21:40:00.000Z', 'roed'),
        {
          ...row('a', 'nat', '2026-10-21', '2026-10-20T23:10:00.000Z'),
          body: 'Væk ham kl. 6',
        },
        row('a', 'aften', '2026-10-20', '2026-10-20T16:00:00.000Z'),
      ],
      { shiftDate: '2026-10-21', shiftLabel: 'dag' }
    );
    expect(out).toHaveLength(1);
    expect(out[0]?.shift_label).toBe('nat');
    expect(out[0]?.shift_date).toBe('2026-10-20');
    expect(out[0]?.body).toBe('a nat\nVæk ham kl. 6');
    expect(out[0]?.flag_color).toBe('roed');
  });
});

describe('lysConcerns', () => {
  it('bruger kun seneste tjek-ind pr. borger', () => {
    const out = lysConcerns([
      { resident_id: 'a', traffic_light: 'rød', mood_score: 2, created_at: '2026-10-20T01:00:00Z' },
      {
        resident_id: 'a',
        traffic_light: 'grøn',
        mood_score: 7,
        created_at: '2026-10-20T06:00:00Z',
      },
      { resident_id: 'b', traffic_light: 'gul', mood_score: 4, created_at: '2026-10-20T05:00:00Z' },
      { resident_id: 'c', traffic_light: 'rød', mood_score: 3, created_at: '2026-10-20T02:00:00Z' },
    ]);
    expect(out.map((r) => r.resident_id)).toEqual(['c', 'b']);
  });
});
