import { afterEach, describe, expect, it } from 'vitest';
import { canEditMarketingCms } from './marketingCmsAccess';

afterEach(() => {
  delete process.env.BUDR_MARKETING_EDITOR_EMAILS;
});

describe('canEditMarketingCms', () => {
  it('denies everyone when no editors are configured', () => {
    expect(canEditMarketingCms('leder@bosted.dk')).toBe(false);
  });

  it('allows configured editors case-insensitively', () => {
    process.env.BUDR_MARKETING_EDITOR_EMAILS = 'a@budrcare.dk, Christian@Example.com';
    expect(canEditMarketingCms('christian@example.com')).toBe(true);
    expect(canEditMarketingCms('leder@bosted.dk')).toBe(false);
    expect(canEditMarketingCms(null)).toBe(false);
  });
});
