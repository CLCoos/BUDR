import { NextRequest, NextResponse } from 'next/server';
import { validateSessionToken, LEGACY_COOKIE_NAME } from '@/lib/residentSessions';

const COOKIE_NAME = 'budr_resident_session';
const MAX_AGE = 30 * 24 * 60 * 60;

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

    const res = NextResponse.json({ ok: true });
    res.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: MAX_AGE,
      path: '/',
    });
    res.cookies.set(LEGACY_COOKIE_NAME, validation.residentUserId, {
      httpOnly: false,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: MAX_AGE,
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
  res.cookies.set(COOKIE_NAME, '', { maxAge: 0, path: '/' });
  return res;
}
