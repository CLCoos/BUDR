'use server';

import { cookies } from 'next/headers';
import { SESSION_COOKIE_NAME, validateSessionToken } from '@/lib/residentSessions';

const COOKIE_NAME = 'budr_resident_id';
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

const DEMO_RESIDENT_ID = 'demo-resident-001';

function allowParkDemoCookie(): boolean {
  if (process.env.NODE_ENV !== 'production') return true;
  return process.env.BUDR_ALLOW_PARK_DEMO_COOKIE === 'true';
}

/**
 * Borgerens id fra den HttpOnly session (`budr_resident_session`), valideret mod
 * `resident_sessions`. Den klient-læsbare `budr_resident_id`-cookie stoles ikke på,
 * da enhver kan sætte den; den accepteres kun for demo-borgeren, når demo er slået til.
 */
export async function getResidentId(): Promise<string | null> {
  const cookieStore = await cookies();

  const sessionToken = cookieStore.get(SESSION_COOKIE_NAME)?.value?.trim();
  if (sessionToken) {
    const validation = await validateSessionToken(sessionToken);
    if (validation.valid) return validation.residentUserId;
  }

  const legacy = cookieStore.get(COOKIE_NAME)?.value?.trim();
  if (legacy === DEMO_RESIDENT_ID && allowParkDemoCookie()) return DEMO_RESIDENT_ID;

  return null;
}

// Alias kept for call-site compatibility
export const getResidentIdFromSession = getResidentId;
