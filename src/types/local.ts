// ── Types for localStorage-backed data entities ───────────────────────────────

export type StorageMode = 'supabase' | 'local';

export type CheckIn = {
  id: string;
  resident_id: string;
  check_in_date: string;
  energy_level: number;
  label: string;
  created_at: string;
};

export type SelfLetter = {
  id: string;
  text: string;
  written_at: string; // ISO datetime
  deliver_at: string; // ISO date (YYYY-MM-DD)
  delivered: boolean;
};

export type JournalEntry = {
  id: string;
  date: string;
  mode: 'write' | 'voice';
  text: string;
  mood?: number;
  /** Feeling words the resident selected (e.g. ['Glad', 'Urolig']) */
  feelings?: string[];
  /** Whether the entry is visible to staff */
  privacy?: 'private' | 'shared';
  /** The reflective prompt the resident was responding to */
  prompt?: string;
};

export type PlanItem = {
  id: string;
  resident_id: string;
  title: string;
  category: string;
  emoji: string | null;
  time_of_day: string;
  recurrence: string;
  recurrence_days: number[] | null;
  notify: boolean;
  notify_minutes_before: number;
  created_by: string;
  staff_suggestion: boolean;
  approved_by_resident: boolean;
  active_from: string;
  created_at: string;
};

export type PlanCompletion = {
  id: string;
  resident_id: string;
  plan_item_id: string;
  completion_date: string;
  completed_at: string;
};

export type XpData = {
  total_xp: number;
  level: number;
};

export type Badge = {
  badge_key: string;
  earned_at: string;
};

export type XpLogEntry = {
  id: string;
  activity: string;
  xp: number;
  ts: string;
};

export type GardenPlot = {
  id: string;
  resident_id: string;
  slot_index: number;
  plant_type: 'tree' | 'flower' | 'herb' | 'bush' | 'vegetable';
  plant_name: string;
  goal_text: string;
  park_goal_id?: string | null;
  growth_stage: 0 | 1 | 2 | 3 | 4;
  total_water: number;
  last_watered_at: string | null;
  is_park_linked: boolean;
  created_at: string;
};

export type LysConversation = {
  id: string;
  resident_id: string;
  title: string;
  messages: Array<{ role: 'user' | 'assistant'; content: string }>;
  created_at: string;
  updated_at: string;
};

export type LocalProfile = {
  nickname: string;
  theme: string;
  avatar: string | null;
};

// ── localStorage keys ─────────────────────────────────────────────────────────
export const LOCAL_KEYS = {
  guestId: 'budr_guest_id',
  checkins: 'budr_checkins',
  journal: 'budr_journal_entries_v1',
  planItems: 'budr_plan_items',
  planCompletions: 'budr_plan_completions',
  xp: 'budr_xp',
  badges: 'budr_badges',
  xpLog: 'budr_xp_log',
  garden: 'budr_garden',
  conversations: 'budr_lys_conversations',
  profile: 'budr_profile',
  pushSubscription: 'budr_push_subscription',
  selfLetters: 'budr_self_letters',
} as const;
