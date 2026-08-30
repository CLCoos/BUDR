import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { generateBriefForResident } from './generateBrief';

const { aiMock } = vi.hoisted(() => ({
  aiMock: vi.fn(),
}));

vi.mock('@/lib/ai/anthropicJournalPolish', () => ({
  callAnthropicJournalPolish: aiMock,
}));

type QueryCall = [column: string, value: unknown];

function createSelectQuery<T>(
  resolver: (calls: QueryCall[]) => { data: T[] | null; error: Error | null }
) {
  const eqCalls: QueryCall[] = [];
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn((column: string, value: unknown) => {
      eqCalls.push([column, value]);
      return query;
    }),
    gte: vi.fn(() => query),
    order: vi.fn(async () => resolver(eqCalls)),
    eqCalls,
  };
  return query;
}

function createInsertQuery(result: Record<string, unknown>) {
  const query = {
    insert: vi.fn(() => query),
    select: vi.fn(() => query),
    single: vi.fn(async () => ({ data: result, error: null })),
  };
  return query;
}

describe('generateBriefForResident', () => {
  beforeEach(() => {
    vi.stubEnv('ANTHROPIC_API_KEY', 'test-key');
    aiMock.mockResolvedValue({
      ok: true,
      text: JSON.stringify({
        lead: 'Sara har haft rolige morgener.',
        bullets: ['2026-06-30: Morgen gik roligt.'],
        actions: [{ label: 'Følg morgenrutine', sectionId: 'journal' }],
      }),
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.unstubAllEnvs();
  });

  it('only sends approved journal entries to the AI prompt', async () => {
    const checkinQuery = createSelectQuery(() => ({
      data: [
        {
          created_at: '2026-06-30T08:00:00.000Z',
          mood_score: 7,
          mood_label: 'rolig',
          traffic_light: 'green',
          free_text: 'God morgen',
        },
      ],
      error: null,
    }));
    const journalRows = [
      {
        created_at: '2026-06-30T09:00:00.000Z',
        entry_text: 'Godkendt fagligt notat',
        category: 'Observation',
        journal_status: 'godkendt',
      },
      {
        created_at: '2026-06-30T10:00:00.000Z',
        entry_text: 'Privat kladde fra Lys',
        category: 'Lys journal',
        journal_status: 'kladde',
      },
    ];
    const journalQuery = createSelectQuery<(typeof journalRows)[number]>((calls) => {
      const filtersApproved = calls.some(
        ([column, value]) => column === 'journal_status' && value === 'godkendt'
      );
      return {
        data: filtersApproved
          ? journalRows.filter((row) => row.journal_status === 'godkendt')
          : journalRows,
        error: null,
      };
    });
    const insertQuery = createInsertQuery({ id: 'brief-1' });

    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'lys_checkin') return checkinQuery;
        if (table === 'journal_entries') return journalQuery;
        if (table === 'ai_briefs') return insertQuery;
        throw new Error(`Unexpected table: ${table}`);
      }),
    };

    const result = await generateBriefForResident({
      supabase: supabase as never,
      residentId: '11111111-1111-4111-8111-111111111111',
      orgId: '22222222-2222-4222-8222-222222222222',
      residentLabel: 'Sara',
      briefType: 'daily',
    });

    expect(result.status).toBe('ok');
    expect(journalQuery.eq).toHaveBeenCalledWith('journal_status', 'godkendt');
    const prompt = aiMock.mock.calls[0]?.[0]?.userMessage as string;
    expect(prompt).toContain('Godkendt fagligt notat');
    expect(prompt).not.toContain('Privat kladde fra Lys');
  });

  it('falls back for legacy journal schemas without journal_status', async () => {
    const checkinQuery = createSelectQuery(() => ({ data: [], error: null }));
    const firstJournalQuery = createSelectQuery(() => ({
      data: null,
      error: new Error('column journal_entries.journal_status does not exist'),
    }));
    const legacyJournalQuery = createSelectQuery(() => ({
      data: [
        {
          created_at: '2026-06-30T09:00:00.000Z',
          entry_text: 'Ældre journalnotat',
          category: 'Observation',
        },
      ],
      error: null,
    }));
    const insertQuery = createInsertQuery({ id: 'brief-legacy' });
    const journalQueries = [firstJournalQuery, legacyJournalQuery];

    const supabase = {
      from: vi.fn((table: string) => {
        if (table === 'lys_checkin') return checkinQuery;
        if (table === 'journal_entries') return journalQueries.shift();
        if (table === 'ai_briefs') return insertQuery;
        throw new Error(`Unexpected table: ${table}`);
      }),
    };

    const result = await generateBriefForResident({
      supabase: supabase as never,
      residentId: '11111111-1111-4111-8111-111111111111',
      orgId: '22222222-2222-4222-8222-222222222222',
      residentLabel: 'Sara',
      briefType: 'daily',
    });

    expect(result.status).toBe('ok');
    expect(supabase.from).toHaveBeenCalledWith('journal_entries');
    expect(supabase.from).toHaveBeenCalledTimes(4);
    const prompt = aiMock.mock.calls[0]?.[0]?.userMessage as string;
    expect(prompt).toContain('Ældre journalnotat');
  });
});
