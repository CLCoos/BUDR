import { beforeEach, describe, expect, it, vi } from 'vitest';

const getResidentIdMock = vi.hoisted(() => vi.fn());
const createServerSupabaseClientMock = vi.hoisted(() => vi.fn());
const createClientMock = vi.hoisted(() => vi.fn());

vi.mock('@/lib/residentAuth', () => ({
  getResidentId: getResidentIdMock,
}));

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: createServerSupabaseClientMock,
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: createClientMock,
}));

type MaybeSingleResult = { data: unknown; error: Error | null };

function makeQuery(result: MaybeSingleResult) {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    maybeSingle: vi.fn(async () => result),
  };
  return query;
}

function makeClient(results: Record<string, MaybeSingleResult>) {
  return {
    from: vi.fn((table: string) => makeQuery(results[table] ?? { data: null, error: null })),
  };
}

describe('assertVoiceApiCaller', () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
    vi.stubEnv('NODE_ENV', 'production');
    vi.stubEnv('NEXT_PUBLIC_SUPABASE_URL', 'https://example.supabase.co');
    vi.stubEnv('SUPABASE_SERVICE_ROLE_KEY', 'service-role-key');
  });

  it('rejects a forged resident cookie without a staff session', async () => {
    getResidentIdMock.mockResolvedValue('not-a-uuid');
    createServerSupabaseClientMock.mockResolvedValue({
      auth: { getUser: vi.fn(async () => ({ data: { user: null } })) },
    });

    const { assertVoiceApiCaller } = await import('./voiceApiAuth');

    await expect(assertVoiceApiCaller()).resolves.toEqual({
      ok: false,
      status: 401,
      message: 'Unauthorized',
    });
    expect(createClientMock).not.toHaveBeenCalled();
  });

  it('accepts a resident cookie only when the resident exists and the organisation is active', async () => {
    getResidentIdMock.mockResolvedValue('550e8400-e29b-41d4-a716-446655440000');
    createClientMock.mockReturnValue(
      makeClient({
        care_residents: {
          data: { user_id: '550e8400-e29b-41d4-a716-446655440000', org_id: 'org-1' },
          error: null,
        },
        organisations: { data: { deactivated_at: null }, error: null },
      })
    );

    const { assertVoiceApiCaller } = await import('./voiceApiAuth');

    await expect(assertVoiceApiCaller()).resolves.toEqual({ ok: true, kind: 'resident' });
    expect(createServerSupabaseClientMock).not.toHaveBeenCalled();
  });

  it('does not let an authenticated non-staff Supabase user call voice APIs', async () => {
    getResidentIdMock.mockResolvedValue(null);
    createServerSupabaseClientMock.mockResolvedValue({
      auth: { getUser: vi.fn(async () => ({ data: { user: { id: 'user-1' } } })) },
      ...makeClient({
        care_staff: { data: null, error: null },
      }),
    });

    const { assertVoiceApiCaller } = await import('./voiceApiAuth');

    await expect(assertVoiceApiCaller()).resolves.toEqual({
      ok: false,
      status: 401,
      message: 'Unauthorized',
    });
  });

  it('accepts an authenticated portal staff user', async () => {
    getResidentIdMock.mockResolvedValue(null);
    createServerSupabaseClientMock.mockResolvedValue({
      auth: { getUser: vi.fn(async () => ({ data: { user: { id: 'staff-1' } } })) },
      ...makeClient({
        care_staff: { data: { id: 'staff-1' }, error: null },
      }),
    });

    const { assertVoiceApiCaller } = await import('./voiceApiAuth');

    await expect(assertVoiceApiCaller()).resolves.toEqual({ ok: true, kind: 'staff' });
  });
});
