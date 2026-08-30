'use server';

import { cookies } from 'next/headers';
import { validateSessionToken } from './residentSessions';

const COOKIE_NAME = 'budr_resident_id';
const SESSION_COOKIE_NAME = 'budr_resident_session';
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
  cookieStore.set(COOKIE_NAME, residentId, COOKIE_OPTS);
}

export async function clearResidentId(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function getResidentId(): Promise<string | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value?.trim();
  if (token) {
    const validation = await validateSessionToken(token);
    if (validation.valid) return validation.residentUserId;
  }

  const legacyResidentId = cookieStore.get(COOKIE_NAME)?.value ?? null;
  if (process.env.NODE_ENV !== 'production' && legacyResidentId === DEMO_RESIDENT_ID) {
    return DEMO_RESIDENT_ID;
  }

  return null;
}

// Alias kept for call-site compatibility
export const getResidentIdFromSession = getResidentId;
