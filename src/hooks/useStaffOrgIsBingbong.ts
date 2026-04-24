'use client';

import { useEffect, useState } from 'react';
import { BINGBONG_DEMO_ORG_SLUG } from '@/lib/bingbongOrg';
import { createClient } from '@/lib/supabase/client';
import { useAuthenticatedUser } from '@/lib/auth/useAuthenticatedUser';

/** True when logged-in staff org matches BingBong demo seed (`organisations.slug`). */
export function useStaffOrgIsBingbong(): { isBingbong: boolean; ready: boolean } {
  const authState = useAuthenticatedUser();
  const [state, setState] = useState<{ isBingbong: boolean; ready: boolean }>({
    isBingbong: false,
    ready: false,
  });

  useEffect(() => {
    let cancelled = false;
    if (authState.status === 'loading') return;
    if (authState.status !== 'authenticated') {
      setState({ isBingbong: false, ready: true });
      return;
    }
    const supabase = createClient();
    if (!supabase) {
      setState({ isBingbong: false, ready: true });
      return;
    }
    void (async () => {
      const { data: org } = await supabase
        .from('organisations')
        .select('slug')
        .eq('id', authState.org.id)
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
  }, [authState]);

  return state;
}
