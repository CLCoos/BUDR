'use client';

import { useCallback, useEffect, useState } from 'react';
import type { StaffMessageStatus } from '@/lib/lys/iDag';
import { copenhagenOnCallShift } from '@/lib/onCallStaff';
import { DEMO_ON_CALL, readDemoStaffMessage } from '../components/lysUi';

/**
 * Seneste besked til personalet og om den er set. Henter igen hvert halve minut.
 * Demo: læses fra browseren, så kvitteringen kan vises uden en rigtig portal.
 */
export function useStaffReceipt(demo: boolean) {
  const [status, setStatus] = useState<StaffMessageStatus | null>(null);

  const load = useCallback(() => {
    if (demo) {
      setStatus(
        readDemoStaffMessage(DEMO_ON_CALL[copenhagenOnCallShift(new Date())].split(' ')[0]!)
      );
      return;
    }
    void fetch('/api/lys/message-staff', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : { latest: null }))
      .then((d: { latest?: StaffMessageStatus | null }) => setStatus(d.latest ?? null))
      .catch(() => undefined);
  }, [demo]);

  useEffect(() => {
    load();
    const t = window.setInterval(load, 30_000);
    return () => window.clearInterval(t);
  }, [load]);

  return { status, setStatus, reload: load };
}
