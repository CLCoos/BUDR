'use server';

import { cookies } from 'next/headers';
import { SESSION_COOKIE_NAME, validateSessionToken } from '@/lib/residentSessions';

const COOKIE_NAME = 'budr_resident_id';
const DEMO_RESIDENT_ID = 'demo-resident-001';
// Legacy readable cookie is a client hint only; server auth uses budr_resident_session.
const MAX_AGE = 60 * 60 * 24 * 365;

const COOKIE_OPTS = {
  httpOnly: false, // readable by client UX; never trusted for live server auth
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: MAX_AGE, // 31536000 — synk med /app/[resident_id]
  path: '/',
};

export async function setResidentId(residentId: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, residentId, COOKIE_OPTS);
}

export async function clearResidentId(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
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

  const legacyResidentId = cookieStore.get(COOKIE_NAME)?.value ?? null;
  if (
    legacyResidentId === DEMO_RESIDENT_ID &&
    (process.env.NODE_ENV !== 'production' || process.env.BUDR_ALLOW_PARK_DEMO_COOKIE === 'true')
  ) {
    return legacyResidentId;
  }

  return null;
}

// Alias kept for call-site compatibility
export const getResidentIdFromSession = getResidentId;
