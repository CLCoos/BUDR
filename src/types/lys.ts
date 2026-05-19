// BUDR: Lys/Recovery domænemodel
// Faglig forankring: Recovery-orienteret praksis med CHIME-rammeværk
// (Connectedness, Hope, Identity, Meaning, Empowerment)

// ─── Grundlæggende typer ───────────────────────────────
export type TrafficLight = 'grøn' | 'gul' | 'rød';
export type ChimeDomain = 'connectedness' | 'hope' | 'identity' | 'meaning' | 'empowerment';
export type CheckinType = 'daily' | 'weekly';
export type NextStepStatus = 'aktiv' | 'fuldført' | 'sat på pause' | 'annulleret';
export type CreatedByType = 'resident' | 'staff';
/** Alias for lys_next_steps.created_by_type */
export type NextStepCreatedByType = CreatedByType;
export type SafetyRiskLevel = 'none' | 'elevated' | 'acute';
export type SafetyCategory =
  | 'suicidalitet'
  | 'selvskade'
  | 'vold'
  | 'psykose'
  | 'overgreb'
  | 'medicin_misbrug'
  | 'none'
  | 'other';

// ─── CHIME-mapping til UI ──────────────────────────────
// Borger ser ALDRIG CHIME-ordet — kun varme hverdagsspørgsmål.
// Medarbejder ser danske CHIME-labels i Care Portal.

export const CHIME_LABELS_DA: Record<ChimeDomain, string> = {
  connectedness: 'Forbundethed',
  hope: 'Håb',
  identity: 'Identitet',
  meaning: 'Mening',
  empowerment: 'Handlekraft',
};

export const CHIME_RESIDENT_LANGUAGE: Record<ChimeDomain, { question: string; emoji: string }> = {
  connectedness: { question: 'Hvem holder du af lige nu?', emoji: '🤝' },
  hope: { question: 'Hvad ser du frem til?', emoji: '✨' },
  identity: { question: 'Hvad er du god til?', emoji: '💪' },
  meaning: { question: 'Hvad er vigtigt for dig?', emoji: '❤️' },
  empowerment: { question: 'Hvad kan du selv?', emoji: '🌱' },
};

// ─── Trivselspuls (lys_checkin) ────────────────────────
export interface LysCheckin {
  id: string;
  resident_id: string;
  org_id: string | null;
  checkin_type: CheckinType;
  mood_score: number | null;
  mood_label: string | null;
  traffic_light: TrafficLight | null;
  free_text: string | null;
  voice_transcript: string | null;
  ai_summary: string | null;
  connectedness_score: number | null;
  hope_score: number | null;
  identity_score: number | null;
  meaning_score: number | null;
  empowerment_score: number | null;
  created_at: string;
}

export interface LysWeeklyReflectionInput {
  connectedness_score: number | null;
  hope_score: number | null;
  identity_score: number | null;
  meaning_score: number | null;
  empowerment_score: number | null;
  free_text: string | null;
}

export interface LysWeeklyReflection extends LysWeeklyReflectionInput {
  id: string;
  resident_id: string;
  org_id: string | null;
  created_at: string;
  checkin_type: 'weekly';
}

export interface LysCheckinInsert {
  resident_id: string;
  mood_score: number;
  mood_label?: string;
  traffic_light?: TrafficLight;
  free_text?: string;
  voice_transcript?: string;
  ai_summary?: string;
  connectedness_score?: number;
  hope_score?: number;
  identity_score?: number;
  meaning_score?: number;
  empowerment_score?: number;
}

// ─── Recovery-profil (lys_recovery_profile) ────────────
export interface LysRecoveryProfile {
  id: string;
  resident_id: string;
  org_id: string | null;
  connectedness_people: string | null;
  connectedness_support: string | null;
  connectedness_belonging: string | null;
  hope_dreams: string | null;
  hope_small_wishes: string | null;
  identity_strengths: string | null;
  identity_proud_of: string | null;
  identity_likes: string | null;
  identity_body: string | null;
  meaning_values: string | null;
  meaning_purpose: string | null;
  empowerment_choices: string | null;
  empowerment_capabilities: string | null;
  version: number;
  created_at: string;
  updated_at: string;
}

export type LysRecoveryProfileFieldKey = Exclude<
  keyof LysRecoveryProfile,
  'id' | 'resident_id' | 'org_id' | 'version' | 'created_at' | 'updated_at'
>;

export interface RecoveryProfileField {
  key: LysRecoveryProfileFieldKey;
  domain: ChimeDomain;
  residentPrompt: string;
  staffLabel: string;
  emoji: string;
}

export const RECOVERY_PROFILE_FIELDS: RecoveryProfileField[] = [
  // Connectedness
  {
    key: 'connectedness_people',
    domain: 'connectedness',
    residentPrompt: 'Hvem holder du af?',
    staffLabel: 'Folk borgeren holder af',
    emoji: '🤝',
  },
  {
    key: 'connectedness_support',
    domain: 'connectedness',
    residentPrompt: 'Hvem hjælper dig?',
    staffLabel: 'Borgerens støttepersoner',
    emoji: '🏠',
  },
  {
    key: 'connectedness_belonging',
    domain: 'connectedness',
    residentPrompt: 'Hvor føler du dig hjemme?',
    staffLabel: 'Tilhørsforhold',
    emoji: '🌍',
  },
  // Hope
  {
    key: 'hope_dreams',
    domain: 'hope',
    residentPrompt: 'Hvad drømmer du om?',
    staffLabel: 'Borgerens drømme',
    emoji: '✨',
  },
  {
    key: 'hope_small_wishes',
    domain: 'hope',
    residentPrompt: 'Hvad ser du frem til i nær fremtid?',
    staffLabel: 'Små ønsker og forventninger',
    emoji: '🌅',
  },
  // Identity
  {
    key: 'identity_strengths',
    domain: 'identity',
    residentPrompt: 'Hvad er du god til?',
    staffLabel: 'Borgerens styrker',
    emoji: '💪',
  },
  {
    key: 'identity_proud_of',
    domain: 'identity',
    residentPrompt: 'Hvad er du stolt af?',
    staffLabel: 'Hvad borgeren er stolt af',
    emoji: '🏆',
  },
  {
    key: 'identity_likes',
    domain: 'identity',
    residentPrompt: 'Hvad kan du lide?',
    staffLabel: 'Interesser og glæder',
    emoji: '⭐',
  },
  {
    key: 'identity_body',
    domain: 'identity',
    residentPrompt: 'Hvad gør din krop glad?',
    staffLabel: 'Krop og sanser',
    emoji: '🌿',
  },
  // Meaning
  {
    key: 'meaning_values',
    domain: 'meaning',
    residentPrompt: 'Hvad er vigtigt for dig?',
    staffLabel: 'Borgerens værdier',
    emoji: '❤️',
  },
  {
    key: 'meaning_purpose',
    domain: 'meaning',
    residentPrompt: 'Hvad giver dig mening?',
    staffLabel: 'Hvad der giver mening',
    emoji: '🌟',
  },
  // Empowerment
  {
    key: 'empowerment_choices',
    domain: 'empowerment',
    residentPrompt: 'Hvilken beslutning er du glad for at have taget?',
    staffLabel: 'Stærke beslutninger',
    emoji: '🎯',
  },
  {
    key: 'empowerment_capabilities',
    domain: 'empowerment',
    residentPrompt: 'Hvad kan du selv klare?',
    staffLabel: 'Egne evner',
    emoji: '🌱',
  },
];

// ─── Refleksion (lys_reflection) ───────────────────────
export interface LysReflection {
  id: string;
  resident_id: string;
  org_id: string | null;
  situation: string;
  what_was_hard: string | null;
  what_gave_strength: string | null;
  ai_suggested_next_step: string | null;
  resident_chosen_step: string | null;
  feeling: string | null;
  feeling_score: number | null;
  primary_chime_domain: ChimeDomain | null;
  created_at: string;
}

export interface LysReflectionInsert {
  resident_id: string;
  situation: string;
  what_was_hard?: string;
  what_gave_strength?: string;
  ai_suggested_next_step?: string;
  resident_chosen_step?: string;
  feeling?: string;
  feeling_score?: number;
  primary_chime_domain?: ChimeDomain;
}

// ─── Næste skridt (lys_next_steps) ─────────────────────
export interface LysNextStep {
  id: string;
  resident_id: string;
  org_id: string | null;
  created_by_type: CreatedByType;
  created_by_user_id: string | null;
  title: string;
  description: string | null;
  target_date: string | null;
  status: NextStepStatus;
  resident_note: string | null;
  staff_note: string | null;
  related_chime_domain: ChimeDomain | null;
  related_reflection_id: string | null;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface LysNextStepInsert {
  resident_id: string;
  created_by_type: CreatedByType;
  created_by_user_id?: string;
  title: string;
  description?: string;
  target_date?: string;
  status?: NextStepStatus;
  resident_note?: string;
  staff_note?: string;
  related_chime_domain?: ChimeDomain;
}

// ─── Recovery story (lys_recovery_stories) ─────────────
export interface LysRecoveryStory {
  id: string;
  resident_id: string;
  org_id: string | null;
  related_journal_entry_id: string | null;
  raw_transcript: string;
  cleaned_story: string;
  resident_approved: boolean;
  created_at: string;
  updated_at: string;
}

export interface LysRecoveryStoryInsert {
  resident_id: string;
  related_journal_entry_id?: string;
  raw_transcript: string;
  cleaned_story: string;
  resident_approved?: boolean;
}

// ─── Safety event (lys_safety_events) ──────────────────
export interface LysSafetyEvent {
  id: string;
  resident_id: string;
  organisation_id: string | null;
  conversation_id: string | null;
  risk_level: SafetyRiskLevel;
  category: SafetyCategory;
  reasoning: string | null;
  user_utterance: string;
  acknowledged_at: string | null;
  acknowledged_by: string | null;
  created_at: string;
}

// ─── Care Portal: aggregeret borger-overblik ──────────
// Bruges i Care Portal til CHIME-radar og trivselsoverblik.

export interface ChimeDomainScores {
  connectedness: number | null;
  hope: number | null;
  identity: number | null;
  meaning: number | null;
  empowerment: number | null;
}

export interface ResidentRecoverySummary {
  resident_id: string;
  display_name: string;
  latest_checkin: LysCheckin | null;
  active_next_steps_count: number;
  recovery_profile_completion_pct: number;
  chime_scores_30d_avg: ChimeDomainScores;
}
