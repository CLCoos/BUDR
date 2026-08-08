import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const MIGRATION = resolve(
  process.cwd(),
  'supabase/migrations/20260808110500_verify_pin_rpc_and_lys_delete_revoke.sql'
);

describe('verify_resident_pin + Lys DELETE revoke migration', () => {
  const sql = readFileSync(MIGRATION, 'utf8');

  it('revokes verify_resident_pin from anon/authenticated and grants service_role', () => {
    expect(sql).toMatch(
      /REVOKE ALL ON FUNCTION public\.verify_resident_pin\(uuid, text\) FROM PUBLIC/i
    );
    expect(sql).toMatch(
      /REVOKE ALL ON FUNCTION public\.verify_resident_pin\(uuid, text\) FROM anon/i
    );
    expect(sql).toMatch(
      /REVOKE ALL ON FUNCTION public\.verify_resident_pin\(uuid, text\) FROM authenticated/i
    );
    expect(sql).toMatch(
      /GRANT EXECUTE ON FUNCTION public\.verify_resident_pin\(uuid, text\) TO service_role/i
    );
  });

  it('drops staff DELETE policies on Lys clinical tables', () => {
    expect(sql).toMatch(/DROP POLICY IF EXISTS lys_checkin_staff_delete/i);
    expect(sql).toMatch(/DROP POLICY IF EXISTS lys_recovery_profile_staff_delete/i);
    expect(sql).toMatch(/DROP POLICY IF EXISTS lys_reflection_staff_delete/i);
    expect(sql).toMatch(/DROP POLICY IF EXISTS lys_next_steps_staff_delete/i);
  });

  it('revokes DELETE grants for authenticated on Lys clinical tables', () => {
    expect(sql).toMatch(/REVOKE DELETE ON public\.lys_checkin FROM authenticated/i);
    expect(sql).toMatch(/REVOKE DELETE ON public\.lys_recovery_profile FROM authenticated/i);
    expect(sql).toMatch(/REVOKE DELETE ON public\.lys_reflection FROM authenticated/i);
    expect(sql).toMatch(/REVOKE DELETE ON public\.lys_next_steps FROM authenticated/i);
  });
});
