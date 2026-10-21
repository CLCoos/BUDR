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

function copenhagenOffsetMinutes(at: Date): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: DK,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(at);
  const get = (t: string) => Number(parts.find((p) => p.type === t)?.value ?? '0');
  const hour = get('hour') === 24 ? 0 : get('hour');
  const asUtc = Date.UTC(get('year'), get('month') - 1, get('day'), hour, get('minute'));
  return Math.round((asUtc - at.getTime()) / 60000);
}

/** Dansk vægur ("2026-10-15", "09:45") → det rigtige UTC-øjeblik, også omkring sommertid. */
export function copenhagenLocalToDate(ymd: string, hhmm: string): Date {
  const [y, m, d] = ymd.split('-').map(Number);
  const [h, min] = hhmm.split(':').map(Number);
  const wall = Date.UTC(y!, m! - 1, d!, h!, min!);
  let guess = new Date(wall - copenhagenOffsetMinutes(new Date(wall)) * 60000);
  guess = new Date(wall - copenhagenOffsetMinutes(guess) * 60000);
  return guess;
}

/** Time of day (0–23) in Europe/Copenhagen. */
export function copenhagenHour(ref = new Date()): number {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: DK,
    hour: '2-digit',
    hour12: false,
  }).formatToParts(ref);
  let h = Number(parts.find((p) => p.type === 'hour')?.value ?? '0');
  if (h === 24) h = 0;
  return Number.isFinite(h) ? h : 0;
}

/**
 * Om klokken i København er mindst `hour`:`minute` (24h).
 * Bruges fx til at fremhæve manglende morgencheck-in efter kl. 10.
 */
export function copenhagenIsAtOrAfterClock(ref: Date, hour: number, minute: number = 0): boolean {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: DK,
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(ref);
  let h = Number(parts.find((p) => p.type === 'hour')?.value ?? '0');
  if (h === 24) h = 0;
  const m = Number(parts.find((p) => p.type === 'minute')?.value ?? '0');
  if (h > hour) return true;
  if (h < hour) return false;
  return m >= minute;
}
