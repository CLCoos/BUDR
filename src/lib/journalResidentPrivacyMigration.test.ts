import { readFileSync } from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

const migrationPath = path.join(
  process.cwd(),
  'supabase/migrations/20260801110500_journal_resident_private_and_revoke_delete.sql'
);

describe('journal resident-private migration', () => {
  it('adds is_resident_private and resident_private status', () => {
    const sql = readFileSync(migrationPath, 'utf8');
    expect(sql).toContain('ADD COLUMN IF NOT EXISTS is_resident_private boolean NOT NULL DEFAULT false');
    expect(sql).toContain("CHECK (journal_status IN ('kladde', 'godkendt', 'resident_private'))");
    expect(sql).toContain('journal_status = \'resident_private\'');
  });

  it('excludes private rows from staff SELECT/UPDATE and drops journal DELETE', () => {
    const sql = readFileSync(migrationPath, 'utf8');
    expect(sql).toContain('is_resident_private = false');
    expect(sql).toContain('DROP POLICY IF EXISTS journal_entries_staff_delete_own_org');
    expect(sql).toContain('DROP POLICY IF EXISTS resident_medications_staff_delete_own_org');
    expect(sql).toContain('REVOKE DELETE ON public.journal_entries FROM authenticated');
    expect(sql).toContain('REVOKE DELETE ON public.resident_medications FROM authenticated');
    expect(sql).not.toMatch(/CREATE POLICY journal_entries_staff_delete/i);
    expect(sql).not.toMatch(/CREATE POLICY resident_medications_staff_delete/i);
  });
});
