import { copenhagenHour, copenhagenYmd } from '@/lib/copenhagenDay';
import { minutesLate } from '@/lib/lys/medicationReminders';

/**
 * Frem til morgenmedicinen kl. 8 hører en endnu ikke indtruffet aftendosis til gårsdagen,
 * så nattevagten kan kvittere den ved overleveringen uden at optage dagens plads.
 */
const MORNING_DOSE_HOUR = 8;
/** Klokkeslæt fra 18:00 kan stadig være gårsdagens dosis, når vagten skriver efter midnat. */
const EVENING_DOSE_FROM_HOUR = 18;

/** Standardtidspunkt pr. tidsgruppe, når ordinationens time_label ikke indeholder et klokkeslæt. */
export const TIME_GROUP_DEFAULT_HHMM: Record<string, string> = {
  morgen: '08:00',
  middag: '12:30',
  aften: '20:00',
  behoev: '12:30',
};

/** Finder HH:MM i fx «kl. 8.00» eller «08:00»; null hvis der ikke er et klokkeslæt. */
export function parseHhMmFromTimeLabel(label: string): string | null {
  const compact = label.replace(/\s/g, '');
  const m = /(\d{1,2})[.:](\d{2})/.exec(compact);
  if (!m) return null;
  const h = Math.min(23, Math.max(0, parseInt(m[1]!, 10)));
  const min = Math.min(59, Math.max(0, parseInt(m[2]!, 10)));
  return `${String(h).padStart(2, '0')}:${String(min).padStart(2, '0')}`;
}

/** Ordinationens planlagte klokkeslæt (dansk tid), samme regel som medicin-widgetten. */
export function scheduledHhMm(timeGroup: string, timeLabel: string): string {
  return (
    parseHhMmFromTimeLabel(timeLabel ?? '') ??
    TIME_GROUP_DEFAULT_HHMM[String(timeGroup ?? '').toLowerCase()] ??
    '12:30'
  );
}

function previousCivilYmd(ymd: string): string {
  const d = new Date(`${ymd}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
}

/**
 * Kalenderdag en fast dosis hører til, når den registreres nu.
 *
 * En aftendosis (kl. 18 eller senere), der kvitteres før kl. 8,
 * hører til gårsdagen: dagens klokkeslæt er endnu ikke indtruffet. Ellers ville
 * kvitteringen optage dagens unikke plads, mens gårsdagens dosis stadig så
 * uafleveret ud. Morgen- og middagsdoser efter midnat hører til i dag.
 */
export function administrationYmd(now: Date, hhmm: string): string {
  const today = copenhagenYmd(now);
  const late = minutesLate(now, hhmm);
  const scheduledHour = Number(hhmm.split(':')[0]);
  if (
    late !== null &&
    late < 0 &&
    Number.isFinite(scheduledHour) &&
    scheduledHour >= EVENING_DOSE_FROM_HOUR &&
    copenhagenHour(now) < MORNING_DOSE_HOUR
  ) {
    return previousCivilYmd(today);
  }
  return today;
}

/** Dosis der skal vises og kvitteres: klokkeslæt plus den kalenderdag den hører til. */
export function doseOccasion(
  now: Date,
  timeGroup: string,
  timeLabel: string
): { ymd: string; hhmm: string } {
  const hhmm = scheduledHhMm(timeGroup, timeLabel);
  return { ymd: administrationYmd(now, hhmm), hhmm };
}

export type ScheduledMedication = {
  id: string;
  resident_id: string;
  name: string;
  dose: string;
  time_group: string;
  time_label: string;
};

export type MissedAdministration = {
  medication: ScheduledMedication;
  scheduledDate: string;
  hhmm: string;
};

/** En dosis regnes som ikke udleveret, når den er mindst så mange minutter over tid. */
export const NOT_GIVEN_AFTER_MINUTES = 60;
/**
 * Ældre doser ignoreres, så et nyt deploy ikke giver alarmer for gamle doser. Jobbet kører
 * hvert 15. minut, så hver dosis rammer vinduet [60, 240) mindst én gang.
 */
export const NOT_GIVEN_WINDOW_END_MINUTES = 240;

/**
 * Faste doser (ikke PN), der nu er 60–240 minutter over tid uden en aktiv udleveringskvittering.
 * Gårsdagens doser tælles med, så en sen aftendosis også fanges efter midnat.
 * `givenKeys` indeholder `${medication_id}|${scheduled_date}` for aktive kvitteringer.
 */
export function findNotGivenDoses(
  medications: ScheduledMedication[],
  givenKeys: Set<string>,
  now: Date
): MissedAdministration[] {
  const today = copenhagenYmd(now);
  const yesterday = copenhagenYmd(new Date(now.getTime() - 24 * 60 * 60 * 1000));
  const result: MissedAdministration[] = [];
  for (const medication of medications) {
    if (medication.time_group === 'behoev') continue;
    const hhmm = scheduledHhMm(medication.time_group, medication.time_label);
    const lateToday = minutesLate(now, hhmm);
    if (lateToday === null) continue;
    for (const [scheduledDate, late] of [
      [today, lateToday],
      [yesterday, lateToday + 24 * 60],
    ] as const) {
      if (late < NOT_GIVEN_AFTER_MINUTES || late >= NOT_GIVEN_WINDOW_END_MINUTES) continue;
      if (givenKeys.has(`${medication.id}|${scheduledDate}`)) continue;
      result.push({ medication, scheduledDate, hhmm });
    }
  }
  return result;
}
