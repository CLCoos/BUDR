import { describe, expect, it } from 'vitest';
import { POST } from './route';

describe('/api/resident-auth/session', () => {
  it('does not mint resident sessions from a resident UUID alone', async () => {
    const response = await POST();

    expect(response.status).toBe(403);
    await expect(response.json()).resolves.toEqual({ error: 'pin_or_webauthn_required' });
  });
});
