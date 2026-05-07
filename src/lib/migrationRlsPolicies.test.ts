import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const legacyPermissivePolicyCreates = [
  'CREATE POLICY "Staff can read journal entries" ON public.journal_entries FOR SELECT TO authenticated USING (true)',
  'CREATE POLICY "Staff can insert journal entries" ON public.journal_entries FOR INSERT TO authenticated WITH CHECK (true)',
  'CREATE POLICY "Authenticated users can read medications" ON public.resident_medications FOR SELECT TO authenticated USING (true)',
  'CREATE POLICY "Authenticated users can insert medications" ON public.resident_medications FOR INSERT TO authenticated WITH CHECK (true)',
  'CREATE POLICY "Authenticated users can update medications" ON public.resident_medications FOR UPDATE TO authenticated USING (true)',
];

const legacyPermissivePolicyDrops = [
  'DROP POLICY IF EXISTS "Staff can read journal entries" ON public.journal_entries',
  'DROP POLICY IF EXISTS "Staff can insert journal entries" ON public.journal_entries',
  'DROP POLICY IF EXISTS "Authenticated users can read medications" ON public.resident_medications',
  'DROP POLICY IF EXISTS "Authenticated users can insert medications" ON public.resident_medications',
  'DROP POLICY IF EXISTS "Authenticated users can update medications" ON public.resident_medications',
];

function migration(relativePath: string): string {
  return readFileSync(path.join(process.cwd(), 'supabase/migrations', relativePath), 'utf8');
}

describe('staff data RLS migrations', () => {
  it('does not recreate legacy permissive staff policies in the baseline', () => {
    const baseline = migration('20260101000000_baseline.sql');

    for (const statement of legacyPermissivePolicyCreates) {
      expect(baseline).not.toContain(statement);
    }
  });

  it('drops legacy permissive staff policies for existing databases', () => {
    const repair = migration('20260507111000_drop_permissive_staff_rls_policies.sql');

    for (const statement of legacyPermissivePolicyDrops) {
      expect(repair).toContain(statement);
    }
  });
});
