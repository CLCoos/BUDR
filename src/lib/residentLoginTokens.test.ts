import { beforeEach, describe, expect, it, vi } from 'vitest';

type Call = { table: string; op: string; args: unknown[] };
const calls: Call[] = [];
let claimResult: { data: unknown; error: unknown } = { data: null, error: null };

function builder(table: string) {
  const chain: Record<string, (...args: unknown[]) => unknown> = {};
  const record =
    (op: string) =>
    (...args: unknown[]) => {
      calls.push({ table, op, args });
      return chain;
    };
  for (const op of ['update', 'eq', 'is', 'gt', 'select']) chain[op] = record(op);
  chain.insert = (...args: unknown[]) => {
    calls.push({ table, op: 'insert', args });
    return Promise.resolve({ error: null });
  };
  chain.maybeSingle = () => {
    if (table === 'resident_login_tokens') return Promise.resolve(claimResult);
    return Promise.resolve({ data: { org_id: 'org-1' }, error: null });
  };
  return chain;
}

vi.mock('@supabase/supabase-js', () => ({
  createClient: () => ({ from: (table: string) => builder(table) }),
}));

const { createLoginToken, hashToken, redeemLoginToken } = await import('./residentSessions');

beforeEach(() => {
  calls.length = 0;
  claimResult = { data: null, error: null };
  process.env.NEXT_PUBLIC_SUPABASE_URL = 'https://example.supabase.co';
  process.env.SUPABASE_SERVICE_ROLE_KEY = 'service-key';
});

describe('createLoginToken', () => {
  it('stores only the hash and expires within the hour', async () => {
    const issued = await createLoginToken({
      residentUserId: 'resident-1',
      orgId: 'org-1',
      createdBy: 'staff-1',
    });
    expect(issued).not.toBeNull();
    const insert = calls.find((c) => c.op === 'insert' && c.table === 'resident_login_tokens');
    const row = insert?.args[0] as Record<string, string>;
    expect(row.token_hash).toBe(hashToken(issued!.token));
    expect(JSON.stringify(row)).not.toContain(issued!.token);
    const ttlMs = issued!.expiresAt.getTime() - Date.now();
    expect(ttlMs).toBeGreaterThan(0);
    expect(ttlMs).toBeLessThanOrEqual(60 * 60 * 1000);
  });
});

describe('redeemLoginToken', () => {
  it('rejects an empty token without touching the database', async () => {
    expect(await redeemLoginToken({ token: '' })).toBeNull();
    expect(calls).toHaveLength(0);
  });

  it('only claims unused, unexpired tokens matching the hash', async () => {
    await redeemLoginToken({ token: 'abc' });
    const filters = calls.filter((c) => c.table === 'resident_login_tokens');
    expect(filters).toContainEqual({
      table: 'resident_login_tokens',
      op: 'eq',
      args: ['token_hash', hashToken('abc')],
    });
    expect(filters).toContainEqual({
      table: 'resident_login_tokens',
      op: 'is',
      args: ['used_at', null],
    });
    expect(filters.some((c) => c.op === 'gt' && c.args[0] === 'expires_at')).toBe(true);
  });

  it('returns null and creates no session when the token is unknown, used or expired', async () => {
    claimResult = { data: null, error: null };
    expect(await redeemLoginToken({ token: 'abc' })).toBeNull();
    expect(calls.some((c) => c.table === 'resident_sessions' && c.op === 'insert')).toBe(false);
  });

  it('creates a session for the resident on the token when claimed', async () => {
    claimResult = { data: { id: 't-1', resident_user_id: 'resident-1' }, error: null };
    const session = await redeemLoginToken({ token: 'abc' });
    expect(session?.residentUserId).toBe('resident-1');
    const insert = calls.find((c) => c.table === 'resident_sessions' && c.op === 'insert');
    expect((insert?.args[0] as Record<string, string>).resident_user_id).toBe('resident-1');
  });
});
