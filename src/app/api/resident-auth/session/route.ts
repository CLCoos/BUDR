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
      return NextResponse.redirect(new URL(next, request.url));
    }
  }

  const loginUrl = new URL(`/app/${rid}`, request.url);
  loginUrl.searchParams.set('next', next);
  return NextResponse.redirect(loginUrl);
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const token = typeof body?.token === 'string' ? body.token : '';
  if (!token) {
    return NextResponse.json({ error: 'missing_token' }, { status: 400 });
  }

  const validation = await validateSessionToken(token);
  if (!validation.valid) {
    return NextResponse.json({ error: 'invalid_session' }, { status: 401 });
  }

  const res = NextResponse.json({ success: true });
  setSessionCookies(res, token, validation.residentUserId);
  return res;
}
