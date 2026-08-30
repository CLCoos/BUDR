import { describe, expect, it } from 'vitest';
import { NextResponse } from 'next/server';
import {
  LEGACY_COOKIE_NAME,
  RESIDENT_LOGOUT_API,
  residentLogoutFetchInit,
  SESSION_COOKIE_NAME,
} from './residentAuthCookieNames';
import { clearResidentAuthCookies, setResidentAuthCookies } from './residentSessionCookies';

function setCookieHeaders(res: NextResponse): string[] {
  const raw = res.headers.getSetCookie?.() ?? [];
  if (raw.length > 0) return raw;
  const single = res.headers.get('set-cookie');
  return single ? [single] : [];
}

function headerFor(res: NextResponse, name: string): string | undefined {
  return setCookieHeaders(res).find((h) => h.startsWith(`${name}=`));
}

describe('resident session cookies', () => {
  it('sets HttpOnly on the session cookie and not on the legacy id cookie', () => {
    const res = NextResponse.json({ ok: true });
    setResidentAuthCookies(res, {
      sessionToken: 'tok',
      residentId: 'demo-resident-001',
      maxAge: 3600,
    });

    const session = headerFor(res, SESSION_COOKIE_NAME);
    const legacy = headerFor(res, LEGACY_COOKIE_NAME);
    expect(session).toBeDefined();
    expect(legacy).toBeDefined();
    expect(session).toMatch(/HttpOnly/i);
    expect(session).toMatch(/Path=\//i);
    expect(session).toMatch(/SameSite=lax/i);
    expect(legacy).not.toMatch(/HttpOnly/i);
    expect(legacy).toMatch(/Path=\//i);
    expect(legacy).toMatch(/SameSite=lax/i);
    expect(res.cookies.get(SESSION_COOKIE_NAME)?.value).toBe('tok');
    expect(res.cookies.get(LEGACY_COOKIE_NAME)?.value).toBe('demo-resident-001');
  });

  it('clears both cookies with the same path/sameSite/httpOnly as set', () => {
    const res = NextResponse.json({ ok: true });
    setResidentAuthCookies(res, {
      sessionToken: 'tok',
      residentId: 'uuid',
      maxAge: 3600,
    });
    clearResidentAuthCookies(res);

    const session = headerFor(res, SESSION_COOKIE_NAME);
    const legacy = headerFor(res, LEGACY_COOKIE_NAME);
    expect(session).toMatch(/^budr_resident_session=;/);
    expect(session).toMatch(/HttpOnly/i);
    expect(session).toMatch(/Path=\//i);
    expect(session).toMatch(/SameSite=lax/i);
    expect(session).toMatch(/Max-Age=0/i);
    expect(legacy).toMatch(/^budr_resident_id=;/);
    expect(legacy).not.toMatch(/HttpOnly/i);
    expect(legacy).toMatch(/Max-Age=0/i);
  });
});

describe('resident logout client contract', () => {
  it('must DELETE the session route (HttpOnly cookie cannot be cleared in JS)', () => {
    expect(RESIDENT_LOGOUT_API).toBe('/api/resident-session');
    expect(residentLogoutFetchInit()).toEqual({
      method: 'DELETE',
      credentials: 'same-origin',
    });
  });
});
