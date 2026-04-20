'use server';

import { cookies } from 'next/headers';

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

export async function getResidentId(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(COOKIE_NAME)?.value ?? null;
}

// Alias kept for call-site compatibility
export const getResidentIdFromSession = getResidentId;
