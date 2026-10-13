import type { ChimeDomain } from '@/types/lys';
import type { ChimeToVumMappingRow } from '@/lib/vum/vumTypes';

/** Default weights (matches DB seed in migration). Used when DB lookup unavailable. */
export const DEFAULT_CHIME_TO_VUM_MAPPINGS: readonly ChimeToVumMappingRow[] = [
  { chime_dimension: 'connectedness', vum_theme_number: 8, weight: 1.0 },
  { chime_dimension: 'connectedness', vum_theme_number: 9, weight: 0.5 },
  { chime_dimension: 'hope', vum_theme_number: 10, weight: 1.0 },
  { chime_dimension: 'identity', vum_theme_number: 10, weight: 1.0 },
  { chime_dimension: 'meaning', vum_theme_number: 9, weight: 0.7 },
  { chime_dimension: 'meaning', vum_theme_number: 10, weight: 0.7 },
  { chime_dimension: 'empowerment', vum_theme_number: 5, weight: 0.8 },
  { chime_dimension: 'empowerment', vum_theme_number: 6, weight: 0.8 },
  { chime_dimension: 'empowerment', vum_theme_number: 10, weight: 0.5 },
] as const;

export function vumThemesForChimeDimension(
  dimension: ChimeDomain,
  mappings: readonly ChimeToVumMappingRow[] = DEFAULT_CHIME_TO_VUM_MAPPINGS
): { themeNumber: number; weight: number }[] {
  return mappings
    .filter((m) => m.chime_dimension === dimension)
    .map((m) => ({ themeNumber: m.vum_theme_number, weight: m.weight }))
    .sort((a, b) => b.weight - a.weight);
}

export function suggestedVumThemesFromChimeDomains(
  domains: ChimeDomain[],
  mappings: readonly ChimeToVumMappingRow[] = DEFAULT_CHIME_TO_VUM_MAPPINGS
): number[] {
  const scores = new Map<number, number>();
  for (const domain of domains) {
    for (const { themeNumber, weight } of vumThemesForChimeDimension(domain, mappings)) {
      scores.set(themeNumber, (scores.get(themeNumber) ?? 0) + weight);
    }
  }
  return [...scores.entries()].sort((a, b) => b[1] - a[1]).map(([n]) => n);
}
