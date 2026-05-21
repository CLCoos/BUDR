import { describe, expect, it } from 'vitest';
import { generateToken, hashToken } from './residentSessions';

describe('hashToken', () => {
  it('is deterministic for the same input', () => {
    expect(hashToken('same-token')).toBe(hashToken('same-token'));
  });

  it('differs for different inputs', () => {
    expect(hashToken('token-a')).not.toBe(hashToken('token-b'));
  });

  it('returns 64 hex characters (SHA-256)', () => {
    const hash = hashToken('test');
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe('generateToken', () => {
  it('returns a non-empty string', () => {
    expect(generateToken().length).toBeGreaterThan(0);
  });

  it('returns unique tokens across calls', () => {
    const a = generateToken();
    const b = generateToken();
    expect(a).not.toBe(b);
  });

  it('uses base64url alphabet (no +, /, or =)', () => {
    const token = generateToken();
    expect(token).not.toMatch(/[+/=]/);
  });
});
