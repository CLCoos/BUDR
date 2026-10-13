import { NextRequest, NextResponse } from 'next/server';
import { createHash } from 'crypto';
import { redeemLoginToken, SESSION_COOKIE_NAME, LEGACY_COOKIE_NAME } from '@/lib/residentSessions';
import { sanitizeNext } from '@/lib/redirectSafety';

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

/**
 * GET /api/resident-auth/session?token=<engangs-token>&next=/park-hub
 * Veksler et login-link udstedt af personalet til en HttpOnly borgersession.
 * Borgerens id alene giver ikke længere adgang.
 */
export async function GET(request: NextRequest) {
  const loginToken = request.nextUrl.searchParams.get('token')?.trim() ?? '';
  const next = sanitizeNext(request.nextUrl.searchParams.get('next'));

  if (!loginToken) {
    return htmlPage(
      'Ugyldigt link',
      'Linket er ikke gyldigt. Bed personalet om et nyt login-link.',
      400
    );
  }

  const userAgent = request.headers.get('user-agent') ?? undefined;
  const ip = request.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '';
  const ipHash = ip ? createHash('sha256').update(ip).digest('hex').slice(0, 16) : undefined;

  const session = await redeemLoginToken({ token: loginToken, userAgent, ipHash });
  if (!session) {
    return htmlPage(
      'Linket virker ikke længere',
      'Linket er udløbet eller allerede brugt. Bed personalet om et nyt login-link.',
      410
    );
  }

  const res = NextResponse.redirect(new URL(next, request.url));
  setSessionCookies(res, session.token, session.residentUserId);
  return res;
}
