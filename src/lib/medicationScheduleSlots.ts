/**
 * Faste, døgnrytmemæssige tidspunkter til medicinpåmindelser.
 * Undgår vilkårlige klokkeslæt (fx 03:30) — typisk morgen, middag, eftermiddag og aften.
 */
export type MedicationTimeSlot = {
  id: string;
  label: string;
  /** HH:MM — matches DB `time`-felt uden sekunder; gem som `HH:MM:00` */
  time: string;
};

export const MEDICATION_TIME_SLOTS: MedicationTimeSlot[] = [
  { id: 'morgen', label: 'Morgen', time: '08:00' },
  { id: 'formiddag', label: 'Formiddag', time: '10:00' },
  { id: 'middag', label: 'Middag', time: '12:30' },
  { id: 'eftermiddag', label: 'Eftermiddag', time: '16:00' },
  { id: 'aften_tidlig', label: 'Tidlig aften', time: '18:00' },
  { id: 'aften', label: 'Aften', time: '20:00' },
  { id: 'sen_aften', label: 'Sen aften', time: '22:00' },
];

const ALLOWED = new Set(MEDICATION_TIME_SLOTS.map((s) => s.time));

/** Sekunder til Supabase `scheduled_time` / time-typer */
export function toScheduledTimeDb(hhmm: string): string {
  const m = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(hhmm.trim());
  if (!m) return '08:00:00';
  const h = m[1]!.padStart(2, '0');
  const min = m[2]!;
  return `${h}:${min}:00`;
}

export function isAllowedMedicationSlotTime(hhmm: string): boolean {
  return ALLOWED.has(hhmm.trim());
}

export function formatSlotLabelDa(slot: MedicationTimeSlot): string {
  const t = slot.time.replace(':', '.');
  return `${slot.label} — kl. ${t}`;
}

/**
 * Demo / simulering: alle medicin-tider som Date i lokal tid,
 * kun ovenstående slot-minutter, spredt over flere døgn.
 */
export function enumerateCivilMedicationSlotDates(anchorNow: Date): Date[] {
  const out: Date[] = [];
  for (let dayOff = -1; dayOff <= 3; dayOff++) {
    for (const slot of MEDICATION_TIME_SLOTS) {
      const [hStr, mStr] = slot.time.split(':');
      const h = parseInt(hStr!, 10);
      const min = parseInt(mStr!, 10);
      const d = new Date(anchorNow);
      d.setDate(d.getDate() + dayOff);
      d.setHours(h, min, 0, 0);
      out.push(d);
    }
  }
  return out.sort((a, b) => a.getTime() - b.getTime());
}
