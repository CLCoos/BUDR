import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  new URL('../../supabase/migrations/20260620110500_ai_briefs_schema_rls.sql', import.meta.url),
  'utf8'
);

describe('ai_briefs migration', () => {
  it('creates the table used by AI brief generation', () => {
    expect(migration).toContain('CREATE TABLE IF NOT EXISTS public.ai_briefs');
    expect(migration).toContain('resident_id uuid NOT NULL');
    expect(migration).toContain('org_id uuid NOT NULL');
    expect(migration).toContain('brief_type text NOT NULL');
    expect(migration).toContain('source_window_start date NOT NULL');
    expect(migration).toContain('source_window_end date NOT NULL');
  });

  it('enforces scoped RLS for staff reads and inserts', () => {
    expect(migration).toContain('ALTER TABLE public.ai_briefs ENABLE ROW LEVEL SECURITY');
    expect(migration).toContain('CREATE POLICY ai_briefs_staff_select_own_org');
    expect(migration).toContain('CREATE POLICY ai_briefs_staff_insert_own_org');
    expect(migration).toContain(
      'org_id = (SELECT cs.org_id FROM public.care_staff cs WHERE cs.id = auth.uid())'
    );
    expect(migration).toContain('public.care_staff_can_access_resident(resident_id::text)');
    expect(migration).toContain('REVOKE ALL ON public.ai_briefs FROM anon');
    expect(migration).toContain('GRANT SELECT, INSERT ON public.ai_briefs TO authenticated');
  });
});
