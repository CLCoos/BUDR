import type { SupabaseClient } from '@supabase/supabase-js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { callAnthropicJournalPolish } from './anthropicJournalPolish';
import { generateBriefForResident } from './generateBrief';

vi.mock('./anthropicJournalPolish', () => ({
  callAnthropicJournalPolish: vi.fn(),
}));

type QueryResult = {
  data: unknown;
  error: { message: string } | null;
};

class QueryStub {
  constructor(private readonly result: QueryResult) {}

  select(): this {
    return this;
  }

  eq(): this {
    return this;
  }

  gte(): this {
    return this;
  }

  order(): this {
    return this;
  }

  limit(): this {
    return this;
  }

  then<TResult1 = QueryResult, TResult2 = never>(
    onfulfilled?: ((value: QueryResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return Promise.resolve(this.result).then(onfulfilled, onrejected);
  }
}

function supabaseStub(results: Record<string, QueryResult>): SupabaseClient {
  return {
    from: (table: string) => new QueryStub(results[table] ?? { data: null, error: null }),
  } as unknown as SupabaseClient;
}

describe('generateBriefForResident', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.ANTHROPIC_API_KEY = 'test-key';
  });

  it('fails before calling Anthropic when ai_briefs storage is unavailable', async () => {
    const supabase = supabaseStub({
      lys_checkin: {
        data: [
          {
            created_at: new Date().toISOString(),
            mood_score: 4,
            mood_label: 'Urolig',
            traffic_light: 'gul',
            free_text: 'Sov dårligt.',
          },
        ],
        error: null,
      },
      journal_entries: { data: [], error: null },
      ai_briefs: { data: null, error: { message: 'relation "ai_briefs" does not exist' } },
    });

    const result = await generateBriefForResident({
      supabase,
      residentId: '11111111-1111-4111-8111-111111111111',
      orgId: '22222222-2222-4222-8222-222222222222',
      residentLabel: 'Sara',
      briefType: 'daily',
    });

    expect(result).toEqual({
      status: 'db_error',
      message: 'relation "ai_briefs" does not exist',
    });
    expect(callAnthropicJournalPolish).not.toHaveBeenCalled();
  });
});
