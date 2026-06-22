import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const migrationSql = readFileSync(
  join(process.cwd(), 'supabase/migrations/20260622110500_ai_briefs_schema_rls.sql'),
  'utf8'
);

describe('ai_briefs migration', () => {
  it('creates the table used by AI brief reads and writes', () => {
    expect(migrationSql).toContain('CREATE TABLE IF NOT EXISTS public.ai_briefs');
    expect(migrationSql).toContain(
      'resident_id uuid NOT NULL REFERENCES public.care_residents(user_id)'
    );
    expect(migrationSql).toContain('brief_type text NOT NULL CHECK');
    expect(migrationSql).toContain('source_window_start date NOT NULL');
    expect(migrationSql).toContain('source_window_end date NOT NULL');
  });

  it('enables tenant-scoped staff RLS for reads and inserts', () => {
    expect(migrationSql).toContain('ALTER TABLE public.ai_briefs ENABLE ROW LEVEL SECURITY');
    expect(migrationSql).toContain('CREATE POLICY "ai_briefs_staff_select"');
    expect(migrationSql).toContain('CREATE POLICY "ai_briefs_staff_insert"');
    expect(migrationSql).toContain('public.care_staff_can_access_resident(resident_id::text)');
    expect(migrationSql).toContain('org_id = ANY (public.care_visible_facility_ids())');
    expect(migrationSql).toContain('cr.org_id = ai_briefs.org_id');
    expect(migrationSql).toContain('GRANT SELECT, INSERT ON public.ai_briefs TO authenticated');
  });
});
