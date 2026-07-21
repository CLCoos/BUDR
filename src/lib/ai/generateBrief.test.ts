import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';

const anthropicMock = vi.hoisted(() => ({
  call: vi.fn(),
}));

vi.mock('@/lib/ai/anthropicJournalPolish', () => ({
  callAnthropicJournalPolish: anthropicMock.call,
}));

import { generateBriefForResident } from './generateBrief';

type QueryResult = {
  data: unknown;
  error: { message: string } | null;
};

type QueryResultFactory = (query: FakeQuery) => QueryResult;

class FakeQuery {
  readonly ops: Array<{ name: string; args: unknown[] }> = [];

  constructor(
    readonly table: string,
    private readonly resultFactory: QueryResultFactory
  ) {}

  select(...args: unknown[]) {
    this.ops.push({ name: 'select', args });
    return this;
  }

  insert(...args: unknown[]) {
    this.ops.push({ name: 'insert', args });
    return this;
  }

  eq(...args: unknown[]) {
    this.ops.push({ name: 'eq', args });
    return this;
  }

  gte(...args: unknown[]) {
    this.ops.push({ name: 'gte', args });
    return this;
  }

  order(...args: unknown[]) {
    this.ops.push({ name: 'order', args });
    return this;
  }

  single() {
    return Promise.resolve(this.resultFactory(this));
  }

  then(resolve: (value: QueryResult) => unknown, reject?: (reason: unknown) => unknown) {
    return Promise.resolve(this.resultFactory(this)).then(resolve, reject);
  }
}

function createSupabaseFake(factories: Record<string, QueryResultFactory[]>) {
  const queries: FakeQuery[] = [];
  const supabase = {
    from(table: string) {
      const factory = factories[table]?.shift();
      if (!factory) throw new Error(`Unexpected table query: ${table}`);
      const query = new FakeQuery(table, factory);
      queries.push(query);
      return query;
    },
  };

  return { supabase: supabase as unknown as SupabaseClient, queries };
}

const okAiResponse = {
  ok: true,
  text: JSON.stringify({
    lead: 'Godkendt mønster.',
    bullets: [],
    actions: [],
  }),
};

describe('generateBriefForResident', () => {
  const originalApiKey = process.env.ANTHROPIC_API_KEY;

  beforeEach(() => {
    process.env.ANTHROPIC_API_KEY = 'test-key';
    anthropicMock.call.mockResolvedValue(okAiResponse);
  });

  afterEach(() => {
    if (originalApiKey === undefined) {
      delete process.env.ANTHROPIC_API_KEY;
    } else {
      process.env.ANTHROPIC_API_KEY = originalApiKey;
    }
    vi.clearAllMocks();
  });

  it('only sends approved journal entries to Anthropic', async () => {
    const approvedJournal = {
      created_at: '2026-06-23T10:00:00.000Z',
      entry_text: 'Godkendt fagligt notat',
      category: 'Observation',
      journal_status: 'godkendt',
    };
    const draftJournal = {
      created_at: '2026-06-23T11:00:00.000Z',
      entry_text: 'Privat kladde må ikke sendes',
      category: 'Lys journal',
      journal_status: 'kladde',
    };

    const { supabase, queries } = createSupabaseFake({
      lys_checkin: [() => ({ data: [], error: null })],
      journal_entries: [
        (query) => {
          const hasApprovedFilter = query.ops.some(
            (op) => op.name === 'eq' && op.args[0] === 'journal_status' && op.args[1] === 'godkendt'
          );
          return {
            data: hasApprovedFilter ? [approvedJournal] : [approvedJournal, draftJournal],
            error: null,
          };
        },
      ],
      ai_briefs: [
        () => ({
          data: { id: 'brief-1' },
          error: null,
        }),
      ],
    });

    const result = await generateBriefForResident({
      supabase,
      residentId: '21111111-1111-1111-1111-111111111111',
      orgId: '31111111-1111-1111-1111-111111111111',
      residentLabel: 'Sara',
      briefType: 'daily',
    });

    expect(result.status).toBe('ok');
    const journalQuery = queries.find((query) => query.table === 'journal_entries');
    expect(journalQuery?.ops).toContainEqual({
      name: 'eq',
      args: ['journal_status', 'godkendt'],
    });

    const userMessage = anthropicMock.call.mock.calls[0][0].userMessage as string;
    expect(userMessage).toContain('Godkendt fagligt notat');
    expect(userMessage).not.toContain('Privat kladde må ikke sendes');
  });

  it('falls back to legacy journal query only when journal_status is missing', async () => {
    const { supabase, queries } = createSupabaseFake({
      lys_checkin: [() => ({ data: [], error: null })],
      journal_entries: [
        () => ({
          data: null,
          error: { message: 'column journal_entries.journal_status does not exist' },
        }),
        () => ({
          data: [
            {
              created_at: '2026-06-23T10:00:00.000Z',
              entry_text: 'Legacy godkendt notat',
              category: 'Observation',
            },
          ],
          error: null,
        }),
      ],
      ai_briefs: [
        () => ({
          data: { id: 'brief-1' },
          error: null,
        }),
      ],
    });

    const result = await generateBriefForResident({
      supabase,
      residentId: '21111111-1111-1111-1111-111111111111',
      orgId: '31111111-1111-1111-1111-111111111111',
      residentLabel: 'Sara',
      briefType: 'daily',
    });

    expect(result.status).toBe('ok');
    const journalQueries = queries.filter((query) => query.table === 'journal_entries');
    expect(journalQueries).toHaveLength(2);
    expect(journalQueries[1].ops[0]).toEqual({
      name: 'select',
      args: ['created_at, entry_text, category'],
    });
    expect(anthropicMock.call.mock.calls[0][0].userMessage).toContain('Legacy godkendt notat');
  });
});
