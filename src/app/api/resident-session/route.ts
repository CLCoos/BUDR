import { NextRequest, NextResponse } from 'next/server';
import { revokeSessionByToken, SESSION_COOKIE_NAME } from '@/lib/residentSessions';
import { clearResidentAuthCookies, setResidentAuthCookies } from '@/lib/residentSessionCookies';

const COOKIE_NAME = SESSION_COOKIE_NAME;
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
    setResidentAuthCookies(res, { sessionToken: token, maxAge: MAX_AGE });
    return res;
  } catch {
    return NextResponse.json({ error: 'Intern fejl' }, { status: 500 });
  }
}

/**
 * DELETE /api/resident-session
 * Logout — revokes the hashed session row and clears both auth cookies.
 * Client JS cannot clear the HttpOnly session cookie.
 */
export async function DELETE(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value?.trim();
  if (token) {
    await revokeSessionByToken(token);
  }
  const res = NextResponse.json({ ok: true });
  clearResidentAuthCookies(res);
  return res;
}
