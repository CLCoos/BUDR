import { readFileSync } from 'fs';
import { describe, expect, it } from 'vitest';

function read(path: string): string {
  return readFileSync(path, 'utf8');
}

describe('resident auth security invariants', () => {
  it('does not let the public resident UUID entry point mint a session', () => {
    const appEntry = read('src/app/app/[resident_id]/page.tsx');
    const sessionRoute = read('src/app/api/resident-auth/session/route.ts');

    expect(appEntry).toContain('redirect(`/login/${resident_id}?next=/park-hub`)');
    expect(appEntry).not.toContain('/api/resident-auth/session?rid=');
    expect(sessionRoute).not.toContain('createSession');
    expect(sessionRoute).toContain('pin_or_biometric_required');
  });

  it('uses validated HttpOnly sessions, not the readable UUID cookie, for server identity', () => {
    const residentAuth = read('src/lib/residentAuth.ts');
    const middleware = read('middleware.ts');

    expect(residentAuth).toContain('validateSessionToken(sessionToken)');
    expect(residentAuth).not.toContain('return cookieStore.get(COOKIE_NAME)?.value ?? null');
    expect(middleware).toContain('HttpOnly session is the only live resident credential');
    expect(middleware).not.toContain('residentExistsInDb(legacyResidentId)');
    expect(middleware).not.toContain('const residentId = legacyResidentId');
  });

  it('validates PIN/WebAuthn-issued tokens before setting resident cookies', () => {
    const route = read('src/app/api/resident-session/route.ts');

    expect(route).toContain('validateSessionToken(token)');
    expect(route).toContain('validation.residentUserId');
    expect(route).toContain('LEGACY_COOKIE_NAME');
  });

  it('keeps Supabase Edge session functions on the hashed session schema', () => {
    const pinVerify = read('supabase/functions/resident-pin-verify/index.ts');
    const sessionValidate = read('supabase/functions/resident-session-validate/index.ts');
    const webauthnRegister = read('supabase/functions/resident-webauthn-register/index.ts');
    const webauthnVerify = read('supabase/functions/resident-webauthn-verify/index.ts');

    for (const source of [pinVerify, webauthnVerify]) {
      expect(source).toContain('resident_user_id');
      expect(source).toContain('session_token_hash');
      expect(source).toContain('sha256Hex(sessionToken)');
      expect(source).not.toContain('token: crypto.randomUUID()');
    }

    for (const source of [sessionValidate, webauthnRegister]) {
      expect(source).toContain('session_token_hash');
      expect(source).toContain('sha256Hex(session');
      expect(source).toContain('revoked_at');
      expect(source).not.toContain(".eq('token'");
    }
  });
});
