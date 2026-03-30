'use server';

import { cookies } from 'next/headers';

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
 * Validate a session token against the edge function and return resident_id.
 * Call this directly in server components — do not rely on middleware headers.
 */
export async function validateSessionToken(token: string): Promise<string | null> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/resident-session-validate`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
          'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!}`,
        },
        body: JSON.stringify({ session_token: token }),
        cache: 'no-store',
      },
    );
    if (!res.ok) return null;
    const { data } = (await res.json()) as { data?: { resident_id: string } };
    return data?.resident_id ?? null;
  } catch {
    return null;
  }
}

/**
 * Read cookie + validate session. Returns resident_id or null.
 */
export async function getResidentId(): Promise<string | null> {
  const token = await getResidentSessionToken();
  if (!token) return null;
  return validateSessionToken(token);
}

/**
 * Alias for getResidentId() — reads budr_resident_session cookie directly
 * (not from middleware headers — Next.js 15 server actions require cookies()
 * from next/headers, not forwarded request headers).
 */
export const getResidentIdFromSession = getResidentId;
