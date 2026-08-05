import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const MIGRATION = resolve(
  __dirname,
  '../../supabase/migrations/20260805110000_org_roles_plan_items_org_settings_rls.sql'
);

describe('org roles / plan items / org settings RLS migration', () => {
  const sql = readFileSync(MIGRATION, 'utf8');

  it('adds care_staff_has_permission helper', () => {
    expect(sql).toMatch(
      /CREATE OR REPLACE FUNCTION public\.care_staff_has_permission\(p_permission text\)/
    );
    expect(sql).toContain('p_permission = ANY (v_perms)');
    expect(sql).toContain("v_role = 'leder'");
  });

  it('replaces org_roles FOR ALL with select + manage_roles writes', () => {
    expect(sql).toContain('DROP POLICY IF EXISTS staff_roles_own_org ON public.org_roles');
    expect(sql).toContain('CREATE POLICY org_roles_staff_select_own_org');
    expect(sql).toContain('CREATE POLICY org_roles_staff_insert_manage');
    expect(sql).toContain('CREATE POLICY org_roles_staff_update_manage');
    expect(sql).toContain('CREATE POLICY org_roles_staff_delete_manage');
    expect(sql).toContain("care_staff_has_permission('manage_roles')");
  });

  it('closes open resident_plan_items suggestion insert', () => {
    expect(sql).toContain(
      'DROP POLICY IF EXISTS staff_suggest_plan_items ON public.resident_plan_items'
    );
    expect(sql).toContain(
      'DROP POLICY IF EXISTS staff_plan_items_org ON public.resident_plan_items'
    );
    expect(sql).toContain('CREATE POLICY rpi_staff_insert');
    expect(sql).toContain('care_staff_can_access_resident(resident_id)');
  });

  it('adds organisations UPDATE for manage_roles', () => {
    expect(sql).toContain('CREATE POLICY "staff can update own org settings"');
    expect(sql).toMatch(/ON public\.organisations\s+FOR UPDATE/);
  });

  it('restricts marketing_content_blocks mutations to manage_roles', () => {
    expect(sql).toContain(
      'DROP POLICY IF EXISTS mcb_staff_insert ON public.marketing_content_blocks'
    );
    expect(sql).toContain(
      'DROP POLICY IF EXISTS mcb_staff_update ON public.marketing_content_blocks'
    );
    expect(sql).toContain("care_staff_has_permission('manage_roles')");
  });
});
