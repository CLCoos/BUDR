/**
 * Statusudtalelse til kommunen før opfølgningsmøde (§107/§108).
 * Struktur efter VUM 2.0/FFB: opsamling på indsatsmål, funktionsevne og væsentlige ændringer,
 * suppleret med borgerens egen vurdering, leverandørens faglige vurdering og anbefalinger.
 */

export const STATUS_REPORT_SECTION_KEYS = [
  'indsatsformaal',
  'maal',
  'funktionsevne',
  'aendringer',
  'borgerens_vurdering',
  'faglig_vurdering',
  'anbefalinger',
] as const;

export type StatusReportSectionKey = (typeof STATUS_REPORT_SECTION_KEYS)[number];

export type StatusReportSections = Partial<Record<StatusReportSectionKey, string>>;

export type StatusReportSectionDefinition = {
  key: StatusReportSectionKey;
  title: string;
  help: string;
  /** Kan BUDR skrive et udkast ud fra data? */
  aiDraft: boolean;
  /** Afsnitsspecifik instruks til modellen. */
  instruction?: string;
};

export const STATUS_REPORT_SECTIONS: readonly StatusReportSectionDefinition[] = [
  {
    key: 'indsatsformaal',
    title: 'Indsatsformål',
    help: 'Formålet med indsatsen, som kommunen har fastsat i bestillingen. Udfyldes fra VUM, hvis det findes.',
    aiDraft: false,
  },
  {
    key: 'maal',
    title: 'Status på indsatsmål og delmål',
    help: 'Hvordan der er arbejdet med hvert mål, hvad der virkede, og om målet er opfyldt.',
    aiDraft: true,
    instruction: `Skriv status på hvert indsatsmål/delmål i kildematerialet (VUM-mål og aftalte næste skridt).
For hvert mål: start en linje med "Mål: <målet>". Beskriv derefter kort hvordan der er arbejdet med målet i perioden, hvad der har virket og hvad der ikke har, og slut med "Vurdering: Opfyldt", "Vurdering: Delvist opfyldt", "Vurdering: Ikke opfyldt" eller "Vurdering: For tidligt at vurdere".
Hvis der ikke findes mål i kilden, skriv "[Udfyldes af personalet: indsatsmål fra bestillingen mangler i BUDR]".`,
  },
  {
    key: 'funktionsevne',
    title: 'Beskrivelse af funktionsevne',
    help: 'Kun de VUM-temaer der er relevante, med funktionsniveau og hvad borgeren klarer selv og med støtte.',
    aiDraft: true,
    instruction: `Beskriv borgerens funktionsevne for de VUM-temaer, hvor kildematerialet har noter, niveau eller relevante observationer.
For hvert tema: start en linje med "<Tema> – <niveau>" (brug niveauet fra VUM, hvis det findes, ellers "niveau ikke vurderet"). Beskriv derefter konkret hvad borgeren klarer selv, hvad borgeren klarer med støtte, og hvilken støtte der virker.
Udelad temaer uden oplysninger.`,
  },
  {
    key: 'aendringer',
    title: 'Væsentlige ændringer siden sidste opfølgning',
    help: 'Ændringer i trivsel, helbred, medicin, netværk, bolig eller hændelser.',
    aiDraft: true,
    instruction: `Beskriv væsentlige ændringer i perioden: trivsel og stemning over tid (brug check-in-tallene), bekymringer og hændelser, kriser, ændringer i medicin, søvn, netværk og hverdag.
Skriv kronologisk eller samlet efter emne. Nævn konkrete datoer eller måneder, hvor det giver mening. Hvis perioden har været stabil, så skriv det.`,
  },
  {
    key: 'borgerens_vurdering',
    title: 'Borgerens egen vurdering',
    help: 'Borgerens egne ord om forløbet og ønsker for fremtiden. Gennemgås med borgeren før afsendelse.',
    aiDraft: true,
    instruction: `Gengiv borgerens egen oplevelse af perioden ud fra borgerens egne tekster (check-ins, noter til næste skridt). Brug borgerens egne ord i citationstegn, hvor det er muligt. Fortolk ikke ud over hvad borgeren selv har skrevet.
Slut altid med linjen "[Gennemgås med borgeren før afsendelse]".`,
  },
  {
    key: 'faglig_vurdering',
    title: 'Leverandørens faglige vurdering',
    help: 'Samlet vurdering af udvikling, ressourcer, risici og potentiale.',
    aiDraft: true,
    instruction: `Skriv botilbuddets samlede faglige vurdering af perioden: udvikling, borgerens ressourcer, hvad der stadig er svært, eventuelle risici, og borgerens potentiale for yderligere udvikling. Vær nuanceret og recovery-orienteret: fremhæv både fremskridt og behov.`,
  },
  {
    key: 'anbefalinger',
    title: 'Anbefalinger til fremtidig indsats',
    help: 'Fortsæt, juster eller afslut indsatsen. Forslag til nye eller reviderede delmål.',
    aiDraft: true,
    instruction: `Skriv botilbuddets anbefalinger til den fremtidige indsats: om indsatsen bør fortsætte uændret, justeres eller ændres i omfang, og forslag til 2–4 nye eller reviderede delmål formuleret konkret og målbart (som punktopstilling med "- ").
Anbefal ikke ændring af paragraf eller ophør, medmindre kildematerialet tydeligt peger på det; skriv i så fald forbeholdet "[Personalet tager stilling]".`,
  },
];

export function getStatusReportSection(key: string): StatusReportSectionDefinition | undefined {
  return STATUS_REPORT_SECTIONS.find((s) => s.key === key);
}

export function isStatusReportSectionKey(key: unknown): key is StatusReportSectionKey {
  return typeof key === 'string' && (STATUS_REPORT_SECTION_KEYS as readonly string[]).includes(key);
}

/** Fjerner ukendte nøgler og ikke-tekst; begrænser længde pr. afsnit. */
export function sanitizeSections(raw: unknown, maxLen = 12000): StatusReportSections {
  if (typeof raw !== 'object' || raw === null || Array.isArray(raw)) return {};
  const out: StatusReportSections = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (isStatusReportSectionKey(k) && typeof v === 'string') {
      out[k] = v.slice(0, maxLen);
    }
  }
  return out;
}
