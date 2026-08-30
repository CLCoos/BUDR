import { NextRequest, NextResponse } from 'next/server';
import {
  validateSessionToken,
  SESSION_COOKIE_NAME,
  LEGACY_COOKIE_NAME,
} from '@/lib/residentSessions';
import { sanitizeNext } from '@/lib/redirectSafety';
import { isValidUuid } from '@/lib/uuid';

const COOKIE_MAX_AGE = 30 * 24 * 60 * 60;

function htmlPage(title: string, body: string, status = 200): NextResponse {
  const html = `<!DOCTYPE html><html lang="da"><head><meta charset="utf-8"/><title>${title}</title></head><body style="font-family:system-ui,sans-serif;padding:2rem;text-align:center"><h1>${title}</h1><p>${body}</p></body></html>`;
  return new NextResponse(html, {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
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

  if (!rid || !isValidUuid(rid)) {
    return htmlPage('Ugyldigt link', 'Ugyldigt link', 400);
  }

  const existingToken = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (existingToken) {
    const validation = await validateSessionToken(existingToken);
    if (validation.valid && validation.residentUserId === rid) {
      const res = NextResponse.redirect(new URL(next, request.url));
      setSessionCookies(res, existingToken, rid);
      return res;
    }
  }

  const loginUrl = new URL(`/login/${rid}`, request.url);
  loginUrl.searchParams.set('next', next);
  return NextResponse.redirect(loginUrl);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const residentUserId = body?.residentUserId;

  if (!residentUserId || typeof residentUserId !== 'string') {
    return NextResponse.json({ error: 'missing_resident_id' }, { status: 400 });
  }

  if (!isValidUuid(residentUserId)) {
    return NextResponse.json({ error: 'invalid_resident_id' }, { status: 400 });
  }

  return NextResponse.json({ error: 'pin_or_webauthn_required' }, { status: 403 });
}
