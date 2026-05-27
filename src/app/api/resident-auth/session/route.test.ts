import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { validateSessionToken } from '@/lib/residentSessions';
import { GET, POST } from './route';

vi.mock('@/lib/residentSessions', () => ({
  SESSION_COOKIE_NAME: 'budr_resident_session',
  LEGACY_COOKIE_NAME: 'budr_resident_id',
  validateSessionToken: vi.fn(),
}));

const RESIDENT_ID = '11111111-1111-4111-8111-111111111111';

describe('/api/resident-auth/session', () => {
  beforeEach(() => {
    vi.mocked(validateSessionToken).mockReset();
  });

  it('redirects unauthenticated resident entry links to PIN login', async () => {
    const req = new NextRequest(
      `https://budr.test/api/resident-auth/session?rid=${RESIDENT_ID}&next=/park-hub`
    );

    const res = await GET(req);

    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe(
      `https://budr.test/login/${RESIDENT_ID}?next=%2Fpark-hub`
    );
    expect(validateSessionToken).not.toHaveBeenCalled();
  });

  it('allows an already-valid session for the requested resident', async () => {
    vi.mocked(validateSessionToken).mockResolvedValue({
      valid: true,
      residentUserId: RESIDENT_ID,
      orgId: '22222222-2222-4222-8222-222222222222',
      sessionId: '33333333-3333-4333-8333-333333333333',
    });
    const req = new NextRequest(
      `https://budr.test/api/resident-auth/session?rid=${RESIDENT_ID}&next=/park-hub`,
      { headers: { cookie: 'budr_resident_session=valid-token' } }
    );

    const res = await GET(req);
    const setCookie = res.headers.get('set-cookie') ?? '';

    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('https://budr.test/park-hub');
    expect(setCookie).toContain('budr_resident_session=valid-token');
    expect(setCookie).toContain(`budr_resident_id=${RESIDENT_ID}`);
  });

  it('rejects UUID-only POST session minting', async () => {
    const req = new NextRequest('https://budr.test/api/resident-auth/session', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ residentUserId: RESIDENT_ID }),
    });

    const res = await POST(req);
    const body = (await res.json()) as { error: string };

    expect(res.status).toBe(403);
    expect(body.error).toBe('pin_or_webauthn_required');
  });
});
