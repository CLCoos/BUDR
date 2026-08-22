import { journalQueryMissingColumn } from '@/lib/journalEntriesQueryCompat';
import { isValidUuid } from '@/lib/uuid';

export const STAFF_MESSAGE_JOURNAL_CATEGORY = 'Besked fra beboer';

const JOURNAL_INSERT_OPTIONAL_COLUMNS = [
  'journal_status',
  'approved_at',
  'approved_by',
  'show_in_diary',
] as const;

/** Demo cookies such as `demo-resident-001` must not be written to UUID FKs. */
export function isDemoResidentId(residentId: string): boolean {
  return !isValidUuid(residentId);
}

export type StaffMessageJournalRow = {
  resident_id: string;
  staff_id: null;
  staff_name: string;
  entry_text: string;
  category: string;
  journal_status: 'godkendt';
  approved_at: string;
  approved_by: null;
  org_id: string | null;
};

export function buildStaffMessageJournalRow(opts: {
  residentId: string;
  displayName: string | null | undefined;
  entryText: string;
  orgId: string | null;
  nowIso: string;
}): StaffMessageJournalRow {
  const name = typeof opts.displayName === 'string' ? opts.displayName.trim() : '';
  return {
    resident_id: opts.residentId,
    staff_id: null,
    staff_name: name ? `Beboer: ${name}` : 'Beboer',
    entry_text: opts.entryText,
    category: STAFF_MESSAGE_JOURNAL_CATEGORY,
    journal_status: 'godkendt',
    approved_at: opts.nowIso,
    approved_by: null,
    org_id: opts.orgId,
  };
}

export function omitMissingJournalInsertColumn<T extends Record<string, unknown>>(
  payload: T,
  errorMessage: string | undefined
): { payload: T; omitted: string | null } {
  for (const col of JOURNAL_INSERT_OPTIONAL_COLUMNS) {
    if (
      Object.prototype.hasOwnProperty.call(payload, col) &&
      journalQueryMissingColumn(errorMessage, col)
    ) {
      const next = { ...payload };
      delete next[col];
      return { payload: next, omitted: col };
    }
  }
  return { payload, omitted: null };
}

export function staffMessageNotificationRow(opts: {
  residentId: string;
  displayName: string | null | undefined;
  entryText: string;
  orgId: string | null;
}): {
  resident_id: string;
  type: 'besked';
  detail: string;
  severity: 'gul';
  source_table: 'journal_entries';
  org_id: string | null;
} {
  const residentLabel =
    typeof opts.displayName === 'string' && opts.displayName.trim()
      ? opts.displayName.trim()
      : 'En beboer';
  const excerpt = opts.entryText.length > 80 ? `${opts.entryText.slice(0, 77)}…` : opts.entryText;
  return {
    resident_id: opts.residentId,
    type: 'besked',
    detail: `${residentLabel}: «${excerpt}»`,
    severity: 'gul',
    source_table: 'journal_entries',
    org_id: opts.orgId,
  };
}

export async function postLysStaffMessage(
  message: string
): Promise<{ ok: true } | { ok: false; status: number }> {
  const res = await fetch('/api/lys/message-staff', {
    method: 'POST',
    credentials: 'include',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ message }),
  });
  if (!res.ok) return { ok: false, status: res.status };
  return { ok: true };
}
