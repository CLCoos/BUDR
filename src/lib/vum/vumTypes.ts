import type { ChimeDomain } from '@/types/lys';

/** VUM 2.0 function level 0–4 (Socialstyrelsen skala). */
export type VumFunctionLevel = 0 | 1 | 2 | 3 | 4;

export type VumAssessmentStatus = 'draft' | 'active' | 'archived';

export type VumThemePayload = {
  notes?: string;
  /** inspiration prompt id → staff/borger svar */
  inspiration?: Record<string, string>;
  level?: VumFunctionLevel;
  updated_at?: string;
};

export type VumGoal = {
  id: string;
  title: string;
  description?: string;
  theme_numbers: number[];
  target_date?: string;
  status: 'aktiv' | 'fuldført' | 'sat på pause' | 'annulleret';
  linked_next_step_id?: string;
};

export type VumAssessmentRow = {
  id: string;
  org_id: string;
  resident_id: string;
  status: VumAssessmentStatus;
  case_opened_at: string;
  case_opened_by: string | null;
  referral_source: string | null;
  case_purpose: string | null;
  theme_1_physical: VumThemePayload;
  theme_2_mental: VumThemePayload;
  theme_3_health_social: VumThemePayload;
  theme_4_communication: VumThemePayload;
  theme_5_practical: VumThemePayload;
  theme_6_selfcare: VumThemePayload;
  theme_7_mobility: VumThemePayload;
  theme_8_relationships: VumThemePayload;
  theme_9_society: VumThemePayload;
  theme_10_personal: VumThemePayload;
  theme_11_environment: VumThemePayload;
  function_levels: Record<string, VumFunctionLevel>;
  goals: VumGoal[];
  last_followup_at: string | null;
  next_followup_due_at: string | null;
  created_at: string;
  updated_at: string;
};

export const VUM_THEME_COLUMN_NAMES = [
  'theme_1_physical',
  'theme_2_mental',
  'theme_3_health_social',
  'theme_4_communication',
  'theme_5_practical',
  'theme_6_selfcare',
  'theme_7_mobility',
  'theme_8_relationships',
  'theme_9_society',
  'theme_10_personal',
  'theme_11_environment',
] as const;

export type VumThemeColumnName = (typeof VUM_THEME_COLUMN_NAMES)[number];

export function themeColumnForNumber(themeNumber: number): VumThemeColumnName | null {
  if (themeNumber < 1 || themeNumber > 11) return null;
  return VUM_THEME_COLUMN_NAMES[themeNumber - 1];
}

export function parseThemePayload(raw: unknown): VumThemePayload {
  if (typeof raw !== 'object' || raw === null) return {};
  const o = raw as Record<string, unknown>;
  const level = o.level;
  const parsedLevel =
    typeof level === 'number' && level >= 0 && level <= 4 ? (level as VumFunctionLevel) : undefined;
  const inspiration =
    typeof o.inspiration === 'object' && o.inspiration !== null
      ? Object.fromEntries(
          Object.entries(o.inspiration as Record<string, unknown>).filter(
            (entry): entry is [string, string] => typeof entry[1] === 'string'
          )
        )
      : undefined;
  return {
    notes: typeof o.notes === 'string' ? o.notes : undefined,
    inspiration,
    level: parsedLevel,
    updated_at: typeof o.updated_at === 'string' ? o.updated_at : undefined,
  };
}

export function syncFunctionLevelsFromThemes(
  assessment: Pick<VumAssessmentRow, VumThemeColumnName>
): Record<string, VumFunctionLevel> {
  const out: Record<string, VumFunctionLevel> = {};
  VUM_THEME_COLUMN_NAMES.forEach((col, index) => {
    const level = parseThemePayload(assessment[col]).level;
    if (level !== undefined) {
      out[String(index + 1)] = level;
    }
  });
  return out;
}

export type ChimeToVumMappingRow = {
  chime_dimension: ChimeDomain;
  vum_theme_number: number;
  weight: number;
};
