import React from 'react';
import { createClient } from '@supabase/supabase-js';
import PortalShell from '@/components/PortalShell';
import ResidentOverviewGrid from './components/ResidentOverviewGrid';

// ── Types ─────────────────────────────────────────────────────

type TrafficDb = 'grøn' | 'gul' | 'rød';
type TrafficUi = 'groen' | 'gul' | 'roed';

const DB_TO_UI: Record<TrafficDb, TrafficUi> = {
  'grøn': 'groen',
  'gul':  'gul',
  'rød':  'roed',
};

export type ResidentItem = {
  id: string;
  name: string;
  initials: string;
  room: string;
  trafficLight: TrafficUi | null;
  moodScore: number | null;
  lastCheckinIso: string | null;
  notePreview: string;
  checkinToday: boolean;
  pendingProposals: number;
};

// ── Data fetching ─────────────────────────────────────────────

function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false } },
  );
}

async function fetchResidentsOverview(): Promise<ResidentItem[]> {
  const supabase = getServiceClient();
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).toISOString();

  const [residentsRes, checkinsRes, proposalsRes] = await Promise.all([
    supabase
      .from('care_residents')
      .select('user_id, display_name, onboarding_data')
      .order('display_name'),
    supabase
      .from('park_daily_checkin')
      .select('resident_id, mood_score, traffic_light, note, created_at')
      .gte('created_at', todayStart)
      .order('created_at', { ascending: false }),
    supabase
      .from('plan_proposals')
      .select('resident_id')
      .eq('status', 'pending'),
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
  const latestCheckin = new Map<string, typeof checkins[0]>();
  for (const c of checkins) {
    if (!latestCheckin.has(c.resident_id)) latestCheckin.set(c.resident_id, c);
  }

  const pendingCount = new Map<string, number>();
  for (const p of proposals) {
    pendingCount.set(p.resident_id, (pendingCount.get(p.resident_id) ?? 0) + 1);
  }

  const today = new Date();

  return residents.map(r => {
    const od = r.onboarding_data ?? {};
    const c  = latestCheckin.get(r.user_id);
    const tl = c ? (DB_TO_UI[c.traffic_light as TrafficDb] ?? null) : null;

    const checkinDate = c ? new Date(c.created_at) : null;
    const checkinToday = checkinDate
      ? checkinDate.getFullYear() === today.getFullYear() &&
        checkinDate.getMonth()    === today.getMonth()    &&
        checkinDate.getDate()     === today.getDate()
      : false;

    return {
      id:             r.user_id,
      name:           r.display_name,
      initials:       od.avatar_initials ?? r.display_name.slice(0, 2).toUpperCase(),
      room:           od.room ?? '—',
      trafficLight:   tl,
      moodScore:      c ? c.mood_score : null,
      lastCheckinIso: c ? c.created_at : null,
      notePreview:    c?.note?.trim() || 'Ingen check-in i dag',
      checkinToday,
      pendingProposals: pendingCount.get(r.user_id) ?? 0,
    };
  });
}

// ── Page ──────────────────────────────────────────────────────

export default async function Resident360ViewPage() {
  const residents = await fetchResidentsOverview();

  return (
    <PortalShell>
      <ResidentOverviewGrid residents={residents} />
    </PortalShell>
  );
}
