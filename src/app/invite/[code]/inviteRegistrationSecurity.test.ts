import { readFileSync } from 'fs';
import path from 'path';
import { describe, expect, it } from 'vitest';

function read(rel: string): string {
  return readFileSync(path.join(process.cwd(), rel), 'utf8');
}

describe('invite registration security', () => {
  it('resolves organisation from invite_code server-side, not client orgId', () => {
    const actions = read('src/app/invite/[code]/actions.ts');
    const form = read('src/app/invite/[code]/InviteForm.tsx');

    expect(actions).toContain('export async function registerInvitedStaff');
    expect(actions).toMatch(/registerInvitedStaff\(\s*inviteCode:\s*string/);
    expect(actions).toContain(".eq('invite_code', code)");
    expect(actions).toContain(".from('organisations')");
    expect(actions).not.toMatch(/registerInvitedStaff\(\s*orgId:\s*string/);

    expect(form).toContain('registerInvitedStaff(inviteCode, formData)');
    expect(form).not.toContain('registerInvitedStaff(orgId');
  });

  it('never trusts client-selected leder role on public invite registration', () => {
    const actions = read('src/app/invite/[code]/actions.ts');
    const form = read('src/app/invite/[code]/InviteForm.tsx');

    expect(actions).toContain("role: 'medarbejder'");
    expect(actions).not.toContain("formData.get('role')");
    expect(form).not.toContain('name="role"');
    expect(form).not.toContain("value={r}");
  });
});
