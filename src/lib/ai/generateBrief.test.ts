import type { SupabaseClient } from '@supabase/supabase-js';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { callAnthropicJournalPolish } from '@/lib/ai/anthropicJournalPolish';
import { generateBriefForResident } from './generateBrief';

vi.mock('@/lib/ai/anthropicJournalPolish', () => ({
  callAnthropicJournalPolish: vi.fn(),
}));

const approvedJournal = {
  created_at: '2026-07-19T08:00:00.000Z',
  entry_text: 'Godkendt observation',
  category: 'observation',
};

const privateDraft = {
  created_at: '2026-07-19T09:00:00.000Z',
  entry_text: 'Privat kladde må ikke sendes',
  category: 'Lys journal',
};

function createSupabaseMock(options: { journalStatusMissing?: boolean } = {}) {
  const journalFilters: Array<[string, unknown]> = [];

  const from = vi.fn((table: string) => {
    if (table === 'ai_briefs') {
      return {
        insert: (brief: Record<string, unknown>) => ({
          select: () => ({
            single: async () => ({ data: { id: 'brief-1', ...brief }, error: null }),
          }),
        }),
      };
    }

    const filters: Array<[string, unknown]> = [];
    const query = {
      select: () => query,
      eq: (column: string, value: unknown) => {
        filters.push([column, value]);
        if (table === 'journal_entries') journalFilters.push([column, value]);
        return query;
      },
      gte: () => query,
      order: async () => {
        if (table === 'lys_checkin') return { data: [], error: null };
        if (table !== 'journal_entries') return { data: [], error: null };

        const filtersApproved = filters.some(
          ([column, value]) => column === 'journal_status' && value === 'godkendt'
        );
        if (filtersApproved && options.journalStatusMissing) {
          return {
            data: null,
            error: { message: 'column journal_entries.journal_status does not exist' },
          };
        }
        return {
          data: filtersApproved ? [approvedJournal] : [approvedJournal, privateDraft],
          error: null,
        };
      },
    };
    return query;
  });

  return {
    supabase: { from } as unknown as SupabaseClient,
    from,
    journalFilters,
  };
}

describe('generateBriefForResident journal privacy', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv('ANTHROPIC_API_KEY', 'test-key');
    vi.mocked(callAnthropicJournalPolish).mockResolvedValue({
      ok: true,
      text: JSON.stringify({
        lead: 'Kort overblik',
        bullets: ['Godkendt observation'],
        actions: [],
      }),
    });
  });

  it('only sends approved journal entries to Anthropic', async () => {
    const { supabase, journalFilters } = createSupabaseMock();

    const result = await generateBriefForResident({
      supabase,
      residentId: '11111111-1111-4111-8111-111111111111',
      orgId: '22222222-2222-4222-8222-222222222222',
      residentLabel: 'Sara',
      briefType: 'daily',
    });

    expect(result.status).toBe('ok');
    expect(journalFilters).toContainEqual(['journal_status', 'godkendt']);
    const prompt = vi.mocked(callAnthropicJournalPolish).mock.calls[0]?.[0].userMessage;
    expect(prompt).toContain(approvedJournal.entry_text);
    expect(prompt).not.toContain(privateDraft.entry_text);
  });

  it('falls back for legacy schemas without journal_status', async () => {
    const { supabase, from } = createSupabaseMock({ journalStatusMissing: true });

    const result = await generateBriefForResident({
      supabase,
      residentId: '11111111-1111-4111-8111-111111111111',
      orgId: '22222222-2222-4222-8222-222222222222',
      residentLabel: 'Sara',
      briefType: 'daily',
    });

    expect(result.status).toBe('ok');
    expect(from.mock.calls.filter(([table]) => table === 'journal_entries')).toHaveLength(2);
  });
});
