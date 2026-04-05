// ── Dual-mode data service ────────────────────────────────────────────────────
// Routes calls to Supabase (logged-in) or localStorage (guest) transparently.

import { createClient } from '@/lib/supabase/client';
import * as ls from '@/lib/localStore';
import { LOCAL_KEYS } from '@/types/local';
import type {
  StorageMode,
  CheckIn,
  JournalEntry,
  PlanItem,
  PlanCompletion,
  XpData,
  Badge,
  GardenPlot,
  LysConversation,
  LocalProfile,
} from '@/types/local';

// ── XP helpers ────────────────────────────────────────────────────────────────

const XP_COOLDOWN_MS = 60 * 60 * 1000; // 1 hour per activity
const LEVEL_THRESHOLDS = [0, 100, 250, 500, 1000];

function calcLevel(xp: number): number {
  let level = 1;
  for (let i = 0; i < LEVEL_THRESHOLDS.length; i++) {
    if (xp >= (LEVEL_THRESHOLDS[i] ?? 0)) level = i + 1;
  }
  return Math.min(level, 5);
}

function xpCooldownKey(activity: string): string {
  return `budr_xp_last_${activity}`;
}

function canAwardXp(activity: string): boolean {
  const last = ls.getItem<number>(xpCooldownKey(activity));
  if (!last) return true;
  return Date.now() - last > XP_COOLDOWN_MS;
}

// ── Humørtjek ─────────────────────────────────────────────────────────────────

export async function saveCheckin(
  mode: StorageMode,
  activeId: string,
  data: { energy_level: number; label: string }
): Promise<void> {
  if (mode === 'supabase') {
    const supabase = createClient();
    if (!supabase) return;
    const today = new Date().toISOString().slice(0, 10);
    await supabase.from('park_daily_checkin').insert({
      resident_id: activeId,
      check_in_date: today,
      energy_level: data.energy_level,
      label: data.label,
    });
    return;
  }
  const entries = ls.getItem<CheckIn[]>(LOCAL_KEYS.checkins) ?? [];
  entries.unshift({
    id: crypto.randomUUID(),
    resident_id: activeId,
    check_in_date: new Date().toISOString().slice(0, 10),
    energy_level: data.energy_level,
    label: data.label,
    created_at: new Date().toISOString(),
  });
  ls.setItem(LOCAL_KEYS.checkins, entries.slice(0, 100));
}

export async function getCheckins(mode: StorageMode, activeId: string): Promise<CheckIn[]> {
  if (mode === 'supabase') {
    const supabase = createClient();
    if (!supabase) return [];
    const { data } = await supabase
      .from('park_daily_checkin')
      .select('*')
      .eq('resident_id', activeId)
      .order('created_at', { ascending: false })
      .limit(30);
    return (data ?? []) as CheckIn[];
  }
  return ls.getItem<CheckIn[]>(LOCAL_KEYS.checkins) ?? [];
}

// ── Journal ───────────────────────────────────────────────────────────────────

export async function saveJournalEntry(
  mode: StorageMode,
  _activeId: string,
  entry: Omit<JournalEntry, 'id'>
): Promise<void> {
  // Journal is always localStorage-first (existing behavior)
  const entries = ls.getItem<JournalEntry[]>(LOCAL_KEYS.journal) ?? [];
  entries.unshift({ id: crypto.randomUUID(), ...entry });
  ls.setItem(LOCAL_KEYS.journal, entries.slice(0, 50));
  void mode; // Supabase journal persistence not implemented yet
}

export async function getJournalEntries(): Promise<JournalEntry[]> {
  return ls.getItem<JournalEntry[]>(LOCAL_KEYS.journal) ?? [];
}

// ── XP ────────────────────────────────────────────────────────────────────────

export async function addXp(
  mode: StorageMode,
  activeId: string,
  activity: string,
  amount: number
): Promise<void> {
  if (mode === 'supabase') {
    const supabase = createClient();
    if (!supabase) return;
    void supabase.rpc('award_xp', {
      p_resident_id: activeId,
      p_activity: activity,
      p_xp: amount,
    });
    return;
  }
  // Local cooldown guard
  if (!canAwardXp(activity)) return;
  ls.setItem(xpCooldownKey(activity), Date.now());

  const current = ls.getItem<XpData>(LOCAL_KEYS.xp) ?? { total_xp: 0, level: 1 };
  const newXp = current.total_xp + amount;
  ls.setItem(LOCAL_KEYS.xp, { total_xp: newXp, level: calcLevel(newXp) });
}

export async function getXp(mode: StorageMode, activeId: string): Promise<XpData> {
  if (mode === 'supabase') {
    const supabase = createClient();
    if (!supabase) return { total_xp: 0, level: 1 };
    const { data } = await supabase
      .from('resident_xp')
      .select('total_xp, level')
      .eq('resident_id', activeId)
      .maybeSingle();
    return (data as XpData | null) ?? { total_xp: 0, level: 1 };
  }
  return ls.getItem<XpData>(LOCAL_KEYS.xp) ?? { total_xp: 0, level: 1 };
}

// ── Badges ────────────────────────────────────────────────────────────────────

export async function earnBadge(
  mode: StorageMode,
  activeId: string,
  badge_key: string
): Promise<void> {
  if (mode === 'supabase') {
    const supabase = createClient();
    if (!supabase) return;
    void supabase
      .from('resident_badges')
      .upsert({ resident_id: activeId, badge_key, earned_at: new Date().toISOString() });
    return;
  }
  const badges = ls.getItem<Badge[]>(LOCAL_KEYS.badges) ?? [];
  if (!badges.find((b) => b.badge_key === badge_key)) {
    badges.push({ badge_key, earned_at: new Date().toISOString() });
    ls.setItem(LOCAL_KEYS.badges, badges);
  }
}

export async function getBadges(mode: StorageMode, activeId: string): Promise<Badge[]> {
  if (mode === 'supabase') {
    const supabase = createClient();
    if (!supabase) return [];
    const { data } = await supabase
      .from('resident_badges')
      .select('badge_key, earned_at')
      .eq('resident_id', activeId);
    return (data ?? []) as Badge[];
  }
  return ls.getItem<Badge[]>(LOCAL_KEYS.badges) ?? [];
}

// ── Haven / Garden ────────────────────────────────────────────────────────────

/** Borger med `budr_resident_id` har ikke altid Supabase JWT som samme bruger — brug server-API. */
function shouldUseResidentGardenApi(activeId: string, mode: StorageMode): boolean {
  if (mode !== 'supabase') return false;
  if (typeof document === 'undefined') return false;
  const m = document.cookie.match(/budr_resident_id=([^;]+)/);
  if (!m?.[1]) return false;
  try {
    return decodeURIComponent(m[1]) === activeId;
  } catch {
    return m[1] === activeId;
  }
}

async function gardenApiJson<T>(
  url: string,
  init?: RequestInit
): Promise<{ ok: boolean; status: number; body: T }> {
  const res = await fetch(url, { credentials: 'include', ...init });
  const body = (await res.json().catch(() => ({}))) as T;
  return { ok: res.ok, status: res.status, body };
}

export async function getGardenPlots(mode: StorageMode, activeId: string): Promise<GardenPlot[]> {
  if (mode === 'supabase') {
    if (shouldUseResidentGardenApi(activeId, mode)) {
      const { ok, body } = await gardenApiJson<{ data?: GardenPlot[]; error?: string }>(
        '/api/park/garden-plot'
      );
      if (!ok) throw new Error(body.error ?? 'Kunne ikke hente haven');
      return (body.data ?? []) as GardenPlot[];
    }
    const supabase = createClient();
    if (!supabase) return [];
    const { data } = await supabase
      .from('garden_plots')
      .select('*')
      .eq('resident_id', activeId)
      .order('slot_index');
    return (data ?? []) as GardenPlot[];
  }
  const plots = ls.getItem<GardenPlot[]>(LOCAL_KEYS.garden) ?? [];
  return plots.filter((p) => p.resident_id === activeId);
}

export async function savePlot(
  mode: StorageMode,
  activeId: string,
  data: Omit<GardenPlot, 'id' | 'resident_id' | 'created_at'>
): Promise<void> {
  if (mode === 'supabase') {
    if (shouldUseResidentGardenApi(activeId, mode)) {
      const { ok, body } = await gardenApiJson<{ error?: string }>('/api/park/garden-plot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          slot_index: data.slot_index,
          plant_type: data.plant_type,
          plant_name: data.plant_name,
          goal_text: data.goal_text,
          growth_stage: data.growth_stage,
          total_water: data.total_water,
          last_watered_at: data.last_watered_at,
          is_park_linked: data.is_park_linked,
        }),
      });
      if (!ok) throw new Error(body.error ?? 'Kunne ikke gemme planten');
      return;
    }
    const supabase = createClient();
    if (!supabase) return;
    const { error } = await supabase
      .from('garden_plots')
      .upsert({ ...data, resident_id: activeId }, { onConflict: 'resident_id,slot_index' });
    if (error) throw new Error(error.message);
    return;
  }
  const plots = ls.getItem<GardenPlot[]>(LOCAL_KEYS.garden) ?? [];
  const idx = plots.findIndex(
    (p) => p.resident_id === activeId && p.slot_index === data.slot_index
  );
  const plot: GardenPlot = {
    id: idx >= 0 ? plots[idx]!.id : crypto.randomUUID(),
    resident_id: activeId,
    created_at: idx >= 0 ? plots[idx]!.created_at : new Date().toISOString(),
    ...data,
  };
  if (idx >= 0) plots[idx] = plot;
  else plots.push(plot);
  ls.setItem(LOCAL_KEYS.garden, plots);
}

export async function updatePlot(
  mode: StorageMode,
  activeId: string,
  id: string,
  data: Partial<GardenPlot>
): Promise<void> {
  if (mode === 'supabase') {
    if (shouldUseResidentGardenApi(activeId, mode)) {
      const { ok, body } = await gardenApiJson<{ error?: string }>('/api/park/garden-plot', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, ...data }),
      });
      if (!ok) throw new Error(body.error ?? 'Kunne ikke opdatere planten');
      return;
    }
    const supabase = createClient();
    if (!supabase) return;
    const { error } = await supabase.from('garden_plots').update(data).eq('id', id);
    if (error) throw new Error(error.message);
    return;
  }
  const plots = ls.getItem<GardenPlot[]>(LOCAL_KEYS.garden) ?? [];
  const idx = plots.findIndex((p) => p.id === id && p.resident_id === activeId);
  if (idx >= 0) {
    plots[idx] = { ...plots[idx]!, ...data };
    ls.setItem(LOCAL_KEYS.garden, plots);
  }
}

export async function deletePlot(mode: StorageMode, activeId: string, id: string): Promise<void> {
  if (mode === 'supabase') {
    if (shouldUseResidentGardenApi(activeId, mode)) {
      const { ok, body } = await gardenApiJson<{ error?: string }>(
        `/api/park/garden-plot?id=${encodeURIComponent(id)}`,
        { method: 'DELETE' }
      );
      if (!ok) throw new Error(body.error ?? 'Kunne ikke slette planten');
      return;
    }
    const supabase = createClient();
    if (!supabase) return;
    const { error } = await supabase.from('garden_plots').delete().eq('id', id);
    if (error) throw new Error(error.message);
    return;
  }
  const plots = ls.getItem<GardenPlot[]>(LOCAL_KEYS.garden) ?? [];
  ls.setItem(
    LOCAL_KEYS.garden,
    plots.filter((p) => !(p.id === id && p.resident_id === activeId))
  );
}

// ── Lys conversations ─────────────────────────────────────────────────────────

export async function saveConversation(
  mode: StorageMode,
  activeId: string,
  data: Omit<LysConversation, 'id' | 'resident_id' | 'created_at' | 'updated_at'> & { id?: string }
): Promise<void> {
  if (mode === 'supabase') {
    const supabase = createClient();
    if (!supabase) return;
    if (data.id) {
      await supabase
        .from('lys_conversations')
        .update({
          title: data.title,
          messages: data.messages,
          updated_at: new Date().toISOString(),
        })
        .eq('id', data.id);
    } else {
      await supabase.from('lys_conversations').insert({
        resident_id: activeId,
        title: data.title,
        messages: data.messages,
      });
    }
    return;
  }
  const convs = ls.getItem<LysConversation[]>(LOCAL_KEYS.conversations) ?? [];
  if (data.id) {
    const idx = convs.findIndex((c) => c.id === data.id);
    if (idx >= 0) {
      convs[idx] = {
        ...convs[idx]!,
        title: data.title,
        messages: data.messages,
        updated_at: new Date().toISOString(),
      };
    }
  } else {
    convs.unshift({
      id: crypto.randomUUID(),
      resident_id: activeId,
      title: data.title,
      messages: data.messages,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  }
  ls.setItem(LOCAL_KEYS.conversations, convs.slice(0, 50));
}

export async function getConversations(
  mode: StorageMode,
  activeId: string
): Promise<LysConversation[]> {
  if (mode === 'supabase') {
    const supabase = createClient();
    if (!supabase) return [];
    const { data } = await supabase
      .from('lys_conversations')
      .select('*')
      .eq('resident_id', activeId)
      .order('updated_at', { ascending: false })
      .limit(20);
    return (data ?? []) as LysConversation[];
  }
  const convs = ls.getItem<LysConversation[]>(LOCAL_KEYS.conversations) ?? [];
  return convs.filter((c) => c.resident_id === activeId);
}

// ── Profile ───────────────────────────────────────────────────────────────────

export async function getProfile(mode: StorageMode, activeId: string): Promise<LocalProfile> {
  void activeId;
  if (mode === 'supabase') {
    try {
      const res = await fetch('/api/park/resident-me', { credentials: 'include' });
      if (!res.ok) return { nickname: '', theme: 'purple', avatar: null };
      const data = (await res.json()) as {
        nickname?: string | null;
        color_theme?: string | null;
        avatar_url?: string | null;
      };
      return {
        nickname: data.nickname ?? '',
        theme: data.color_theme ?? 'purple',
        avatar: data.avatar_url ?? null,
      };
    } catch {
      return { nickname: '', theme: 'purple', avatar: null };
    }
  }
  return (
    ls.getItem<LocalProfile>(LOCAL_KEYS.profile) ?? { nickname: '', theme: 'purple', avatar: null }
  );
}

export async function saveProfile(
  mode: StorageMode,
  activeId: string,
  data: Partial<LocalProfile>
): Promise<void> {
  void activeId;
  if (mode === 'supabase') {
    try {
      await fetch('/api/park/resident-me', {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          nickname: data.nickname,
          color_theme: data.theme,
        }),
      });
    } catch {
      /* ignore */
    }
    return;
  }
  const current = ls.getItem<LocalProfile>(LOCAL_KEYS.profile) ?? {
    nickname: '',
    theme: 'purple',
    avatar: null,
  };
  ls.setItem(LOCAL_KEYS.profile, { ...current, ...data });
}

// ── Plan items (read-only in guest mode for now) ──────────────────────────────

export async function getPlanItems(mode: StorageMode, activeId: string): Promise<PlanItem[]> {
  if (mode === 'supabase') {
    const supabase = createClient();
    if (!supabase) return [];
    const { data } = await supabase
      .from('resident_plan_items')
      .select('*')
      .eq('resident_id', activeId)
      .order('time_of_day');
    return (data ?? []) as PlanItem[];
  }
  const items = ls.getItem<PlanItem[]>(LOCAL_KEYS.planItems) ?? [];
  return items.filter((p) => p.resident_id === activeId);
}

export async function savePlanItem(
  mode: StorageMode,
  activeId: string,
  data: Omit<PlanItem, 'id' | 'resident_id' | 'created_at'>
): Promise<void> {
  if (mode === 'supabase') {
    const supabase = createClient();
    if (!supabase) return;
    await supabase.from('resident_plan_items').insert({ ...data, resident_id: activeId });
    return;
  }
  const items = ls.getItem<PlanItem[]>(LOCAL_KEYS.planItems) ?? [];
  items.push({
    id: crypto.randomUUID(),
    resident_id: activeId,
    created_at: new Date().toISOString(),
    ...data,
  });
  ls.setItem(LOCAL_KEYS.planItems, items);
}

export async function completePlanItem(
  mode: StorageMode,
  activeId: string,
  planItemId: string,
  date: string
): Promise<void> {
  if (mode === 'supabase') {
    const supabase = createClient();
    if (!supabase) return;
    await supabase.from('resident_plan_completions').upsert({
      resident_id: activeId,
      plan_item_id: planItemId,
      completion_date: date,
    });
    return;
  }
  const completions = ls.getItem<PlanCompletion[]>(LOCAL_KEYS.planCompletions) ?? [];
  const exists = completions.find(
    (c) => c.plan_item_id === planItemId && c.completion_date === date
  );
  if (!exists) {
    completions.push({
      id: crypto.randomUUID(),
      resident_id: activeId,
      plan_item_id: planItemId,
      completion_date: date,
      completed_at: new Date().toISOString(),
    });
    ls.setItem(LOCAL_KEYS.planCompletions, completions);
  }
}
