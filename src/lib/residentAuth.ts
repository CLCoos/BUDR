'use server';

import { cookies } from 'next/headers';
import {
  LEGACY_COOKIE_NAME,
  SESSION_COOKIE_NAME,
  validateSessionToken,
} from '@/lib/residentSessions';

const COOKIE_NAME = LEGACY_COOKIE_NAME;
const DEMO_RESIDENT_ID = 'demo-resident-001';
// Compatibility cookie only; server-side auth must validate budr_resident_session.
const MAX_AGE = 60 * 60 * 24 * 365;

const COOKIE_OPTS = {
  httpOnly: false, // readable by legacy Lys client code; not trusted as auth
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  maxAge: MAX_AGE,
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
  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (sessionToken) {
    const validation = await validateSessionToken(sessionToken);
    if (validation.valid) return validation.residentUserId;
  }

  // Demo mode is the only legacy-cookie-only path that remains valid. Real
  // resident UUIDs must come from a validated HttpOnly server session.
  const legacyResidentId = cookieStore.get(COOKIE_NAME)?.value ?? null;
  if (legacyResidentId === DEMO_RESIDENT_ID && allowParkDemoCookie()) {
    return legacyResidentId;
  }

  return null;
}

// Alias kept for call-site compatibility
export const getResidentIdFromSession = getResidentId;

function allowParkDemoCookie(): boolean {
  if (process.env.NODE_ENV !== 'production') return true;
  return process.env.BUDR_ALLOW_PARK_DEMO_COOKIE === 'true';
}
