import { describe, expect, it } from 'vitest';
import {
  canPersistPlanCompletion,
  defaultEmojiForCategory,
  isPlanItemActiveOnDate,
  isPlanYmd,
  normalizePlanTime,
  parseCreatePlanItemBody,
  parsePlanDateParam,
  parsePlanItemPatch,
  shouldRetryDailyPlansWithDateColumn,
} from './planItems';

describe('normalizePlanTime', () => {
  it('accepts HH:MM and HH:MM:SS', () => {
    expect(normalizePlanTime('09:00')).toBe('09:00');
    expect(normalizePlanTime('23:59:00')).toBe('23:59');
  });

  it('rejects invalid times', () => {
    expect(normalizePlanTime('9:00')).toBeNull();
    expect(normalizePlanTime('24:00')).toBeNull();
    expect(normalizePlanTime('')).toBeNull();
  });
});

describe('parsePlanDateParam', () => {
  it('accepts YYYY-MM-DD', () => {
    expect(parsePlanDateParam('2026-08-17')).toBe('2026-08-17');
    expect(isPlanYmd('2026-08-17')).toBe(true);
  });

  it('rejects other values', () => {
    expect(parsePlanDateParam('17-08-2026')).toBeNull();
    expect(parsePlanDateParam('')).toBeNull();
    expect(parsePlanDateParam(null)).toBeNull();
  });
});

describe('isPlanItemActiveOnDate', () => {
  const monday = new Date(2026, 7, 17, 12, 0, 0); // Mon 17 Aug 2026

  it('keeps one-off items on their active_from day only', () => {
    expect(
      isPlanItemActiveOnDate(
        {
          recurrence: 'none',
          recurrence_days: [],
          recurrence_week_parity: null,
          active_from: '2026-08-17',
          active_until: null,
        },
        monday
      )
    ).toBe(true);
    expect(
      isPlanItemActiveOnDate(
        {
          recurrence: 'none',
          recurrence_days: [],
          recurrence_week_parity: null,
          active_from: '2026-08-16',
          active_until: null,
        },
        monday
      )
    ).toBe(false);
  });

  it('keeps daily items after active_from', () => {
    expect(
      isPlanItemActiveOnDate(
        {
          recurrence: 'daily',
          recurrence_days: [0, 1, 2, 3, 4, 5, 6],
          recurrence_week_parity: null,
          active_from: '2026-08-10',
          active_until: null,
        },
        monday
      )
    ).toBe(true);
  });

  it('respects custom weekday lists (Monday = 0)', () => {
    expect(
      isPlanItemActiveOnDate(
        {
          recurrence: 'custom',
          recurrence_days: [0],
          recurrence_week_parity: null,
          active_from: '2026-08-01',
          active_until: null,
        },
        monday
      )
    ).toBe(true);
    expect(
      isPlanItemActiveOnDate(
        {
          recurrence: 'custom',
          recurrence_days: [1],
          recurrence_week_parity: null,
          active_from: '2026-08-01',
          active_until: null,
        },
        monday
      )
    ).toBe(false);
  });
});

describe('parseCreatePlanItemBody', () => {
  it('accepts a valid create payload', () => {
    const parsed = parseCreatePlanItemBody({
      title: ' Gåtur ',
      time: '09:30',
      category: 'aktivitet',
      recurrence: 'none',
      active_from: '2026-08-17',
    });
    expect(parsed).toMatchObject({
      title: 'Gåtur',
      time: '09:30',
      category: 'aktivitet',
      recurrence: 'none',
      active_from: '2026-08-17',
    });
  });

  it('rejects empty title and bad category', () => {
    expect(
      parseCreatePlanItemBody({
        title: '  ',
        time: '09:00',
        category: 'aktivitet',
        active_from: '2026-08-17',
      })
    ).toEqual({
      error: 'Titel er påkrævet',
    });
    expect(
      parseCreatePlanItemBody({
        title: 'X',
        time: '09:00',
        category: 'nope',
        active_from: '2026-08-17',
      })
    ).toEqual({
      error: 'Ugyldig kategori',
    });
  });
});

describe('parsePlanItemPatch', () => {
  const id = '550e8400-e29b-41d4-a716-446655440000';

  it('parses approve/reject', () => {
    expect(parsePlanItemPatch({ action: 'approve', id })).toEqual({ action: 'approve', id });
    expect(parsePlanItemPatch({ action: 'reject', id })).toEqual({ action: 'reject', id });
  });

  it('parses complete with date', () => {
    expect(parsePlanItemPatch({ action: 'complete', id, date: '2026-08-17' })).toEqual({
      action: 'complete',
      id,
      date: '2026-08-17',
    });
  });

  it('rejects unknown actions and missing ids', () => {
    expect(parsePlanItemPatch({ action: 'delete', id })).toEqual({ error: 'Ugyldig handling' });
    expect(parsePlanItemPatch({ action: 'approve' })).toEqual({ error: 'Mangler id' });
  });
});

describe('canPersistPlanCompletion', () => {
  it('only persists UUID plan item ids (FK to resident_plan_items)', () => {
    expect(canPersistPlanCompletion('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
    expect(canPersistPlanCompletion('plan-0')).toBe(false);
  });
});

describe('shouldRetryDailyPlansWithDateColumn', () => {
  it('retries when plan_date is missing from schema', () => {
    expect(shouldRetryDailyPlansWithDateColumn('column daily_plans.plan_date does not exist')).toBe(
      true
    );
    expect(shouldRetryDailyPlansWithDateColumn('permission denied')).toBe(false);
  });
});

describe('defaultEmojiForCategory', () => {
  it('maps known categories', () => {
    expect(defaultEmojiForCategory('medicin')).toBe('💊');
    expect(defaultEmojiForCategory('ukendt')).toBe('📌');
  });
});
