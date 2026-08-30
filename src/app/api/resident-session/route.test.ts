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

import { DELETE, POST } from './route';

function jsonRequest(body: unknown): NextRequest {
  return new NextRequest('http://localhost/api/resident-session', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('/api/resident-session', () => {
  beforeEach(() => {
    mocks.validateSessionToken.mockReset();
  });

  it('rejects an invalid session token without setting cookies', async () => {
    mocks.validateSessionToken.mockResolvedValue({ valid: false, reason: 'not_found' });

    const res = await POST(jsonRequest({ token: 'forged-token' }));

    expect(res.status).toBe(401);
    expect(res.cookies.get('budr_resident_session')).toBeUndefined();
    expect(res.cookies.get('budr_resident_id')).toBeUndefined();
  });

  it('sets both cookies only after token validation succeeds', async () => {
    mocks.validateSessionToken.mockResolvedValue({
      valid: true,
      residentUserId: '11111111-1111-4111-8111-111111111111',
      orgId: '22222222-2222-4222-8222-222222222222',
      sessionId: '33333333-3333-4333-8333-333333333333',
    });

    const res = await POST(jsonRequest({ token: 'verified-token' }));

    expect(res.status).toBe(200);
    expect(res.cookies.get('budr_resident_session')?.value).toBe('verified-token');
    expect(res.cookies.get('budr_resident_session')?.httpOnly).toBe(true);
    expect(res.cookies.get('budr_resident_id')?.value).toBe('11111111-1111-4111-8111-111111111111');
    expect(mocks.validateSessionToken).toHaveBeenCalledWith('verified-token');
  });

  it('clears both session and compatibility cookies on logout', async () => {
    const res = await DELETE();

    expect(res.cookies.get('budr_resident_session')?.maxAge).toBe(0);
    expect(res.cookies.get('budr_resident_id')?.maxAge).toBe(0);
  });
});
