import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const migration = readFileSync(
  path.join(process.cwd(), 'supabase/migrations/20260723110500_ai_briefs_schema_rls.sql'),
  'utf8'
);

describe('ai_briefs migration', () => {
  it('creates the table used by AI brief generation', () => {
    expect(migration).toMatch(/CREATE TABLE IF NOT EXISTS public\.ai_briefs/i);
    expect(migration).toMatch(
      /resident_id uuid NOT NULL REFERENCES public\.care_residents\(user_id\)/i
    );
    expect(migration).toMatch(
      /brief_type text NOT NULL CHECK \(brief_type IN \('daily', 'weekly'\)\)/i
    );
    expect(migration).toMatch(/source_window_start date NOT NULL/i);
    expect(migration).toMatch(/source_window_end date NOT NULL/i);
  });

  it('protects briefs with tenant-scoped staff RLS', () => {
    expect(migration).toMatch(/ALTER TABLE public\.ai_briefs ENABLE ROW LEVEL SECURITY/i);
    expect(migration).toMatch(/CREATE POLICY "ai_briefs_staff_select_org"/i);
    expect(migration).toMatch(/CREATE POLICY "ai_briefs_staff_insert_org"/i);
    expect(migration).toMatch(/public\.care_staff_can_access_resident\(resident_id::text\)/i);
    expect(migration).toMatch(/cr\.org_id = ai_briefs\.org_id/i);
    expect(migration).toMatch(/GRANT SELECT, INSERT ON public\.ai_briefs TO authenticated/i);
  });
});
