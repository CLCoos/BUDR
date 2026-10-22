import { describe, expect, it } from 'vitest';
import {
  forbudte,
  manglendeOverskrifter,
  mangler,
  medicinraad,
  navneITekst,
  nyeDiagnoser,
  nyeTal,
} from './tjek';

describe('tjek', () => {
  it('finder diagnoser, der ikke stod i materialet', () => {
    expect(
      nyeDiagnoser('Borgeren virker psykotisk og har depression.', 'Borgeren har depression.')
    ).toEqual(['psykotisk']);
  });

  it('finder medicinråd', () => {
    expect(medicinraad('Personalet bør øge dosis.')).toHaveLength(1);
    expect(medicinraad('Borgeren tog sin medicin kl. 11.')).toHaveLength(0);
  });

  it('finder navne og manglende overskrifter', () => {
    expect(navneITekst('Anna gik en tur.', ['Anna', 'Bo'])).toEqual(['Anna']);
    expect(
      manglendeOverskrifter('Handling/aktivitet\nTekst', ['Handling/aktivitet', 'Refleksion'])
    ).toEqual(['Refleksion']);
  });

  it('finder tal, der ikke stod i materialet', () => {
    expect(nyeTal('Kl. 9.30 og 10 minutter senere, 45 min', 'kl 9:30 efter 10 min')).toEqual([
      '45',
    ]);
  });

  it('tjekker skal/må ikke indeholde', () => {
    expect(mangler('Meget vred', ['meget vred', 'KBJ'])).toEqual(['KBJ']);
    expect(forbudte('Han var frustreret', ['frustreret'])).toEqual(['frustreret']);
  });
});
