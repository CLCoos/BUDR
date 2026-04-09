export type HeroVariantId = 'A' | 'B';

export type HeroVariantCopy = {
  title_html: string;
  cta: string;
  pilot_link: string;
};

export type InstitutionerHeroCopyPayload = {
  variant: HeroVariantId;
  A: HeroVariantCopy;
  B: HeroVariantCopy;
};

export const DEFAULT_INSTITUTIONER_HERO_COPY: InstitutionerHeroCopyPayload = {
  variant: 'B',
  A: {
    title_html: '<em>Kom hurtigt i gang</em> — fra overblik til tryg pilot',
    cta: 'Book en kort afklaring',
    pilot_link: 'Se pilotpakken: leverancer, opstart og næste skridt →',
  },
  B: {
    title_html: '<em>Skab ro i driften</em> — fra første overblik til målbar pilot',
    cta: 'Få et konkret pilotoplæg',
    pilot_link: 'Se pilotpakken: mål, leverancer og forventet effekt →',
  },
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null;
}

function cleanText(v: unknown, fallback: string): string {
  if (typeof v !== 'string') return fallback;
  const trimmed = v.trim();
  return trimmed.length > 0 ? trimmed : fallback;
}

function cleanVariant(v: unknown, fallback: HeroVariantId): HeroVariantId {
  return v === 'A' || v === 'B' ? v : fallback;
}

function cleanVariantCopy(v: unknown, fallback: HeroVariantCopy): HeroVariantCopy {
  if (!isRecord(v)) return fallback;
  return {
    title_html: cleanText(v.title_html, fallback.title_html),
    cta: cleanText(v.cta, fallback.cta),
    pilot_link: cleanText(v.pilot_link, fallback.pilot_link),
  };
}

export function sanitizeInstitutionerHeroCopy(input: unknown): InstitutionerHeroCopyPayload {
  if (!isRecord(input)) return DEFAULT_INSTITUTIONER_HERO_COPY;
  return {
    variant: cleanVariant(input.variant, DEFAULT_INSTITUTIONER_HERO_COPY.variant),
    A: cleanVariantCopy(input.A, DEFAULT_INSTITUTIONER_HERO_COPY.A),
    B: cleanVariantCopy(input.B, DEFAULT_INSTITUTIONER_HERO_COPY.B),
  };
}
