import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  cookieJar: new Map<string, string>(),
  validateSessionToken: vi.fn(),
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({
    get: (name: string) =>
      mocks.cookieJar.has(name) ? { value: mocks.cookieJar.get(name) } : undefined,
    set: vi.fn(),
    delete: vi.fn(),
  })),
}));

vi.mock('@/lib/residentSessions', () => ({
  LEGACY_COOKIE_NAME: 'budr_resident_id',
  SESSION_COOKIE_NAME: 'budr_resident_session',
  validateSessionToken: mocks.validateSessionToken,
}));

describe('getResidentId', () => {
  beforeEach(() => {
    mocks.cookieJar.clear();
    mocks.validateSessionToken.mockReset();
    delete process.env.BUDR_ALLOW_PARK_DEMO_COOKIE;
  });

  it('does not authorize a forged legacy resident id cookie', async () => {
    const { getResidentId } = await import('./residentAuth');

    mocks.cookieJar.set('budr_resident_id', '550e8400-e29b-41d4-a716-446655440000');

    await expect(getResidentId()).resolves.toBeNull();
    expect(mocks.validateSessionToken).not.toHaveBeenCalled();
  });

  it('returns the resident id from a validated HttpOnly session token', async () => {
    const { getResidentId } = await import('./residentAuth');

    mocks.cookieJar.set('budr_resident_session', 'server-token');
    mocks.cookieJar.set('budr_resident_id', '550e8400-e29b-41d4-a716-446655440000');
    mocks.validateSessionToken.mockResolvedValue({
      valid: true,
      residentUserId: '11111111-1111-4111-8111-111111111111',
      orgId: '22222222-2222-4222-8222-222222222222',
      sessionId: '33333333-3333-4333-8333-333333333333',
      expiresAt: new Date(Date.now() + 60_000).toISOString(),
    });

    await expect(getResidentId()).resolves.toBe('11111111-1111-4111-8111-111111111111');
    expect(mocks.validateSessionToken).toHaveBeenCalledWith('server-token');
  });

  it('keeps the local demo resident available outside production', async () => {
    const { getResidentId } = await import('./residentAuth');

    mocks.cookieJar.set('budr_resident_id', 'demo-resident-001');

    await expect(getResidentId()).resolves.toBe('demo-resident-001');
  });
});
