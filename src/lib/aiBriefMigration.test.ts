import { readFileSync } from 'fs';
import { describe, expect, it } from 'vitest';

const migrationPath = 'supabase/migrations/20260627110500_ai_briefs_schema_rls.sql';

describe('ai_briefs migration', () => {
  const sql = readFileSync(migrationPath, 'utf8');

  it('creates the table used by the AI brief code path', () => {
    expect(sql).toMatch(/CREATE TABLE IF NOT EXISTS public\.ai_briefs/i);
    expect(sql).toMatch(/resident_id uuid NOT NULL/i);
    expect(sql).toMatch(/org_id uuid NOT NULL/i);
    expect(sql).toMatch(/brief_type text NOT NULL/i);
  });

  it('enables RLS and scopes authenticated staff policies by org and resident', () => {
    expect(sql).toMatch(/ALTER TABLE public\.ai_briefs ENABLE ROW LEVEL SECURITY/i);
    expect(sql).toMatch(/CREATE POLICY ai_briefs_staff_select_own_org/i);
    expect(sql).toMatch(/CREATE POLICY ai_briefs_staff_insert_own_org/i);
    expect(sql).toMatch(/cs\.org_id FROM public\.care_staff/i);
    expect(sql).toMatch(/cr\.user_id = ai_briefs\.resident_id/i);
    expect(sql).toMatch(/cr\.org_id = ai_briefs\.org_id/i);
    expect(sql).not.toMatch(/FOR (?:SELECT|INSERT|UPDATE|DELETE|ALL) TO authenticated[\s\S]{0,120}true/i);
  });
});
