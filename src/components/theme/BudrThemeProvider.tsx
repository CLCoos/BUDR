'use client';

import { useEffect } from 'react';
import { applyBudrTheme, readStoredBudrTheme } from '@/lib/budrTheme';

/** Sætter `data-theme` på `<html>` (+ `#care-portal-shell` hvis den findes) fra `localStorage` `budr-theme`. */
export default function BudrThemeProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    applyBudrTheme(readStoredBudrTheme());
    const onStorage = (e: StorageEvent) => {
      if (e.key !== 'budr-theme') return;
      applyBudrTheme(readStoredBudrTheme());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  return <>{children}</>;
}
