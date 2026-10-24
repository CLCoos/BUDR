import { initialsOfName } from '@/lib/residents/formatName';

/** Navne på borgere: find dem i fri tekst, og sæt navnet tilbage efter AI har skrevet "Borgeren". */

export type ResidentNameRow = {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
  nickname: string | null;
};

export function residentNames(r: ResidentNameRow): string[] {
  return [r.display_name, r.first_name, r.nickname, r.last_name]
    .map((n) => (n ?? '').trim())
    .filter((n) => n.length >= 2);
}

/** Det fulde navn: kun til hover og borgerens egen side. */
export function residentFullName(r: ResidentNameRow): string {
  return (
    [r.first_name, r.last_name]
      .map((n) => (n ?? '').trim())
      .filter(Boolean)
      .join(' ') ||
    r.display_name?.trim() ||
    r.nickname?.trim() ||
    'Borger'
  );
}

/** Sådan står borgeren i portalen og i AI-svar: initialer (GDPR). */
export function residentLabel(r: ResidentNameRow): string {
  const full = residentFullName(r);
  return full === 'Borger' ? full : initialsOfName(full);
}

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function containsWord(text: string, word: string): boolean {
  return new RegExp(`(?<![\\p{L}])${escapeRegExp(word)}(?![\\p{L}])`, 'iu').test(text);
}

/**
 * Hvilke borgere nævnes i teksten? Fulde navne og visningsnavne vægter højest; et fornavn
 * tæller kun, hvis det er entydigt blandt bostedets borgere.
 */
export function findResidentsInText(text: string, residents: ResidentNameRow[]): ResidentNameRow[] {
  const full = residents.filter((r) => {
    const fullName = [r.first_name, r.last_name].filter(Boolean).join(' ').trim();
    return (
      (fullName.includes(' ') && containsWord(text, fullName)) ||
      (r.display_name?.trim() && containsWord(text, r.display_name.trim()))
    );
  });
  if (full.length > 0) return full;
  const byFirst = residents.filter((r) =>
    [r.first_name, r.nickname].some(
      (n) => n && n.trim().length >= 2 && containsWord(text, n.trim())
    )
  );
  return byFirst;
}

/** "Borgeren"/"Borgerens" → fornavn/fornavns (dansk genitiv: Lars → Lars'). */
export function restoreName(text: string, firstName: string): string {
  const name = firstName.trim();
  if (!name) return text;
  const genitive = /[sxz]$/i.test(name) ? `${name}'` : `${name}s`;
  return text.replace(/\bBorgerens\b/g, genitive).replace(/\bBorgeren\b/g, name);
}

/** Erstat navne (længste først) med en neutral betegnelse, før tekst sendes til AI. */
export function replaceNames(text: string, names: string[], replacement: string): string {
  const unique = [...new Set(names.map((n) => n.trim()).filter((n) => n.length >= 2))].sort(
    (a, b) => b.length - a.length
  );
  let out = text;
  for (const name of unique) {
    // Også ejefald ("Miras", "Lars'"), så navnet ikke slipper igennem med et s bagpå.
    out = out.replace(
      new RegExp(`(?<![\\p{L}])${escapeRegExp(name)}(s|')?(?![\\p{L}])`, 'giu'),
      (_m, genitive?: string) => (genitive ? `${replacement}s` : replacement)
    );
  }
  return out;
}
