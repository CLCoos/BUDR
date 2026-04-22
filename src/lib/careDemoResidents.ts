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
  { id: 'res-001', displayName: 'Anders Mikkelsen', initials: 'AM', house: 'A', room: '104' },
  { id: 'res-002', displayName: 'Finn Larsen', initials: 'FL', house: 'A', room: '103' },
  { id: 'res-003', displayName: 'Kirsten Rasmussen', initials: 'KR', house: 'A', room: '109' },
  { id: 'res-004', displayName: 'Maja Thomsen', initials: 'MT', house: 'B', room: '211' },
  { id: 'res-005', displayName: 'Thomas Berg', initials: 'TB', house: 'D', room: '407' },
  { id: 'res-006', displayName: 'Lena Poulsen', initials: 'LP', house: 'A', room: '102' },
  { id: 'res-007', displayName: 'Henrik Sørensen', initials: 'HS', house: 'C', room: '312' },
  { id: 'res-008', displayName: 'Birgit Nielsen', initials: 'BN', house: 'B', room: '205' },
  { id: 'res-009', displayName: 'Rasmus Vestergaard', initials: 'RV', house: 'D', room: '401' },
  { id: 'res-010', displayName: 'Dorthe Andersen', initials: 'DA', house: 'C', room: '301' },
  { id: 'res-011', displayName: 'Signe Holm', initials: 'SH', house: 'B', room: '208' },
  { id: 'res-012', displayName: 'Ole Christiansen', initials: 'OC', house: 'C', room: '315' },
];

export function careDemoProfileById(id: string): CareDemoResidentProfile | undefined {
  return CARE_DEMO_RESIDENT_PROFILES.find((r) => r.id === id);
}

/** Til `DepartmentSelect` i Care Portal (uden "Alle" — den håndteres af komponenten). */
export const CARE_PORTAL_DEPARTMENT_OPTIONS: { id: CareHouse; label: string }[] = CARE_HOUSES.map(
  (id) => ({ id, label: carePortalHouseChipLabel(id) })
);
