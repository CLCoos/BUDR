import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  validateSessionToken: vi.fn(),
}));

vi.mock('@/lib/residentSessions', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/residentSessions')>();
  return {
    ...actual,
    validateSessionToken: mocks.validateSessionToken,
  };
});

import { POST } from './route';

function jsonRequest(body: unknown): Request {
  return new Request('http://localhost/api/resident-session', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'Content-Type': 'application/json' },
  });
}

describe('/api/resident-session', () => {
  beforeEach(() => {
    mocks.validateSessionToken.mockReset();
  });

  it('rejects unvalidated session tokens', async () => {
    mocks.validateSessionToken.mockResolvedValue({ valid: false, reason: 'not_found' });

    const response = await POST(jsonRequest({ token: 'forged-token' }) as never);

    expect(response.status).toBe(401);
    expect(response.headers.get('set-cookie')).toBeNull();
  });

  it('sets the HttpOnly session cookie only after token validation', async () => {
    mocks.validateSessionToken.mockResolvedValue({
      valid: true,
      residentUserId: 'resident-a',
      orgId: 'org-a',
      sessionId: 'session-a',
    });

    const response = await POST(jsonRequest({ token: 'valid-token' }) as never);

    expect(response.status).toBe(200);
    expect(response.headers.get('set-cookie')).toContain('budr_resident_session=valid-token');
    expect(response.headers.get('set-cookie')).toContain('HttpOnly');
  });
});
