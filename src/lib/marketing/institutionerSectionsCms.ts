export type InstitutionerSectionsCopyPayload = {
  implementering_intro: string;
  implementering_items: [string, string, string, string];
  pilot_intro: string;
  pilot_items: [string, string, string, string];
  pilot_helper: string;
};

export const DEFAULT_INSTITUTIONER_SECTIONS_COPY: InstitutionerSectionsCopyPayload = {
  implementering_intro:
    'Implementeringen skal opleves enkel i hverdagen. BUDR står for onboarding, opsætning og dataoverflytning, så jeres team kan fokusere på borgerne og den daglige drift.',
  implementering_items: [
    'Opstart: Vi laver en konkret plan med jer og tager de tunge praktiske opgaver, så opstarten bliver kort og overskuelig.',
    'Roller: Én kontaktperson hos jer er nok til koordinering. Vi håndterer resten sammen med relevante nøglepersoner.',
    'Onboarding: Vi træner personale i Care Portal og introducerer Lys i et tempo, der passer jeres vagtplan og hverdag.',
    'Teknik: Adgang via browser eller mobil app-wrapper. Vi hjælper med opsætning, logins og sikker overflytning af relevante data fra start.',
  ],
  pilot_intro:
    'En pilot er en afgrænset periode, hvor I får løsningen ind i hverdagen med tæt støtte. Målet er hurtig læring og tydelig effekt.',
  pilot_items: [
    'Varighed: Aftales efter jeres drift og mål, så I hurtigt får en brugbar evaluering uden at belaste organisationen unødigt.',
    'Succeskriterier: Vi sætter konkrete mål fra start, fx bedre overblik ved vagtskifte, mere ensartet journalpraksis og højere tryghed i teamet.',
    'Support: Fast kontakt, klare responstider og aktiv opfølgning under hele pilotforløbet, så I ikke står alene undervejs.',
    'Persondata: Roller som dataansvarlig og underdatabehandlere afklares skriftligt i aftalegrundlaget. Se overordnet ramme i vores privatlivspolitik.',
  ],
  pilot_helper:
    'Har I behov for materiale til DPO eller IT, understøtter vi med teknisk beskrivelse og underdatabehandlerliste.',
};

function cleanText(v: unknown, fallback: string): string {
  if (typeof v !== 'string') return fallback;
  const t = v.trim();
  return t.length ? t : fallback;
}

function cleanItems(
  v: unknown,
  fallback: [string, string, string, string]
): [string, string, string, string] {
  if (!Array.isArray(v)) return fallback;
  const out = [...fallback] as [string, string, string, string];
  for (let i = 0; i < out.length; i += 1) {
    out[i] = cleanText(v[i], fallback[i]);
  }
  return out;
}

export function sanitizeInstitutionerSectionsCopy(
  input: unknown
): InstitutionerSectionsCopyPayload {
  if (!input || typeof input !== 'object') return DEFAULT_INSTITUTIONER_SECTIONS_COPY;
  const r = input as Record<string, unknown>;
  return {
    implementering_intro: cleanText(
      r.implementering_intro,
      DEFAULT_INSTITUTIONER_SECTIONS_COPY.implementering_intro
    ),
    implementering_items: cleanItems(
      r.implementering_items,
      DEFAULT_INSTITUTIONER_SECTIONS_COPY.implementering_items
    ),
    pilot_intro: cleanText(r.pilot_intro, DEFAULT_INSTITUTIONER_SECTIONS_COPY.pilot_intro),
    pilot_items: cleanItems(r.pilot_items, DEFAULT_INSTITUTIONER_SECTIONS_COPY.pilot_items),
    pilot_helper: cleanText(r.pilot_helper, DEFAULT_INSTITUTIONER_SECTIONS_COPY.pilot_helper),
  };
}
