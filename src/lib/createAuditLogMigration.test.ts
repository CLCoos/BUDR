import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  join(process.cwd(), 'supabase/migrations/20260809110500_create_audit_log_service_role_only.sql'),
  'utf8'
);

describe('create_audit_log service_role-only migration', () => {
  it('revokes EXECUTE from PUBLIC, anon, and authenticated', () => {
    expect(migration).toMatch(/REVOKE ALL ON FUNCTION public\.create_audit_log/g);
    expect(migration).toContain('FROM PUBLIC');
    expect(migration).toContain('FROM anon');
    expect(migration).toContain('FROM authenticated');
  });

  it('grants EXECUTE only to service_role', () => {
    expect(migration).toContain('GRANT EXECUTE ON FUNCTION public.create_audit_log');
    expect(migration).toContain('TO service_role');
  });
});

describe('portal audit client path', () => {
  it('uses Route Handler instead of direct RPC from the browser', () => {
    const client = readFileSync(join(process.cwd(), 'src/lib/auditClient.ts'), 'utf8');
    expect(client).toContain("/api/portal/audit-log");
    expect(client).not.toContain(".rpc('create_audit_log'");
  });

  it('audit-log route binds actor to the authenticated staff user', () => {
    const route = readFileSync(
      join(process.cwd(), 'src/app/api/portal/audit-log/route.ts'),
      'utf8'
    );
    expect(route).toContain('createAdminSupabaseClient');
    expect(route).toContain("p_actor_id: user.id");
    expect(route).toContain('ALLOWED_ACTIONS');
    expect(route).toContain("from('care_staff')");
  });
});
