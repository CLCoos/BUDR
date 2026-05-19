import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { createSession, SESSION_COOKIE_NAME } from '@/lib/residentSessions';

const COOKIE_MAX_AGE = 30 * 24 * 60 * 60;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const residentUserId = body?.residentUserId;

  if (!residentUserId || typeof residentUserId !== 'string') {
    return NextResponse.json({ error: 'missing_resident_id' }, { status: 400 });
  }

  if (!UUID_RE.test(residentUserId)) {
    return NextResponse.json({ error: 'invalid_resident_id' }, { status: 400 });
  }

  const userAgent = req.headers.get('user-agent') ?? undefined;
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '';
  const ipHash = ip ? createHash('sha256').update(ip).digest('hex').slice(0, 16) : undefined;

  const session = await createSession({ residentUserId, userAgent, ipHash });
  if (!session) {
    return NextResponse.json({ error: 'session_creation_failed' }, { status: 500 });
  }

  const res = NextResponse.json({ success: true });
  res.cookies.set(SESSION_COOKIE_NAME, session.token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: COOKIE_MAX_AGE,
  });
  return res;
}
