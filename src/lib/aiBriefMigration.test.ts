import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const migrationSql = readFileSync(
  path.join(process.cwd(), 'supabase/migrations/20260624110500_ai_briefs_schema_rls.sql'),
  'utf8'
);

describe('ai_briefs migration', () => {
  it('creates the ai_briefs table used by resident 360 and brief generation', () => {
    expect(migrationSql).toContain('CREATE TABLE IF NOT EXISTS public.ai_briefs');
    expect(migrationSql).toContain('resident_id uuid NOT NULL REFERENCES public.care_residents');
    expect(migrationSql).toContain('org_id uuid NOT NULL REFERENCES public.organisations');
    expect(migrationSql).toContain("brief_type text NOT NULL DEFAULT 'daily'");
    expect(migrationSql).toContain('bullets jsonb NOT NULL');
    expect(migrationSql).toContain('actions jsonb NOT NULL');
    expect(migrationSql).toContain('source_window_start date NOT NULL');
    expect(migrationSql).toContain('source_window_end date NOT NULL');
  });

  it('enables RLS and scopes staff access to their own resident/org', () => {
    expect(migrationSql).toContain('ALTER TABLE public.ai_briefs ENABLE ROW LEVEL SECURITY');
    expect(migrationSql).toMatch(
      /CREATE POLICY ai_briefs_staff_select_own_org[\s\S]*FOR SELECT TO authenticated[\s\S]*public\.care_staff_can_access_resident\(resident_id::text\)[\s\S]*org_id = \(SELECT cs\.org_id FROM public\.care_staff cs WHERE cs\.id = auth\.uid\(\)\)/
    );
    expect(migrationSql).toMatch(
      /CREATE POLICY ai_briefs_staff_insert_own_org[\s\S]*FOR INSERT TO authenticated[\s\S]*WITH CHECK[\s\S]*public\.care_staff_can_access_resident\(resident_id::text\)[\s\S]*org_id = \(SELECT cs\.org_id FROM public\.care_staff cs WHERE cs\.id = auth\.uid\(\)\)/
    );
    expect(migrationSql).toMatch(
      /CREATE POLICY ai_briefs_service_all[\s\S]*FOR ALL TO service_role[\s\S]*USING \(true\)[\s\S]*WITH CHECK \(true\)/
    );
    expect(migrationSql).toContain('GRANT SELECT, INSERT ON public.ai_briefs TO authenticated');
  });
});
