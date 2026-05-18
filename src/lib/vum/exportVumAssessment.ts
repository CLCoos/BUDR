import { VUM_THEMES } from '@/lib/vum/vumThemes';
import {
  parseThemePayload,
  syncFunctionLevelsFromThemes,
  type VumAssessmentRow,
  type VumThemeColumnName,
  VUM_THEME_COLUMN_NAMES,
} from '@/lib/vum/vumTypes';

export type VumExportJson = {
  format: 'budr-vum-2.0';
  version: 1;
  exported_at: string;
  resident_id: string;
  org_id: string;
  assessment_id: string;
  status: string;
  case: {
    opened_at: string;
    referral_source: string | null;
    purpose: string | null;
  };
  themes: {
    number: number;
    title: string;
    category: string;
    function_level: number | null;
    notes: string | null;
    inspiration: Record<string, string>;
  }[];
  goals: VumAssessmentRow['goals'];
  function_levels: Record<string, number>;
};

export function buildVumExportJson(assessment: VumAssessmentRow): VumExportJson {
  const functionLevels = syncFunctionLevelsFromThemes(assessment);

  const themes = VUM_THEMES.map((def) => {
    const col = VUM_THEME_COLUMN_NAMES[def.number - 1] as VumThemeColumnName;
    const payload = parseThemePayload(assessment[col]);
    return {
      number: def.number,
      title: def.title,
      category: def.categoryLabel,
      function_level: payload.level ?? functionLevels[String(def.number)] ?? null,
      notes: payload.notes ?? null,
      inspiration: payload.inspiration ?? {},
    };
  });

  return {
    format: 'budr-vum-2.0',
    version: 1,
    exported_at: new Date().toISOString(),
    resident_id: assessment.resident_id,
    org_id: assessment.org_id,
    assessment_id: assessment.id,
    status: assessment.status,
    case: {
      opened_at: assessment.case_opened_at,
      referral_source: assessment.referral_source,
      purpose: assessment.case_purpose,
    },
    themes,
    goals: assessment.goals,
    function_levels: functionLevels,
  };
}
