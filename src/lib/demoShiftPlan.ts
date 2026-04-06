/** Simuleret vagtplan / løn for Care Portal demo (localStorage). */

export const DEMO_SHIFTS_KEY = 'budr_demo_shifts_v1';
export const DEMO_VACATION_KEY = 'budr_demo_vacation_days_v1';

export type DemoShiftType = 'dag' | 'aften' | 'nat' | 'vagt' | 'uddannelse';

export type DemoShift = {
  id: string;
  date: string; // YYYY-MM-DD
  type: DemoShiftType;
  start: string; // HH:mm
  end: string;
  hours: number;
  supplement?: string;
};

export type DemoVacationDay = {
  id: string;
  date: string;
  label: string;
  status: 'planlagt' | 'godkendt';
};

const HOURLY_BASE = 198.5;
const EVENING_BONUS_PER_H = 12.4;
const NIGHT_BONUS_PER_H = 28.0;
const WEEKEND_BONUS_PER_SHIFT = 185;

function isWeekend(d: Date): boolean {
  const day = d.getDay();
  return day === 0 || day === 6;
}

export function defaultDemoShifts(): DemoShift[] {
  const out: DemoShift[] = [];
  const base = new Date();
  base.setHours(12, 0, 0, 0);
  for (let i = -3; i <= 14; i++) {
    const d = new Date(base);
    d.setDate(d.getDate() + i);
    const iso = d.toISOString().slice(0, 10);
    const wd = d.getDay();
    if (wd === 0 || wd === 6) {
      if (i % 2 === 0) {
        out.push({
          id: `s-${iso}-d`,
          date: iso,
          type: 'dag',
          start: '08:00',
          end: '15:30',
          hours: 7.5,
        });
      }
      continue;
    }
    if (i % 7 === 0 || i === 2) {
      out.push({
        id: `s-${iso}-a`,
        date: iso,
        type: 'aften',
        start: '15:00',
        end: '23:00',
        hours: 8,
        supplement: 'Aftentillæg',
      });
    } else if (i % 5 === 0 && i > 0) {
      out.push({
        id: `s-${iso}-n`,
        date: iso,
        type: 'nat',
        start: '23:00',
        end: '07:00',
        hours: 8,
        supplement: 'Nattillæg',
      });
    } else {
      out.push({
        id: `s-${iso}-d`,
        date: iso,
        type: 'dag',
        start: '07:30',
        end: '15:30',
        hours: 8,
      });
    }
  }
  return out;
}

export function defaultVacation(): DemoVacationDay[] {
  const d = new Date();
  d.setDate(d.getDate() + 21);
  return [
    {
      id: 'v1',
      date: d.toISOString().slice(0, 10),
      label: 'Sommerferie (planlagt)',
      status: 'godkendt',
    },
  ];
}

export function loadShifts(): DemoShift[] {
  if (typeof window === 'undefined') return defaultDemoShifts();
  try {
    const raw = localStorage.getItem(DEMO_SHIFTS_KEY);
    if (!raw) {
      const seed = defaultDemoShifts();
      localStorage.setItem(DEMO_SHIFTS_KEY, JSON.stringify(seed));
      return seed;
    }
    const parsed = JSON.parse(raw) as DemoShift[];
    return Array.isArray(parsed) && parsed.length ? parsed : defaultDemoShifts();
  } catch {
    return defaultDemoShifts();
  }
}

export function saveShifts(shifts: DemoShift[]) {
  try {
    localStorage.setItem(DEMO_SHIFTS_KEY, JSON.stringify(shifts));
  } catch {
    /* ignore */
  }
}

export function loadVacation(): DemoVacationDay[] {
  if (typeof window === 'undefined') return defaultVacation();
  try {
    const raw = localStorage.getItem(DEMO_VACATION_KEY);
    if (!raw) {
      const seed = defaultVacation();
      localStorage.setItem(DEMO_VACATION_KEY, JSON.stringify(seed));
      return seed;
    }
    const parsed = JSON.parse(raw) as DemoVacationDay[];
    return Array.isArray(parsed) ? parsed : defaultVacation();
  } catch {
    return defaultVacation();
  }
}

/** Aktuel lønperiode: den 15. til den 14. (typisk kommunal praksis varierer — demo). */
export function currentPayPeriod(): { start: Date; end: Date; label: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const d = now.getDate();
  let start: Date;
  let end: Date;
  if (d >= 15) {
    start = new Date(y, m, 15);
    end = new Date(y, m + 1, 14, 23, 59, 59, 999);
  } else {
    start = new Date(y, m - 1, 15);
    end = new Date(y, m, 14, 23, 59, 59, 999);
  }
  const fmt = (x: Date) =>
    x.toLocaleDateString('da-DK', { day: 'numeric', month: 'short', year: 'numeric' });
  return { start, end, label: `${fmt(start)} — ${fmt(end)}` };
}

export function shiftsInPeriod(shifts: DemoShift[], start: Date, end: Date): DemoShift[] {
  const s = start.toISOString().slice(0, 10);
  const e = end.toISOString().slice(0, 10);
  return shifts.filter((x) => x.date >= s && x.date <= e);
}

export function estimateGrossPay(shifts: DemoShift[]): {
  base: number;
  supplements: number;
  weekend: number;
  totalHours: number;
  estimatedGross: number;
} {
  let base = 0;
  let supplements = 0;
  let weekend = 0;
  let totalHours = 0;
  for (const sh of shifts) {
    totalHours += sh.hours;
    base += sh.hours * HOURLY_BASE;
    if (sh.type === 'aften') supplements += sh.hours * EVENING_BONUS_PER_H;
    if (sh.type === 'nat') supplements += sh.hours * NIGHT_BONUS_PER_H;
    const dt = new Date(sh.date + 'T12:00:00');
    if (isWeekend(dt)) weekend += WEEKEND_BONUS_PER_SHIFT;
  }
  return {
    base,
    supplements,
    weekend,
    totalHours,
    estimatedGross: Math.round(base + supplements + weekend),
  };
}

export function formatKr(n: number) {
  return new Intl.NumberFormat('da-DK', {
    style: 'currency',
    currency: 'DKK',
    maximumFractionDigits: 0,
  }).format(n);
}

export const DEMO_OPEN_SHIFTS = [
  {
    id: 'open-1',
    date: '',
    type: 'aften' as const,
    label: 'Aftenvagt · Hus B',
    hours: 8,
    note: 'Akut fravær — tilmelding senest kl. 14',
  },
  {
    id: 'open-2',
    date: '',
    type: 'dag' as const,
    label: 'Døgnvagt (vikar)',
    hours: 24,
    note: 'Kræver §124-kursus',
  },
];
