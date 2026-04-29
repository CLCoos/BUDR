export type SafetyClassification = {
  risk_level: 'none' | 'elevated' | 'acute';
  category: string;
  reasoning: string;
};

const SAFETY_SYSTEM_PROMPT = `Du er en safety-klassifikator for et AI-system der taler med beboere på socialpsykiatriske bosteder. Din eneste opgave er at vurdere risikoniveauet i borgerens ytring.

Returnér KUN JSON i dette format:
{"risk_level": "none|elevated|acute", "category": "suicidalitet|selvskade|vold|psykose|overgreb|medicin_misbrug|none|other", "reasoning": "kort dansk forklaring, max 1 sætning"}

Definitioner:
- acute: Borgeren udtrykker konkret intention, plan eller umiddelbar handling. Eksempler: 'jeg vil tage mit liv i aften', 'jeg har pillerne klar', 'jeg slår ham ihjel når han kommer', 'stemmerne siger jeg skal springe ud'.
- elevated: Borgeren udtrykker svære tanker, impulser eller forværring uden konkret plan. Eksempler: 'jeg orker ikke mere', 'jeg har det sort indeni', 'jeg har lyst til at skære', 'de overvåger mig igen'.
- none: Almindelig samtale, hverdagsbekymringer, normal tristhed eller frustration uden krisesprog.

Vær varsom: tvivl trækker OPAD i risikoniveau, ikke nedad. Hvis du er i tvivl mellem none og elevated, vælg elevated. Hvis du er i tvivl mellem elevated og acute, vælg acute.

Returnér intet andet end JSON. Ingen forklaring uden for JSON. Ingen markdown.`;

const FALLBACK_CLASSIFICATION: SafetyClassification = {
  risk_level: 'elevated',
  category: 'other',
  reasoning: 'klassifikator-fejl, eskaleret som forholdsregel',
};

function normalizeRiskLevel(value: unknown): SafetyClassification['risk_level'] {
  if (value === 'none' || value === 'elevated' || value === 'acute') return value;
  return 'elevated';
}

function normalizeCategory(value: unknown): string {
  const allowed = new Set([
    'suicidalitet',
    'selvskade',
    'vold',
    'psykose',
    'overgreb',
    'medicin_misbrug',
    'none',
    'other',
  ]);
  const category = typeof value === 'string' ? value.trim() : '';
  if (!category) return 'other';
  return allowed.has(category) ? category : 'other';
}

function normalizeReasoning(value: unknown): string {
  const reasoning = typeof value === 'string' ? value.trim() : '';
  if (!reasoning) return FALLBACK_CLASSIFICATION.reasoning;
  return reasoning.slice(0, 300);
}

function parseModelJson(rawText: string): SafetyClassification {
  try {
    const parsed = JSON.parse(rawText) as {
      risk_level?: unknown;
      category?: unknown;
      reasoning?: unknown;
    };
    return {
      risk_level: normalizeRiskLevel(parsed.risk_level),
      category: normalizeCategory(parsed.category),
      reasoning: normalizeReasoning(parsed.reasoning),
    };
  } catch {
    const firstBrace = rawText.indexOf('{');
    const lastBrace = rawText.lastIndexOf('}');
    if (firstBrace >= 0 && lastBrace > firstBrace) {
      const maybeJson = rawText.slice(firstBrace, lastBrace + 1);
      try {
        const parsed = JSON.parse(maybeJson) as {
          risk_level?: unknown;
          category?: unknown;
          reasoning?: unknown;
        };
        return {
          risk_level: normalizeRiskLevel(parsed.risk_level),
          category: normalizeCategory(parsed.category),
          reasoning: normalizeReasoning(parsed.reasoning),
        };
      } catch {
        return FALLBACK_CLASSIFICATION;
      }
    }
    return FALLBACK_CLASSIFICATION;
  }
}

export async function classifyUtterance(
  utterance: string,
  signal?: AbortSignal
): Promise<SafetyClassification> {
  const key = process.env.ANTHROPIC_API_KEY?.trim();
  if (!key || !utterance.trim()) return FALLBACK_CLASSIFICATION;

  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
      },
      signal,
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 150,
        system: SAFETY_SYSTEM_PROMPT,
        messages: [{ role: 'user', content: utterance }],
      }),
    });

    if (!res.ok) {
      const err = await res.text().catch(() => '');
      console.error('[lys/safetyClassifier] anthropic', res.status, err.slice(0, 300));
      return FALLBACK_CLASSIFICATION;
    }

    const data = (await res.json()) as {
      content?: Array<{ type?: string; text?: string }>;
    };
    const text = data.content?.find((c) => c.type === 'text')?.text?.trim() ?? '';
    if (!text) return FALLBACK_CLASSIFICATION;
    return parseModelJson(text);
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      console.warn('[lys/safetyClassifier] aborted (timeout)');
    } else {
      console.error('[lys/safetyClassifier] error', error);
    }
    return FALLBACK_CLASSIFICATION;
  }
}
