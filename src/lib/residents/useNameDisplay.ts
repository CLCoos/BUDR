'use client';

import { useMemo } from 'react';
import { formatResidentName, fullResidentName, getInitials } from './formatName';

/**
 * Borgere vises altid med initialer. Hooken er bevaret, så kaldere ikke skal ændres,
 * og referencerne er stabile (AlertPanel hentede før data i en løkke ved nye funktioner).
 */
export function useNameDisplay() {
  return useMemo(
    () => ({
      formatName: formatResidentName,
      getInitials,
      fullName: fullResidentName,
      mode: 'initials_only' as const,
    }),
    []
  );
}
