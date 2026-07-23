import type { SupabaseClient } from '@supabase/supabase-js';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { callAnthropicJournalPolish } from '@/lib/ai/anthropicJournalPolish';
import { generateBriefForResident } from './generateBrief';

vi.mock('@/lib/ai/anthropicJournalPolish', () => ({
  callAnthropicJournalPolish: vi.fn(),
}));

type Row = Record<string, unknown>;
type EqCall = { column: string; value: unknown };
type QueryCall = {
  table: string;
  select?: string;
  eqs: EqCall[];
  gtes: EqCall[];
  insert?: Row;
};

class MockQueryBuilder {
  private call: QueryCall;

  constructor(
    private readonly table: string,
    private readonly rowsByTable: Record<string, Row[]>,
    private readonly calls: QueryCall[]
  ) {
    this.call = { table, eqs: [], gtes: [] };
    this.calls.push(this.call);
  }

  select(columns?: string) {
    this.call.select = columns;
    return this;
  }

  eq(column: string, value: unknown) {
    this.call.eqs.push({ column, value });
    return this;
  }

  gte(column: string, value: unknown) {
    this.call.gtes.push({ column, value });
    return this;
  }

  order() {
    return Promise.resolve(this.resolveRows());
  }

  insert(payload: Row) {
    this.call.insert = payload;
    return this;
  }

  single() {
    return Promise.resolve({
      data: { id: 'brief-1', ...this.call.insert },
      error: null,
    });
  }

  private resolveRows() {
    let rows = [...(this.rowsByTable[this.table] ?? [])];
    for (const eq of this.call.eqs) {
      rows = rows.filter((row) => row[eq.column] === eq.value);
    }
    for (const gte of this.call.gtes) {
      rows = rows.filter((row) => String(row[gte.column] ?? '') >= String(gte.value));
    }
    return { data: rows, error: null };
  }
}

function createSupabaseMock(rowsByTable: Record<string, Row[]>) {
  const calls: QueryCall[] = [];
  const supabase = {
    from(table: string) {
      return new MockQueryBuilder(table, rowsByTable, calls);
    },
  } as unknown as SupabaseClient;

  return { supabase, calls };
}

const mockedAnthropic = vi.mocked(callAnthropicJournalPolish);

describe('generateBriefForResident', () => {
  const originalApiKey = process.env.ANTHROPIC_API_KEY;

  beforeEach(() => {
    process.env.ANTHROPIC_API_KEY = 'test-key';
    mockedAnthropic.mockResolvedValue({
      ok: true,
      text: '{"lead":"Godkendt mønster","bullets":[],"actions":[]}',
    });
  });

  afterEach(() => {
    process.env.ANTHROPIC_API_KEY = originalApiKey;
    mockedAnthropic.mockReset();
  });

  it('only sends approved journal notes to the AI brief prompt', async () => {
    const residentId = '550e8400-e29b-41d4-a716-446655440000';
    const orgId = '550e8400-e29b-41d4-a716-446655440001';
    const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

    const { supabase, calls } = createSupabaseMock({
      lys_checkin: [],
      journal_entries: [
        {
          resident_id: residentId,
          org_id: orgId,
          created_at: yesterday,
          entry_text: 'Godkendt note til kollega',
          category: 'Observation',
          journal_status: 'godkendt',
        },
        {
          resident_id: residentId,
          org_id: orgId,
          created_at: yesterday,
          entry_text: 'Privat kladde må ikke sendes',
          category: 'Lys journal',
          journal_status: 'kladde',
        },
      ],
      ai_briefs: [],
    });

    const result = await generateBriefForResident({
      supabase,
      residentId,
      orgId,
      residentLabel: 'Sara',
      briefType: 'daily',
    });

    expect(result.status).toBe('ok');
    expect(mockedAnthropic).toHaveBeenCalledTimes(1);

    const prompt = mockedAnthropic.mock.calls[0]?.[0].userMessage ?? '';
    expect(prompt).toContain('Godkendt note til kollega');
    expect(prompt).not.toContain('Privat kladde må ikke sendes');

    const journalQuery = calls.find(
      (call) => call.table === 'journal_entries' && call.select?.includes('journal_status')
    );
    expect(journalQuery?.eqs).toContainEqual({ column: 'journal_status', value: 'godkendt' });
  });
});
