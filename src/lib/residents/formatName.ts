export type NameDisplayMode = 'first_name_initial' | 'full_name' | 'initials_only';

export interface ResidentNameFields {
  first_name: string | null;
  last_name: string | null;
  display_name: string | null;
}

function clean(value: string | null | undefined): string {
  return typeof value === 'string' ? value.trim() : '';
}

function fallbackName(displayName: string | null): string {
  const name = clean(displayName);
  return name || '—';
}

export function getInitials(resident: ResidentNameFields): string {
  const first = clean(resident.first_name);
  const last = clean(resident.last_name);
  if (first && last) {
    const firstInitial = first.slice(0, 1).toUpperCase();
    const lastInitials = last.slice(0, 2).toUpperCase();
    return `${firstInitial}${lastInitials}`;
  }
  return fallbackName(resident.display_name).slice(0, 3).toUpperCase();
}

export function formatResidentName(
  resident: ResidentNameFields,
  mode: NameDisplayMode = 'first_name_initial'
): string {
  const first = clean(resident.first_name);
  const last = clean(resident.last_name);
  if (!first || !last) return fallbackName(resident.display_name);

  switch (mode) {
    case 'full_name':
      return `${first} ${last}`;
    case 'initials_only':
      return getInitials(resident);
    case 'first_name_initial':
    default:
      return `${first} ${last.slice(0, 1)}.`;
  }
}
