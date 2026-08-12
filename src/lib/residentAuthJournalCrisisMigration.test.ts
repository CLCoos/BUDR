import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const MIGRATION = resolve(
  process.cwd(),
  'supabase/migrations/20260812110500_resident_auth_tables_journal_status_crisis_delete.sql'
);

describe('resident auth tables + journal_status + crisis_plans DELETE migration', () => {
  const sql = readFileSync(MIGRATION, 'utf8');

  it('creates resident_pins with service-role-only access (no authenticated grants)', () => {
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS public\.resident_pins/i);
    expect(sql).toMatch(/pin_hash text NOT NULL/i);
    expect(sql).toMatch(/ENABLE ROW LEVEL SECURITY/i);
    expect(sql).toMatch(/resident_pins_service_all/i);
    expect(sql).toMatch(/REVOKE ALL ON TABLE public\.resident_pins FROM authenticated/i);
    expect(sql).toMatch(/GRANT ALL ON TABLE public\.resident_pins TO service_role/i);
  });

  it('creates resident_webauthn_credentials with unique credential_id', () => {
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS public\.resident_webauthn_credentials/i);
    expect(sql).toMatch(/credential_id text NOT NULL/i);
    expect(sql).toMatch(/public_key text NOT NULL/i);
    expect(sql).toMatch(/counter bigint NOT NULL DEFAULT 0/i);
    expect(sql).toMatch(
      /CONSTRAINT resident_webauthn_credentials_credential_id_key UNIQUE \(credential_id\)/i
    );
    expect(sql).toMatch(
      /REVOKE ALL ON TABLE public\.resident_webauthn_credentials FROM authenticated/i
    );
  });

  it('adds journal_status + approval columns with kladde/godkendt check', () => {
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS journal_status text/i);
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS approved_at timestamptz/i);
    expect(sql).toMatch(/ADD COLUMN IF NOT EXISTS approved_by uuid/i);
    expect(sql).toMatch(/journal_entries_journal_status_check/i);
    expect(sql).toMatch(/CHECK \(journal_status IN \('kladde', 'godkendt'\)\)/i);
  });

  it('drops crisis_plans staff DELETE and revokes DELETE grants', () => {
    expect(sql).toMatch(
      /DROP POLICY IF EXISTS crisis_plans_staff_delete ON public\.crisis_plans/i
    );
    expect(sql).toMatch(/REVOKE DELETE ON TABLE public\.crisis_plans FROM authenticated/i);
  });
});
