import { readFileSync } from 'fs';
import { resolve } from 'path';
import { describe, expect, it } from 'vitest';

function source(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), 'utf8');
}

describe('resident session security guards', () => {
  it('does not mint resident sessions from a public UUID entry link', () => {
    const appEntry = source('src/app/app/[resident_id]/page.tsx');

    expect(appEntry).not.toContain('createSession(');
    expect(appEntry).toContain('redirect(`/login/${resident_id}`)');
  });

  it('keeps anonymous resident session creation disabled', () => {
    const sessionRoute = source('src/app/api/resident-auth/session/route.ts');

    expect(sessionRoute).not.toContain('createSession(');
    expect(sessionRoute).toContain('resident_session_requires_pin_or_webauthn');
  });

  it('requires server session validation before APIs trust a resident id', () => {
    const residentAuth = source('src/lib/residentAuth.ts');

    expect(residentAuth).toContain('validateSessionToken(sessionToken)');
    expect(residentAuth).toContain('return validation.residentUserId');
    expect(residentAuth).toContain('legacyResidentId === DEMO_RESIDENT_ID');
  });
});
