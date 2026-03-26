'use server';

import { cookies, headers } from 'next/headers';

const COOKIE_NAME = 'budr_resident_session';
const MAX_AGE = 60 * 60 * 12; // 12 hours in seconds

/**
 * Store a resident session token as an HttpOnly cookie.
 * Called after successful PIN or WebAuthn verification.
 */
export async function setResidentSession(token: string): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'strict',
    maxAge: MAX_AGE,
    path: '/',
  });
}

/**
 * Clear the resident session cookie (logout).
 */
export async function clearResidentSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

/**
 * Read the resident session token from the cookie (server-side).
 */
export async function getResidentSessionToken(): Promise<string | null> {
  const cookieStore = await cookies();
  return cookieStore.get(COOKIE_NAME)?.value ?? null;
}

/**
 * Read the resident_id injected by middleware into request headers.
 * Use this in Server Components / Route Handlers within /park/*.
 */
export async function getResidentId(): Promise<string | null> {
  const headerStore = await headers();
  return headerStore.get('x-resident-id');
}
