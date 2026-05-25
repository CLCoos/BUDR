import { NextRequest, NextResponse } from 'next/server';
import { validateSessionToken, SESSION_COOKIE_NAME } from '@/lib/residentSessions';
import { sanitizeNext } from '@/lib/redirectSafety';
import { isValidUuid } from '@/lib/uuid';

function htmlPage(title: string, body: string, status = 200): NextResponse {
  const html = `<!DOCTYPE html><html lang="da"><head><meta charset="utf-8"/><title>${title}</title></head><body style="font-family:system-ui,sans-serif;padding:2rem;text-align:center"><h1>${title}</h1><p>${body}</p></body></html>`;
  return new NextResponse(html, {
    status,
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
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

  return NextResponse.redirect(new URL(`/login/${rid}?next=${encodeURIComponent(next)}`, request.url));
}

export async function POST() {
  return NextResponse.json({ error: 'pin_or_webauthn_required' }, { status: 403 });
}
