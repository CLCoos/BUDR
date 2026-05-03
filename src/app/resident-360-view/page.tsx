import React from 'react';
import { redirect } from 'next/navigation';
import type { SupabaseClient } from '@supabase/supabase-js';
import PortalShell from '@/components/PortalShell';
import ResidentOverviewGrid from './components/ResidentOverviewGrid';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { parseStaffOrgId } from '@/lib/staffOrgScope';
import { formatResidentName, getInitials, type NameDisplayMode } from '@/lib/residents/formatName';
import { copenhagenStartOfTodayUtcIso, copenhagenYmd } from '@/lib/copenhagenDay';
import { DB_TO_UI, type ResidentItem, type TrafficDb } from './residentOverviewTypes';

async function fetchResidentsOverview(
  supabase: SupabaseClient,
  orgId: string,
  mode: NameDisplayMode
): Promise<ResidentItem[]> {
  const now = new Date();
  const todayStart = copenhagenStartOfTodayUtcIso(now);
  const todayYmd = copenhagenYmd(now);

  const [residentsRes, checkinsRes, proposalsRes] = await Promise.all([
    supabase
      .from('care_residents')
      .select('user_id, first_name, last_name, display_name, onboarding_data')
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
    first_name: string | null;
    last_name: string | null;
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

  const latestCheckin = new Map<string, (typeof checkins)[0]>();
  for (const c of checkins) {
    if (!latestCheckin.has(c.resident_id)) latestCheckin.set(c.resident_id, c);
  }

  const pendingCount = new Map<string, number>();
  for (const p of proposals) {
    pendingCount.set(p.resident_id, (pendingCount.get(p.resident_id) ?? 0) + 1);
  }

  return residents.map((r) => {
    const od = r.onboarding_data ?? {};
    const c = latestCheckin.get(r.user_id);
    const tl = c ? (DB_TO_UI[c.traffic_light as TrafficDb] ?? null) : null;

    const checkinToday = c ? copenhagenYmd(new Date(c.created_at)) === todayYmd : false;

    const fn = (r.first_name ?? '').trim();
    const ln = (r.last_name ?? '').trim();
    const nameFieldsMissing = !fn && !ln;

    return {
      id: r.user_id,
      name: formatResidentName(r, mode),
      initials:
        typeof od.avatar_initials === 'string' && od.avatar_initials.trim()
          ? od.avatar_initials.toUpperCase()
          : getInitials(r),
      room: od.room ?? '—',
      house: od.house ?? '—',
      trafficLight: tl,
      moodScore: c ? c.mood_score : null,
      lastCheckinIso: c ? c.created_at : null,
      notePreview: c?.note?.trim() || 'Ingen check-in i dag',
      checkinToday,
      pendingProposals: pendingCount.get(r.user_id) ?? 0,
      nameFieldsMissing,
    };
  });
}

export default async function Resident360ViewPage() {
  const supabase = await createServerSupabaseClient();
  if (!supabase) redirect('/care-portal-login?err=config');
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/care-portal-login');

  const orgId = parseStaffOrgId(user.user_metadata?.org_id);
  if (!orgId) redirect('/care-portal-dashboard/settings');

  const { data: org } = await supabase
    .from('organisations')
    .select('resident_name_display_mode')
    .eq('id', orgId)
    .maybeSingle();
  const mode: NameDisplayMode =
    org?.resident_name_display_mode === 'full_name' ||
    org?.resident_name_display_mode === 'initials_only'
      ? org.resident_name_display_mode
      : 'first_name_initial';

  const residents = await fetchResidentsOverview(supabase, orgId, mode);

  return (
    <PortalShell>
      <ResidentOverviewGrid residents={residents} orgId={orgId} />
    </PortalShell>
  );
}
