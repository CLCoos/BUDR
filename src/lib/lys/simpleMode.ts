/**
 * Enkel Lys viser kun Nu, Fortæl og Hjælp. Min vej er skjult, så dagbogen og
 * log ud skal kunne nås fra forsiden. Ellers kan borgeren gemme «Kun mig»
 * uden at kunne læse det igen, og sessionen kan ikke afsluttes.
 */

export function journalSavedWhere(simpleMode: boolean): string {
  return simpleMode
    ? 'Det er kun dig, der kan se det. Du finder det under Min dagbog nederst på Nu.'
    : 'Det er kun dig, der kan se det. Du finder det under Min vej.';
}

export function eveningSavedWhere(simpleMode: boolean): string {
  return simpleMode
    ? 'Tak. Det er gemt under Min dagbog nederst på Nu.'
    : 'Tak. Det er gemt i din dagbog under Min vej.';
}
