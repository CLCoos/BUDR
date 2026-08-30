import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  cookieValues: new Map<string, string>(),
  validateSessionToken: vi.fn(),
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({
    get: (name: string) =>
      mocks.cookieValues.has(name) ? { value: mocks.cookieValues.get(name) } : undefined,
    set: vi.fn(),
    delete: vi.fn(),
  })),
}));

vi.mock('@/lib/residentSessions', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/lib/residentSessions')>();
  return {
    ...actual,
    validateSessionToken: mocks.validateSessionToken,
  };
});

import { getResidentId } from './residentAuth';

describe('getResidentId', () => {
  beforeEach(() => {
    mocks.cookieValues.clear();
    mocks.validateSessionToken.mockReset();
  });

  it('does not authorize from the client-writable legacy resident id cookie', async () => {
    mocks.cookieValues.set('budr_resident_id', 'victim-resident-id');

    await expect(getResidentId()).resolves.toBeNull();
    expect(mocks.validateSessionToken).not.toHaveBeenCalled();
  });

  it('returns the resident id from a valid HttpOnly session token', async () => {
    mocks.cookieValues.set('budr_resident_session', 'valid-token');
    mocks.validateSessionToken.mockResolvedValue({
      valid: true,
      residentUserId: 'resident-a',
      orgId: 'org-a',
      sessionId: 'session-a',
    });

    await expect(getResidentId()).resolves.toBe('resident-a');
    expect(mocks.validateSessionToken).toHaveBeenCalledWith('valid-token');
  });

  it('does not fall back to the legacy cookie when the session token is invalid', async () => {
    mocks.cookieValues.set('budr_resident_session', 'invalid-token');
    mocks.cookieValues.set('budr_resident_id', 'victim-resident-id');
    mocks.validateSessionToken.mockResolvedValue({ valid: false, reason: 'not_found' });

    await expect(getResidentId()).resolves.toBeNull();
  });
});
