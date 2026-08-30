import { describe, expect, it } from 'vitest';
import { runWithConcurrency } from './briefScheduling';

describe('runWithConcurrency', () => {
  it('never runs more than the requested number of tasks at once', async () => {
    let active = 0;
    let maxActive = 0;

    await runWithConcurrency([1, 2, 3, 4, 5], 2, async () => {
      active += 1;
      maxActive = Math.max(maxActive, active);
      await new Promise((resolve) => setTimeout(resolve, 1));
      active -= 1;
    });

    expect(maxActive).toBeLessThanOrEqual(2);
  });

  it('treats invalid limits as one-at-a-time', async () => {
    const seen: number[] = [];

    await runWithConcurrency([1, 2, 3], 0, async (n) => {
      seen.push(n);
    });

    expect(seen).toEqual([1, 2, 3]);
  });
});
