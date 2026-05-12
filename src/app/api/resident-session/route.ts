import { NextRequest, NextResponse } from 'next/server';
import {
  createResidentServiceClient,
  isResidentSessionUuid,
  RESIDENT_ID_COOKIE,
  RESIDENT_SESSION_COOKIE,
} from '@/lib/residentApiSession';

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

    if (!isResidentSessionUuid(token)) {
      return NextResponse.json({ error: 'Manglende token' }, { status: 400 });
    }

    const supabase = createResidentServiceClient();
    if (!supabase) {
      return NextResponse.json({ error: 'Server ikke konfigureret' }, { status: 503 });
    }

    const { data: session, error } = await supabase
      .from('resident_sessions')
      .select('resident_id')
      .eq('token', token.trim())
      .gt('expires_at', new Date().toISOString())
      .maybeSingle();

    const residentId = (session as { resident_id?: string | null } | null)?.resident_id ?? '';
    if (error || !isResidentSessionUuid(residentId)) {
      return NextResponse.json({ error: 'Session ugyldig eller udløbet' }, { status: 401 });
    }

    const res = NextResponse.json({ ok: true });
    res.cookies.set(RESIDENT_SESSION_COOKIE, token.trim(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: MAX_AGE,
      path: '/',
    });
    res.cookies.set(RESIDENT_ID_COOKIE, residentId, {
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
  res.cookies.set(RESIDENT_SESSION_COOKIE, '', { maxAge: 0, path: '/' });
  res.cookies.set(RESIDENT_ID_COOKIE, '', { maxAge: 0, path: '/' });
  return res;
}
