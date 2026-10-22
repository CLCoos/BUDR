/** Hvor borgeren skrev det, der gav en krisehændelse. Delt mellem server og portal. */
export type SafetySource =
  | 'lys_samtale'
  | 'tjek_ind'
  | 'dagbog'
  | 'privat_dagbog'
  | 'stemmedagbog'
  | 'besked_til_personalet';

export const SAFETY_SOURCE_LABELS: Record<SafetySource, string> = {
  lys_samtale: 'Lys-samtale',
  tjek_ind: 'Tjek-ind',
  dagbog: 'Dagbog',
  privat_dagbog: 'Privat dagbog',
  stemmedagbog: 'Stemmedagbog',
  besked_til_personalet: 'Besked til personalet',
};

export const SAFETY_RISK_LABELS: Record<string, string> = {
  acute: 'Akut',
  elevated: 'Forhøjet',
};

export function safetySourceLabel(source: string | null | undefined): string {
  return SAFETY_SOURCE_LABELS[(source ?? 'lys_samtale') as SafetySource] ?? 'Lys';
}
