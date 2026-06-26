import { describe, expect, it } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';

function source(relativePath: string): string {
  return readFileSync(path.join(process.cwd(), relativePath), 'utf8');
}

describe('critical security regressions', () => {
  it('does not mint resident sessions from UUID-only resident-auth requests', () => {
    const route = source('src/app/api/resident-auth/session/route.ts');

    expect(route).not.toContain('createSession');
    expect(route).toContain("body?.token");
    expect(route).toContain('validateSessionToken(token)');
  });

  it('scopes staff-assistant service-role context to the authenticated staff org', () => {
    const route = source('src/app/api/portal/staff-assistant/route.ts');

    expect(route).toContain(".from('care_staff')");
    expect(route).toContain(".eq('id', user.id)");
    expect(route).toContain(".eq('org_id', orgId)");
    expect(route).toContain(".in('resident_id', residentIds)");
  });

  it('blocks mood alerts for residents outside the caller staff org', () => {
    const route = source('src/app/api/portal/mood-alert/route.ts');

    expect(route).toContain('residentOrgId !== staffOrgId');
    expect(route).toContain("return NextResponse.json({ error: 'forbidden' }, { status: 403 })");
    expect(route).toContain('org_id: residentOrgId');
  });

  it('keeps Supabase resident session edge functions on the hashed session schema', () => {
    const edgeFiles = [
      'supabase/functions/resident-pin-verify/index.ts',
      'supabase/functions/resident-webauthn-verify/index.ts',
      'supabase/functions/resident-session-validate/index.ts',
      'supabase/functions/resident-webauthn-register/index.ts',
    ];

    for (const file of edgeFiles) {
      const body = source(file);
      expect(body).toContain('session_token_hash');
      expect(body).not.toContain(".eq('token'");
      expect(body).not.toContain("select('token')");
    }
  });
});
