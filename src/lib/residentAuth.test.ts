import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  cookieValues: new Map<string, string>(),
  validateSessionToken: vi.fn(),
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({
    get: (name: string) => {
      const value = mocks.cookieValues.get(name);
      return value ? { name, value } : undefined;
    },
    set: vi.fn(),
    delete: vi.fn(),
  })),
}));

vi.mock('@/lib/residentSessions', () => ({
  LEGACY_COOKIE_NAME: 'budr_resident_id',
  SESSION_COOKIE_NAME: 'budr_resident_session',
  validateSessionToken: mocks.validateSessionToken,
}));

import { getResidentId } from './residentAuth';

describe('getResidentId', () => {
  beforeEach(() => {
    mocks.cookieValues.clear();
    mocks.validateSessionToken.mockReset();
  });

  it('returns the resident from a valid HttpOnly session token', async () => {
    mocks.cookieValues.set('budr_resident_session', 'raw-session-token');
    mocks.cookieValues.set('budr_resident_id', '11111111-1111-4111-8111-111111111111');
    mocks.validateSessionToken.mockResolvedValue({
      valid: true,
      residentUserId: '22222222-2222-4222-8222-222222222222',
      orgId: '33333333-3333-4333-8333-333333333333',
      sessionId: '44444444-4444-4444-8444-444444444444',
    });

    await expect(getResidentId()).resolves.toBe('22222222-2222-4222-8222-222222222222');
    expect(mocks.validateSessionToken).toHaveBeenCalledWith('raw-session-token');
  });

  it('does not authorize a legacy resident UUID cookie by itself', async () => {
    mocks.cookieValues.set('budr_resident_id', '11111111-1111-4111-8111-111111111111');

    await expect(getResidentId()).resolves.toBeNull();
    expect(mocks.validateSessionToken).not.toHaveBeenCalled();
  });

  it('keeps the local demo resident available outside production', async () => {
    mocks.cookieValues.set('budr_resident_id', 'demo-resident-001');

    await expect(getResidentId()).resolves.toBe('demo-resident-001');
  });
});
