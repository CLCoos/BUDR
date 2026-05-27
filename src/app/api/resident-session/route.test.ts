import { describe, expect, it, vi, beforeEach } from 'vitest';
import { NextRequest } from 'next/server';
import { validateSessionToken } from '@/lib/residentSessions';
import { POST } from './route';

vi.mock('@/lib/residentSessions', () => ({
  SESSION_COOKIE_NAME: 'budr_resident_session',
  LEGACY_COOKIE_NAME: 'budr_resident_id',
  validateSessionToken: vi.fn(),
}));

const RESIDENT_ID = '11111111-1111-4111-8111-111111111111';

describe('/api/resident-session', () => {
  beforeEach(() => {
    vi.mocked(validateSessionToken).mockReset();
  });

  it('does not set cookies for invalid bearer tokens', async () => {
    vi.mocked(validateSessionToken).mockResolvedValue({ valid: false, reason: 'not_found' });
    const req = new NextRequest('https://budr.test/api/resident-session', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token: 'not-a-session' }),
    });

    const res = await POST(req);
    const body = (await res.json()) as { error: string };

    expect(res.status).toBe(401);
    expect(body.error).toBe('Ugyldig session');
    expect(res.headers.get('set-cookie')).toBeNull();
  });

  it('sets HttpOnly session and legacy hint cookies for valid tokens', async () => {
    vi.mocked(validateSessionToken).mockResolvedValue({
      valid: true,
      residentUserId: RESIDENT_ID,
      orgId: '22222222-2222-4222-8222-222222222222',
      sessionId: '33333333-3333-4333-8333-333333333333',
    });
    const req = new NextRequest('https://budr.test/api/resident-session', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ token: 'valid-token' }),
    });

    const res = await POST(req);
    const setCookie = res.headers.get('set-cookie') ?? '';

    expect(res.status).toBe(200);
    expect(setCookie).toContain('budr_resident_session=valid-token');
    expect(setCookie).toContain('HttpOnly');
    expect(setCookie).toContain(`budr_resident_id=${RESIDENT_ID}`);
  });
});
