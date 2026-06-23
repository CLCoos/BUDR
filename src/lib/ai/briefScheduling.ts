export const SCHEDULED_BRIEF_CONCURRENCY = 5;

export async function runWithConcurrency<T>(
  items: T[],
  limit: number,
  task: (item: T) => Promise<void>
): Promise<void> {
  const safeLimit = Math.max(1, Math.floor(limit));
  for (let i = 0; i < items.length; i += safeLimit) {
    await Promise.all(items.slice(i, i + safeLimit).map(task));
  }
}
