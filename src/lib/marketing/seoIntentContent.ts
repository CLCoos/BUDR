import type { Metadata } from 'next';

export type SeoIntentBlock = {
  title: string;
  paragraphs: string[];
};

export type SeoIntentRelated = {
  href: string;
  label: string;
};

export type SeoIntentDefinition = {
  path: string;
  formSource: string;
  meta: Metadata;
  h1: string;
  lead: string;
  blocks: SeoIntentBlock[];
  related: SeoIntentRelated[];
};

/** Indhold og metadata til SEO-landingssider for botilbud/kommune. */
export const SEO_INTENT_BY_PATH: Record<string, SeoIntentDefinition> = {
  '/for-botilbud/journal-og-digital-tilsyn': {
    path: '/for-botilbud/journal-og-digital-tilsyn',
    formSource: 'seo_journal_digital_tilsyn',
    meta: {
      title: 'Digitalt tilsyn og journal i botilbud | BUDR Care',
      description:
        'Sådan understøtter I digitalt tilsyn og journal i botilbud: kladde og godkendelse, overblik for ledelse og vagt, og sporbar dokumentation — med BUDR Care og Care Portal.',
      openGraph: {
        title: 'Journal og digitalt tilsyn til botilbud',
        description:
          'Fælles journalflow, godkendelse og overblik — til socialpsykiatriske og beslægtede botilbud.',
      },
    },
    h1: 'Digitalt tilsyn og journal i botilbud — uden papirsporet',
    lead: 'Kommuner og botilbud bliver målt på dokumentation og kvalitet. Her samler vi, hvordan et moderne journal- og tilsynsflow kan se ud, når **digitalisering** skal gavne borgeren og personalet — ikke blot flytte PDF’er.',
    blocks: [
      {
        title: 'Hvad ledelser og kommuner typisk søger efter',
        paragraphs: [
          'Ved søgninger som “digitalt tilsyn” og “journal botilbud” ligger behovet ofte i tre lag: **tryghed for borgeren**, **sporbarhed for tilsyn** og **arbejdsgange teamet faktisk bruger** på tværs af vagter.',
          'Uden fælles status på journalnotater risikerer I, at digitalt tilsyn bliver reaktivt — først når ting går galt. Med tydelig **kladde- og godkendelsesmodel** ved I, hvad der er udkast, og hvad der er besluttet dokumentation.',
        ],
      },
      {
        title: 'Sådan støtter BUDR Care det praktisk',
        paragraphs: [
          '**Care Portal** giver overblik over borgere, journal og opgaver ét sted. Journal kan håndteres som kladde eller godkendt, så overdragelse og ledelsesdialog bygger på den samme version af sandheden.',
          'Kombinationen med **Lys** (borgerens app) betyder, at humør, tjek-in og egne notater kan kobles til teamets overblik — uden at digitalisering bliver et sideløbende system personalet skal “huske at tjekke”.',
        ],
      },
      {
        title: 'Næste skridt: demo eller pilot',
        paragraphs: [
          'Vi anbefaler, at I ser **demoen** af Care Portal og derefter taler pilot og succesmål med jeres DPO/IT. Brug formularen nedenfor — så ved vi, at henvendelsen kom fra denne side om digitalt tilsyn og journal.',
        ],
      },
    ],
    related: [
      {
        href: '/for-botilbud/varsling-socialpsykiatri',
        label: 'Varsling og tidlig indsats i socialpsykiatrien',
      },
      {
        href: '/for-botilbud/plan-og-medicinoverblik',
        label: 'Dagsplan og medicinoverblik på botilbud',
      },
    ],
  },
  '/for-botilbud/varsling-socialpsykiatri': {
    path: '/for-botilbud/varsling-socialpsykiatri',
    formSource: 'seo_varsling_socialpsykiatri',
    meta: {
      title: 'Varsling i socialpsykiatrien — tidligt overblik | BUDR Care',
      description:
        'Varsling og proaktiv opfølgning i socialpsykiatrien: trafiklys, tjek-in og fælles overblik i Care Portal — før situationer eskalerer.',
      openGraph: {
        title: 'Varsling og overblik i socialpsykiatrien',
        description:
          'Fra borgerens signaler til teamets handling — med struktureret varsling og journal.',
      },
    },
    h1: 'Varsling i socialpsykiatrien — når timing er alt',
    lead: 'Søgninger som **“varsling socialpsykiatri”** handler ofte om at fange forandringer tidligt: når humør, søvn eller tryghed ændrer sig, skal teamet kunne handle koordineret — ikke først når krisen er synlig for alle.',
    blocks: [
      {
        title: 'Fra signal til fælles handling',
        paragraphs: [
          'Varsling forudsætter **ensartet indsamling** (fx struktureret tjek-in) og **et sted**, hvor signaler bliver til overblik — uden at personalet skal lede i tre systemer.',
          'I BUDR Care kan borgeren give egne signaler via **Lys**, mens **Care Portal** samler overblik, opgaver og dokumentation. Varsling bliver dermed et led i hverdagen, ikke en ekstra rapport.',
        ],
      },
      {
        title: 'Pas godt på persondata og faglighed',
        paragraphs: [
          'Varsling må ikke blive “overvågning”. Teknisk og organisatorisk skal adgang være begrænset til relevant personale, og dokumentation skal understøtte **faglige beslutninger** — derfor arbejder vi med klare roller, godkendt journal og organisationsscoping.',
        ],
      },
      {
        title: 'Prøv flowet i demo eller pilot',
        paragraphs: [
          'Book eller skriv via formularen — vi tager udgangspunkt i jeres mål for **varsling** og **tidlig indsats**, og viser, hvordan produktet understøtter dem.',
        ],
      },
    ],
    related: [
      {
        href: '/for-botilbud/journal-og-digital-tilsyn',
        label: 'Digitalt tilsyn og journal i botilbud',
      },
      {
        href: '/for-botilbud/plan-og-medicinoverblik',
        label: 'Plan og medicinoverblik',
      },
    ],
  },
  '/for-botilbud/plan-og-medicinoverblik': {
    path: '/for-botilbud/plan-og-medicinoverblik',
    formSource: 'seo_plan_medicin_overblik',
    meta: {
      title: 'Plan og medicinoverblik i botilbud | BUDR Care',
      description:
        'Dagsplan, medicin og overblik for socialpsykiatriske botilbud: ét sted for personalet — med Care Portal og borgerens Lys.',
      openGraph: {
        title: 'Plan og medicinoverblik til botilbud',
        description:
          'Koordinér plan, medicin og borgerens hverdag med fælles portal og tydelig dokumentation.',
      },
    },
    h1: 'Plan og medicinoverblik på botilbud — ét fælles ståsted',
    lead: 'Når I søger efter **plan og medicinoverblik botilbud**, er målet typisk mindre friktion i hverdagen: færre løse lister, tydeligere ansvar på vagten og bedre overdragelse mellem kolleger.',
    blocks: [
      {
        title: 'Hvor plan og medicin ofte knækker',
        paragraphs: [
          'Medicin og dagsplan lever ofte side om side i forskellige værktøjer. Det giver risiko for, at **borgerens dag** og **lægefaglige beslutninger** ikke er synkroniserede, når vagten skifter.',
          'Ledelse og kommune skal samtidig kunne se, at indsatser er sammenhængende — uden at personalet bruger tid på dobbeltregistrering.',
        ],
      },
      {
        title: 'Hvordan BUDR Care samler trådene',
        paragraphs: [
          '**Care Portal** er bygget til overblik over borgere, planer, medicin og dokumentation. **360°-visningen** samler typisk det, teamet skal vide ved vagtskifte.',
          'Med **Lys** kan borgeren deltage i egen struktur (tjek-in, humør), så planen ikke kun er noget “personalet har besluttet”, men noget der kan mærkes i hverdagen.',
        ],
      },
      {
        title: 'Kom godt i gang',
        paragraphs: [
          'Brug **Care Portal-demoen** for et hurtigt indtryk, eller skriv til os om **pilot** med konkrete succeskriterier for plan og medicindialog på jeres botilbud.',
        ],
      },
    ],
    related: [
      {
        href: '/for-botilbud/journal-og-digital-tilsyn',
        label: 'Journal og digitalt tilsyn',
      },
      {
        href: '/for-botilbud/varsling-socialpsykiatri',
        label: 'Varsling i socialpsykiatrien',
      },
    ],
  },
};

export const SEO_INTENT_PATHS = Object.keys(SEO_INTENT_BY_PATH) as readonly string[];

export function getSeoIntent(path: string): SeoIntentDefinition | undefined {
  return SEO_INTENT_BY_PATH[path];
}
