import { describe, expect, it } from 'vitest';
import {
  buildPlannerInsertRow,
  clipPlannerText,
  defaultPlannerEndsAt,
  isPlannerAppointmentType,
  parsePlannerEntry,
  plannerDayWindow,
  plannerInsertNeedsColumnFallback,
  plannerInsertWithoutExtendedColumns,
} from './plannerEntries';

describe('plannerEntries', () => {
  it('accepts known appointment types and rejects demo ids', () => {
    expect(isPlannerAppointmentType('laege')).toBe(true);
    expect(isPlannerAppointmentType('intern')).toBe(true);
    expect(isPlannerAppointmentType('res-sara')).toBe(false);
    expect(isPlannerAppointmentType('')).toBe(false);
  });

  it('clips titles so silent truncation is explicit', () => {
    expect(clipPlannerText('  læge  ', 20)).toBe('læge');
    expect(clipPlannerText('x'.repeat(12), 8)).toBe('xxxxxxxx');
  });

  it('builds an org-scoped insert without broadcasting to residents', () => {
    const orgId = '550e8400-e29b-41d4-a716-446655440000';
    const residentId = '21111111-1111-1111-1111-111111111111';
    const scheduledAt = new Date('2026-08-28T08:30:00.000Z');
    const row = buildPlannerInsertRow({
      orgId,
      title: '  Statusmøde  ',
      type: 'intern',
      scheduledAt,
      residentUserId: residentId,
      location: 'Kontor',
      responsible: 'Lars N.',
      house: 'A',
    });
    expect(row).toEqual({
      org_id: orgId,
      title: 'Statusmøde',
      category: 'intern',
      starts_at: scheduledAt.toISOString(),
      ends_at: defaultPlannerEndsAt(scheduledAt.toISOString()),
      visible_to_resident: false,
      resident_user_id: residentId,
      location: 'Kontor',
      responsible: 'Lars N.',
      house: 'A',
    });
  });

  it('rejects empty title/responsible and non-uuid org, and drops demo resident ids', () => {
    const orgId = '550e8400-e29b-41d4-a716-446655440000';
    const scheduledAt = new Date('2026-08-28T08:30:00.000Z');
    expect(
      buildPlannerInsertRow({
        orgId,
        title: '   ',
        type: 'laege',
        scheduledAt,
        residentUserId: null,
        location: '',
        responsible: 'LN',
        house: '',
      })
    ).toBeNull();
    expect(
      buildPlannerInsertRow({
        orgId: 'not-an-org',
        title: 'Læge',
        type: 'laege',
        scheduledAt,
        residentUserId: null,
        location: '',
        responsible: 'LN',
        house: '',
      })
    ).toBeNull();
    const row = buildPlannerInsertRow({
      orgId,
      title: 'Læge',
      type: 'laege',
      scheduledAt,
      residentUserId: 'res-sara',
      location: '',
      responsible: 'LN',
      house: 'Z' as never,
    });
    expect(row?.resident_user_id).toBeNull();
    expect(row?.house).toBe('');
    expect(row?.location).toBe('—');
  });

  it('parses stored rows and defaults unknown category/house', () => {
    const parsed = parsePlannerEntry({
      id: 'entry-1',
      title: 'Gåtur',
      category: 'aktivitet',
      starts_at: '2026-08-28T08:30:00.000Z',
      resident_user_id: '21111111-1111-1111-1111-111111111111',
      location: 'Gården',
      responsible: 'Dagvagt',
      house: 'B',
    });
    expect(parsed).toMatchObject({
      id: 'entry-1',
      title: 'Gåtur',
      type: 'aktivitet',
      house: 'B',
    });
    expect(
      parsePlannerEntry({
        id: 'entry-2',
        title: 'Teammøde',
        category: 'unknown',
        starts_at: '2026-08-28T12:00:00.000Z',
      })
    ).toMatchObject({
      type: 'andet',
      location: '—',
      responsible: '—',
      house: null,
      residentUserId: null,
    });
    expect(
      parsePlannerEntry({ title: 'missing id', starts_at: '2026-08-28T12:00:00.000Z' })
    ).toBeNull();
  });

  it('uses Copenhagen civil day as the live query window', () => {
    const window = plannerDayWindow(new Date('2026-08-28T11:10:09.234Z'));
    expect(window.ymd).toBe('2026-08-28');
    expect(Date.parse(window.startIso)).toBeLessThan(Date.parse('2026-08-28T11:10:09.234Z'));
    expect(Date.parse(window.endIso)).toBeGreaterThan(Date.parse('2026-08-28T11:10:09.234Z'));
    expect(window.endIso).not.toBe(window.startIso);
  });

  it('falls back when location/responsible/house columns are missing', () => {
    expect(
      plannerInsertNeedsColumnFallback('column care_planner_entries.location does not exist')
    ).toBe(true);
    expect(plannerInsertNeedsColumnFallback('permission denied')).toBe(false);
    const full = buildPlannerInsertRow({
      orgId: '550e8400-e29b-41d4-a716-446655440000',
      title: 'Læge',
      type: 'laege',
      scheduledAt: new Date('2026-08-28T08:30:00.000Z'),
      residentUserId: null,
      location: 'Privat rum',
      responsible: 'Region',
      house: 'A',
    });
    expect(full).not.toBeNull();
    const base = plannerInsertWithoutExtendedColumns(full!);
    expect(base).not.toHaveProperty('location');
    expect(base).not.toHaveProperty('responsible');
    expect(base).not.toHaveProperty('house');
    expect(base.title).toBe('Læge');
  });
});
