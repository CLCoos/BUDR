import { describe, expect, it } from 'vitest';
import {
  buildCareStaffAttachWrite,
  careStaffFullName,
  coarseCareStaffRole,
} from './attachCareStaff';

describe('coarseCareStaffRole', () => {
  it('keeps leder and maps every other org role onto medarbejder', () => {
    expect(coarseCareStaffRole('leder')).toBe('leder');
    expect(coarseCareStaffRole(' Leder ')).toBe('leder');
    expect(coarseCareStaffRole('medarbejder')).toBe('medarbejder');
    expect(coarseCareStaffRole('gæst')).toBe('medarbejder');
    expect(coarseCareStaffRole('Aftenvagt')).toBe('medarbejder');
  });
});

describe('careStaffFullName', () => {
  it('prefers display_name, then full_name, then the email local part', () => {
    expect(
      careStaffFullName({
        email: 'ada@example.com',
        user_metadata: { display_name: 'Ada', full_name: 'Ada Lovelace' },
      })
    ).toBe('Ada');
    expect(
      careStaffFullName({
        email: 'ada@example.com',
        user_metadata: { full_name: 'Ada Lovelace' },
      })
    ).toBe('Ada Lovelace');
    expect(careStaffFullName({ email: 'ada@example.com', user_metadata: {} })).toBe('ada');
    expect(careStaffFullName({ email: null, user_metadata: null })).toBe('Medarbejder');
  });
});

describe('buildCareStaffAttachWrite', () => {
  const authUser = { email: 'ny@example.com', user_metadata: { display_name: 'Ny Kollega' } };

  it('includes full_name on insert and does not copy a custom org role name', () => {
    const write = buildCareStaffAttachWrite({
      userId: 'user-1',
      orgId: 'org-1',
      roleId: 'role-guest',
      orgRoleName: 'gæst',
      existing: false,
      authUser,
    });
    expect(write.op).toBe('insert');
    expect(write.row).toEqual({
      id: 'user-1',
      org_id: 'org-1',
      role_id: 'role-guest',
      role: 'medarbejder',
      full_name: 'Ny Kollega',
    });
  });

  it('updates org and role without touching full_name when the row already exists', () => {
    const write = buildCareStaffAttachWrite({
      userId: 'user-1',
      orgId: 'org-2',
      roleId: 'role-leader',
      orgRoleName: 'leder',
      existing: true,
      authUser,
    });
    expect(write.op).toBe('update');
    expect(write.row).toEqual({
      org_id: 'org-2',
      role_id: 'role-leader',
      role: 'leder',
    });
    expect(write.row).not.toHaveProperty('full_name');
  });
});
