import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const baselineSql = readFileSync(
  join(process.cwd(), 'supabase/migrations/20260101000000_baseline.sql'),
  'utf8'
);
const repairSql = readFileSync(
  join(process.cwd(), 'supabase/migrations/20260513111500_repair_baseline_schema_rls.sql'),
  'utf8'
);

describe('squashed Supabase baseline', () => {
  it('is plain SQL accepted by migration runners', () => {
    expect(baselineSql).not.toMatch(/^\\(?:restrict|unrestrict)\b/m);
    expect(baselineSql).toContain('CREATE SCHEMA IF NOT EXISTS public;');
  });

  it('keeps schema columns required by live app code', () => {
    expect(baselineSql).toContain("journal_status text DEFAULT 'godkendt'::text NOT NULL");
    expect(baselineSql).toContain('approved_at timestamp with time zone');
    expect(baselineSql).toContain('approved_by uuid');
    expect(baselineSql).toContain("revisions jsonb DEFAULT '[]'::jsonb NOT NULL");
  });

  it('does not recreate tenant-bypassing authenticated policies', () => {
    expect(baselineSql).not.toMatch(
      /CREATE POLICY (?!"service insert notifications").*(USING \(true\)|WITH CHECK \(true\))/
    );
    expect(baselineSql).toContain('CREATE POLICY care_residents_staff_select');
    expect(baselineSql).toContain('CREATE POLICY journal_staff_select_org');
    expect(baselineSql).toContain('CREATE POLICY pdc_staff_select');
    expect(baselineSql).toContain('CREATE POLICY portal_threads_select_own_org');
  });
});

describe('baseline repair migration', () => {
  it('removes legacy permissive policies and recreates scoped replacements', () => {
    expect(repairSql).toContain('DROP POLICY IF EXISTS open_select ON public.care_residents');
    expect(repairSql).toContain('DROP POLICY IF EXISTS "Staff can read journal entries"');
    expect(repairSql).toContain('DROP POLICY IF EXISTS "portal read messages"');
    expect(repairSql).toContain('CREATE POLICY care_residents_staff_select');
    expect(repairSql).toContain('CREATE POLICY journal_staff_select_org');
    expect(repairSql).toContain('CREATE POLICY portal_messages_select_own_org');
  });
});
