/**
 * Borgere vises altid med initialer i portalen (GDPR, Christian 2026-10-23).
 * Det fulde navn ses kun ved hover på initialerne og på borgerens egen side.
 */
export type NameDisplayMode = 'first_name_initial' | 'full_name' | 'initials_only';

export interface ResidentNameFields {
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
}

function clean(value: string | null | undefined): string {
  return typeof value === 'string' ? value.trim() : '';
}

/** Initialer af et navn: forbogstavet i hvert ord ("Sara Kristensen" → "SK"). Initialer bevares. */
export function initialsOfName(name: string): string {
  const t = name.trim();
  if (!t) return '—';
  if (/^[\p{Lu}]{2,4}\.?$/u.test(t)) return t.replace(/\.$/, '');
  const words = t
    .replace(/\./g, ' ')
    .split(/[\s-]+/)
    .filter(Boolean);
  if (words.length === 1) return words[0]!.slice(0, 2).toUpperCase();
  return words
    .map((w) => w[0]!.toUpperCase())
    .join('')
    .slice(0, 4);
}

/** Det fulde navn, til hover og til borgerens egen side. */
export function fullResidentName(resident: ResidentNameFields): string {
  const full = [clean(resident.first_name), clean(resident.last_name)].filter(Boolean).join(' ');
  return full || clean(resident.display_name) || '—';
}

export function getInitials(resident: ResidentNameFields): string {
  return initialsOfName(fullResidentName(resident));
}

/** Navnet, som det vises i lister og kort: altid initialer. */
export function formatResidentName(resident: ResidentNameFields, _mode?: NameDisplayMode): string {
  return getInitials(resident);
}
