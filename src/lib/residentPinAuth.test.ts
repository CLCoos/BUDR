import { describe, expect, it } from 'vitest';
import {
  isWebAuthnCounterOnlyProofAcceptable,
  staffMaySetResidentPin,
} from '@/lib/residentPinAuth';

describe('staffMaySetResidentPin', () => {
  const orgA = '11111111-1111-4111-8111-111111111111';
  const orgB = '22222222-2222-4222-8222-222222222222';

  it('allows staff in the same org as the resident', () => {
    expect(staffMaySetResidentPin({ staffOrgId: orgA, residentOrgId: orgA })).toBe(true);
  });

  it('rejects cross-org PIN reset (any valid JWT is not enough)', () => {
    expect(staffMaySetResidentPin({ staffOrgId: orgA, residentOrgId: orgB })).toBe(false);
  });

  it('rejects missing staff or resident org', () => {
    expect(staffMaySetResidentPin({ staffOrgId: null, residentOrgId: orgA })).toBe(false);
    expect(staffMaySetResidentPin({ staffOrgId: orgA, residentOrgId: undefined })).toBe(false);
    expect(staffMaySetResidentPin({ staffOrgId: '  ', residentOrgId: orgA })).toBe(false);
  });
});

describe('WebAuthn verify proof bar', () => {
  it('rejects counter-only proofs (no signature verification)', () => {
    expect(isWebAuthnCounterOnlyProofAcceptable()).toBe(false);
  });
});
