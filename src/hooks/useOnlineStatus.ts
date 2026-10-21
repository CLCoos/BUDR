'use client';

import { useEffect, useState } from 'react';

/**
 * Browser online/offline — opdateres ved `online` / `offline` events.
 */
export function useOnlineStatus(): boolean {
  // Starter som online på både server og klient, så første render er ens (ingen hydration-fejl).
  const [online, setOnline] = useState(true);

  useEffect(() => {
    setOnline(navigator.onLine);
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);

  return online;
}
