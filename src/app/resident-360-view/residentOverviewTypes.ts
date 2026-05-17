/** Delte typer for beboeroversigt (liste + 360°). */

export type TrafficDb = 'grøn' | 'gul' | 'rød';
export type TrafficUi = 'groen' | 'gul' | 'roed';

export const DB_TO_UI: Record<TrafficDb, TrafficUi> = {
  grøn: 'groen',
  gul: 'gul',
  rød: 'roed',
};

export type ResidentItem = {
  id: string;
  name: string;
  initials: string;
  room: string;
  /** Afdeling/hus fra onboarding_data (fx Hus A, TLS) */
  house: string;
  trafficLight: TrafficUi | null;
  moodScore: number | null;
  lastCheckinIso: string | null;
  notePreview: string;
  checkinToday: boolean;
  pendingProposals: number;
  /** True når hverken first_name eller last_name er sat (rådata) */
  nameFieldsMissing: boolean;
};
