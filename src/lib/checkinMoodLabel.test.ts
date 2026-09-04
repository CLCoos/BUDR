import { describe, expect, it } from 'vitest';
import { needsOverrapportAttention } from './overrapport/composeStructuredReport';
import {
  moodLabelFromCheckin,
  moodLabelFromTenPointScore,
  moodLabelNeedsAttention,
  resolveCheckinMoodLabel,
} from './checkinMoodLabel';

describe('resolveCheckinMoodLabel', () => {
  it('keeps the stored Lys label and ignores inverted selected+1 scores', () => {
    expect(moodLabelFromCheckin({ mood_label: 'Fantastisk', mood_score: 1 })).toBe('Fantastisk');
    expect(moodLabelFromCheckin({ mood_label: 'Meget svært', mood_score: 6 })).toBe('Meget svært');
  });

  it('does not invent a 1–5 label from score when mood_label is missing', () => {
    expect(moodLabelFromCheckin({ mood_label: null, mood_score: 1 })).toBeNull();
    expect(moodLabelFromCheckin({ mood_score: 5 })).toBeNull();
    expect(resolveCheckinMoodLabel('  ')).toBeNull();
  });
});

describe('moodLabelNeedsAttention', () => {
  it('flags hard days and not good days', () => {
    expect(moodLabelNeedsAttention('Fantastisk')).toBe(false);
    expect(moodLabelNeedsAttention('Godt')).toBe(false);
    expect(moodLabelNeedsAttention('Okay')).toBe(false);
    expect(moodLabelNeedsAttention('Lidt tungt')).toBe(true);
    expect(moodLabelNeedsAttention('Svært')).toBe(true);
    expect(moodLabelNeedsAttention('Meget svært')).toBe(true);
  });
});

describe('needsOverrapportAttention with stored labels', () => {
  const base = {
    name: 'Sara K.',
    initials: 'SK',
    checkinTime: '09:00',
    notePreview: null,
    pendingMessages: 0,
  };

  it('does not put a green Fantastisk day in særligt fokus just because score is 1', () => {
    expect(
      needsOverrapportAttention({
        ...base,
        moodLabel: moodLabelFromCheckin({ mood_label: 'Fantastisk', mood_score: 1 }),
        trafficLight: 'grøn',
      })
    ).toBe(false);
  });

  it('puts Meget svært in særligt fokus even without traffic light', () => {
    expect(
      needsOverrapportAttention({
        ...base,
        moodLabel: 'Meget svært',
        trafficLight: null,
      })
    ).toBe(true);
  });
});

describe('moodLabelFromTenPointScore', () => {
  it('maps 1–10 slider (1 = worst) without inverting', () => {
    expect(moodLabelFromTenPointScore(1)).toBe('Meget svært');
    expect(moodLabelFromTenPointScore(10)).toBe('Fantastisk');
    expect(moodLabelFromTenPointScore(7)).toBe('Godt');
  });
});
