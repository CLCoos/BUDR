'use client';

import Link from 'next/link';
import React, { useEffect, useMemo, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

type ChecklistState = {
  ready: boolean;
  show: boolean;
  inviteDone: boolean;
  importDone: boolean;
  pinDone: boolean;
};

export default function OnboardingChecklist() {
  const [state, setState] = useState<ChecklistState>({
    ready: false,
    show: false,
    inviteDone: false,
    importDone: false,
    pinDone: false,
  });

  useEffect(() => {
    const supabase = createClient();
    if (!supabase) {
      setState((prev) => ({ ...prev, ready: true }));
      return;
    }

    void (async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setState((prev) => ({ ...prev, ready: true }));
        return;
      }

      const { data: me } = await supabase
        .from('care_staff')
        .select('org_id, role')
        .eq('id', user.id)
        .single<{ org_id: string; role: string | null }>();
      if (!me?.org_id || me.role !== 'leder') {
        setState((prev) => ({ ...prev, ready: true }));
        return;
      }

      const doneKey = `budr_onboarding_checklist_done_${me.org_id}`;
      try {
        if (localStorage.getItem(doneKey) === '1') {
          setState((prev) => ({ ...prev, ready: true }));
          return;
        }
      } catch {
        /* ignore */
      }

      const [{ count: staffCount }, { count: residentCount }, { count: pinAuditCount }] =
        await Promise.all([
          supabase
            .from('care_staff')
            .select('id', { count: 'exact', head: true })
            .eq('org_id', me.org_id),
          supabase
            .from('care_residents')
            .select('user_id', { count: 'exact', head: true })
            .eq('org_id', me.org_id),
          supabase
            .from('audit_logs')
            .select('id', { count: 'exact', head: true })
            .eq('actor_org_id', me.org_id)
            .eq('action', 'resident_pin.changed'),
        ]);

      const inviteDone = (staffCount ?? 0) > 1;
      const importDone = (residentCount ?? 0) > 0;
      const pinDone = (pinAuditCount ?? 0) > 0;
      const allDone = inviteDone && importDone && pinDone;

      if (allDone) {
        try {
          localStorage.setItem(doneKey, '1');
        } catch {
          /* ignore */
        }
      }

      setState({
        ready: true,
        show: !allDone,
        inviteDone,
        importDone,
        pinDone,
      });
    })();
  }, []);

  const progress = useMemo(() => {
    const doneCount = [state.inviteDone, state.importDone, state.pinDone].filter(Boolean).length;
    return Math.round((doneCount / 3) * 100);
  }, [state.inviteDone, state.importDone, state.pinDone]);

  if (!state.ready || !state.show) return null;

  return (
    <section
      className="mb-5 rounded-xl border p-4"
      style={{ borderColor: 'var(--cp-border)', backgroundColor: 'var(--cp-bg2)' }}
    >
      <div className="mb-3 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold" style={{ color: 'var(--cp-text)' }}>
          Kom godt i gang
        </h2>
        <span className="text-xs" style={{ color: 'var(--cp-muted)' }}>
          {progress}% fuldført
        </span>
      </div>

      <div className="mb-4 h-2 w-full rounded-full" style={{ backgroundColor: 'var(--cp-bg3)' }}>
        <div
          className="h-2 rounded-full transition-all"
          style={{ width: `${progress}%`, backgroundColor: 'var(--cp-green)' }}
        />
      </div>

      <div className="space-y-2 text-sm">
        <ChecklistRow
          done={state.inviteDone}
          href="/care-portal-dashboard/settings"
          label="Invitér en kollega"
        />
        <ChecklistRow done={state.importDone} href="/care-portal-import" label="Importér beboere" />
        <ChecklistRow done={state.pinDone} href="/care-portal-import" label="Sæt PIN" />
      </div>
    </section>
  );
}

function ChecklistRow({ done, href, label }: { done: boolean; href: string; label: string }) {
  return (
    <Link
      href={href}
      className="flex items-center justify-between rounded-lg border px-3 py-2"
      style={{ borderColor: 'var(--cp-border)', backgroundColor: 'var(--cp-bg3)' }}
    >
      <span style={{ color: 'var(--cp-text)' }}>{label}</span>
      <span
        className="text-xs font-semibold"
        style={{ color: done ? 'var(--cp-green)' : 'var(--cp-muted)' }}
      >
        {done ? '✓ Fuldført' : 'Åbn'}
      </span>
    </Link>
  );
}
