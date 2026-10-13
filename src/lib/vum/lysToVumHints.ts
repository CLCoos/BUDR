import type { LysRecoveryProfile, LysReflection, LysNextStep } from '@/types/lys';
import { suggestedVumThemesFromChimeDomains } from '@/lib/vum/chimeToVumMapping';
import type { ChimeDomain } from '@/types/lys';

export type VumThemeHint = {
  themeNumber: number;
  source: string;
  excerpt: string;
};

/** Read-only hints from Lys recovery data → VUM temaer (Sprint 2 auto-mapping foundation). */
export function hintsFromRecoveryProfile(profile: LysRecoveryProfile): VumThemeHint[] {
  const hints: VumThemeHint[] = [];

  if (profile.connectedness_people || profile.connectedness_support) {
    hints.push({
      themeNumber: 8,
      source: 'Recovery-profil · Forbundethed',
      excerpt: [profile.connectedness_people, profile.connectedness_support]
        .filter(Boolean)
        .join(' · ')
        .slice(0, 280),
    });
  }
  if (profile.hope_dreams || profile.hope_small_wishes) {
    hints.push({
      themeNumber: 10,
      source: 'Recovery-profil · Håb',
      excerpt: [profile.hope_dreams, profile.hope_small_wishes]
        .filter(Boolean)
        .join(' · ')
        .slice(0, 280),
    });
  }
  if (profile.identity_strengths || profile.identity_proud_of) {
    hints.push({
      themeNumber: 10,
      source: 'Recovery-profil · Identitet',
      excerpt: [profile.identity_strengths, profile.identity_proud_of]
        .filter(Boolean)
        .join(' · ')
        .slice(0, 280),
    });
  }
  if (profile.meaning_values || profile.meaning_purpose) {
    hints.push({
      themeNumber: 10,
      source: 'Recovery-profil · Mening',
      excerpt: [profile.meaning_values, profile.meaning_purpose]
        .filter(Boolean)
        .join(' · ')
        .slice(0, 280),
    });
  }
  if (profile.empowerment_choices || profile.empowerment_capabilities) {
    hints.push({
      themeNumber: 5,
      source: 'Recovery-profil · Handlekraft',
      excerpt: [profile.empowerment_choices, profile.empowerment_capabilities]
        .filter(Boolean)
        .join(' · ')
        .slice(0, 280),
    });
  }

  return hints;
}

export function hintsFromReflection(reflection: LysReflection): VumThemeHint[] {
  const domain = reflection.primary_chime_domain as ChimeDomain | null;
  if (!domain) return [];

  const themes = suggestedVumThemesFromChimeDomains([domain]);
  const excerpt = [
    reflection.situation,
    reflection.what_gave_strength,
    reflection.resident_chosen_step,
  ]
    .filter(Boolean)
    .join(' ')
    .slice(0, 280);

  return themes.map((themeNumber) => ({
    themeNumber,
    source: `Refleksion · ${domain}`,
    excerpt,
  }));
}

export function hintsFromNextStep(step: LysNextStep): VumThemeHint[] {
  const domain = step.related_chime_domain as ChimeDomain | null;
  const themes = domain ? suggestedVumThemesFromChimeDomains([domain]) : [5, 10];
  return themes.map((themeNumber) => ({
    themeNumber,
    source: 'Næste skridt',
    excerpt: [step.title, step.description].filter(Boolean).join(' — ').slice(0, 280),
  }));
}
