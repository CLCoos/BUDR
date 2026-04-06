// BUDR: PARK Flow Types
// Varemærkeneutrale navne — metodikken er KRAP-inspireret

export type TrafficLight = 'red' | 'yellow' | 'green'
export type GoalStatus = 'active' | 'completed' | 'paused'

// ─── Flow 1: Daglig check-in ───────────────────────────
export interface DailyCheckin {
  id: string
  resident_id: string
  score: number // 1–10
  mood_label: string | null
  free_text: string | null
  traffic_light: TrafficLight | null
  created_at: string
}

export interface DailyCheckinInsert {
  resident_id: string
  score: number
  mood_label?: string
  free_text?: string
  traffic_light?: TrafficLight
}

// ─── Flow 2: Tankefanger ───────────────────────────────
export interface ThoughtCatch {
  id: string
  resident_id: string
  situation: string
  automatic_thought: string
  emotion: string | null
  emotion_score: number | null // 1–10
  counter_thought: string | null
  outcome_score: number | null // 1–10
  created_at: string
}

export interface ThoughtCatchInsert {
  resident_id: string
  situation: string
  automatic_thought: string
  emotion?: string
  emotion_score?: number
  counter_thought?: string
  outcome_score?: number
}

// ─── Flow 3: Ressourceblomst ───────────────────────────
export interface ResourceProfile {
  id: string
  resident_id: string
  petal_social: string | null
  petal_activities: string | null
  petal_strengths: string | null
  petal_support: string | null
  petal_body: string | null
  petal_values: string | null
  petal_history: string | null
  petal_dreams: string | null
  version: number
  created_at: string
  updated_at: string
}

export const RESOURCE_PETALS: { key: keyof ResourceProfile; label: string; emoji: string }[] = [
  { key: 'petal_social',     label: 'Folk jeg holder af',    emoji: '🤝' },
  { key: 'petal_activities', label: 'Ting jeg kan lide',     emoji: '⭐' },
  { key: 'petal_strengths',  label: 'Jeg er god til',        emoji: '💪' },
  { key: 'petal_support',    label: 'Hvem hjælper mig',      emoji: '🏠' },
  { key: 'petal_body',       label: 'Krop og sanser',        emoji: '🌿' },
  { key: 'petal_values',     label: 'Hvad er vigtigt for mig', emoji: '❤️' },
  { key: 'petal_history',    label: 'Noget jeg er stolt af', emoji: '🏆' },
  { key: 'petal_dreams',     label: 'Mine drømme',           emoji: '✨' },
]

// ─── Flow 4: Trafiklys / Alert ─────────────────────────
export interface TrafficAlert {
  id: string
  resident_id: string
  triggered_from: 'checkin' | 'manual'
  color: TrafficLight
  note: string | null
  acknowledged_by: string | null
  acknowledged_at: string | null
  created_at: string
}

// ─── Flow 5: Måltrappe ─────────────────────────────────
export interface Goal {
  id: string
  resident_id: string
  created_by_staff: string | null
  title: string
  description: string | null
  target_date: string | null
  status: GoalStatus
  created_at: string
  updated_at: string
  steps?: GoalStep[]
}

export interface GoalStep {
  id: string
  goal_id: string
  step_number: number
  title: string
  description: string | null
  completed: boolean
  completed_at: string | null
  resident_note: string | null
  created_at: string
}

// ─── Care Portal: Borger-overblik ─────────────────────
export interface ResidentSummary {
  resident_id: string
  display_name: string
  latest_checkin: DailyCheckin | null
  active_alert: TrafficAlert | null
  active_goals_count: number
  resource_profile_complete: boolean
}
