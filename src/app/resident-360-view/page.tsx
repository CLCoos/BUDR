import React from 'react';
import { redirect } from 'next/navigation';
import type { SupabaseClient } from '@supabase/supabase-js';
import PortalShell from '@/components/PortalShell';
import ResidentOverviewGrid from './components/ResidentOverviewGrid';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { parseStaffOrgId } from '@/lib/staffOrgScope';

// ── Types ─────────────────────────────────────────────────────

type TrafficDb = 'grøn' | 'gul' | 'rød';
type TrafficUi = 'groen' | 'gul' | 'roed';

const DB_TO_UI: Record<TrafficDb, TrafficUi> = {
  grøn: 'groen',
  gul: 'gul',
  rød: 'roed',
};

export type ResidentItem = {
  id: string;
  name: string;
  initials: string;
  room: string;
  /** Afdeling/hus fra onboarding_data (fx Hus A, TLS) */
  house: string;
  trafficLight: TrafficUi | null;
  moodScore: number | null;
  lastCheckinIso: string | null;
  notePreview: string;
  checkinToday: boolean;
  pendingProposals: number;
};

// ── Data fetching ─────────────────────────────────────────────

async function fetchResidentsOverview(
  supabase: SupabaseClient,
  orgId: string
): Promise<ResidentItem[]> {
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

  const [residentsRes, checkinsRes, proposalsRes] = await Promise.all([
    supabase
      .from('care_residents')
      .select('user_id, display_name, onboarding_data')
      .eq('org_id', orgId)
      .order('display_name'),
    supabase
      .from('park_daily_checkin')
      .select('resident_id, mood_score, traffic_light, note, created_at')
      .gte('created_at', todayStart)
      .order('created_at', { ascending: false }),
    supabase.from('plan_proposals').select('resident_id').eq('status', 'pending'),
  ]);

  const residents = (residentsRes.data ?? []) as {
    user_id: string;
    display_name: string;
    onboarding_data: Record<string, string> | null;
  }[];

  const checkins = (checkinsRes.data ?? []) as {
    resident_id: string;
    mood_score: number;
    traffic_light: string;
    note: string | null;
    created_at: string;
  }[];

  const proposals = (proposalsRes.data ?? []) as { resident_id: string }[];

  // Latest check-in per resident (already ordered desc)
  const latestCheckin = new Map<string, (typeof checkins)[0]>();
  for (const c of checkins) {
    if (!latestCheckin.has(c.resident_id)) latestCheckin.set(c.resident_id, c);
  }

  const pendingCount = new Map<string, number>();
  for (const p of proposals) {
    pendingCount.set(p.resident_id, (pendingCount.get(p.resident_id) ?? 0) + 1);
  }

  const today = new Date();

  return residents.map((r) => {
    const od = r.onboarding_data ?? {};
    const c = latestCheckin.get(r.user_id);
    const tl = c ? (DB_TO_UI[c.traffic_light as TrafficDb] ?? null) : null;

    const checkinDate = c ? new Date(c.created_at) : null;
    const checkinToday = checkinDate
      ? checkinDate.getFullYear() === today.getFullYear() &&
        checkinDate.getMonth() === today.getMonth() &&
        checkinDate.getDate() === today.getDate()
      : false;

    return {
      id: r.user_id,
      name: r.display_name,
      initials: od.avatar_initials ?? r.display_name.slice(0, 2).toUpperCase(),
      room: od.room ?? '—',
      house: od.house ?? '—',
      trafficLight: tl,
      moodScore: c ? c.mood_score : null,
      lastCheckinIso: c ? c.created_at : null,
      notePreview: c?.note?.trim() || 'Ingen check-in i dag',
      checkinToday,
      pendingProposals: pendingCount.get(r.user_id) ?? 0,
    };
  });
}

// ── Page ──────────────────────────────────────────────────────

export default async function Resident360ViewPage() {
  const supabase = await createServerSupabaseClient();
  if (!supabase) redirect('/care-portal-login?err=config');
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/care-portal-login');

  const orgId = parseStaffOrgId(user.user_metadata?.org_id);
  if (!orgId) redirect('/care-portal-dashboard/settings');

  const residents = await fetchResidentsOverview(supabase, orgId);

  return (
    <PortalShell>
      <ResidentOverviewGrid residents={residents} />
    </PortalShell>
  );
}
