export type VumThemeCategory = 'functions' | 'activity' | 'environment';

export type VumInspirationPrompt = {
  id: string;
  label: string;
};

export type VumThemeDefinition = {
  number: number;
  slug: string;
  title: string;
  category: VumThemeCategory;
  categoryLabel: string;
  shortDescription: string;
  inspirationPrompts: VumInspirationPrompt[];
};

export const VUM_FUNCTION_LEVEL_LABELS: Record<number, string> = {
  0: 'Ingen væsentlige problemer',
  1: 'Let problemer',
  2: 'Moderate problemer',
  3: 'Alvorlige problemer',
  4: 'Fuldstændig problem',
};

export const VUM_THEME_CATEGORY_LABELS: Record<VumThemeCategory, string> = {
  functions: 'Funktioner og forhold',
  activity: 'Aktivitet og deltagelse',
  environment: 'Omgivelsesfaktorer',
};

export const VUM_THEMES: readonly VumThemeDefinition[] = [
  {
    number: 1,
    slug: 'physical',
    title: 'Fysiske funktioner',
    category: 'functions',
    categoryLabel: VUM_THEME_CATEGORY_LABELS.functions,
    shortDescription: 'Mobilitet, syn, hørelse og andre fysiske funktioner.',
    inspirationPrompts: [
      { id: 'mobility', label: 'Hvordan påvirker fysiske begrænsninger borgerens hverdag?' },
      { id: 'aids', label: 'Bruger borgeren hjælpemidler — og hvordan fungerer det?' },
    ],
  },
  {
    number: 2,
    slug: 'mental',
    title: 'Mentale funktioner',
    category: 'functions',
    categoryLabel: VUM_THEME_CATEGORY_LABELS.functions,
    shortDescription: 'Kognition, hukommelse, opmærksomhed og koncentration.',
    inspirationPrompts: [
      { id: 'cognition', label: 'Hvordan oplever borgeren egen hukommelse og koncentration?' },
      { id: 'stress', label: 'Hvornår er det sværest at holde fokus eller træffe valg?' },
    ],
  },
  {
    number: 3,
    slug: 'health_social',
    title: 'Sociale og sundhedsmæssige forhold',
    category: 'functions',
    categoryLabel: VUM_THEME_CATEGORY_LABELS.functions,
    shortDescription: 'Psykisk lidelse, somatik, misbrug og relaterede forhold.',
    inspirationPrompts: [
      {
        id: 'diagnosis',
        label: 'Hvilke diagnoser eller helbredsforhold er relevante for indsatsen?',
      },
      { id: 'treatment', label: 'Hvordan samarbejder borgeren med behandlere uden for bostedet?' },
    ],
  },
  {
    number: 4,
    slug: 'communication',
    title: 'Kommunikation',
    category: 'activity',
    categoryLabel: VUM_THEME_CATEGORY_LABELS.activity,
    shortDescription: 'Sprog, samtale, læsning og skrivning.',
    inspirationPrompts: [
      { id: 'express', label: 'Hvordan udtrykker borgeren behov og følelser over for personalet?' },
      { id: 'understand', label: 'Hvor let forstår borgeren mundtlig og skriftlig information?' },
    ],
  },
  {
    number: 5,
    slug: 'practical',
    title: 'Praktiske opgaver',
    category: 'activity',
    categoryLabel: VUM_THEME_CATEGORY_LABELS.activity,
    shortDescription: 'Madlavning, rengøring, indkøb og økonomi i hverdagen.',
    inspirationPrompts: [
      { id: 'daily', label: 'Hvilke praktiske opgaver mestrer borgeren selv?' },
      { id: 'support', label: 'Hvor har borgeren brug for støtte fra personalet?' },
    ],
  },
  {
    number: 6,
    slug: 'selfcare',
    title: 'Egenomsorg',
    category: 'activity',
    categoryLabel: VUM_THEME_CATEGORY_LABELS.activity,
    shortDescription: 'Personlig hygiejne, påklædning, mad og drikke.',
    inspirationPrompts: [
      { id: 'hygiene', label: 'Hvordan fungerer personlig hygiejne og påklædning?' },
      { id: 'nutrition', label: 'Hvordan er borgerens spise- og drikkevaner?' },
    ],
  },
  {
    number: 7,
    slug: 'mobility',
    title: 'Mobilitet',
    category: 'activity',
    categoryLabel: VUM_THEME_CATEGORY_LABELS.activity,
    shortDescription: 'Bevægelse i hjemmet, transport og brug af hjælpemidler.',
    inspirationPrompts: [
      { id: 'home', label: 'Hvordan bevæger borgeren sig på afdelingen?' },
      { id: 'community', label: 'Deltager borgeren i aktiviteter uden for bostedet?' },
    ],
  },
  {
    number: 8,
    slug: 'relationships',
    title: 'Relationer til andre',
    category: 'activity',
    categoryLabel: VUM_THEME_CATEGORY_LABELS.activity,
    shortDescription: 'Familie, venner, fællesskaber og intimitet.',
    inspirationPrompts: [
      { id: 'network', label: 'Hvem er vigtige relationer i borgerens netværk?' },
      { id: 'conflict', label: 'Hvordan håndteres konflikter eller ensomhed?' },
    ],
  },
  {
    number: 9,
    slug: 'society',
    title: 'Samfundsliv',
    category: 'activity',
    categoryLabel: VUM_THEME_CATEGORY_LABELS.activity,
    shortDescription: 'Uddannelse, arbejde, økonomi og frivilligt arbejde.',
    inspirationPrompts: [
      {
        id: 'participation',
        label: 'Hvilke sociale eller faglige aktiviteter deltager borgeren i?',
      },
      { id: 'economy', label: 'Hvordan håndteres økonomi og myndighedskontakt?' },
    ],
  },
  {
    number: 10,
    slug: 'personal',
    title: 'Personlige faktorer',
    category: 'environment',
    categoryLabel: VUM_THEME_CATEGORY_LABELS.environment,
    shortDescription: 'Motivation, livsstil, ønsker, håb og drømme.',
    inspirationPrompts: [
      { id: 'hope', label: 'Hvad giver borgeren håb og retning fremad?' },
      { id: 'values', label: 'Hvilke værdier og styrker er centrale i recovery?' },
    ],
  },
  {
    number: 11,
    slug: 'environment',
    title: 'Omgivelsesfaktorer',
    category: 'environment',
    categoryLabel: VUM_THEME_CATEGORY_LABELS.environment,
    shortDescription: 'Bolig, netværk, økonomi og tilgængelige services.',
    inspirationPrompts: [
      { id: 'housing', label: 'Hvordan understøtter boligen borgerens trivsel?' },
      { id: 'services', label: 'Hvilke eksterne tilbud og services er i spil?' },
    ],
  },
] as const;

export function getVumTheme(number: number): VumThemeDefinition | undefined {
  return VUM_THEMES.find((t) => t.number === number);
}
