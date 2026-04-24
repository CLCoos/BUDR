'use client';

import DokumentSøgning from '@/components/DokumentSøgning';
import { carePortalPilotSimulatedData } from '@/lib/carePortalPilotSimulated';

export function GlobalSearch() {
  const pilot = carePortalPilotSimulatedData();
  return <DokumentSøgning carePortalDark linkTarget={pilot ? 'pilot' : 'live'} />;
}
