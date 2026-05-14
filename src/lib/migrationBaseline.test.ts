import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const baselinePath = join(process.cwd(), 'supabase/migrations/20260101000000_baseline.sql');
const repairPath = join(
  process.cwd(),
  'supabase/migrations/20260514110500_lock_down_legacy_open_rls_policies.sql'
);

const baselineSql = readFileSync(baselinePath, 'utf8');
const repairSql = readFileSync(repairPath, 'utf8');

const forbiddenBaselinePatterns: Array<[string, RegExp]> = [
  ['psql restrict meta command', /^\\(?:restrict|unrestrict)\b/m],
  ['open care_residents select', /CREATE POLICY open_select ON public\.care_residents/i],
  ['open medication policies', /CREATE POLICY "Authenticated users can .* medications"/i],
  ['open journal read policy', /CREATE POLICY "Staff can read journal entries"/i],
  ['open journal insert policy', /CREATE POLICY "Staff can insert journal entries"/i],
  ['unscoped daily plan management', /CREATE POLICY "Staff manage plans"/i],
  ['unscoped plan proposal review', /CREATE POLICY "Staff review proposals"/i],
  ['org-null daily plan visibility', /CREATE POLICY "Staff see org plans"/i],
  ['org-null plan proposal visibility', /CREATE POLICY "Staff see org proposals"/i],
  ['anonymous garden access', /CREATE POLICY anon_all_plots/i],
  ['anonymous facility contacts', /CREATE POLICY anon_read_facility_contacts/i],
  ['open check-in read', /CREATE POLICY "portal can read all checkins"/i],
  ['open check-in insert', /CREATE POLICY "residents can insert own checkins"/i],
  ['open message policies', /CREATE POLICY "portal (?:read|insert) (?:messages|threads)"/i],
  ['open notification read', /CREATE POLICY "staff read notifications"/i],
  ['open notification update', /CREATE POLICY "staff acknowledge notifications"/i],
  ['open facility contact mutation', /CREATE POLICY staff_all_facility_contacts/i],
  ['unscoped staff plan suggestions', /CREATE POLICY staff_suggest_plan_items/i],
];

const legacyPolicyDrops = [
  '"Authenticated users can insert medications"',
  '"Authenticated users can read medications"',
  '"Authenticated users can update medications"',
  '"Staff can insert journal entries"',
  '"Staff can read journal entries"',
  '"Staff manage plans"',
  '"Staff review proposals"',
  '"Staff see org plans"',
  '"Staff see org proposals"',
  'anon_all_plots',
  'anon_read_facility_contacts',
  'open_select',
  '"portal can read all checkins"',
  '"residents can insert own checkins"',
  '"portal insert messages"',
  '"portal insert threads"',
  '"portal read messages"',
  '"portal read threads"',
  '"staff acknowledge notifications"',
  '"staff read notifications"',
  'staff_all_facility_contacts',
  'staff_suggest_plan_items',
];

describe('squashed Supabase baseline', () => {
  it('does not contain psql-only or legacy open RLS policies', () => {
    for (const [label, pattern] of forbiddenBaselinePatterns) {
      expect(baselineSql, label).not.toMatch(pattern);
    }
  });

  it('keeps scoped replacements for the locked-down tables', () => {
    expect(baselineSql).toContain('CREATE POLICY care_residents_staff_select');
    expect(baselineSql).toContain('CREATE POLICY journal_staff_select_org');
    expect(baselineSql).toContain('CREATE POLICY dp_staff_select');
    expect(baselineSql).toContain('CREATE POLICY pp_staff_select');
    expect(baselineSql).toContain('CREATE POLICY rm_staff_select');
    expect(baselineSql).toContain('CREATE POLICY pdc_staff_select');
    expect(baselineSql).toContain('CREATE POLICY portal_threads_staff_select');
    expect(baselineSql).toContain('CREATE POLICY portal_messages_staff_select');
  });

  it('ships a repair migration for already-applied legacy policies', () => {
    for (const policyName of legacyPolicyDrops) {
      expect(repairSql).toContain(`DROP POLICY IF EXISTS ${policyName}`);
    }
  });
});
