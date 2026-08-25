import type { NextResponse } from 'next/server';
import { LEGACY_COOKIE_NAME, SESSION_COOKIE_NAME } from '@/lib/residentAuthCookieNames';

export { LEGACY_COOKIE_NAME, SESSION_COOKIE_NAME } from '@/lib/residentAuthCookieNames';

/** Match set + clear attributes so Secure/HttpOnly cookies actually expire. */
export function residentAuthCookieSecure(): boolean {
  return process.env.NODE_ENV === 'production';
}

function baseCookieAttrs() {
  return {
    secure: residentAuthCookieSecure(),
    sameSite: 'lax' as const,
    path: '/',
  };
}

export function setResidentAuthCookies(
  res: NextResponse,
  opts: { sessionToken?: string; residentId?: string; maxAge: number }
): void {
  const base = baseCookieAttrs();
  if (opts.sessionToken) {
    res.cookies.set(SESSION_COOKIE_NAME, opts.sessionToken, {
      ...base,
      httpOnly: true,
      maxAge: opts.maxAge,
    });
  }
  if (opts.residentId) {
    res.cookies.set(LEGACY_COOKIE_NAME, opts.residentId, {
      ...base,
      httpOnly: false,
      maxAge: opts.maxAge,
    });
  }
}

export function clearResidentAuthCookies(res: NextResponse): void {
  const base = baseCookieAttrs();
  const expired = new Date(0);
  res.cookies.set(SESSION_COOKIE_NAME, '', {
    ...base,
    httpOnly: true,
    maxAge: 0,
    expires: expired,
  });
  res.cookies.set(LEGACY_COOKIE_NAME, '', {
    ...base,
    httpOnly: false,
    maxAge: 0,
    expires: expired,
  });
}
