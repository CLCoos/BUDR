import { describe, expect, it } from 'vitest';
import {
  createdByLabel,
  formatGoalDateDa,
  mapLysNextStepsToGoals,
} from './goalProgressFromNextSteps';

describe('createdByLabel', () => {
  it('labels resident vs staff creators', () => {
    expect(createdByLabel('resident')).toBe('Borger');
    expect(createdByLabel('staff')).toBe('Personale');
    expect(createdByLabel(null)).toBe('—');
    expect(createdByLabel(undefined)).toBe('—');
  });
});

describe('formatGoalDateDa', () => {
  it('formats in Europe/Copenhagen (not UTC date-shift)', () => {
    // 23:30 UTC on 14 Mar is already 15 Mar in Copenhagen (CET/CEST).
    expect(formatGoalDateDa('2026-03-14T23:30:00.000Z')).toBe('15.03.2026');
  });
});

describe('mapLysNextStepsToGoals', () => {
  it('maps an active resident next-step to a goal with the description as the step', () => {
    const mapped = mapLysNextStepsToGoals([
      {
        id: 'step-1',
        title: 'Gå til bageren',
        description: 'Køb en bolle alene',
        created_by_type: 'resident',
        created_at: '2026-03-15T10:00:00.000Z',
        status: 'aktiv',
        completed_at: null,
        resident_note: null,
      },
    ]);

    expect(mapped).toHaveLength(1);
    expect(mapped[0].id).toBe('step-1');
    expect(mapped[0].title).toBe('Gå til bageren');
    expect(mapped[0].createdBy).toBe('Borger');
    expect(mapped[0].createdAt).toBe('15.03.2026');
    expect(mapped[0].steps).toEqual([
      {
        id: 'step-1-body',
        text: 'Køb en bolle alene',
        completed: false,
        completedAt: undefined,
      },
    ]);
  });

  it('falls back to title when description is empty', () => {
    const mapped = mapLysNextStepsToGoals([
      {
        id: 'step-2',
        title: 'Sluk skærmen',
        description: '  ',
        created_by_type: 'staff',
        created_at: '2026-03-10T08:00:00.000Z',
        status: 'aktiv',
      },
    ]);
    expect(mapped[0].createdBy).toBe('Personale');
    expect(mapped[0].steps[0].text).toBe('Sluk skærmen');
    expect(mapped[0].steps[0].completed).toBe(false);
  });

  it('marks fuldført steps complete with completion date', () => {
    const mapped = mapLysNextStepsToGoals([
      {
        id: 'step-3',
        title: 'Fællesspisning',
        description: null,
        created_by_type: 'resident',
        created_at: '2026-03-20T12:00:00.000Z',
        status: 'fuldført',
        completed_at: '2026-03-22T09:15:00.000Z',
      },
    ]);
    expect(mapped[0].steps[0].completed).toBe(true);
    expect(mapped[0].steps[0].completedAt).toBe('22.03.2026');
  });

  it('does not treat park_goals status=active as complete', () => {
    const mapped = mapLysNextStepsToGoals([
      {
        id: 'legacy',
        title: 'Legacy',
        created_at: '2026-03-01T00:00:00.000Z',
        status: 'active',
      },
    ]);
    expect(mapped[0].steps[0].completed).toBe(false);
  });
});
