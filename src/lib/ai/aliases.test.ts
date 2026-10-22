import { describe, expect, it } from 'vitest';
import {
  createAliasMap,
  initialerAfNavn,
  namePartsFor,
  residentAliasMap,
  residentInitials,
} from './aliases';

describe('createAliasMap', () => {
  const people = [
    { label: 'Anna Holm', names: namePartsFor('Anna Holm', 'AH') },
    ...Array.from({ length: 11 }, (_, i) => ({ label: `Navn${i}`, names: [`Navn${i}`] })),
  ];
  const map = createAliasMap(people);

  it('skjuler fulde navne, fornavne og initialer', () => {
    expect(map.hide('Anna Holm sagde hej. Anna var glad. AH sov.')).toBe(
      'Borger 1 sagde hej. Borger 1 var glad. Borger 1 sov.'
    );
  });

  it('sætter navne ind igen, også når der er over ti borgere', () => {
    expect(map.restore('Borger 1 og Borger 12 spiste sammen.')).toBe(
      'Anna Holm og Navn10 spiste sammen.'
    );
  });
});

describe('ejefald', () => {
  it('skjuler også navne med s bagpå og sætter dem ind igen', () => {
    const map = createAliasMap([
      { label: 'Mira Søndergaard', names: namePartsFor('Mira Søndergaard') },
    ]);
    const hidden = map.hide('Lægen har ændret Miras medicin.');
    expect(hidden).toBe('Lægen har ændret Borger 1s medicin.');
    expect(map.restore(hidden)).toBe('Lægen har ændret Mira Søndergaards medicin.');
  });
});

describe('initialer', () => {
  it('laver initialer af navne og bevarer initialer', () => {
    expect(initialerAfNavn('Asta Lindberg Fog')).toBe('ALF');
    expect(initialerAfNavn('Fatima Al-Sayed')).toBe('FAS');
    expect(initialerAfNavn('KBJ')).toBe('KBJ');
  });
});

describe('residentAliasMap', () => {
  const rows = [
    {
      user_id: 'a',
      first_name: 'Karin',
      last_name: 'Bech Jensen',
      display_name: 'Karin B.',
      nickname: 'Kis',
    },
    { user_id: 'b', first_name: null, last_name: null, display_name: 'Ole Dam', nickname: null },
  ];

  it('giver initialer ud fra fulde navn eller visningsnavn', () => {
    expect(residentInitials(rows[0]!)).toBe('KBJ');
    expect(residentInitials(rows[1]!)).toBe('OD');
  });

  it('skjuler alle navne og sætter initialer ind i svaret', () => {
    const map = residentAliasMap(rows);
    const hidden = map.hide('Kis og Karin talte med Ole Dam.');
    expect(hidden).not.toMatch(/Kis|Karin|Ole/);
    expect(map.restore(hidden)).toBe('KBJ og KBJ talte med OD.');
  });
});
