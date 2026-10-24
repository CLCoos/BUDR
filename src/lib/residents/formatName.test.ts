import { describe, expect, it } from 'vitest';
import { formatResidentName, fullResidentName, getInitials, initialsOfName } from './formatName';

describe('borgernavne', () => {
  it('viser altid initialer', () => {
    const r = { first_name: 'Sara', last_name: 'Kristensen', display_name: null };
    expect(formatResidentName(r)).toBe('SK');
    expect(formatResidentName(r, 'full_name')).toBe('SK');
    expect(getInitials(r)).toBe('SK');
    expect(fullResidentName(r)).toBe('Sara Kristensen');
  });

  it('bruger visningsnavnet, når for- og efternavn mangler', () => {
    expect(getInitials({ first_name: null, last_name: null, display_name: 'Mikkel Thomsen' })).toBe(
      'MT'
    );
  });

  it('bevarer initialer og håndterer forkortelser', () => {
    expect(initialsOfName('MT')).toBe('MT');
    expect(initialsOfName('Sara K.')).toBe('SK');
    expect(initialsOfName('Asta Lindberg-Fog')).toBe('ALF');
    expect(initialsOfName('')).toBe('—');
  });
});
