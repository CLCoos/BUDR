import { readFileSync } from 'fs';
import path from 'path';
import { NextRequest } from 'next/server';
import { afterEach, describe, expect, it, vi } from 'vitest';

const RESIDENT_ID = '11111111-1111-4111-8111-111111111111';

afterEach(() => {
  vi.restoreAllMocks();
  vi.resetModules();
  vi.unstubAllEnvs();
});

function jsonRequest(url: string, body: unknown): NextRequest {
  return new NextRequest(url, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
}

describe('resident auth security regressions', () => {
  it('routes public resident UUID links to PIN login, not session minting', async () => {
    const redirect = vi.fn((url: string) => {
      throw new Error(`NEXT_REDIRECT:${url}`);
    });
    vi.doMock('next/navigation', () => ({ redirect }));

    const { default: ResidentEntryPage } = await import('../app/app/[resident_id]/page');

    await expect(
      ResidentEntryPage({ params: Promise.resolve({ resident_id: RESIDENT_ID }) })
    ).rejects.toThrow(`NEXT_REDIRECT:/login/${RESIDENT_ID}?next=%2Fpark-hub`);
    expect(redirect).toHaveBeenCalledWith(`/login/${RESIDENT_ID}?next=%2Fpark-hub`);
  });

  it('does not create resident-auth sessions from GET UUID alone', async () => {
    const createSession = vi
      .fn()
      .mockResolvedValue({ token: 'minted-token', expiresAt: new Date() });
    vi.doMock('@/lib/residentSessions', () => ({
      createSession,
      validateSessionToken: vi.fn().mockResolvedValue({ valid: false, reason: 'not_found' }),
      SESSION_COOKIE_NAME: 'budr_resident_session',
      LEGACY_COOKIE_NAME: 'budr_resident_id',
    }));

    const { GET } = await import('../app/api/resident-auth/session/route');
    const res = await GET(
      new NextRequest(
        `http://localhost/api/resident-auth/session?rid=${RESIDENT_ID}&next=/park-hub`
      )
    );

    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe(
      `http://localhost/login/${RESIDENT_ID}?next=%2Fpark-hub`
    );
    expect(res.headers.get('set-cookie')).toBeNull();
    expect(createSession).not.toHaveBeenCalled();
  });

  it('rejects resident-auth POST session creation from residentUserId alone', async () => {
    const createSession = vi
      .fn()
      .mockResolvedValue({ token: 'minted-token', expiresAt: new Date() });
    vi.doMock('@/lib/residentSessions', () => ({
      createSession,
      validateSessionToken: vi.fn(),
      SESSION_COOKIE_NAME: 'budr_resident_session',
      LEGACY_COOKIE_NAME: 'budr_resident_id',
    }));

    const { POST } = await import('../app/api/resident-auth/session/route');
    const res = await POST(
      jsonRequest('http://localhost/api/resident-auth/session', { residentUserId: RESIDENT_ID })
    );
    const body = (await res.json()) as { error?: string };

    expect(res.status).toBe(403);
    expect(body.error).toBe('resident_auth_required');
    expect(res.headers.get('set-cookie')).toBeNull();
    expect(createSession).not.toHaveBeenCalled();
  });

  it('validates tokens before setting the HttpOnly resident session cookie', async () => {
    vi.doMock('@/lib/residentSessions', () => ({
      validateSessionToken: vi.fn().mockResolvedValue({ valid: false, reason: 'not_found' }),
    }));

    const { POST } = await import('../app/api/resident-session/route');
    const res = await POST(
      jsonRequest('http://localhost/api/resident-session', { token: 'forged' })
    );
    const body = (await res.json()) as { error?: string };

    expect(res.status).toBe(401);
    expect(body.error).toBe('Ugyldig session');
    expect(res.headers.get('set-cookie')).toBeNull();
  });

  it('resolves server-side resident identity only from a valid session token', async () => {
    const validateSessionToken = vi.fn().mockResolvedValue({
      valid: true,
      residentUserId: RESIDENT_ID,
      orgId: '22222222-2222-4222-8222-222222222222',
      sessionId: '33333333-3333-4333-8333-333333333333',
    });
    vi.doMock('next/headers', () => ({
      cookies: vi.fn(async () => ({
        get: (name: string) =>
          name === 'budr_resident_session'
            ? { value: 'verified-token' }
            : name === 'budr_resident_id'
              ? { value: '99999999-9999-4999-8999-999999999999' }
              : undefined,
      })),
    }));
    vi.doMock('./residentSessions', () => ({ validateSessionToken }));

    const { getResidentId } = await import('./residentAuth');

    await expect(getResidentId()).resolves.toBe(RESIDENT_ID);
    expect(validateSessionToken).toHaveBeenCalledWith('verified-token');
  });

  it('ignores legacy UUID cookies when no valid live resident session exists', async () => {
    vi.doMock('next/headers', () => ({
      cookies: vi.fn(async () => ({
        get: (name: string) => (name === 'budr_resident_id' ? { value: RESIDENT_ID } : undefined),
      })),
    }));
    vi.doMock('./residentSessions', () => ({
      validateSessionToken: vi.fn(),
    }));

    const { getResidentId } = await import('./residentAuth');

    await expect(getResidentId()).resolves.toBeNull();
  });

  it('middleware blocks live resident routes with only a legacy UUID cookie', async () => {
    const residentExistsClient = {
      from: vi.fn(() => ({
        select: vi.fn().mockReturnThis(),
        eq: vi.fn().mockReturnThis(),
        maybeSingle: vi.fn().mockResolvedValue({ data: { org_id: null }, error: null }),
      })),
    };
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'http://supabase.test');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY', 'anon');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-role');
    vi.doMock('@supabase/supabase-js', () => ({
      createClient: vi.fn(() => residentExistsClient),
    }));
    vi.doMock('@/lib/residentSessions', () => ({
      validateSessionToken: vi.fn(),
    }));

    const { middleware } = await import('../../middleware');
    const res = await middleware(
      new NextRequest('http://localhost/park-hub', {
        headers: { cookie: `budr_resident_id=${RESIDENT_ID}` },
      })
    );

    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('http://localhost/?park=login');
    expect(res.headers.get('set-cookie')).toContain('budr_resident_id=');
    expect(residentExistsClient.from).not.toHaveBeenCalledWith('care_residents');
  });
});

describe('resident Edge session schema', () => {
  const functionFiles = [
    'resident-pin-verify/index.ts',
    'resident-webauthn-verify/index.ts',
    'resident-webauthn-register/index.ts',
    'resident-session-validate/index.ts',
  ];

  it('does not read or write raw resident session tokens in Supabase Edge functions', () => {
    for (const file of functionFiles) {
      const source = readFileSync(path.join(process.cwd(), 'supabase/functions', file), 'utf8');

      expect(source).not.toMatch(/\.eq\('token'/);
      expect(source).not.toMatch(/\.select\('token'/);
      expect(source).toContain('session_token_hash');
    }
  });

  it('writes migrated resident session identity columns from PIN and WebAuthn login', () => {
    for (const file of ['resident-pin-verify/index.ts', 'resident-webauthn-verify/index.ts']) {
      const source = readFileSync(path.join(process.cwd(), 'supabase/functions', file), 'utf8');

      expect(source).toContain('resident_user_id');
      expect(source).toContain('org_id');
      expect(source).not.toMatch(/resident_id:\s*residentId/);
      expect(source).not.toMatch(/resident_id,\s*\n\s*token:/);
    }
  });
});
