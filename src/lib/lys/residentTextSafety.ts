/**
 * Fælles tjek for krisetegn i alt, hvad en borger skriver i Lys: tjek-ind, dagbog, stemmedagbog,
 * beskeder til personalet og Lys-samtaler. Ved tegn på risiko oprettes en hændelse i
 * `lys_safety_events`, som personalet ser i portalen, og ruten kan bede Lys om at vise hjælp.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import { classifyUtterance, type SafetyClassification } from '@/lib/lys/safetyClassifier';
import type { SafetySource } from '@/lib/lys/safetySources';

export type { SafetySource };

/** Står i hændelsen i stedet for teksten, når borgeren har skrevet privat. */
export const PRIVATE_TEXT_PLACEHOLDER =
  'Skrevet i borgerens private dagbog. Teksten vises ikke for personalet.';

export type SafetyResult = Pick<SafetyClassification, 'risk_level' | 'category'>;

const NONE: SafetyClassification = { risk_level: 'none', category: 'none', reasoning: '' };
const TIMEOUT_MS = 5000;

// Bruges kun, når klassifikatoren ikke svarer, så et AI-nedbrud hverken skjuler krisetegn
// eller sender en besked til personalet for hvert eneste tjek-ind.
const KRISEORD = [
  /\b(tage|tog) mit (eget )?liv\b/i,
  /\bslå mig selv ihjel\b/i,
  /\bselvmord/i,
  /\b(vil|ville|skal) (bare )?dø\b/i,
  /\bikke (vil|gider) leve\b/i,
  /\borker ikke (mere|at leve)\b/i,
  /\bsove for evigt\b/i,
  /\bskære i mig\b/i,
  /\bskade mig selv\b/i,
  /\b(slå|slår) (ham|hende|dem|nogen) ihjel\b/i,
  /\bpillerne (er )?klar\b/i,
  /\bstemmerne siger\b/i,
];

export function kriseordIRisiko(text: string): SafetyClassification {
  return KRISEORD.some((re) => re.test(text))
    ? {
        risk_level: 'elevated',
        category: 'other',
        reasoning: 'klassifikator svarede ikke; kriseord fundet i teksten',
      }
    : NONE;
}

async function classifyWithTimeout(text: string): Promise<SafetyClassification> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const result = await classifyUtterance(text, controller.signal);
    // classifyUtterance svarer "elevated/other" som forholdsregel, når den fejler.
    if (result.category === 'other' && result.reasoning.startsWith('klassifikator-fejl')) {
      return kriseordIRisiko(text);
    }
    return result;
  } catch {
    return kriseordIRisiko(text);
  } finally {
    clearTimeout(timer);
  }
}

export async function checkResidentText(opts: {
  supabase: SupabaseClient;
  residentId: string;
  orgId: string | null;
  text: string;
  source: SafetySource;
  conversationId?: string | null;
  /**
   * Fra hvilket niveau personalet får en hændelse. Borgeren får altid hjælp i Lys ved risiko.
   * Standard er "elevated"; den private dagbog bruger et højere niveau eller "never".
   */
  alertStaffFrom?: 'elevated' | 'acute' | 'never';
  /** Til test: erstatter AI-klassifikatoren. */
  classify?: (text: string) => Promise<SafetyClassification>;
}): Promise<SafetyResult> {
  const text = opts.text.trim();
  if (!text) return { risk_level: 'none', category: 'none' };

  const classification = await (opts.classify ?? classifyWithTimeout)(text);
  if (classification.risk_level === 'none') return { risk_level: 'none', category: 'none' };
  const result = { risk_level: classification.risk_level, category: classification.category };

  const from = opts.alertStaffFrom ?? 'elevated';
  if (from === 'never' || (from === 'acute' && classification.risk_level !== 'acute')) {
    return result;
  }

  const row = {
    resident_id: opts.residentId,
    organisation_id: opts.orgId,
    conversation_id: opts.conversationId ?? null,
    risk_level: classification.risk_level,
    category: classification.category,
    reasoning: opts.source === 'privat_dagbog' ? null : classification.reasoning,
    user_utterance: opts.source === 'privat_dagbog' ? PRIVATE_TEXT_PLACEHOLDER : text,
    source: opts.source,
  };
  let { error } = await opts.supabase.from('lys_safety_events').insert(row);
  if (error && /source/i.test(error.message)) {
    // Kolonnen findes ikke endnu (migrationen er ikke kørt): gem uden kilde.
    const { source: _source, ...withoutSource } = row;
    void _source;
    ({ error } = await opts.supabase.from('lys_safety_events').insert(withoutSource));
  }
  if (error) console.error('[residentTextSafety] insert failed', error.message);

  return result;
}
