import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = process.cwd();

function readRoute(relativePath: string): string {
  return readFileSync(join(root, relativePath), 'utf8');
}

describe('plan proposal API authz', () => {
  it('approve-proposal requires edit_park_plans before mutating', () => {
    const src = readRoute('src/app/api/portal/approve-proposal/route.ts');
    expect(src).toContain('getStaffPermissions');
    expect(src).toContain('PERMISSIONS.EDIT_PARK_PLANS');
    expect(src).toMatch(/hasPermission\(\s*permissions,\s*PERMISSIONS\.EDIT_PARK_PLANS\s*\)/);

    const permIdx = src.indexOf('PERMISSIONS.EDIT_PARK_PLANS');
    const upsertIdx = src.indexOf(".from('daily_plans')");
    expect(permIdx).toBeGreaterThan(-1);
    expect(upsertIdx).toBeGreaterThan(permIdx);
  });

  it('approve-proposal claims pending proposal before writing daily_plans', () => {
    const src = readRoute('src/app/api/portal/approve-proposal/route.ts');
    const claimIdx = src.indexOf(".from('plan_proposals')");
    const upsertIdx = src.indexOf(".from('daily_plans')");
    expect(claimIdx).toBeGreaterThan(-1);
    expect(upsertIdx).toBeGreaterThan(claimIdx);
    expect(src).toContain("status: 'approved'");
    expect(src).toContain(".eq('status', 'pending')");
    // Failed plan write must not leave a stuck approved proposal.
    expect(src).toContain("status: 'pending'");
    expect(src).toContain('rollback');
  });

  it('reject-proposal requires edit_park_plans and claims pending row', () => {
    const src = readRoute('src/app/api/portal/reject-proposal/route.ts');
    expect(src).toContain('getStaffPermissions');
    expect(src).toMatch(/hasPermission\(\s*permissions,\s*PERMISSIONS\.EDIT_PARK_PLANS\s*\)/);
    expect(src).toContain("status: 'rejected'");
    expect(src).toContain(".eq('status', 'pending')");
    expect(src).toContain('.select(');
    expect(src).toContain('.maybeSingle()');
  });
});

describe('resident-sessions API authz', () => {
  it('lists and revokes require view_360', () => {
    const src = readRoute('src/app/api/portal/resident-sessions/route.ts');
    expect(src).toContain('getStaffPermissions');
    const matches = src.match(/PERMISSIONS\.VIEW_360/g) ?? [];
    expect(matches.length).toBeGreaterThanOrEqual(2);
    expect(src).toMatch(/hasPermission\(\s*permissions,\s*PERMISSIONS\.VIEW_360\s*\)/);
  });
});
