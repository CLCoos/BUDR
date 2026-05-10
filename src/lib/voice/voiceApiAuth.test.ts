import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getResidentId: vi.fn(),
  createServerSupabaseClient: vi.fn(),
  createClient: vi.fn(),
}));

vi.mock('@/lib/residentAuth', () => ({
  getResidentId: mocks.getResidentId,
}));

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: mocks.createServerSupabaseClient,
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: mocks.createClient,
}));

import { assertVoiceApiCaller, validateActiveResidentId } from './voiceApiAuth';

function queryResult(result: { data: unknown; error: unknown }) {
  const chain = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    maybeSingle: vi.fn(async () => result),
  };
  return chain;
}

function serviceClient(tables: Record<string, () => ReturnType<typeof queryResult>>) {
  return {
    from: vi.fn((table: string) => tables[table]()),
  };
}

describe('voice API auth', () => {
  beforeEach(() => {
    vi.unstubAllEnvs();
    vi.clearAllMocks();
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-role');
  });

  it('does not authorize paid voice calls from a forged non-UUID resident cookie', async () => {
    mocks.getResidentId.mockResolvedValue('not-a-resident-id');
    mocks.createServerSupabaseClient.mockResolvedValue({
      auth: { getUser: vi.fn(async () => ({ data: { user: null } })) },
    });

    await expect(assertVoiceApiCaller()).resolves.toEqual({
      ok: false,
      status: 401,
      message: 'Unauthorized',
    });
    expect(mocks.createClient).not.toHaveBeenCalled();
  });

  it('authorizes a resident cookie only after the resident and org are active', async () => {
    const residentId = '550e8400-e29b-41d4-a716-446655440000';
    mocks.getResidentId.mockResolvedValue(residentId);
    mocks.createClient.mockReturnValue(
      serviceClient({
        care_residents: () =>
          queryResult({ data: { user_id: residentId, org_id: 'org-1' }, error: null }),
        organisations: () => queryResult({ data: { deactivated_at: null }, error: null }),
      })
    );

    await expect(assertVoiceApiCaller()).resolves.toEqual({ ok: true, kind: 'resident' });
    expect(mocks.createServerSupabaseClient).not.toHaveBeenCalled();
  });

  it('rejects residents from deactivated organisations', async () => {
    const residentId = '550e8400-e29b-41d4-a716-446655440000';
    mocks.createClient.mockReturnValue(
      serviceClient({
        care_residents: () =>
          queryResult({ data: { user_id: residentId, org_id: 'org-1' }, error: null }),
        organisations: () =>
          queryResult({ data: { deactivated_at: '2026-05-10T00:00:00.000Z' }, error: null }),
      })
    );

    await expect(validateActiveResidentId(residentId)).resolves.toBe('invalid');
  });
});
