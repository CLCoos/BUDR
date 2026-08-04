import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = join(__dirname, '../..');

function read(rel: string): string {
  return readFileSync(join(root, rel), 'utf8');
}

describe('daily_plans / plan_proposals schema alignment', () => {
  const migration = read(
    'supabase/migrations/20260804110500_daily_plans_schema_and_rls.sql'
  );

  it('renames baseline date columns to plan_date when needed', () => {
    expect(migration).toMatch(/RENAME COLUMN date TO plan_date/);
    expect(migration).toContain("table_name = 'daily_plans'");
    expect(migration).toContain("table_name = 'plan_proposals'");
  });

  it('adds columns the app writes on propose/approve', () => {
    expect(migration).toMatch(/ADD COLUMN IF NOT EXISTS user_message/);
    expect(migration).toMatch(/ADD COLUMN IF NOT EXISTS created_by/);
    expect(migration).toMatch(/ADD COLUMN IF NOT EXISTS updated_at/);
    expect(migration).toContain('daily_plans_resident_id_plan_date_key');
  });

  it('replaces unscoped staff FOR ALL / UPDATE with resident-org policies', () => {
    expect(migration).toContain('DROP POLICY IF EXISTS "Staff manage plans"');
    expect(migration).toContain('DROP POLICY IF EXISTS "Staff review proposals"');
    expect(migration).toContain('care_staff_can_access_resident((resident_id)::text)');
    expect(migration).toContain('CREATE POLICY "dp_staff_insert"');
    expect(migration).toContain('CREATE POLICY "pp_staff_update"');
  });

  it('API routes persist plan_date + user_message (not baseline date)', () => {
    const propose = read('src/app/api/lys/propose-plan/route.ts');
    const lysPropose = read('src/app/api/lys/lys-plan-proposal/route.ts');
    const approve = read('src/app/api/portal/approve-proposal/route.ts');

    expect(propose).toContain('plan_date: today');
    expect(propose).toContain('user_message:');
    expect(lysPropose).toContain('plan_date: today');
    expect(lysPropose).toContain('user_message');
    expect(approve).toContain("onConflict: 'resident_id,plan_date'");
    expect(approve).toContain('plan_date: proposal.plan_date');
    expect(approve).toContain('created_by:');
    expect(approve).toContain('updated_at:');
  });
});
