import { readFileSync } from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

const migrationPath = path.join(
  process.cwd(),
  'supabase/migrations/20260725110500_ai_briefs_schema_rls.sql'
);

describe('ai_briefs migration', () => {
  it('creates the ai_briefs table used by portal and cron brief generation', () => {
    const sql = readFileSync(migrationPath, 'utf8');

    expect(sql).toContain('CREATE TABLE IF NOT EXISTS public.ai_briefs');
    expect(sql).toContain('resident_id uuid NOT NULL REFERENCES public.care_residents(user_id)');
    expect(sql).toContain("brief_type text NOT NULL CHECK (brief_type IN ('daily', 'weekly'))");
    expect(sql).toContain('bullets jsonb NOT NULL');
    expect(sql).toContain('actions jsonb NOT NULL');
  });

  it('enables RLS with tenant-scoped staff policies and service-role access', () => {
    const sql = readFileSync(migrationPath, 'utf8');

    expect(sql).toContain('ALTER TABLE public.ai_briefs ENABLE ROW LEVEL SECURITY');
    expect(sql).toContain('CREATE POLICY ai_briefs_service_all');
    expect(sql).toContain('TO service_role');
    expect(sql).toContain('CREATE POLICY ai_briefs_staff_select_own_org');
    expect(sql).toContain('CREATE POLICY ai_briefs_staff_insert_own_org');
    expect(sql).toContain('public.care_staff_can_access_resident(resident_id::text)');
    expect(sql).toContain('cr.user_id = ai_briefs.resident_id');
    expect(sql).toContain('cr.org_id = ai_briefs.org_id');
    expect(sql).toContain('GRANT SELECT, INSERT ON public.ai_briefs TO authenticated');
  });
});
