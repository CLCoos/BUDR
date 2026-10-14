'use client';

import { useCallback, useMemo } from 'react';
import { useCurrentOrg } from '@/lib/org/useCurrentOrg';
import {
  formatResidentName,
  getInitials,
  type NameDisplayMode,
  type ResidentNameFields,
} from './formatName';

export function useNameDisplay() {
  const org = useCurrentOrg();
  const mode: NameDisplayMode = org?.resident_name_display_mode ?? 'first_name_initial';

  // Stabil reference: komponenter har `formatName` i useEffect/useCallback-afhængigheder.
  // En ny funktion pr. render fik fx AlertPanel til at hente data i en uendelig løkke.
  const formatName = useCallback(
    (resident: ResidentNameFields, overrideMode?: NameDisplayMode) =>
      formatResidentName(resident, overrideMode ?? mode),
    [mode]
  );

  return useMemo(() => ({ formatName, getInitials, mode }), [formatName, mode]);
}
