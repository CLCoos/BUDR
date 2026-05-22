'use server';

import { cookies } from 'next/headers';
import { validateSessionToken, SESSION_COOKIE_NAME, LEGACY_COOKIE_NAME } from './residentSessions';

const DEMO_RESIDENT_ID = 'demo-resident-001';
// 1 year — device security (Face ID / PIN / biometrics) handles access control
const MAX_AGE = 60 * 60 * 24 * 365;

const COOKIE_OPTS = {
  httpOnly: false, // læsbar client-side så Lys kan logge ud uden API-kald
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: MAX_AGE, // 31536000 — synk med /app/[resident_id]
  path: '/',
};

export async function setResidentId(residentId: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(LEGACY_COOKIE_NAME, residentId, COOKIE_OPTS);
}

export async function clearResidentId(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(LEGACY_COOKIE_NAME);
  cookieStore.delete(SESSION_COOKIE_NAME);
}

function allowParkDemoCookie(): boolean {
  if (process.env.NODE_ENV !== 'production') return true;
  return process.env.BUDR_ALLOW_PARK_DEMO_COOKIE === 'true';
}

export async function getResidentId(): Promise<string | null> {
  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value?.trim();

  if (sessionToken) {
    const validation = await validateSessionToken(sessionToken);
    if (validation.valid) {
      return validation.residentUserId;
    }
  }

  const legacyResidentId = cookieStore.get(LEGACY_COOKIE_NAME)?.value?.trim();
  if (legacyResidentId === DEMO_RESIDENT_ID && allowParkDemoCookie()) {
    return legacyResidentId;
  }

  return null;
}

// Alias kept for call-site compatibility
export const getResidentIdFromSession = getResidentId;
