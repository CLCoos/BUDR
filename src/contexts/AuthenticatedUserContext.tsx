'use client';

import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
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

const AuthenticatedUserContext = createContext<AuthState | null>(null);

/** Undgå setState når auth-snapshot er uændret (nye objektreferencer fra Supabase). */
function authStateUnchanged(prev: AuthState, next: AuthState): boolean {
  if (prev.status !== next.status) return false;
  if (prev.status === 'loading' || prev.status === 'unauthenticated') return true;
  if (prev.status === 'authenticated-incomplete' && next.status === 'authenticated-incomplete') {
    return prev.user.id === next.user.id && prev.reason === next.reason;
  }
  if (prev.status === 'authenticated' && next.status === 'authenticated') {
    return (
      prev.user.id === next.user.id &&
      prev.org.id === next.org.id &&
      prev.staff.id === next.staff.id &&
      prev.org.deactivated_at === next.org.deactivated_at
    );
  }
  return false;
}

function commitAuthState(setState: React.Dispatch<React.SetStateAction<AuthState>>, next: AuthState) {
  setState((prev) => (authStateUnchanged(prev, next) ? prev : next));
}

export function AuthenticatedUserProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'loading' });

  useEffect(() => {
    let cancelled = false;
    let resolveInFlight = false;
    const supabase = createClient();
    if (!supabase) {
      commitAuthState(setState, { status: 'unauthenticated' });
      return;
    }
    const client = supabase;

    async function resolve() {
      if (resolveInFlight) return;
      resolveInFlight = true;
      try {
        const {
          data: { user },
        } = await client.auth.getUser();

        if (!user) {
          if (!cancelled) commitAuthState(setState, { status: 'unauthenticated' });
          return;
        }

        const orgId =
          typeof user.user_metadata?.org_id === 'string' ? user.user_metadata.org_id : null;
        if (!orgId) {
          if (!cancelled) {
            commitAuthState(setState, {
              status: 'authenticated-incomplete',
              user,
              reason: 'missing_org_id',
            });
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
            commitAuthState(setState, {
              status: 'authenticated-incomplete',
              user,
              reason: 'org_not_found',
            });
          }
          return;
        }

        if (org.deactivated_at) {
          if (!cancelled) {
            commitAuthState(setState, {
              status: 'authenticated-incomplete',
              user,
              reason: 'org_deactivated',
            });
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
            commitAuthState(setState, {
              status: 'authenticated-incomplete',
              user,
              reason: 'no_care_staff_row',
            });
          }
          return;
        }

        if (!cancelled) {
          commitAuthState(setState, { status: 'authenticated', user, org, staff });
        }
      } finally {
        resolveInFlight = false;
      }
    }

    void resolve();
    const { data } = client.auth.onAuthStateChange((event, session) => {
      if (event === 'INITIAL_SESSION' && !session) return;
      if (event === 'TOKEN_REFRESHED') return;
      void resolve();
    });

    return () => {
      cancelled = true;
      data.subscription.unsubscribe();
    };
  }, []);

  const value = useMemo(() => state, [state]);

  return (
    <AuthenticatedUserContext.Provider value={value}>{children}</AuthenticatedUserContext.Provider>
  );
}

export function useAuthenticatedUser(): AuthState {
  const ctx = useContext(AuthenticatedUserContext);
  if (!ctx) {
    throw new Error('useAuthenticatedUser must be used within AuthenticatedUserProvider');
  }
  return ctx;
}
