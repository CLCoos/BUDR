/**
 * Kopiér til fagsystem: journalnotater fra BUDR som ren tekst, klar til at sætte ind i bostedets
 * officielle fagsystem (fx Sensum eller Nexus). Ingen formatering, der kan gå i stykker ved indsæt.
 */

export type FagsystemNote = {
  id: string;
  resident_id: string;
  staff_name: string | null;
  entry_text: string;
  category: string | null;
  created_at: string;
};

export type FagsystemTransfer = {
  journal_entry_id: string;
  transferred_by_name: string | null;
  transferred_at: string;
};

const DK = 'Europe/Copenhagen';

/** "15.10.2026 kl. 14.32" i dansk tid. */
export function fagsystemDateTime(iso: string): string {
  const d = new Date(iso);
  const date = new Intl.DateTimeFormat('da-DK', {
    timeZone: DK,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  })
    .format(d)
    .replace(/\//g, '.');
  const time = new Intl.DateTimeFormat('da-DK', {
    timeZone: DK,
    hour: '2-digit',
    minute: '2-digit',
  })
    .format(d)
    .replace(':', '.');
  return `${date} kl. ${time}`;
}

/** Fjerner tomme linjer i overskud og mellemrum i enderne, men bevarer afsnit. */
export function cleanNoteText(text: string): string {
  return text
    .replace(/\r\n?/g, '\n')
    .split('\n')
    .map((l) => l.replace(/[ \t]+$/g, ''))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

export function noteHeader(n: FagsystemNote): string {
  const parts = [fagsystemDateTime(n.created_at)];
  if (n.category?.trim()) parts.push(n.category.trim());
  if (n.staff_name?.trim()) parts.push(`Skrevet af ${n.staff_name.trim()}`);
  return parts.join(' · ');
}

export function formatNoteForFagsystem(n: FagsystemNote, withHeader: boolean): string {
  const body = cleanNoteText(n.entry_text);
  return withHeader ? `${noteHeader(n)}\n${body}` : body;
}

/** Flere notater i tidsorden, ældste først, adskilt af en tom linje. */
export function formatNotesForFagsystem(notes: FagsystemNote[], withHeader: boolean): string {
  return [...notes]
    .sort((a, b) => a.created_at.localeCompare(b.created_at))
    .map((n) => formatNoteForFagsystem(n, withHeader))
    .join('\n\n');
}

/** Notater pr. borger; borgere sorteret efter navn, notater ældste først. */
export function groupNotesByResident(
  notes: FagsystemNote[],
  nameOf: (residentId: string) => string
): { residentId: string; name: string; notes: FagsystemNote[] }[] {
  const map = new Map<string, FagsystemNote[]>();
  for (const n of notes) {
    const list = map.get(n.resident_id);
    if (list) list.push(n);
    else map.set(n.resident_id, [n]);
  }
  return [...map.entries()]
    .map(([residentId, list]) => ({
      residentId,
      name: nameOf(residentId),
      notes: list.sort((a, b) => a.created_at.localeCompare(b.created_at)),
    }))
    .sort((a, b) => a.name.localeCompare(b.name, 'da'));
}
