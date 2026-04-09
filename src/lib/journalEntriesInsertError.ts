import type { PostgrestError } from '@supabase/supabase-js';

/** Dansk forklaring af typiske Supabase/Postgres-fejl ved insert i journal_entries. */
export function formatJournalEntriesInsertError(err: PostgrestError | null): string {
  if (!err) return 'Kunne ikke gemme notat — prøv igen';
  const raw = err.message ?? '';
  const msg = raw.toLowerCase();
  const code = err.code ?? '';

  if (code === '42501' || msg.includes('row-level security') || msg.includes('violates row-level security')) {
    return 'Ingen adgang til at gemme journal for denne beboer. Tjek org_id på din bruger og at beboeren tilhører samme bosted.';
  }
  if (
    code === '23514' ||
    msg.includes('journal_entries_journal_status_check') ||
    (msg.includes('check constraint') && msg.includes('journal_status'))
  ) {
    return 'Databasen accepterer ikke journalstatus (fx »kladde«). Kør de seneste Supabase-migrationer for journal_entries.';
  }
  if (msg.includes('show_in_diary')) {
    return 'Kolonnen show_in_diary mangler i databasen. Kør migration journal_entries_show_in_diary, eller prøv igen (appen prøver automatisk uden den kolonne).';
  }
  if (code === '23503' || msg.includes('foreign key')) {
    return 'Journalen kunne ikke kobles til beboer eller personale (database-reference). Kontakt administrator.';
  }
  return raw.trim() || 'Kunne ikke gemme notat — prøv igen';
}
