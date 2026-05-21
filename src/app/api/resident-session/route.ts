import { NextRequest, NextResponse } from 'next/server';
import {
  LEGACY_COOKIE_NAME,
  SESSION_COOKIE_NAME,
  validateSessionToken,
} from '@/lib/residentSessions';

const COOKIE_MAX_AGE_FALLBACK = 30 * 24 * 60 * 60;

function maxAgeFromExpiresAt(expiresAt: string): number {
  const expiresMs = new Date(expiresAt).getTime();
  if (!Number.isFinite(expiresMs)) return COOKIE_MAX_AGE_FALLBACK;
  const seconds = Math.floor((expiresMs - Date.now()) / 1000);
  return Math.max(0, Math.min(seconds, COOKIE_MAX_AGE_FALLBACK));
}

/**
 * POST /api/resident-session
 * Called by the client after a successful PIN or WebAuthn verification
 * to set the HttpOnly session cookie.
 */
export async function POST(req: NextRequest) {
  try {
    const { token } = (await req.json()) as { token: string };

    if (!token || typeof token !== 'string') {
      return NextResponse.json({ error: 'Manglende token' }, { status: 400 });
    }

    const validation = await validateSessionToken(token);
    if (!validation.valid) {
      return NextResponse.json({ error: 'Ugyldig session' }, { status: 401 });
    }

    const maxAge = maxAgeFromExpiresAt(validation.expiresAt);
    const res = NextResponse.json({ ok: true });
    res.cookies.set(SESSION_COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge,
      path: '/',
    });
    // Compatibility hint for client-only Lys code. Authorization never trusts this cookie.
    res.cookies.set(LEGACY_COOKIE_NAME, validation.residentUserId, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge,
      path: '/',
    });
    return res;
  } catch {
    return NextResponse.json({ error: 'Intern fejl' }, { status: 500 });
  }
}

/**
 * DELETE /api/resident-session
 * Logout — clears the session cookie.
 */
export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SESSION_COOKIE_NAME, '', { maxAge: 0, path: '/' });
  res.cookies.set(LEGACY_COOKIE_NAME, '', { maxAge: 0, path: '/' });
  return res;
}
