'use client';

import { useEffect, useState } from 'react';

export default function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(true);
  const [showBanner, setShowBanner] = useState(false);
  const [justCameOnline, setJustCameOnline] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Undgå service worker på Next.js + Netlify: gammel cache giver ofte ødelagte
    // /_next/static-chunks efter deploy (blank side). Afregistrer evt. gammel SW.
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistrations().then((regs) => {
        regs.forEach((reg) => reg.unregister());
      });
    }

    const handleOnline = () => {
      setIsOnline(true);
      setJustCameOnline(true);
      setShowBanner(true);
      setTimeout(() => {
        setShowBanner(false);
        setJustCameOnline(false);
      }, 3000);

      // Trigger background sync
      if ('serviceWorker' in navigator && 'SyncManager' in window) {
        navigator.serviceWorker.ready.then((reg) => {
          const sw = reg as ServiceWorkerRegistration & {
            sync?: { register: (tag: string) => Promise<void> };
          };
          sw.sync?.register('sync-journal').catch(() => {});
        });
      }
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowBanner(true);
    };

    setIsOnline(navigator.onLine);
    if (!navigator.onLine) setShowBanner(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  if (!showBanner) return null;

  return (
    <div
      className={`fixed top-0 left-0 right-0 z-50 flex items-center justify-center gap-2 py-2 px-4 text-xs font-semibold transition-all duration-500 ${
        isOnline
          ? 'bg-emerald-500/90 text-white'
          : 'bg-midnight-800/95 text-rose-300 border-b border-rose-500/30'
      }`}
    >
      {isOnline ? (
        <>
          <span className="w-1.5 h-1.5 bg-white rounded-full" />
          {justCameOnline ? '✅ Forbundet igen — synkroniserer data...' : 'Online'}
        </>
      ) : (
        <>
          <span className="w-1.5 h-1.5 bg-rose-400 rounded-full animate-pulse" />
          📴 Offline — appen virker stadig. Data synkroniseres når du er online igen.
        </>
      )}
    </div>
  );
}
