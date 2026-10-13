import { NextRequest, NextResponse } from 'next/server';
import { LEGACY_COOKIE_NAME, revokeSession, validateSessionToken } from '@/lib/residentSessions';

const COOKIE_NAME = 'budr_resident_session';
/** 1 år — matcher øvrige beboer-cookie varighed; PIN/WebAuthn styrer reelt adgang. */
const MAX_AGE = 31536000;

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

    const res = NextResponse.json({ ok: true });
    res.cookies.set(COOKIE_NAME, token, {
      httpOnly: true,
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
 * Logout — tilbagekalder sessionen i databasen og rydder cookies, så en kopieret
 * cookie ikke kan genbruges.
 */
export async function DELETE(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value?.trim();
  if (token) {
    const validation = await validateSessionToken(token);
    if (validation.valid) {
      await revokeSession({ sessionId: validation.sessionId, reason: 'resident_logout' });
    }
  }
  const res = NextResponse.json({ ok: true });
  res.cookies.set(COOKIE_NAME, '', { maxAge: 0, path: '/' });
  res.cookies.set(LEGACY_COOKIE_NAME, '', { maxAge: 0, path: '/' });
  return res;
}
