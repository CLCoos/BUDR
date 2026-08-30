import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const MIGRATION = resolve(
  process.cwd(),
  'supabase/migrations/20260807110500_pin_rpc_and_recovery_stories_consent.sql'
);

describe('pin RPC + recovery stories consent migration', () => {
  const sql = readFileSync(MIGRATION, 'utf8');

  it('revokes set_resident_pin from anon/authenticated and grants service_role', () => {
    expect(sql).toMatch(/REVOKE ALL ON FUNCTION public\.set_resident_pin\(uuid, text\) FROM PUBLIC/i);
    expect(sql).toMatch(/REVOKE ALL ON FUNCTION public\.set_resident_pin\(uuid, text\) FROM anon/i);
    expect(sql).toMatch(
      /REVOKE ALL ON FUNCTION public\.set_resident_pin\(uuid, text\) FROM authenticated/i
    );
    expect(sql).toMatch(
      /GRANT EXECUTE ON FUNCTION public\.set_resident_pin\(uuid, text\) TO service_role/i
    );
  });

  it('limits staff SELECT on lys_recovery_stories to resident_approved = true', () => {
    expect(sql).toMatch(/DROP POLICY IF EXISTS lys_recovery_stories_staff_select/i);
    expect(sql).toMatch(/DROP POLICY IF EXISTS lys_recovery_stories_staff_update/i);
    expect(sql).toMatch(/resident_approved\s*=\s*true/i);
    expect(sql).not.toMatch(
      /CREATE POLICY lys_recovery_stories_staff_update[\s\S]*FOR UPDATE/i
    );
  });
});
