import { describe, expect, it } from 'vitest';
import { careStaffRoleFromOrgRoleName, preferredInviteRoleId } from './careStaffRole';

describe('careStaffRoleFromOrgRoleName', () => {
  it('keeps system leder', () => {
    expect(careStaffRoleFromOrgRoleName('leder')).toBe('leder');
    expect(careStaffRoleFromOrgRoleName(' Leder ')).toBe('leder');
  });

  it('keeps system gæst (the invite dropdown default when roles are ordered by name)', () => {
    expect(careStaffRoleFromOrgRoleName('gæst')).toBe('gæst');
    expect(careStaffRoleFromOrgRoleName('Gæst')).toBe('gæst');
  });

  it('maps custom org roles to medarbejder so the CHECK constraint still passes', () => {
    expect(careStaffRoleFromOrgRoleName('medarbejder')).toBe('medarbejder');
    expect(careStaffRoleFromOrgRoleName('Aftenvagt')).toBe('medarbejder');
    expect(careStaffRoleFromOrgRoleName('Vikar')).toBe('medarbejder');
  });
});

describe('preferredInviteRoleId', () => {
  it('prefers medarbejder over gæst when roles are ordered by name', () => {
    expect(
      preferredInviteRoleId([
        { id: 'guest-id', name: 'gæst' },
        { id: 'leder-id', name: 'leder' },
        { id: 'staff-id', name: 'medarbejder' },
      ])
    ).toBe('staff-id');
  });

  it('falls back to the first role when medarbejder is missing', () => {
    expect(preferredInviteRoleId([{ id: 'guest-id', name: 'gæst' }])).toBe('guest-id');
    expect(preferredInviteRoleId([])).toBe('');
  });
});
