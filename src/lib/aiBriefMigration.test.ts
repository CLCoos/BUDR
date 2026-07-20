import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

const migrationPath = fileURLToPath(
  new URL('../../supabase/migrations/20260720110500_ai_briefs_schema_rls.sql', import.meta.url)
);
const sql = readFileSync(migrationPath, 'utf8').replace(/\s+/g, ' ');

describe('ai_briefs migration', () => {
  it('creates the schema used by brief generation', () => {
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS public\.ai_briefs/);
    expect(sql).toMatch(/resident_id uuid NOT NULL/);
    expect(sql).toMatch(/org_id uuid NOT NULL/);
    expect(sql).toMatch(/brief_type text NOT NULL/);
    expect(sql).toMatch(/bullets jsonb NOT NULL/);
    expect(sql).toMatch(/actions jsonb NOT NULL/);
  });

  it('restricts authenticated access to staff and matching resident organisations', () => {
    expect(sql).toMatch(/ALTER TABLE public\.ai_briefs ENABLE ROW LEVEL SECURITY/);
    expect(sql).toMatch(/REVOKE ALL ON TABLE public\.ai_briefs FROM anon/);
    expect(sql).toMatch(/GRANT SELECT, INSERT ON TABLE public\.ai_briefs TO authenticated/);
    expect(sql).toMatch(/CREATE POLICY ai_briefs_staff_select/);
    expect(sql).toMatch(/CREATE POLICY ai_briefs_staff_insert/);
    expect(sql).toMatch(/public\.care_is_portal_staff\(\)/);
    expect(sql).toMatch(/org_id = ANY \(public\.care_visible_facility_ids\(\)\)/);
    expect(sql).toMatch(/cr\.user_id = ai_briefs\.resident_id/);
    expect(sql).toMatch(/cr\.org_id = ai_briefs\.org_id/);
  });
});
