import { describe, expect, it } from 'vitest';
import {
  buildStaffTaskInsertRow,
  canSaveStaffTask,
  deadlineDayLabelFromYmd,
  deadlineYmdToDate,
  initialsFromDisplayName,
  isDeadlineOnOrBefore,
  isDeadlineYmd,
  isTaskPriority,
  isTaskStatus,
  normalizeAssignee,
  parseStaffTaskRow,
  requiredStaffTaskFieldsMissing,
} from './staffTasks';

describe('task enums', () => {
  it('accepts Danish status and priority labels', () => {
    expect(isTaskStatus('åben')).toBe(true);
    expect(isTaskStatus('igangsat')).toBe(true);
    expect(isTaskStatus('afsluttet')).toBe(true);
    expect(isTaskStatus('open')).toBe(false);
    expect(isTaskPriority('høj')).toBe(true);
    expect(isTaskPriority('mellem')).toBe(true);
    expect(isTaskPriority('lav')).toBe(true);
    expect(isTaskPriority('high')).toBe(false);
  });
});

describe('deadline YMD', () => {
  it('rejects impossible calendar dates', () => {
    expect(isDeadlineYmd('2026-08-29')).toBe(true);
    expect(isDeadlineYmd('2026-02-30')).toBe(false);
    expect(isDeadlineYmd('29-08-2026')).toBe(false);
    expect(isDeadlineYmd('')).toBe(false);
  });

  it('labels overdue / today / future by civil date string', () => {
    expect(deadlineDayLabelFromYmd('2026-08-28', '2026-08-29')).toBe('overdue');
    expect(deadlineDayLabelFromYmd('2026-08-29', '2026-08-29')).toBe('today');
    expect(deadlineDayLabelFromYmd('2026-08-30', '2026-08-29')).toBe('future');
    expect(isDeadlineOnOrBefore('2026-08-29', '2026-08-29')).toBe(true);
    expect(isDeadlineOnOrBefore('2026-08-30', '2026-08-29')).toBe(false);
  });

  it('maps date-only values to noon UTC so the civil day is stable', () => {
    const d = deadlineYmdToDate('2026-08-29');
    expect(d.toISOString()).toBe('2026-08-29T12:00:00.000Z');
  });
});

describe('assignee and initials', () => {
  it('normalizes initials and truncates', () => {
    expect(normalizeAssignee(' sk ')).toBe('SK');
    expect(normalizeAssignee('kontaktpædagog')).toBe('KONTAK');
  });

  it('derives two-letter initials from display name', () => {
    expect(initialsFromDisplayName('Sara K.')).toBe('SK');
    expect(initialsFromDisplayName('Finn')).toBe('FI');
    expect(initialsFromDisplayName('   ')).toBe('?');
  });
});

describe('insert payload', () => {
  it('requires resident, title, valid deadline, assignee and priority', () => {
    expect(
      requiredStaffTaskFieldsMissing({
        residentId: '',
        title: '  ',
        deadlineYmd: 'bad',
        assignedTo: '',
        priority: 'high',
      })
    ).toEqual(['residentId', 'title', 'deadline', 'assignedTo', 'priority']);
    expect(
      canSaveStaffTask({
        residentId: '550e8400-e29b-41d4-a716-446655440000',
        title: 'Ring til pårørende',
        deadlineYmd: '2026-08-29',
        assignedTo: 'LN',
        priority: 'høj',
      })
    ).toBe(true);
  });

  it('builds an org-scoped insert with open status', () => {
    const row = buildStaffTaskInsertRow({
      orgId: '11111111-1111-4111-8111-111111111111',
      createdBy: '22222222-2222-4222-8222-222222222222',
      residentId: '550e8400-e29b-41d4-a716-446655440000',
      title: '  Opfølgning på kriseplan  ',
      deadlineYmd: '2026-08-29',
      assignedTo: 'ln',
      priority: 'høj',
    });
    expect(row).toEqual({
      org_id: '11111111-1111-4111-8111-111111111111',
      created_by: '22222222-2222-4222-8222-222222222222',
      resident_id: '550e8400-e29b-41d4-a716-446655440000',
      title: 'Opfølgning på kriseplan',
      deadline: '2026-08-29',
      assigned_to: 'LN',
      status: 'åben',
      priority: 'høj',
    });
  });
});

describe('parseStaffTaskRow', () => {
  it('maps a valid row and rejects mock / corrupt payloads', () => {
    const parsed = parseStaffTaskRow({
      id: '33333333-3333-4333-8333-333333333333',
      resident_id: '550e8400-e29b-41d4-a716-446655440000',
      title: 'Bestille tid hos læge',
      deadline: '2026-08-29',
      assigned_to: 'SK',
      status: 'igangsat',
      priority: 'mellem',
      created_at: '2026-08-29T10:00:00.000Z',
    });
    expect(parsed?.title).toBe('Bestille tid hos læge');
    expect(parsed?.status).toBe('igangsat');
    expect(parseStaffTaskRow({ ...parsed, status: 'open' } as Record<string, unknown>)).toBeNull();
    expect(
      parseStaffTaskRow({
        id: 'tsk-001',
        resident_id: 'res-002',
        title: 'Fake',
        deadline: 'yesterday',
        assigned_to: 'SK',
        status: 'åben',
        priority: 'høj',
      })
    ).toBeNull();
  });
});
