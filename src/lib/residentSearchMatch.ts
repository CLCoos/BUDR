/**
 * Søgning på beboerliste / dokumentsøgning: navn, værelse og initialer
 * (inkl. uden mellemrum/punktum, fx "ls" → "L.S." / "LS").
 */
export function normalizeSearchLetters(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .replace(/[^a-zæøå]/g, '');
}

function derivedInitialsLetters(displayName: string): string {
  const parts = displayName.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '';
  return normalizeSearchLetters(parts.map((w) => w[0] ?? '').join(''));
}

/** Tom query = match alt (til filter-pipelines der selv tjekker tom). */
export function residentNameRoomInitialsMatch(
  displayName: string,
  room: string,
  initials: string,
  queryRaw: string
): boolean {
  const q = queryRaw.trim();
  if (!q) return true;

  const qLower = q.toLowerCase();
  if (displayName.toLowerCase().includes(qLower)) return true;
  if (String(room).toLowerCase().includes(qLower)) return true;

  const qLet = normalizeSearchLetters(q);
  if (qLet.length === 0) return false;

  const iniLet = normalizeSearchLetters(initials);
  if (iniLet.length > 0) {
    if (iniLet.startsWith(qLet) || qLet.startsWith(iniLet)) return true;
    if (qLet.length >= 2 && iniLet.includes(qLet)) return true;
  }

  const der = derivedInitialsLetters(displayName);
  if (der.length > 0) {
    if (der.startsWith(qLet) || qLet.startsWith(der)) return true;
    if (qLet.length >= 2 && der.includes(qLet)) return true;
  }

  return false;
}
