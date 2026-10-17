import { describe, expect, it } from 'vitest';
import { createSerialQueue } from './serialQueue';

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

describe('createSerialQueue', () => {
  it('lader en langsom første gem ikke overskrive en nyere', async () => {
    const enqueue = createSerialQueue();
    let stored = '';

    const first = enqueue(async () => {
      await delay(40);
      stored = 'første udkast';
    });
    const second = enqueue(async () => {
      stored = 'nyere tekst';
    });

    await Promise.all([first, second]);
    expect(stored).toBe('nyere tekst');
  });

  it('kører næste opgave selv om den forrige fejler', async () => {
    const enqueue = createSerialQueue();
    const done: string[] = [];

    const failed = enqueue(async () => {
      throw new Error('netværk');
    });
    const next = enqueue(async () => {
      done.push('gemt');
    });

    await expect(failed).rejects.toThrow('netværk');
    await next;
    expect(done).toEqual(['gemt']);
  });
});
