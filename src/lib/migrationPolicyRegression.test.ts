import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function migration(path: string): string {
  return readFileSync(join(root, path), 'utf8');
}

describe('critical migration regressions', () => {
  it('creates lys_checkin.checkin_type before the compat view filters on it', () => {
    const sql = migration('supabase/migrations/20260516140000_park_daily_checkin_compat_view.sql');

    const addColumn = sql.indexOf('ADD COLUMN IF NOT EXISTS checkin_type');
    const createView = sql.indexOf('CREATE VIEW public.park_daily_checkin');

    expect(addColumn).toBeGreaterThanOrEqual(0);
    expect(createView).toBeGreaterThan(addColumn);
  });

  it('repairs plan table policies with resident org scoping', () => {
    const sql = migration('supabase/migrations/20260521110500_lock_down_plan_rls_policies.sql');

    expect(sql).toContain('DROP POLICY IF EXISTS "Staff manage plans"');
    expect(sql).toContain('DROP POLICY IF EXISTS "Staff review proposals"');
    expect(sql).toContain('DROP POLICY IF EXISTS staff_suggest_plan_items');
    expect(sql.match(/public\.care_staff_can_access_resident\(resident_id::text\)/g)).toHaveLength(
      15
    );
  });
});
