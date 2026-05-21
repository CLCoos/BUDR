import { NextRequest, NextResponse } from 'next/server';
import { validateSessionToken, SESSION_COOKIE_NAME } from '@/lib/residentSessions';

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
      return NextResponse.redirect(new URL(next, request.url));
    }
  }

  const loginUrl = new URL(`/login/${rid}`, request.url);
  loginUrl.searchParams.set('next', next);
  return NextResponse.redirect(loginUrl);
}

export async function POST() {
  return NextResponse.json(
    { error: 'resident_session_requires_verified_pin_or_webauthn' },
    { status: 403 }
  );
}
