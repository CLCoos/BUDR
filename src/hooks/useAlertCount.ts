'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { resolveStaffOrgResidents } from '@/lib/staffOrgScope';

// Each hook instance gets a unique channel name to avoid Supabase
// removing a shared channel when one of several consumers unmounts.
let _instanceId = 0;

export function useAlertCount(): number {
  const [count, setCount] = useState(0);
  const instanceId = useRef<number | null>(null);
  if (instanceId.current === null) instanceId.current = ++_instanceId;

  const refresh = useCallback(async () => {
    const supabase = createClient();
    if (!supabase) return;

    const { orgId, residentIds, error: orgErr } = await resolveStaffOrgResidents(supabase);
    if (orgErr || !orgId || residentIds.length === 0) {
      setCount(0);
      return;
    }

    const { count: dbCount } = await supabase
      .from('care_portal_notifications')
      .select('id', { count: 'exact', head: true })
      .is('acknowledged_at', null)
      .in('resident_id', residentIds);

    const cutoff = new Date(Date.now() - 48 * 3600 * 1000).toISOString();
    const { data: recent } = await supabase
      .from('park_daily_checkin')
      .select('resident_id')
      .gte('created_at', cutoff)
      .in('resident_id', residentIds);

    const activeIdSet = new Set((recent ?? []).map((r) => r.resident_id));
    const inactiveCount = residentIds.filter((id) => !activeIdSet.has(id)).length;

    setCount((dbCount ?? 0) + inactiveCount);
  }, []);

  useEffect(() => {
    void refresh();

    const supabase = createClient();
    if (!supabase) return;

    // Unique channel name per instance so cleanup of one doesn't affect another
    const channelName = `alert_count_changes_${instanceId.current}`;
    const channel = supabase
      .channel(channelName)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'care_portal_notifications' },
        () => void refresh()
      )
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'park_daily_checkin' },
        () => void refresh()
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [refresh]);

  return count;
}
