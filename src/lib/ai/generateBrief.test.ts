import { describe, expect, it } from 'vitest';
import { fetchApprovedJournalRowsForBrief } from './generateBrief';

type QueryResult = {
  data?: unknown[];
  error?: { message: string } | null;
};

type QueryCall = {
  table: string;
  steps: Array<{ op: string; args: unknown[] }>;
};

function createSupabaseMock(results: QueryResult[]) {
  const calls: QueryCall[] = [];

  return {
    calls,
    supabase: {
      from(table: string) {
        const call: QueryCall = { table, steps: [] };
        calls.push(call);
        const result = results.shift() ?? { data: [], error: null };
        const builder = {
          select(...args: unknown[]) {
            call.steps.push({ op: 'select', args });
            return builder;
          },
          eq(...args: unknown[]) {
            call.steps.push({ op: 'eq', args });
            return builder;
          },
          gte(...args: unknown[]) {
            call.steps.push({ op: 'gte', args });
            return builder;
          },
          order(...args: unknown[]) {
            call.steps.push({ op: 'order', args });
            return Promise.resolve({ data: result.data ?? null, error: result.error ?? null });
          },
        };
        return builder;
      },
    },
  };
}

describe('fetchApprovedJournalRowsForBrief', () => {
  it('filters AI brief journal context to approved notes', async () => {
    const mock = createSupabaseMock([
      {
        data: [{ created_at: '2026-06-27T08:00:00Z', entry_text: 'Approved', category: 'Note' }],
      },
    ]);

    const result = await fetchApprovedJournalRowsForBrief(
      mock.supabase as never,
      'resident-id',
      'org-id',
      '2026-06-20T00:00:00Z'
    );

    expect(result.error).toBeNull();
    expect(result.rows).toHaveLength(1);
    expect(mock.calls).toHaveLength(1);
    expect(mock.calls[0].steps).toContainEqual({
      op: 'eq',
      args: ['journal_status', 'godkendt'],
    });
  });

  it('falls back only when legacy databases are missing journal_status', async () => {
    const mock = createSupabaseMock([
      { error: { message: 'column journal_status does not exist' } },
      {
        data: [{ created_at: '2026-06-27T08:00:00Z', entry_text: 'Legacy', category: 'Note' }],
      },
    ]);

    const result = await fetchApprovedJournalRowsForBrief(
      mock.supabase as never,
      'resident-id',
      'org-id',
      '2026-06-20T00:00:00Z'
    );

    expect(result.error).toBeNull();
    expect(result.rows).toHaveLength(1);
    expect(mock.calls).toHaveLength(2);
    expect(mock.calls[1].steps).not.toContainEqual({
      op: 'eq',
      args: ['journal_status', 'godkendt'],
    });
  });
});
