'use client';

import type { RealtimeChannel } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';

export type SafetyRiskLevel = 'none' | 'elevated' | 'acute';

export type SafetyEventRow = {
  id: string;
  resident_id: string;
  organisation_id: string | null;
  conversation_id: string | null;
  risk_level: SafetyRiskLevel;
  category: string;
  reasoning: string | null;
  user_utterance: string;
  acknowledged_at: string | null;
  acknowledged_by: string | null;
  created_at: string;
};

export type SafetyEventWithResident = SafetyEventRow & {
  resident_name: string;
};

function supabaseOrThrow() {
  const supabase = createClient();
  if (!supabase) throw new Error('Supabase er ikke konfigureret.');
  return supabase;
}

export function truncateSafetyUtterance(text: string): string {
  const cleaned = text.trim();
  if (cleaned.length <= 80) return cleaned;
  return `${cleaned.slice(0, 77)}...`;
}

function riskSortWeight(level: SafetyRiskLevel): number {
  if (level === 'acute') return 0;
  if (level === 'elevated') return 1;
  return 2;
}

async function fetchResidentNameMap(residentIds: string[]): Promise<Map<string, string>> {
  if (residentIds.length === 0) return new Map();
  const supabase = supabaseOrThrow();
  const { data, error } = await supabase
    .from('care_residents')
    .select('user_id, first_name, last_name, display_name')
    .in('user_id', residentIds);
  if (error) throw error;

  const map = new Map<string, string>();
  for (const row of (data ?? []) as Array<{
    user_id: string;
    first_name: string | null;
    last_name: string | null;
    display_name: string | null;
  }>) {
    const full =
      [row.first_name?.trim(), row.last_name?.trim()].filter(Boolean).join(' ').trim() ||
      row.display_name?.trim() ||
      'Ukendt beboer';
    map.set(row.user_id, full);
  }
  return map;
}

export async function fetchResidentNamesByIds(residentIds: string[]): Promise<Map<string, string>> {
  return fetchResidentNameMap(residentIds);
}

function enrichWithResidentName(
  events: SafetyEventRow[],
  residentNameMap: Map<string, string>
): SafetyEventWithResident[] {
  return events
    .map((event) => ({
      ...event,
      resident_name: residentNameMap.get(event.resident_id) ?? 'Ukendt beboer',
    }))
    .sort((a, b) => {
      const w = riskSortWeight(a.risk_level) - riskSortWeight(b.risk_level);
      if (w !== 0) return w;
      return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
    });
}

export async function fetchUnacknowledgedSafetyEvents(
  organisationId: string
): Promise<SafetyEventWithResident[]> {
  const supabase = supabaseOrThrow();
  const { data, error } = await supabase
    .from('lys_safety_events')
    .select('*')
    .eq('organisation_id', organisationId)
    .is('acknowledged_at', null)
    .in('risk_level', ['elevated', 'acute'])
    .order('created_at', { ascending: false });
  if (error) throw error;
  const rows = (data ?? []) as SafetyEventRow[];
  const residentNameMap = await fetchResidentNameMap(
    Array.from(new Set(rows.map((r) => r.resident_id)))
  );
  return enrichWithResidentName(rows, residentNameMap);
}

export async function fetchSafetyEventsForConversation(
  conversationId: string
): Promise<SafetyEventWithResident[]> {
  const supabase = supabaseOrThrow();
  const { data, error } = await supabase
    .from('lys_safety_events')
    .select('*')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true });
  if (error) throw error;
  const rows = (data ?? []) as SafetyEventRow[];
  const residentNameMap = await fetchResidentNameMap(
    Array.from(new Set(rows.map((r) => r.resident_id)))
  );
  return enrichWithResidentName(rows, residentNameMap);
}

export async function fetchSafetyEventsForResident(
  residentId: string
): Promise<SafetyEventWithResident[]> {
  const supabase = supabaseOrThrow();
  const { data, error } = await supabase
    .from('lys_safety_events')
    .select('*')
    .eq('resident_id', residentId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  const rows = (data ?? []) as SafetyEventRow[];
  const residentNameMap = await fetchResidentNameMap([residentId]);
  return enrichWithResidentName(rows, residentNameMap);
}

export async function acknowledgeSafetyEvent(eventId: string, staffId: string): Promise<void> {
  const supabase = supabaseOrThrow();
  const { error } = await supabase
    .from('lys_safety_events')
    .update({
      acknowledged_at: new Date().toISOString(),
      acknowledged_by: staffId,
    })
    .eq('id', eventId);
  if (error) throw error;
}

function uniqueSafetyChannelTopic(organisationId: string): string {
  /* Hvert kald skal have eget topic: `supabase.channel(name)` genbruger eksisterende kanal, og
   * man må ikke tilføje nye `postgres_changes`-callbacks efter `subscribe()` (fx når både
   * `PortalNotificationBar` og `ActionCards` abonnerer på samme org). */
  const suffix =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 11)}`;
  return `lys-safety-events-${organisationId}-${suffix}`;
}

export function subscribeSafetyEvents(
  organisationId: string,
  callback: (payload: { eventType: 'INSERT' | 'UPDATE'; event: SafetyEventRow }) => void
): () => void {
  const supabase = supabaseOrThrow();
  const channel: RealtimeChannel = supabase
    .channel(uniqueSafetyChannelTopic(organisationId))
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'lys_safety_events',
        filter: `organisation_id=eq.${organisationId}`,
      },
      (payload) => callback({ eventType: 'INSERT', event: payload.new as SafetyEventRow })
    )
    .on(
      'postgres_changes',
      {
        event: 'UPDATE',
        schema: 'public',
        table: 'lys_safety_events',
        filter: `organisation_id=eq.${organisationId}`,
      },
      (payload) => callback({ eventType: 'UPDATE', event: payload.new as SafetyEventRow })
    )
    .subscribe();

  return () => {
    void supabase.removeChannel(channel);
  };
}

export function formatRelativeDa(input: string): string {
  const date = new Date(input);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const minuteMs = 60 * 1000;
  const hourMs = 60 * minuteMs;
  const dayMs = 24 * hourMs;
  const days = Math.floor(diffMs / dayMs);

  if (diffMs < hourMs) {
    const mins = Math.max(1, Math.floor(diffMs / minuteMs));
    return `for ${mins} min siden`;
  }
  if (diffMs < dayMs) {
    const hours = Math.floor(diffMs / hourMs);
    return `for ${hours} ${hours === 1 ? 'time' : 'timer'} siden`;
  }
  if (days === 1) {
    return `i går kl. ${date.toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit' })}`;
  }
  if (days <= 6) return `for ${days} dage siden`;
  return date.toLocaleString('da-DK', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}
