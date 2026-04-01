'use client';

import React, { createContext, useContext } from 'react';

export interface ResidentCtx {
  firstName: string;
  initials: string;
  residentId: string;
}

const ResidentContext = createContext<ResidentCtx>({
  firstName: '',
  initials: '',
  residentId: '',
});

export function ResidentProvider({
  firstName,
  initials,
  residentId,
  children,
}: ResidentCtx & { children: React.ReactNode }) {
  return (
    <ResidentContext.Provider value={{ firstName, initials, residentId }}>
      {children}
    </ResidentContext.Provider>
  );
}

export function useResident(): ResidentCtx {
  return useContext(ResidentContext);
}
