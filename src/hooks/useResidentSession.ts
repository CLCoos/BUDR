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

const INITIAL: ResidentSession = {
  isLoggedIn: false,
  residentId: null,
  guestId: '',
  storageMode: 'local',
  activeId: '',
};

export function useResidentSession(): ResidentSession {
  const [session, setSession] = useState<ResidentSession>(INITIAL);

  useEffect(() => {
    const residentId = readCookieResidentId();
    const guestId    = getOrCreateGuestId();

    if (residentId) {
      setSession({
        isLoggedIn:  true,
        residentId,
        guestId,
        storageMode: 'supabase',
        activeId:    residentId,
      });
    } else {
      setSession({
        isLoggedIn:  false,
        residentId:  null,
        guestId,
        storageMode: 'local',
        activeId:    guestId,
      });
    }
  }, []);

  return session;
}
