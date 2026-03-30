// BUDR: PARK Flow Supabase Queries
import { createClient } from '@/lib/supabase/client'
import type {
  DailyCheckinInsert,
  ThoughtCatchInsert,
  ResourceProfile,
  TrafficLight,
  GoalStep,
} from '@/types/park'

function getSupabase() {
  const client = createClient()
  if (!client) throw new Error('Supabase ikke konfigureret')
  return client
}

// ─── Flow 1: Daglig check-in ──────────────────────────
export async function submitCheckin(data: DailyCheckinInsert) {
  const supabase = getSupabase()
  const { error, data: row } = await supabase
    .from('park_daily_checkin')
    .insert(data)
    .select()
    .single()

  if (error) throw error

  // Auto-trigger alert hvis trafiklys er rødt
  if (data.traffic_light === 'red') {
    await triggerAlert(data.resident_id, 'checkin', 'red', data.free_text ?? undefined)
  }

  return row
}

export async function getCheckinHistory(residentId: string, days = 14) {
  const supabase = getSupabase()
  const since = new Date()
  since.setDate(since.getDate() - days)

  const { data, error } = await supabase
    .from('park_daily_checkin')
    .select('*')
    .eq('resident_id', residentId)
    .gte('created_at', since.toISOString())
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

// ─── Flow 2: Tankefanger ──────────────────────────────
export async function submitThoughtCatch(data: ThoughtCatchInsert) {
  const supabase = getSupabase()
  const { error, data: row } = await supabase
    .from('park_thought_catch')
    .insert(data)
    .select()
    .single()

  if (error) throw error
  return row
}

export async function getThoughtHistory(residentId: string, limit = 20) {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('park_thought_catch')
    .select('*')
    .eq('resident_id', residentId)
    .order('created_at', { ascending: false })
    .limit(limit)

  if (error) throw error
  return data
}

// ─── Flow 3: Ressourceblomst ──────────────────────────
export async function getResourceProfile(residentId: string) {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('park_resource_profile')
    .select('*')
    .eq('resident_id', residentId)
    .order('version', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) throw error
  return data
}

export async function upsertResourceProfile(
  residentId: string,
  petals: Partial<Omit<ResourceProfile, 'id' | 'resident_id' | 'version' | 'created_at' | 'updated_at'>>
) {
  const supabase = getSupabase()
  const existing = await getResourceProfile(residentId)

  if (existing) {
    const { data, error } = await supabase
      .from('park_resource_profile')
      .update({ ...petals, updated_at: new Date().toISOString() })
      .eq('id', existing.id)
      .select()
      .single()
    if (error) throw error
    return data
  } else {
    const { data, error } = await supabase
      .from('park_resource_profile')
      .insert({ resident_id: residentId, ...petals })
      .select()
      .single()
    if (error) throw error
    return data
  }
}

// ─── Flow 4: Alerts ───────────────────────────────────
export async function triggerAlert(
  residentId: string,
  source: 'checkin' | 'manual',
  color: TrafficLight,
  note?: string
) {
  const supabase = getSupabase()
  const { error } = await supabase.from('park_traffic_alerts').insert({
    resident_id: residentId,
    triggered_from: source,
    color,
    note: note ?? null,
  })
  if (error) throw error
}

export async function acknowledgeAlert(alertId: string, staffId: string) {
  const supabase = getSupabase()
  const { error } = await supabase
    .from('park_traffic_alerts')
    .update({ acknowledged_by: staffId, acknowledged_at: new Date().toISOString() })
    .eq('id', alertId)
  if (error) throw error
}

export async function getUnacknowledgedAlerts() {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('park_traffic_alerts')
    .select('*, resident:resident_id(id, email, raw_user_meta_data)')
    .is('acknowledged_at', null)
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

// ─── Flow 5: Måltrappe ────────────────────────────────
export async function getGoalsWithSteps(residentId: string) {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('park_goals')
    .select(`
      *,
      steps:park_goal_steps (*)
    `)
    .eq('resident_id', residentId)
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  if (error) throw error
  return data
}

export async function completeStep(
  stepId: string,
  residentNote?: string
): Promise<GoalStep> {
  const supabase = getSupabase()
  const { data, error } = await supabase
    .from('park_goal_steps')
    .update({
      completed: true,
      completed_at: new Date().toISOString(),
      resident_note: residentNote ?? null,
    })
    .eq('id', stepId)
    .select()
    .single()

  if (error) throw error
  return data
}

// ─── Care Portal: Realtime subscription ──────────────
export function subscribeToAlerts(
  callback: (alert: unknown) => void
) {
  const supabase = getSupabase()
  return supabase
    .channel('park_alerts')
    .on(
      'postgres_changes',
      { event: 'INSERT', schema: 'public', table: 'park_traffic_alerts' },
      (payload) => callback(payload.new)
    )
    .subscribe()
}
