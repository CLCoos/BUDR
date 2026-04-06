import { getDemoOverrapportResidents } from '@/lib/overrapport/demoResidentSummaries';
import type { TilsynsResidentRow } from './composeStructuredTilsynsrapport';

/** Demo beboerdata til tilsynsrapport (samme narrativ som portal-demo). */
export function getDemoTilsynsResidents(): TilsynsResidentRow[] {
  return getDemoOverrapportResidents().map((r) => ({
    name: r.name,
    trafficLight: r.trafficLight,
    moodLabel: r.moodLabel,
    note: r.notePreview,
  }));
}
