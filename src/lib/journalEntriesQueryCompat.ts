import type { SupabaseClient } from '@supabase/supabase-js';

export function journalQueryMissingColumn(message: string | undefined, column: string): boolean {
  const m = (message ?? '').toLowerCase();
  const c = column.toLowerCase();
  return m.includes(c) && (m.includes('does not exist') || m.includes('schema cache'));
}

/** Rækker til aften-sammenfatning: dagens kladder med «vis i dagbog». */
export type DiaryDraftRow = {
  id: string;
  staff_name: string;
  entry_text: string;
  category: string;
  created_at: string;
};

/**
 * Henter journal-rækker til AI-sammenfatning når `journal_status` / `show_in_diary`
 * kan mangle i ældre Supabase-miljøer.
 */
export async function fetchDiaryDraftRowsForSynthesis(
  supabase: SupabaseClient,
  residentId: string,
  sinceIso: string
): Promise<{ rows: DiaryDraftRow[]; error: Error | null }> {
  const q1 = await supabase
    .from('journal_entries')
    .select('id, staff_name, entry_text, category, created_at, journal_status, show_in_diary')
    .eq('resident_id', residentId)
    .eq('journal_status', 'kladde')
    .eq('show_in_diary', true)
    .gte('created_at', sinceIso)
    .order('created_at', { ascending: true });

  if (!q1.error && q1.data) {
    return { rows: q1.data as DiaryDraftRow[], error: null };
  }

  const e1 = q1.error?.message ?? '';
  const missStatus = journalQueryMissingColumn(e1, 'journal_status');
  const missDiary = journalQueryMissingColumn(e1, 'show_in_diary');

  // Kun show_in_diary mangler — behold kladde-filter
  if (missDiary && !missStatus) {
    const r1b = await supabase
      .from('journal_entries')
      .select('id, staff_name, entry_text, category, created_at, journal_status')
      .eq('resident_id', residentId)
      .eq('journal_status', 'kladde')
      .gte('created_at', sinceIso)
      .order('created_at', { ascending: true });
    if (!r1b.error && r1b.data) {
      return { rows: r1b.data as DiaryDraftRow[], error: null };
    }
    if (r1b.error) {
      return { rows: [], error: new Error(r1b.error.message) };
    }
  }

  if (missStatus) {
    const q2 = await supabase
      .from('journal_entries')
      .select('id, staff_name, entry_text, category, created_at, show_in_diary')
      .eq('resident_id', residentId)
      .eq('show_in_diary', true)
      .gte('created_at', sinceIso)
      .order('created_at', { ascending: true });

    if (!q2.error && q2.data) {
      return { rows: q2.data as DiaryDraftRow[], error: null };
    }

    const e2 = q2.error?.message ?? '';
    if (journalQueryMissingColumn(e2, 'show_in_diary')) {
      const q3 = await supabase
        .from('journal_entries')
        .select('id, staff_name, entry_text, category, created_at')
        .eq('resident_id', residentId)
        .gte('created_at', sinceIso)
        .order('created_at', { ascending: true });

      if (q3.error) {
        return { rows: [], error: new Error(q3.error.message) };
      }
      return { rows: (q3.data ?? []) as DiaryDraftRow[], error: null };
    }

    return { rows: [], error: new Error(q2.error?.message ?? e1) };
  }

  return { rows: [], error: new Error(e1 || 'Ukendt fejl ved hentning af journal') };
}
