'use client';

import { useEffect, useState } from 'react';
import { BINGBONG_DEMO_ORG_SLUG } from '@/lib/bingbongOrg';
import { createClient } from '@/lib/supabase/client';
import { parseStaffOrgId } from '@/lib/staffOrgScope';

/** True when logged-in staff org matches BingBong demo seed (`organisations.slug`). */
export function useStaffOrgIsBingbong(): { isBingbong: boolean; ready: boolean } {
  const [state, setState] = useState<{ isBingbong: boolean; ready: boolean }>({
    isBingbong: false,
    ready: false,
  });

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    if (!supabase) {
      setState({ isBingbong: false, ready: true });
      return;
    }
    void (async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const orgId = parseStaffOrgId(session?.user?.user_metadata?.org_id);
      if (!orgId) {
        if (!cancelled) setState({ isBingbong: false, ready: true });
        return;
      }
      const { data: org } = await supabase
        .from('organisations')
        .select('slug')
        .eq('id', orgId)
        .maybeSingle();
      const slug = org && typeof org.slug === 'string' && org.slug.trim() ? org.slug.trim() : '';
      if (!cancelled) {
        setState({
          isBingbong: slug === BINGBONG_DEMO_ORG_SLUG,
          ready: true,
        });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  return state;
}
