import { describe, expect, it } from 'vitest';
import { careStaffFullName, coarseCareStaffRole, preferredInviteRoleId } from './careStaffRole';

describe('coarseCareStaffRole', () => {
  it('keeps leder and maps every other org role to medarbejder (DB CHECK)', () => {
    expect(coarseCareStaffRole('leder')).toBe('leder');
    expect(coarseCareStaffRole(' Leder ')).toBe('leder');
    expect(coarseCareStaffRole('medarbejder')).toBe('medarbejder');
    expect(coarseCareStaffRole('gæst')).toBe('medarbejder');
    expect(coarseCareStaffRole('Aftenvagt')).toBe('medarbejder');
  });
});

describe('preferredInviteRoleId', () => {
  it('prefers medarbejder over the alphabetically first gæst', () => {
    expect(
      preferredInviteRoleId([
        { id: 'g', name: 'gæst' },
        { id: 'l', name: 'leder' },
        { id: 'm', name: 'medarbejder' },
      ])
    ).toBe('m');
  });

  it('falls back to the first role, or empty', () => {
    expect(preferredInviteRoleId([{ id: 'g', name: 'gæst' }])).toBe('g');
    expect(preferredInviteRoleId([])).toBe('');
  });
});

describe('careStaffFullName', () => {
  it('prefers display_name, then full_name, then the email local part', () => {
    expect(careStaffFullName({ email: 'a@x.dk', user_metadata: { display_name: 'Ada' } })).toBe(
      'Ada'
    );
    expect(careStaffFullName({ email: 'a@x.dk', user_metadata: { full_name: 'Ada L' } })).toBe(
      'Ada L'
    );
    expect(careStaffFullName({ email: 'ada@x.dk', user_metadata: {} })).toBe('ada');
    expect(careStaffFullName({ email: null, user_metadata: null })).toBe('Medarbejder');
  });
});
