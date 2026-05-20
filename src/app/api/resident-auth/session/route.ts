import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import {
  createSession,
  validateSessionToken,
  SESSION_COOKIE_NAME,
  LEGACY_COOKIE_NAME,
} from '@/lib/residentSessions';

const COOKIE_MAX_AGE = 30 * 24 * 60 * 60;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function htmlPage(title: string, body: string, status = 200): NextResponse {
  const html = `<!DOCTYPE html><html lang="da"><head><meta charset="utf-8"/><title>${title}</title></head><body style="font-family:system-ui,sans-serif;padding:2rem;text-align:center"><h1>${title}</h1><p>${body}</p></body></html>`;
  return new NextResponse(html, {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

function sanitizeNext(next: string | null): string {
  const fallback = '/park-hub';
  if (!next || !next.startsWith('/') || next.includes('//') || next.includes(':')) {
    return fallback;
  }
  return next;
}

function redirectToNext(request: NextRequest, path: string): NextResponse {
  const redirectUrl = new URL(path, request.url);
  redirectUrl.search = '';
  return NextResponse.redirect(redirectUrl);
}

function setSessionCookies(res: NextResponse, token: string, residentId: string): void {
  res.cookies.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: COOKIE_MAX_AGE,
  });
  res.cookies.set(LEGACY_COOKIE_NAME, residentId, {
    httpOnly: false,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: COOKIE_MAX_AGE,
  });
}

export async function GET(request: NextRequest) {
  const rid = request.nextUrl.searchParams.get('rid');
  const next = sanitizeNext(request.nextUrl.searchParams.get('next'));

  if (!rid || !UUID_RE.test(rid)) {
    return htmlPage('Ugyldigt link', 'Ugyldigt link', 400);
  }

  const existingToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (existingToken) {
    const validation = await validateSessionToken(existingToken);
    if (validation.valid && validation.residentUserId === rid) {
      return redirectToNext(request, next);
    }
  }

  const userAgent = request.headers.get('user-agent') ?? undefined;
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '';
  const ipHash = ip ? createHash('sha256').update(ip).digest('hex').slice(0, 16) : undefined;

  const session = await createSession({ residentUserId: rid, userAgent, ipHash });
  if (!session) {
    return htmlPage(
      'Kunne ikke starte session',
      'Kunne ikke starte session. Kontakt personalet, hvis problemet fortsætter.'
    );
  }

  const res = redirectToNext(request, next);
  setSessionCookies(res, session.token, rid);
  return res;
}

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
