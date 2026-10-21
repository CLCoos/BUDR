import { describe, expect, it } from 'vitest';
import { createAliasMap, namePartsFor } from './aliases';

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
