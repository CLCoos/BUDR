import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import path from 'node:path';

const migrationSql = readFileSync(
  path.join(process.cwd(), 'supabase/migrations/20260629110500_ai_briefs_schema_rls.sql'),
  'utf8'
);

describe('ai_briefs migration', () => {
  it('creates the table used by AI-brief routes', () => {
    expect(migrationSql).toMatch(/CREATE TABLE IF NOT EXISTS public\.ai_briefs/i);
    expect(migrationSql).toMatch(/brief_type text NOT NULL CHECK/i);
    expect(migrationSql).toMatch(/source_window_start date NOT NULL/i);
    expect(migrationSql).toMatch(/source_window_end date NOT NULL/i);
  });

  it('protects AI briefs with tenant-scoped RLS policies', () => {
    expect(migrationSql).toMatch(/ALTER TABLE public\.ai_briefs ENABLE ROW LEVEL SECURITY/i);
    expect(migrationSql).toMatch(/CREATE POLICY "ai_briefs_staff_select"/i);
    expect(migrationSql).toMatch(/CREATE POLICY "ai_briefs_staff_insert"/i);
    expect(migrationSql).toMatch(/public\.care_is_portal_staff\(\)/i);
    expect(migrationSql).toMatch(/org_id = ANY \(public\.care_visible_facility_ids\(\)\)/i);
    expect(migrationSql).toMatch(/public\.care_staff_can_access_resident\(resident_id::text\)/i);
    expect(migrationSql).not.toMatch(/USING\s*\(\s*true\s*\)/i);
    expect(migrationSql).not.toMatch(/WITH CHECK\s*\(\s*true\s*\)/i);
  });
});
