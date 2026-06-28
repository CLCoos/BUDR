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

  it('scopes staff-assistant service-role context to the authenticated staff org', () => {
    const route = read('src/app/api/portal/staff-assistant/route.ts');

    expect(route).toContain(".from('care_staff')");
    expect(route).toContain(".eq('id', user.id)");
    expect(route).toContain(".eq('org_id', orgId)");
    expect(route).toContain(".in('resident_id', residentIds)");
  });

  it('blocks mood alerts for residents outside the caller staff org', () => {
    const route = read('src/app/api/portal/mood-alert/route.ts');

    expect(route).toContain('residentOrgId !== staffOrgId');
    expect(route).toContain("return NextResponse.json({ error: 'forbidden' }, { status: 403 })");
    expect(route).toContain('org_id: residentOrgId');
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
