'use client';

import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/client';

type Org = {
  id: string;
  name: string | null;
  slug: string | null;
  deactivated_at: string | null;
};

type CareStaff = {
  id: string;
  org_id: string | null;
  role: string | null;
  role_id: string | null;
};

export type IncompleteReason =
  | 'missing_org_id'
  | 'org_not_found'
  | 'org_deactivated'
  | 'no_care_staff_row';

export type AuthState =
  | { status: 'loading' }
  | { status: 'unauthenticated' }
  | { status: 'authenticated-incomplete'; user: User; reason: IncompleteReason }
  | { status: 'authenticated'; user: User; org: Org; staff: CareStaff };

export function useAuthenticatedUser(): AuthState {
  const [state, setState] = useState<AuthState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();
    if (!supabase) {
      setState({ status: 'unauthenticated' });
      return;
    }
    const client = supabase;

    async function resolve() {
      const {
        data: { user },
      } = await client.auth.getUser();

      if (!user) {
        if (!cancelled) setState({ status: 'unauthenticated' });
        return;
      }

      const orgId =
        typeof user.user_metadata?.org_id === 'string' ? user.user_metadata.org_id : null;
      if (!orgId) {
        if (!cancelled) {
          setState({ status: 'authenticated-incomplete', user, reason: 'missing_org_id' });
        }
        return;
      }

      const { data: org } = await client
        .from('organisations')
        .select('id,name,slug,deactivated_at')
        .eq('id', orgId)
        .maybeSingle<Org>();

      if (!org) {
        if (!cancelled) {
          setState({ status: 'authenticated-incomplete', user, reason: 'org_not_found' });
        }
        return;
      }

      if (org.deactivated_at) {
        if (!cancelled) {
          setState({ status: 'authenticated-incomplete', user, reason: 'org_deactivated' });
        }
        return;
      }

      const { data: staff } = await client
        .from('care_staff')
        .select('id,org_id,role,role_id')
        .eq('id', user.id)
        .eq('org_id', orgId)
        .maybeSingle<CareStaff>();

      if (!staff) {
        if (!cancelled) {
          setState({ status: 'authenticated-incomplete', user, reason: 'no_care_staff_row' });
        }
        return;
      }

      if (!cancelled) {
        setState({ status: 'authenticated', user, org, staff });
      }
    }

    void resolve();
    const { data } = client.auth.onAuthStateChange(() => {
      void resolve();
    });

    return () => {
      cancelled = true;
      data.subscription.unsubscribe();
    };
  }, []);

  return state;
}
