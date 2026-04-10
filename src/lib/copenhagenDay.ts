/** Dansk drift: journal «i dag» skal følge kalenderdag i København, ikke server-TZ (fx UTC på Netlify). */

const DK = 'Europe/Copenhagen';

/** YYYY-MM-DD for kalenderdag i København */
export function copenhagenYmd(ref = new Date()): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: DK,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(ref);
}

/**
 * UTC-øjeblik når kalenderdagen `ymd` (YYYY-MM-DD) starter i København.
 * Bruges som `.gte('created_at', …)` mod `timestamptz` i Postgres.
 */
export function copenhagenStartOfDateUtcIso(ymd: string): string {
  const anchor = Date.parse(`${ymd}T12:00:00.000Z`);
  if (Number.isNaN(anchor)) {
    return new Date().toISOString();
  }
  const start = anchor - 40 * 3600000;
  const end = anchor + 40 * 3600000;
  let minMs: number | null = null;
  for (let t = start; t <= end; t += 60000) {
    const formatted = new Intl.DateTimeFormat('en-CA', {
      timeZone: DK,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date(t));
    if (formatted === ymd && (minMs === null || t < minMs)) {
      minMs = t;
    }
  }
  if (minMs === null) {
    return new Date(`${ymd}T00:00:00.000Z`).toISOString();
  }
  return new Date(minMs).toISOString();
}

export function copenhagenStartOfTodayUtcIso(ref = new Date()): string {
  return copenhagenStartOfDateUtcIso(copenhagenYmd(ref));
}
