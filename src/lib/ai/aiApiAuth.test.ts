import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/residentAuth', () => ({
  getResidentId: vi.fn(),
}));

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(),
}));

import { getResidentId } from '@/lib/residentAuth';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { assertAiApiCaller } from './aiApiAuth';

describe('assertAiApiCaller', () => {
  afterEach(() => {
    vi.resetAllMocks();
    vi.unstubAllEnvs();
  });

  it('allows unauthenticated calls outside production', async () => {
    vi.stubEnv('NODE_ENV', 'development');
    await expect(assertAiApiCaller()).resolves.toEqual({ ok: true, kind: 'dev' });
    expect(getResidentId).not.toHaveBeenCalled();
  });

  it('accepts resident cookie in production', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.mocked(getResidentId).mockResolvedValue('550e8400-e29b-41d4-a716-446655440000');
    await expect(assertAiApiCaller()).resolves.toEqual({ ok: true, kind: 'resident' });
  });

  it('accepts staff session in production', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.mocked(getResidentId).mockResolvedValue(null);
    vi.mocked(createServerSupabaseClient).mockResolvedValue({
      auth: {
        getUser: async () => ({ data: { user: { id: 'staff-1' } } }),
      },
    } as never);
    await expect(assertAiApiCaller()).resolves.toEqual({ ok: true, kind: 'staff' });
  });

  it('rejects anonymous production callers', async () => {
    vi.stubEnv('NODE_ENV', 'production');
    vi.mocked(getResidentId).mockResolvedValue(null);
    vi.mocked(createServerSupabaseClient).mockResolvedValue({
      auth: {
        getUser: async () => ({ data: { user: null } }),
      },
    } as never);
    await expect(assertAiApiCaller()).resolves.toEqual({
      ok: false,
      status: 401,
      message: 'Unauthorized',
    });
  });
});
