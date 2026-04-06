'use client';

import { useEffect, useState } from 'react';
import { getItem, setItem } from '@/lib/localStore';
import { LOCAL_KEYS, type StorageMode } from '@/types/local';

export type ResidentSession = {
  isLoggedIn: boolean;
  /** UUID from budr_resident_id cookie — null in guest mode */
  residentId: string | null;
  /** Local UUID — always present (generated on first visit) */
  guestId: string;
  /** Which storage backend to use */
  storageMode: StorageMode;
  /** Stable identifier regardless of mode (residentId ?? guestId) */
  activeId: string;
};

function readCookieResidentId(): string | null {
  if (typeof document === 'undefined') return null;
  return document.cookie.match(/budr_resident_id=([^;]+)/)?.[1] ?? null;
}

function getOrCreateGuestId(): string {
  const existing = getItem<string>(LOCAL_KEYS.guestId);
  if (existing) return existing;
  const id = crypto.randomUUID();
  setItem(LOCAL_KEYS.guestId, id);
  return id;
}

const SSR_INITIAL: ResidentSession = {
  isLoggedIn: false,
  residentId: null,
  guestId: '',
  storageMode: 'local',
  activeId: '',
};

/**
 * Compute session synchronously on the client.
 * Returns SSR_INITIAL on the server (no window/document) so that
 * the lazy useState initializer is SSR-safe without hydration mismatches
 * on the identifiers (we use useEffect to push the client values anyway).
 */
function computeSession(): ResidentSession {
  if (typeof window === 'undefined') return SSR_INITIAL;
  const residentId = readCookieResidentId();
  const guestId    = getOrCreateGuestId();
  return residentId
    ? { isLoggedIn: true,  residentId, guestId, storageMode: 'supabase', activeId: residentId }
    : { isLoggedIn: false, residentId: null, guestId, storageMode: 'local',   activeId: guestId  };
}

export function useResidentSession(): ResidentSession {
  // On the client this initializes synchronously with the real values.
  // On the server it returns SSR_INITIAL; useEffect then syncs the client state.
  const [session, setSession] = useState<ResidentSession>(computeSession);

  useEffect(() => {
    // Re-run on mount to handle the hydration case where the server returned
    // SSR_INITIAL (activeId: '') and we need to populate real values.
    const s = computeSession();
    if (s.activeId !== session.activeId) setSession(s);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return session;
}
