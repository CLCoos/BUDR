/** Dato (YYYY-MM-DD) i dansk tid; medication_reminders.date er en lokal kalenderdag. */
export function copenhagenDateString(now: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Europe/Copenhagen',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}

/** Minutter siden et lokalt klokkeslæt (HH:MM[:SS]) i dag i dansk tid; negativ = endnu ikke. */
export function minutesLate(now: Date, hhmm: string): number | null {
  const [h, m] = hhmm.split(':').map((n) => Number(n));
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/Copenhagen',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(now);
  const nowH = Number(parts.find((p) => p.type === 'hour')?.value);
  const nowM = Number(parts.find((p) => p.type === 'minute')?.value);
  return nowH * 60 + nowM - (h * 60 + m);
}
