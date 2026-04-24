'use client';

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

  return {
    formatName: (resident: ResidentNameFields, overrideMode?: NameDisplayMode) =>
      formatResidentName(resident, overrideMode ?? mode),
    getInitials,
    mode,
  };
}
