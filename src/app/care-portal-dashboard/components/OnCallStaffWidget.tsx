'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ChevronDown, Loader2, PhoneCall, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { resolveStaffOrgResidents } from '@/lib/staffOrgScope';
import {
  DEMO_ON_CALL_STAFF,
  ON_CALL_SHIFT_KEYS,
  ON_CALL_SHIFT_LABELS,
  buildOnCallUpsertRow,
  copenhagenOnCallShift,
  demoOnCallDraft,
  draftFromAssignments,
  emptyOnCallDraft,
  formatDanishPhoneDisplay,
  normalizeDanishPhone,
  onCallShiftDate,
  type OnCallDraft,
  type OnCallShiftKey,
  type OnCallStaffOption,
  assignmentMapFromRows,
} from '@/lib/onCallStaff';

const INPUT_STYLE: React.CSSProperties = {
  backgroundColor: 'var(--cp-bg2)',
  border: '1px solid var(--cp-border2)',
  color: 'var(--cp-text)',
  borderRadius: 8,
  width: '100%',
  padding: '0.5rem 0.75rem',
  fontSize: '0.8125rem',
  outline: 'none',
};

type Props = {
  /** Demo-dashboard: simulerede numre, ingen Supabase. */
  demoMode?: boolean;
};

export default function OnCallStaffWidget({ demoMode = false }: Props) {
  const today = onCallShiftDate();
  const currentShift = copenhagenOnCallShift();
  const [draft, setDraft] = useState<OnCallDraft>(() =>
    demoMode ? demoOnCallDraft(today) : emptyOnCallDraft()
  );
  const [staffOptions, setStaffOptions] = useState<OnCallStaffOption[]>(
    demoMode ? DEMO_ON_CALL_STAFF : []
  );
  const [loading, setLoading] = useState(!demoMode);
  const [refreshing, setRefreshing] = useState(false);
  const [scopeError, setScopeError] = useState<string | null>(null);
  const [savingShift, setSavingShift] = useState<OnCallShiftKey | null>(null);
  const [orgId, setOrgId] = useState<string | null>(null);

  const loadLive = useCallback(async () => {
    const supabase = createClient();
    if (!supabase) {
      setScopeError('Kunne ikke oprette forbindelse');
      setDraft(emptyOnCallDraft());
      setStaffOptions([]);
      setOrgId(null);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    const { orgId: resolvedOrg, error: orgErr } = await resolveStaffOrgResidents(supabase);
    if (orgErr || !resolvedOrg) {
      setScopeError(
        orgErr === 'no_session'
          ? 'Log ind for at sætte vagthavende'
          : 'Ingen organisation tilknyttet din bruger'
      );
      setDraft(emptyOnCallDraft());
      setStaffOptions([]);
      setOrgId(null);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    const dateYmd = onCallShiftDate();
    const [{ data: staffRows, error: staffErr }, { data: onCallRows, error: onErr }] =
      await Promise.all([
        supabase
          .from('care_staff')
          .select('id, full_name')
          .eq('org_id', resolvedOrg)
          .order('full_name'),
        supabase
          .from('on_call_staff')
          .select('staff_id, phone, shift')
          .eq('org_id', resolvedOrg)
          .eq('date', dateYmd),
      ]);

    if (staffErr || onErr) {
      setScopeError(staffErr?.message ?? onErr?.message ?? 'Kunne ikke hente vagthavende');
      setDraft(emptyOnCallDraft());
      setStaffOptions([]);
      setOrgId(resolvedOrg);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    const options: OnCallStaffOption[] = (staffRows ?? [])
      .map((row) => {
        const r = row as { id: string; full_name: string | null };
        return { id: r.id, fullName: (r.full_name ?? '').trim() || 'Medarbejder' };
      })
      .filter((row) => row.id);

    setOrgId(resolvedOrg);
    setStaffOptions(options);
    setDraft(draftFromAssignments(assignmentMapFromRows(onCallRows ?? [])));
    setScopeError(null);
    setLoading(false);
    setRefreshing(false);
  }, []);

  useEffect(() => {
    if (demoMode) return;
    void loadLive();
  }, [demoMode, loadLive]);

  const staffNameById = useMemo(() => {
    const m = new Map<string, string>();
    for (const s of staffOptions) m.set(s.id, s.fullName);
    return m;
  }, [staffOptions]);

  const updateDraft = (shift: OnCallShiftKey, patch: Partial<OnCallDraft[OnCallShiftKey]>) => {
    setDraft((prev) => ({ ...prev, [shift]: { ...prev[shift], ...patch } }));
  };

  const handleSave = async (shift: OnCallShiftKey) => {
    if (demoMode) {
      const phone = normalizeDanishPhone(draft[shift].phone);
      if (!draft[shift].staffId) {
        toast.error('Vælg en medarbejder');
        return;
      }
      if (!phone) {
        toast.error('Telefon skal være et dansk 8-cifret nummer');
        return;
      }
      updateDraft(shift, { phone: formatDanishPhoneDisplay(phone) });
      toast.success('Gemt i demo (ikke synligt for borgere)');
      return;
    }

    if (!orgId) {
      toast.error('Ingen organisation');
      return;
    }
    const row = buildOnCallUpsertRow({
      orgId,
      staffId: draft[shift].staffId,
      phone: draft[shift].phone,
      dateYmd: onCallShiftDate(),
      shift,
      allowedStaffIds: staffOptions.map((s) => s.id),
    });
    if ('error' in row) {
      toast.error(row.error);
      return;
    }

    const supabase = createClient();
    if (!supabase) {
      toast.error('Kunne ikke oprette forbindelse');
      return;
    }

    setSavingShift(shift);
    const { data: existing, error: existingErr } = await supabase
      .from('on_call_staff')
      .select('id')
      .eq('org_id', row.org_id)
      .eq('date', row.date)
      .eq('shift', row.shift)
      .maybeSingle();

    let saveErr = existingErr;
    if (!saveErr && existing && typeof (existing as { id?: string }).id === 'string') {
      const { error } = await supabase
        .from('on_call_staff')
        .update({
          staff_id: row.staff_id,
          phone: row.phone,
          updated_at: row.updated_at,
        })
        .eq('id', (existing as { id: string }).id);
      saveErr = error;
    } else if (!saveErr) {
      const { error } = await supabase.from('on_call_staff').insert(row);
      saveErr = error;
    }

    setSavingShift(null);
    if (saveErr) {
      toast.error(saveErr.message || 'Kunne ikke gemme vagthavende');
      return;
    }
    updateDraft(shift, { phone: formatDanishPhoneDisplay(row.phone) });
    toast.success(`${ON_CALL_SHIFT_LABELS[shift]} gemt — synligt i Lys kriseflow`);
  };

  return (
    <section className="cp-card-elevated p-4" aria-label="Vagthavende personale">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="flex items-start gap-2">
          <PhoneCall size={16} className="mt-0.5 shrink-0" style={{ color: 'var(--cp-blue)' }} />
          <div>
            <h3 className="text-sm font-semibold" style={{ color: 'var(--cp-text)' }}>
              Vagthavende i dag
            </h3>
            <p className="text-xs" style={{ color: 'var(--cp-muted)' }}>
              {demoMode
                ? 'Demo: simulerede numre — gemmes ikke til borgerens kriseflow.'
                : 'Gemmes i Care Portal og vises i borgerens kriseflow (trin 3) og Lys-vagtplan.'}
            </p>
          </div>
        </div>
        {!demoMode ? (
          <button
            type="button"
            onClick={() => {
              setRefreshing(true);
              void loadLive();
            }}
            disabled={loading || refreshing}
            className="inline-flex items-center rounded-lg border px-2 py-1.5 text-xs disabled:opacity-50"
            style={{ borderColor: 'var(--cp-border)', color: 'var(--cp-muted)' }}
            aria-label="Opdater vagthavende"
          >
            {refreshing ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" aria-hidden />
            )}
          </button>
        ) : null}
      </div>

      {loading ? (
        <p className="text-xs" style={{ color: 'var(--cp-muted)' }}>
          Henter dagens vagthavende…
        </p>
      ) : null}

      {!loading && scopeError ? (
        <p className="mb-3 text-xs" style={{ color: 'var(--cp-red)' }}>
          {scopeError}
        </p>
      ) : null}

      {!loading && !scopeError && !demoMode && staffOptions.length === 0 ? (
        <p className="mb-3 text-xs" style={{ color: 'var(--cp-muted)' }}>
          Ingen medarbejdere i organisationen — tilføj personale før vagthavende kan sættes.
        </p>
      ) : null}

      {!loading && (!scopeError || demoMode) ? (
        <div className="space-y-3">
          {ON_CALL_SHIFT_KEYS.map((shift) => {
            const isCurrent = shift === currentShift;
            const savedPhone = normalizeDanishPhone(draft[shift].phone);
            const savedName = staffNameById.get(draft[shift].staffId);
            return (
              <div
                key={shift}
                className="rounded-lg border p-3"
                style={{
                  borderColor: isCurrent ? 'var(--cp-green)' : 'var(--cp-border)',
                  backgroundColor: 'var(--cp-bg3)',
                }}
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="text-xs font-semibold" style={{ color: 'var(--cp-muted)' }}>
                    {ON_CALL_SHIFT_LABELS[shift]}
                    {isCurrent ? ' · nu' : ''}
                  </p>
                  {savedPhone && savedName ? (
                    <a
                      href={`tel:+45${savedPhone}`}
                      className="text-xs font-medium underline-offset-2 hover:underline"
                      style={{ color: 'var(--cp-blue)' }}
                    >
                      {formatDanishPhoneDisplay(savedPhone)}
                    </a>
                  ) : (
                    <span className="text-xs" style={{ color: 'var(--cp-muted)' }}>
                      Ikke sat
                    </span>
                  )}
                </div>
                <div className="space-y-2">
                  <div className="relative">
                    <label htmlFor={`oncall-staff-${shift}`} className="sr-only">
                      Medarbejder, {ON_CALL_SHIFT_LABELS[shift]}
                    </label>
                    <select
                      id={`oncall-staff-${shift}`}
                      value={draft[shift].staffId}
                      onChange={(e) => updateDraft(shift, { staffId: e.target.value })}
                      style={{ ...INPUT_STYLE, paddingRight: '2rem', appearance: 'none' }}
                    >
                      <option value="">Vælg medarbejder</option>
                      {staffOptions.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.fullName}
                        </option>
                      ))}
                    </select>
                    <ChevronDown
                      className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2"
                      style={{ color: 'var(--cp-muted2)' }}
                      aria-hidden
                    />
                  </div>
                  <label htmlFor={`oncall-phone-${shift}`} className="sr-only">
                    Telefon, {ON_CALL_SHIFT_LABELS[shift]}
                  </label>
                  <input
                    id={`oncall-phone-${shift}`}
                    type="tel"
                    inputMode="tel"
                    autoComplete="tel"
                    placeholder="12 34 56 78"
                    value={draft[shift].phone}
                    onChange={(e) => updateDraft(shift, { phone: e.target.value })}
                    style={INPUT_STYLE}
                  />
                  <button
                    type="button"
                    onClick={() => void handleSave(shift)}
                    disabled={savingShift === shift}
                    className="w-full rounded-lg px-3 py-1.5 text-xs font-semibold text-white disabled:opacity-50"
                    style={{ backgroundColor: 'var(--cp-green)' }}
                  >
                    {savingShift === shift ? 'Gemmer…' : 'Gem skift'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
    </section>
  );
}
