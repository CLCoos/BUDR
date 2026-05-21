import { describe, expect, it } from 'vitest';
import { sanitizeNext } from './redirectSafety';

const FALLBACK = '/park-hub';

describe('sanitizeNext', () => {
  it('allows a valid relative path', () => {
    expect(sanitizeNext('/park-hub')).toBe('/park-hub');
  });

  it('rejects absolute open-redirect URLs', () => {
    expect(sanitizeNext('https://evil.com')).toBe(FALLBACK);
  });

  it('rejects protocol-relative paths', () => {
    expect(sanitizeNext('//evil.com')).toBe(FALLBACK);
  });

  it('rejects paths containing colon', () => {
    expect(sanitizeNext('/path:with:colon')).toBe(FALLBACK);
  });

  it('falls back for null, undefined, and empty', () => {
    expect(sanitizeNext(null)).toBe(FALLBACK);
    expect(sanitizeNext(undefined)).toBe(FALLBACK);
    expect(sanitizeNext('')).toBe(FALLBACK);
  });

  it('preserves a valid path with query string (no colon in path)', () => {
    expect(sanitizeNext('/park-hub?tab=overblik')).toBe('/park-hub?tab=overblik');
  });
});
