import { afterEach, describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import { callAnthropicJournalPolish } from '@/lib/ai/anthropicJournalPolish';
import { generateBriefForResident } from './generateBrief';

vi.mock('@/lib/ai/anthropicJournalPolish', () => ({
  callAnthropicJournalPolish: vi.fn(),
}));

type QueryOperation = {
  op: 'select' | 'eq' | 'gte' | 'order' | 'insert';
  column?: string;
  value?: unknown;
};

type QueryResult = {
  data: unknown;
  error: { message: string } | null;
};

class FakeSupabase {
  operations: Record<string, QueryOperation[]> = {};
  insertPayload: Record<string, unknown> | null = null;
  journalStatusMissing = false;

  from(table: string) {
    if (!this.operations[table]) this.operations[table] = [];
    return new FakeQueryBuilder(this, table);
  }

  resolve(table: string, operations: QueryOperation[]): QueryResult {
    if (table === 'lys_checkin') {
      return {
        data: [
          {
            created_at: '2026-06-28T08:00:00.000Z',
            mood_score: 6,
            mood_label: 'rolig',
            traffic_light: 'grøn',
            free_text: 'God morgen',
          },
        ],
        error: null,
      };
    }

    if (table === 'journal_entries') {
      const filtersApproved = operations.some(
        (op) => op.op === 'eq' && op.column === 'journal_status' && op.value === 'godkendt'
      );

      if (filtersApproved && this.journalStatusMissing) {
        return {
          data: null,
          error: { message: 'column journal_entries.journal_status does not exist' },
        };
      }

      const approved = {
        created_at: '2026-06-28T09:00:00.000Z',
        entry_text: 'Godkendt tekst',
        category: 'Journal',
      };
      const draft = {
        created_at: '2026-06-28T10:00:00.000Z',
        entry_text: 'Kladde hemmelig',
        category: 'Lys journal',
      };

      return { data: filtersApproved ? [approved] : [approved, draft], error: null };
    }

    return { data: null, error: { message: `unexpected table: ${table}` } };
  }
}

class FakeQueryBuilder {
  private operations: QueryOperation[] = [];
  private allTableOperations: QueryOperation[];

  constructor(
    private supabase: FakeSupabase,
    private table: string
  ) {
    this.allTableOperations = supabase.operations[table];
  }

  private record(operation: QueryOperation) {
    this.operations.push(operation);
    this.allTableOperations.push(operation);
  }

  select() {
    this.record({ op: 'select' });
    return this;
  }

  eq(column: string, value: unknown) {
    this.record({ op: 'eq', column, value });
    return this;
  }

  gte(column: string, value: unknown) {
    this.record({ op: 'gte', column, value });
    return this;
  }

  order(column: string, value: unknown) {
    this.record({ op: 'order', column, value });
    return this;
  }

  insert(payload: Record<string, unknown>) {
    this.record({ op: 'insert', value: payload });
    this.supabase.insertPayload = payload;
    return this;
  }

  single(): Promise<QueryResult> {
    if (this.table !== 'ai_briefs') {
      return Promise.resolve({
        data: null,
        error: { message: `unexpected single on table: ${this.table}` },
      });
    }

    return Promise.resolve({
      data: { id: 'brief-1', ...this.supabase.insertPayload },
      error: null,
    });
  }

  then<TResult1 = QueryResult, TResult2 = never>(
    onfulfilled?: ((value: QueryResult) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: unknown) => TResult2 | PromiseLike<TResult2>) | null
  ): Promise<TResult1 | TResult2> {
    return Promise.resolve(this.supabase.resolve(this.table, this.operations)).then(
      onfulfilled,
      onrejected
    );
  }
}

describe('generateBriefForResident', () => {
  afterEach(() => {
    vi.clearAllMocks();
    delete process.env.ANTHROPIC_API_KEY;
  });

  it('sends only approved journal entries to Anthropic', async () => {
    process.env.ANTHROPIC_API_KEY = 'test-key';
    vi.mocked(callAnthropicJournalPolish).mockResolvedValue({
      ok: true,
      text: '{"lead":"Kort overblik","bullets":[],"actions":[]}',
    });

    const supabase = new FakeSupabase();

    const result = await generateBriefForResident({
      supabase: supabase as unknown as SupabaseClient,
      residentId: 'resident-1',
      orgId: '550e8400-e29b-41d4-a716-446655440000',
      residentLabel: 'Sara',
      briefType: 'daily',
    });

    expect(result.status).toBe('ok');
    expect(supabase.operations.journal_entries).toContainEqual({
      op: 'eq',
      column: 'journal_status',
      value: 'godkendt',
    });

    const prompt = vi.mocked(callAnthropicJournalPolish).mock.calls[0][0].userMessage;
    expect(prompt).toContain('Godkendt tekst');
    expect(prompt).not.toContain('Kladde hemmelig');
  });

  it('falls back for legacy environments without journal_status', async () => {
    process.env.ANTHROPIC_API_KEY = 'test-key';
    vi.mocked(callAnthropicJournalPolish).mockResolvedValue({
      ok: true,
      text: '{"lead":"Kort overblik","bullets":[],"actions":[]}',
    });

    const supabase = new FakeSupabase();
    supabase.journalStatusMissing = true;

    const result = await generateBriefForResident({
      supabase: supabase as unknown as SupabaseClient,
      residentId: 'resident-1',
      orgId: '550e8400-e29b-41d4-a716-446655440000',
      residentLabel: 'Sara',
      briefType: 'daily',
    });

    expect(result.status).toBe('ok');
    expect(supabase.operations.journal_entries.filter((op) => op.op === 'select')).toHaveLength(2);
  });
});
