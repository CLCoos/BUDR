import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';

const mocks = vi.hoisted(() => ({
  validateSessionToken: vi.fn(),
}));

vi.mock('@/lib/residentSessions', () => ({
  LEGACY_COOKIE_NAME: 'budr_resident_id',
  SESSION_COOKIE_NAME: 'budr_resident_session',
  validateSessionToken: mocks.validateSessionToken,
}));

import { GET, POST } from './route';

const RESIDENT_ID = '11111111-1111-4111-8111-111111111111';

describe('/api/resident-auth/session', () => {
  beforeEach(() => {
    mocks.validateSessionToken.mockReset();
  });

  it('redirects UUID-only GET requests to PIN login instead of issuing a session', async () => {
    const res = await GET(
      new NextRequest(
        `http://localhost/api/resident-auth/session?rid=${RESIDENT_ID}&next=/park-hub`
      )
    );

    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe(
      `http://localhost/login/${RESIDENT_ID}?next=%2Fpark-hub`
    );
    expect(res.cookies.get('budr_resident_session')).toBeUndefined();
    expect(mocks.validateSessionToken).not.toHaveBeenCalled();
  });

  it('reuses an existing valid session for the requested resident', async () => {
    mocks.validateSessionToken.mockResolvedValue({
      valid: true,
      residentUserId: RESIDENT_ID,
      orgId: '22222222-2222-4222-8222-222222222222',
      sessionId: '33333333-3333-4333-8333-333333333333',
    });

    const res = await GET(
      new NextRequest(
        `http://localhost/api/resident-auth/session?rid=${RESIDENT_ID}&next=/park-hub`,
        {
          headers: { Cookie: 'budr_resident_session=existing-token' },
        }
      )
    );

    expect(res.status).toBe(307);
    expect(res.headers.get('location')).toBe('http://localhost/park-hub');
    expect(mocks.validateSessionToken).toHaveBeenCalledWith('existing-token');
  });

  it('rejects legacy POST bodies that try to mint a session from residentUserId', async () => {
    const res = await POST(
      new NextRequest('http://localhost/api/resident-auth/session', {
        method: 'POST',
        body: JSON.stringify({ residentUserId: RESIDENT_ID }),
        headers: { 'Content-Type': 'application/json' },
      })
    );

    expect(res.status).toBe(400);
    expect(res.cookies.get('budr_resident_session')).toBeUndefined();
    expect(mocks.validateSessionToken).not.toHaveBeenCalled();
  });
});
