'use client';

import React, { useEffect, useState } from 'react';
import { PhoneCall } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { parseStaffOrgId } from '@/lib/staffOrgScope';
import { logPortalAudit } from '@/lib/auditClient';

type ShiftKey = 'day' | 'evening' | 'night';
type OnCallRow = {
  id: string;
  shift: ShiftKey;
  phone: string;
  staff_id: string;
};

const SHIFT_LABELS: Record<ShiftKey, string> = {
  day: 'Dag (06:00-14:00)',
  evening: 'Aften (14:00-22:00)',
  night: 'Nat (22:00-06:00)',
};

export default function OnCallStaffWidget() {
  const [orgId, setOrgId] = useState<string | null>(null);
  const [staffId, setStaffId] = useState<string | null>(null);
  const [staffName, setStaffName] = useState('Personale');
  const [rows, setRows] = useState<OnCallRow[]>([]);
  const [phoneByShift, setPhoneByShift] = useState<Record<ShiftKey, string>>({
    day: '',
    evening: '',
    night: '',
  });
  const [savingShift, setSavingShift] = useState<ShiftKey | null>(null);

  const today = new Date().toISOString().slice(0, 10);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const supabase = createClient();
      if (!supabase) return;
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const user = session?.user;
      if (!user) return;
      const foundOrgId = parseStaffOrgId(user.user_metadata?.org_id);
      if (!foundOrgId) return;
      if (cancelled) return;
      setOrgId(foundOrgId);
      setStaffId(user.id);
      const displayName =
        typeof user.user_metadata?.display_name === 'string' &&
        user.user_metadata.display_name.trim()
          ? user.user_metadata.display_name.trim()
          : (user.email?.split('@')[0] ?? 'Personale');
      setStaffName(displayName);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      if (!orgId) return;
      const supabase = createClient();
      if (!supabase) return;
      const { data, error } = await supabase
        .from('on_call_staff')
        .select('id, shift, phone, staff_id')
        .eq('org_id', orgId)
        .eq('date', today);
      if (cancelled) return;
      if (error) {
        setRows([]);
        return;
      }
      const typed = (data ?? []) as OnCallRow[];
      setRows(typed);
      setPhoneByShift({
        day: typed.find((r) => r.shift === 'day')?.phone ?? '',
        evening: typed.find((r) => r.shift === 'evening')?.phone ?? '',
        night: typed.find((r) => r.shift === 'night')?.phone ?? '',
      });
    })();
    return () => {
      cancelled = true;
    };
  }, [orgId, today]);

  const saveShift = async (shift: ShiftKey) => {
    if (!orgId || !staffId) {
      toast.error('Mangler org/staff kontekst');
      return;
    }
    const phone = phoneByShift[shift].trim();
    if (!phone) {
      toast.error('Telefonnummer mangler');
      return;
    }
    const supabase = createClient();
    if (!supabase) return;
    setSavingShift(shift);
    const { error } = await supabase.from('on_call_staff').upsert(
      {
        org_id: orgId,
        staff_id: staffId,
        phone,
        date: today,
        shift,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'org_id,date,shift' }
    );
    setSavingShift(null);
    if (error) {
      toast.error('Kunne ikke gemme vagthavende');
      return;
    }
    void logPortalAudit({
      action: 'daily_plan.updated',
      tableName: 'on_call_staff',
      metadata: { org_id: orgId, date: today, shift },
    });
    toast.success('Vagthavende gemt');
    const { data } = await supabase
      .from('on_call_staff')
      .select('id, shift, phone, staff_id')
      .eq('org_id', orgId)
      .eq('date', today);
    setRows((data ?? []) as OnCallRow[]);
  };

  const clearShift = async (shift: ShiftKey) => {
    if (!orgId) return;
    const supabase = createClient();
    if (!supabase) return;
    const current = rows.find((r) => r.shift === shift);
    if (!current) return;
    const { error } = await supabase.from('on_call_staff').delete().eq('id', current.id);
    if (error) {
      toast.error('Kunne ikke fjerne vagthavende');
      return;
    }
    void logPortalAudit({
      action: 'daily_plan.updated',
      tableName: 'on_call_staff',
      recordId: current.id,
      metadata: { operation: 'delete', shift },
    });
    toast.success('Vagthavende fjernet');
    setRows((prev) => prev.filter((r) => r.id !== current.id));
  };

  return (
    <section className="cp-card-elevated p-4" aria-label="Vagthavende personale">
      <div className="flex items-center gap-2 mb-3">
        <PhoneCall size={16} style={{ color: 'var(--cp-blue)' }} />
        <h3 className="text-sm font-semibold" style={{ color: 'var(--cp-text)' }}>
          Vagthavende i dag
        </h3>
      </div>
      <p className="text-xs mb-3" style={{ color: 'var(--cp-muted)' }}>
        Bruges af borgerens kriseflow trin 3. Navn: {staffName}.
      </p>
      <div className="space-y-3">
        {(Object.keys(SHIFT_LABELS) as ShiftKey[]).map((shift) => {
          const active = rows.some((r) => r.shift === shift);
          return (
            <div
              key={shift}
              className="rounded-lg border p-3"
              style={{ borderColor: 'var(--cp-border)', backgroundColor: 'var(--cp-bg3)' }}
            >
              <p className="text-xs font-semibold mb-2" style={{ color: 'var(--cp-muted)' }}>
                {SHIFT_LABELS[shift]}
              </p>
              <div className="flex gap-2">
                <input
                  value={phoneByShift[shift]}
                  onChange={(e) =>
                    setPhoneByShift((prev) => ({ ...prev, [shift]: e.target.value }))
                  }
                  placeholder="Telefonnummer"
                  className="flex-1 rounded-md border px-2.5 py-1.5 text-xs"
                />
                <button
                  type="button"
                  onClick={() => void saveShift(shift)}
                  disabled={savingShift === shift}
                  className="rounded-md bg-[#0F1B2D] px-2.5 py-1.5 text-xs font-semibold text-white disabled:opacity-40"
                >
                  {savingShift === shift ? 'Gemmer…' : active ? 'Opdatér' : 'Sæt vagt'}
                </button>
                {active && (
                  <button
                    type="button"
                    onClick={() => void clearShift(shift)}
                    className="rounded-md border px-2.5 py-1.5 text-xs font-semibold text-gray-600"
                  >
                    Fjern
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
