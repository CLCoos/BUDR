'use client';

import React, { createContext, useContext } from 'react';
import type { NameDisplayMode } from '@/lib/residents/formatName';

export type CurrentOrg = {
  id: string | null;
  name: string | null;
  resident_name_display_mode: NameDisplayMode;
};

const CurrentOrgContext = createContext<CurrentOrg | null>(null);

export function CurrentOrgProvider({
  value,
  children,
}: {
  value: CurrentOrg;
  children: React.ReactNode;
}) {
  return <CurrentOrgContext.Provider value={value}>{children}</CurrentOrgContext.Provider>;
}

export function useCurrentOrg() {
  return useContext(CurrentOrgContext);
}
