import { describe, expect, it } from 'vitest';
import { shouldCreateLowMoodAlert } from '@/lib/lysDailyMood';
import {
  LYS_QUICK_MOODS,
  moodLabelFromScore,
  nextPlanPoint,
  onShiftLine,
  receiptText,
} from './iDag';

describe('LYS_QUICK_MOODS', () => {
  it('svært og meget svært giver personalet en alarm, de andre gør ikke', () => {
    const alerts = LYS_QUICK_MOODS.map((m) =>
      shouldCreateLowMoodAlert(m.score, m.traffic === 'roed' ? 'rød' : m.traffic)
    );
    expect(alerts).toEqual([false, false, false, true, true]);
  });

  it('ord til gamle og nye scorer', () => {
    expect([10, 8, 6, 4, 2, 1].map(moodLabelFromScore)).toEqual([
      'Rigtig godt',
      'Godt',
      'Okay',
      'Lidt tungt',
      'Svært',
      'Meget svært',
    ]);
  });
});

describe('nextPlanPoint', () => {
  const items = [
    { id: 'a', title: 'Morgenmad', time: '08:00' },
    { id: 'b', title: 'Gåtur', time: '11:00' },
    { id: 'c', title: 'Aftensmad', time: '17:30' },
  ];

  it('springer klarede og gamle punkter over', () => {
    const r = nextPlanPoint(items, new Set(['a']), '12:00');
    expect(r.next?.id).toBe('c');
    expect(r.left).toBe(2);
    expect(r.total).toBe(3);
  });

  it('viser et punkt, der lige er begyndt', () => {
    expect(nextPlanPoint(items, new Set(), '11:20').next?.id).toBe('b');
  });

  it('null når alt er klaret', () => {
    expect(nextPlanPoint(items, new Set(['a', 'b', 'c']), '09:00').next).toBeNull();
  });
});

describe('onShiftLine', () => {
  it('fornavne for den aktuelle vagt', () => {
    expect(
      onShiftLine(
        [
          { shift: 'evening', staffName: 'Mette Kjær' },
          { shift: 'evening', staffName: 'Ali Hassan' },
          { shift: 'day', staffName: 'Sara Ib' },
        ],
        'evening'
      )
    ).toBe('Mette og Ali er her til kl. 22');
    expect(onShiftLine([], 'day')).toBeNull();
  });
});

describe('receiptText', () => {
  it('siger hvem der har set beskeden', () => {
    expect(
      receiptText({
        sentAt: '2026-10-20T12:02:00Z',
        seenAt: '2026-10-20T12:12:00Z',
        seenBy: 'Mette',
      })
    ).toEqual({ text: 'Mette har set din besked kl. 14.12', seen: true });
    expect(receiptText({ sentAt: '2026-10-20T12:02:00Z', seenAt: null, seenBy: null }).seen).toBe(
      false
    );
  });
});
