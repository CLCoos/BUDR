import type { DemoShift } from '@/lib/demoShiftPlan';
import type { CareHouse } from '@/lib/careDemoResidents';
import type { CarePortalDepartment } from '@/lib/carePortalHouse';

/** Lokations-strenge pr. kernevagt (samme som demo-vagtplan UI). */
export const VAGTPLAN_CORE_SHIFT_LOCATIONS: Record<'dag' | 'aften' | 'nat', string> = {
  dag: 'Hus A + B',
  aften: 'Hus B + C',
  nat: 'Nattevagt (hele huset)',
};

function ymd(d: Date): string {
  return d.toISOString().slice(0, 10);
}

/** Kernevagt ud fra klokken (overlap 15:00–15:30: regnes som dag indtil 15:30). */
export function currentCoreShiftTypeAt(now: Date): 'dag' | 'aften' | 'nat' {
  const mins = now.getHours() * 60 + now.getMinutes();
  if (mins >= 23 * 60 || mins < 7 * 60) return 'nat';
  if (mins < 7 * 60 + 30) return 'nat';
  if (mins < 15 * 60 + 30) return 'dag';
  return 'aften';
}

/** Udleder én afdeling fra vagt-lokationsstreng (første hus ved "Hus A + B"). */
export function departmentFromVagtplanLocationString(loc: string): CarePortalDepartment {
  const low = loc.toLowerCase();
  if (low.includes('hele hus')) return 'alle';
  const re = /hus\s*([ABCD])/gi;
  let first: CareHouse | null = null;
  let m: RegExpExecArray | null;
  while ((m = re.exec(loc)) !== null) {
    const letter = m[1]!.toUpperCase();
    if (letter === 'A' || letter === 'B' || letter === 'C' || letter === 'D') {
      if (!first) first = letter as CareHouse;
    }
  }
  return first ?? 'alle';
}

function shiftDatesToScan(shift: 'dag' | 'aften' | 'nat', now: Date): string[] {
  const today = ymd(now);
  if (shift === 'nat' && now.getHours() < 7) {
    const y = new Date(now);
    y.setDate(y.getDate() - 1);
    return [ymd(y), today];
  }
  return [today];
}

/**
 * Hvis den loggede bruger har en demo-vagt (dag/aften/nat) der matcher nuværende skift,
 * returneres tilhørende afdeling ud fra vagtplanens lokation.
 */
export function inferDepartmentFromDemoShifts(
  shifts: DemoShift[],
  now: Date = new Date()
): CarePortalDepartment | null {
  const type = currentCoreShiftTypeAt(now);
  for (const d of shiftDatesToScan(type, now)) {
    const has = shifts.some(
      (s) =>
        s.date === d &&
        (s.type === 'dag' || s.type === 'aften' || s.type === 'nat') &&
        s.type === type
    );
    if (has) {
      const loc = VAGTPLAN_CORE_SHIFT_LOCATIONS[type];
      return departmentFromVagtplanLocationString(loc);
    }
  }
  return null;
}
