/**
 * Automatiske tjek af AI-tekst. Bruges af testsættet (`npm run eval:ai`) og kan bruges i ruterne.
 * Tjekkene er bevidst enkle og forklarlige; den faglige helhedsvurdering laver bedømmeren.
 */

const DIAGNOSER = [
  'skizofreni',
  'skizofren',
  'psykose',
  'psykotisk',
  'depression',
  'depressiv',
  'bipolar',
  'borderline',
  'personlighedsforstyrrelse',
  'angstlidelse',
  'ptsd',
  'adhd',
  'autisme',
  'ocd',
  'paranoid',
  'spiseforstyrrelse',
];

const MEDICINRAAD = [
  /\bbør\s+(?:øge|sænke|ændre|justere|trappe|pause)/i,
  /\banbefal\w*\s+(?:at\s+)?(?:øge|sænke|ændre|justere)\s+(?:dosis|medicin)/i,
  /\b(?:øg|sænk)\s+dosis\b/i,
  /\bskal\s+have\s+(?:mere|mindre)\s+(?:medicin|\w+mg)/i,
];

function norm(s: string): string {
  return s.toLowerCase().normalize('NFC');
}

function ordFindes(text: string, ord: string): boolean {
  const escaped = ord.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?<![\\p{L}])${escaped}`, 'iu').test(text);
}

/** Diagnoser i svaret, som ikke stod i materialet. */
export function nyeDiagnoser(output: string, input: string): string[] {
  return DIAGNOSER.filter((d) => ordFindes(output, d) && !ordFindes(input, d));
}

/** Formuleringer, der ligner råd om medicin. */
export function medicinraad(output: string): string[] {
  return MEDICINRAAD.map((re) => output.match(re)?.[0]).filter((m): m is string => Boolean(m));
}

function navnFindes(text: string, navn: string): boolean {
  const escaped = navn.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(?<![\\p{L}])${escaped}(?:s|')?(?![\\p{L}])`, 'iu').test(text);
}

/** Navne (fra listen), der står i teksten, også i ejefald ("Miras"). */
export function navneITekst(text: string, navne: string[]): string[] {
  return [...new Set(navne.filter((n) => n.trim().length >= 2 && navnFindes(text, n.trim())))];
}

/** Overskrifter, der mangler (hver skal stå på sin egen linje). */
export function manglendeOverskrifter(text: string, overskrifter: string[]): string[] {
  const lines = text.split('\n').map((l) => norm(l.replace(/[*#]/g, '').trim()));
  return overskrifter.filter((h) => !lines.includes(norm(h)));
}

/** Tal og klokkeslæt i svaret, som ikke findes i materialet (signal om opfundne detaljer). */
export function nyeTal(output: string, input: string, ignorer: string[] = []): string[] {
  const tal = (s: string) =>
    new Set((s.match(/\d+(?:[.:,]\d+)?/g) ?? []).map((t) => t.replace(':', '.').replace(',', '.')));
  const fraInput = tal(input);
  const ign = new Set(ignorer);
  return [...tal(output)].filter((t) => !fraInput.has(t) && !ign.has(t));
}

/** Tekststykker, der skal stå i svaret, men mangler (uden hensyn til store/små bogstaver). */
export function mangler(output: string, skalIndeholde: string[]): string[] {
  const o = norm(output);
  return skalIndeholde.filter((s) => !o.includes(norm(s)));
}

/** Tekststykker, der ikke må stå i svaret, men gør. */
export function forbudte(output: string, maaIkkeIndeholde: string[]): string[] {
  const o = norm(output);
  return maaIkkeIndeholde.filter((s) => o.includes(norm(s)));
}
