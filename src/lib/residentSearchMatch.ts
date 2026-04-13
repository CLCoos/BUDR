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

/**
 * Højere tal = bedre match til sortering (dokumentsøgning m.m.).
 * Sikrer fx at eksakt initialer-match ("ls" → "LS") kommer over værelse/navn med tilfældig "ls"-delfuld.
 */
export function residentSearchRank(
  displayName: string,
  room: string,
  initials: string,
  queryRaw: string
): number {
  const q = queryRaw.trim();
  if (!q) return 0;

  const qLower = q.toLowerCase();
  const qLet = normalizeSearchLetters(q);
  const iniLet = normalizeSearchLetters(initials);
  const der = derivedInitialsLetters(displayName);

  let rank = 0;

  if (qLet.length > 0 && iniLet.length > 0) {
    if (iniLet === qLet) rank = Math.max(rank, 1000);
    else if (iniLet.startsWith(qLet)) rank = Math.max(rank, 900 - (iniLet.length - qLet.length));
    else if (qLet.startsWith(iniLet)) rank = Math.max(rank, 850 - (qLet.length - iniLet.length));
    else if (qLet.length >= 2 && iniLet.includes(qLet)) rank = Math.max(rank, 280);
  }

  if (qLet.length > 0 && der.length > 0) {
    if (der === qLet) rank = Math.max(rank, 960);
    else if (der.startsWith(qLet)) rank = Math.max(rank, 820 - (der.length - qLet.length));
    else if (qLet.startsWith(der)) rank = Math.max(rank, 780);
    else if (qLet.length >= 2 && der.includes(qLet)) rank = Math.max(rank, 260);
  }

  const nameLower = displayName.toLowerCase();
  if (nameLower.startsWith(qLower)) rank = Math.max(rank, 620);
  else if (nameLower.includes(qLower)) rank = Math.max(rank, 520);

  const roomLower = String(room).toLowerCase();
  if (roomLower.includes(qLower)) rank = Math.max(rank, 380);

  return rank;
}

export function sortResidentsBySearchRelevance<
  T extends { name: string; room: string; initials: string },
>(rows: T[], queryRaw: string): T[] {
  const q = queryRaw.trim();
  const out = [...rows];
  out.sort((a, b) => {
    if (q) {
      const ra = residentSearchRank(a.name, a.room, a.initials, q);
      const rb = residentSearchRank(b.name, b.room, b.initials, q);
      if (rb !== ra) return rb - ra;
    }
    return a.name.localeCompare(b.name, 'da', { sensitivity: 'base' });
  });
  return out;
}
