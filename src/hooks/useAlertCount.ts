'use client';
import { useEffect, useState, useCallback, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';

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

    const { count: dbCount } = await supabase
      .from('care_portal_notifications')
      .select('id', { count: 'exact', head: true })
      .is('acknowledged_at', null);

    const cutoff = new Date(Date.now() - 48 * 3600 * 1000).toISOString();
    const { count: totalResidents } = await supabase
      .from('care_residents')
      .select('user_id', { count: 'exact', head: true });
    const { count: activeResidents } = await supabase
      .from('park_daily_checkin')
      .select('resident_id', { count: 'exact', head: true })
      .gte('created_at', cutoff);

    const inactiveCount = Math.max(0, (totalResidents ?? 0) - (activeResidents ?? 0));
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
      .on('postgres_changes', { event: '*', schema: 'public', table: 'care_portal_notifications' }, () => void refresh())
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'park_daily_checkin' }, () => void refresh())
      .subscribe();

    return () => { void supabase.removeChannel(channel); };
  }, [refresh]);

  return count;
}
