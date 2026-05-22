/** Delte demo-profiler til Care Portal (kalender, medicin, beboerliste). */
export const CARE_HOUSES = ['A', 'B', 'C', 'D', 'TLS'] as const;
export type CareHouse = (typeof CARE_HOUSES)[number];

/** Kort label til hus-chips (fx onboarding `TLS` uden "Hus"-præfiks). */
export function carePortalHouseChipLabel(house: CareHouse): string {
  return house === 'TLS' ? 'TLS' : `Hus ${house}`;
}

export type CareDemoResidentProfile = {
  id: string;
  displayName: string;
  initials: string;
  house: CareHouse;
  room: string;
};

export const CARE_DEMO_RESIDENT_PROFILES: CareDemoResidentProfile[] = [
  { id: 'res-sara', displayName: 'Sara Kristensen', initials: 'SK', house: 'A', room: '104' },
  { id: 'res-mikkel', displayName: 'Mikkel Thomsen', initials: 'MT', house: 'A', room: '103' },
  { id: 'res-anders', displayName: 'Anders Pedersen', initials: 'AP', house: 'A', room: '109' },
  { id: 'res-mette', displayName: 'Mette Poulsen', initials: 'MP', house: 'B', room: '205' },
  { id: 'res-camilla', displayName: 'Camilla Birk', initials: 'CB', house: 'B', room: '211' },
  { id: 'res-jonas', displayName: 'Jonas Friis', initials: 'JF', house: 'C', room: '312' },
];

export function careDemoProfileById(id: string): CareDemoResidentProfile | undefined {
  return CARE_DEMO_RESIDENT_PROFILES.find((r) => r.id === id);
}

/** Til `DepartmentSelect` i Care Portal (uden "Alle" — den håndteres af komponenten). */
export const CARE_PORTAL_DEPARTMENT_OPTIONS: { id: CareHouse; label: string }[] = CARE_HOUSES.map(
  (id) => ({ id, label: carePortalHouseChipLabel(id) })
);
