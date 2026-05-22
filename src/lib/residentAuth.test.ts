import { describe, expect, it, vi, beforeEach } from 'vitest';
import { cookies } from 'next/headers';
import { validateSessionToken } from './residentSessions';
import { getResidentId } from './residentAuth';

vi.mock('next/headers', () => ({
  cookies: vi.fn(),
}));

vi.mock('./residentSessions', () => ({
  SESSION_COOKIE_NAME: 'budr_resident_session',
  LEGACY_COOKIE_NAME: 'budr_resident_id',
  validateSessionToken: vi.fn(),
}));

function mockCookies(values: Record<string, string>) {
  vi.mocked(cookies).mockResolvedValue({
    get: (name: string) => {
      const value = values[name];
      return value == null ? undefined : ({ value } as never);
    },
    set: vi.fn(),
    delete: vi.fn(),
  } as never);
}

describe('getResidentId', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it('returns the resident id from a valid HttpOnly session token', async () => {
    mockCookies({ budr_resident_session: 'valid-token' });
    vi.mocked(validateSessionToken).mockResolvedValue({
      valid: true,
      residentUserId: '11111111-1111-1111-1111-111111111111',
      orgId: '22222222-2222-2222-2222-222222222222',
      sessionId: '33333333-3333-3333-3333-333333333333',
    });

    await expect(getResidentId()).resolves.toBe('11111111-1111-1111-1111-111111111111');
  });

  it('does not authorize a live resident from the legacy readable cookie', async () => {
    mockCookies({ budr_resident_id: '11111111-1111-1111-1111-111111111111' });

    await expect(getResidentId()).resolves.toBeNull();
    expect(validateSessionToken).not.toHaveBeenCalled();
  });

  it('does not fall back to legacy live resident id after an invalid session token', async () => {
    mockCookies({
      budr_resident_session: 'invalid-token',
      budr_resident_id: '11111111-1111-1111-1111-111111111111',
    });
    vi.mocked(validateSessionToken).mockResolvedValue({ valid: false, reason: 'not_found' });

    await expect(getResidentId()).resolves.toBeNull();
  });

  it('keeps the explicit demo resident cookie available outside production', async () => {
    mockCookies({ budr_resident_id: 'demo-resident-001' });

    await expect(getResidentId()).resolves.toBe('demo-resident-001');
  });
});
