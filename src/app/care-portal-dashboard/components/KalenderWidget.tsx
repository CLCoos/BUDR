'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, Clock, Loader2, MapPin, Plus, User } from 'lucide-react';
import { toast } from 'sonner';
import type { CareHouse } from '@/lib/careDemoResidents';
import { CARE_DEMO_RESIDENT_PROFILES, careDemoProfileById } from '@/lib/careDemoResidents';
import { createClient } from '@/lib/supabase/client';
import { resolveStaffOrgResidents } from '@/lib/staffOrgScope';
import { isResidentUuidForCloud } from '@/lib/residentUuid';
import { useCarePortalDepartment } from '@/contexts/CarePortalDepartmentContext';
import { onboardingHouseToCareHouse } from '@/lib/carePortalHouse';
import {
  buildPlannerInsertRow,
  isPlannerAppointmentType,
  isPlannerHouse,
  parsePlannerEntry,
  plannerDayWindow,
  plannerInsertNeedsColumnFallback,
  plannerInsertWithoutExtendedColumns,
  type PlannerAppointmentType,
} from '@/lib/plannerEntries';

export type { CareHouse } from '@/lib/careDemoResidents';

const APPT_TYPES = [
  { id: 'laege', label: 'Læge/Psykiater', color: 'var(--cp-blue)' },
  { id: 'aktivitet', label: 'Aktivitet', color: 'var(--cp-green)' },
  { id: 'intern', label: 'Intern møde', color: 'var(--cp-blue)' },
  { id: 'transport', label: 'Transport', color: 'var(--cp-amber)' },
  { id: 'andet', label: 'Andet', color: 'var(--cp-muted)' },
] as const;

export type AppointmentTypeId = (typeof APPT_TYPES)[number]['id'];

export interface CareAppointment {
  id: string;
  title: string;
  scheduledAt: Date;
  type: AppointmentTypeId;
  residentId: string | null;
  residentName: string | null;
  residentInitials: string | null;
  house: CareHouse;
  location: string;
  responsible: string;
}

type ResidentOption = { id: string; name: string; initials: string; house: CareHouse };

const DEMO_RESIDENT_OPTIONS: ResidentOption[] = CARE_DEMO_RESIDENT_PROFILES.map((r) => ({
  id: r.id,
  name: r.displayName,
  initials: r.initials,
  house: r.house,
}));

function formatDanishLongDate(d: Date): string {
  const wd = d.toLocaleDateString('da-DK', { weekday: 'long' });
  const cap = wd.charAt(0).toUpperCase() + wd.slice(1);
  return `${cap} d. ${d.getDate()}. ${d.toLocaleDateString('da-DK', { month: 'long' })} ${d.getFullYear()}`;
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString('da-DK', { hour: '2-digit', minute: '2-digit', hour12: false });
}

function typeColor(type: AppointmentTypeId): string {
  return APPT_TYPES.find((t) => t.id === type)?.color ?? 'var(--cp-muted)';
}

function todayAt(day: Date, h: number, m: number): Date {
  const t = new Date(day);
  t.setHours(h, m, 0, 0);
  return t;
}

function createMockAppointments(day: Date): CareAppointment[] {
  const p = (id: string) => careDemoProfileById(id);
  return [
    {
      id: 'cal-001',
      title: 'Statusmøde med kontaktpædagog',
      scheduledAt: todayAt(day, 10, 30),
      type: 'intern',
      residentId: 'res-sara',
      residentName: p('res-sara')?.displayName ?? null,
      residentInitials: p('res-sara')?.initials ?? null,
      house: p('res-sara')?.house ?? 'A',
      location: 'Mødelokale',
      responsible: 'Lars N.',
    },
    {
      id: 'cal-002',
      title: 'Gåtur med kontaktpædagog',
      scheduledAt: todayAt(day, 10, 30),
      type: 'aktivitet',
      residentId: 'res-sara',
      residentName: p('res-sara')?.displayName ?? null,
      residentInitials: p('res-sara')?.initials ?? null,
      house: p('res-sara')?.house ?? 'A',
      location: 'Gården',
      responsible: 'Lars N.',
    },
    {
      id: 'cal-003',
      title: 'Samtale kontaktperson',
      scheduledAt: todayAt(day, 11, 0),
      type: 'intern',
      residentId: 'res-camilla',
      residentName: p('res-camilla')?.displayName ?? null,
      residentInitials: p('res-camilla')?.initials ?? null,
      house: p('res-camilla')?.house ?? 'B',
      location: 'Stue 211',
      responsible: 'Lars N.',
    },
    {
      id: 'cal-004',
      title: 'Behandler — telefon',
      scheduledAt: todayAt(day, 11, 0),
      type: 'laege',
      residentId: 'res-mikkel',
      residentName: p('res-mikkel')?.displayName ?? null,
      residentInitials: p('res-mikkel')?.initials ?? null,
      house: p('res-mikkel')?.house ?? 'A',
      location: 'Privat rum',
      responsible: 'Region psykiatri',
    },
    {
      id: 'cal-005',
      title: 'Gåtur i gården',
      scheduledAt: todayAt(day, 11, 0),
      type: 'aktivitet',
      residentId: 'res-anders',
      residentName: p('res-anders')?.displayName ?? null,
      residentInitials: p('res-anders')?.initials ?? null,
      house: p('res-anders')?.house ?? 'A',
      location: 'Udendørs',
      responsible: 'Dagvagt',
    },
    {
      id: 'cal-006',
      title: 'Fælles quiz',
      scheduledAt: todayAt(day, 10, 0),
      type: 'aktivitet',
      residentId: 'res-mette',
      residentName: p('res-mette')?.displayName ?? null,
      residentInitials: p('res-mette')?.initials ?? null,
      house: p('res-mette')?.house ?? 'B',
      location: 'Fællesstue Hus B',
      responsible: 'Aktivitet',
    },
    {
      id: 'cal-007',
      title: 'Introduktion til fællesrum',
      scheduledAt: todayAt(day, 8, 30),
      type: 'aktivitet',
      residentId: 'res-jonas',
      residentName: p('res-jonas')?.displayName ?? null,
      residentInitials: p('res-jonas')?.initials ?? null,
      house: p('res-jonas')?.house ?? 'C',
      location: 'Fællesrum Hus C',
      responsible: 'Kontaktperson',
    },
    {
      id: 'cal-008',
      title: 'Vagtoverdragelse',
      scheduledAt: todayAt(day, 14, 0),
      type: 'intern',
      residentId: null,
      residentName: null,
      residentInitials: null,
      house: 'A',
      location: 'Kontor',
      responsible: 'Alle team',
    },
  ];
}

const INPUT_STYLE: React.CSSProperties = {
  backgroundColor: 'var(--cp-bg3)',
  border: '1px solid var(--cp-border2)',
  color: 'var(--cp-text)',
  borderRadius: 8,
  width: '100%',
  padding: '0.5rem 0.75rem',
  fontSize: '0.875rem',
  outline: 'none',
  colorScheme: 'dark',
};

type KalenderWidgetProps = {
  /** `demo` = mock aftaler + demo-beboere. `live` = org-aftaler i `care_planner_entries`. */
  variant?: 'live' | 'demo';
};

function residentOptionFromRow(row: {
  user_id: unknown;
  display_name: unknown;
  onboarding_data: unknown;
}): ResidentOption | null {
  const id = String(row.user_id ?? '');
  if (!isResidentUuidForCloud(id)) return null;
  const od = (row.onboarding_data ?? {}) as Record<string, unknown>;
  const name = String(row.display_name ?? '').trim() || '—';
  const rawIni = od.avatar_initials;
  const initials =
    typeof rawIni === 'string' && rawIni.trim().length > 0
      ? rawIni.trim().toUpperCase().slice(0, 4)
      : name.slice(0, 2).toUpperCase();
  return {
    id,
    name,
    initials,
    house: onboardingHouseToCareHouse(od.house),
  };
}

function appointmentFromPlannerRow(
  row: Record<string, unknown>,
  residents: ResidentOption[]
): CareAppointment | null {
  const parsed = parsePlannerEntry(row);
  if (!parsed) return null;
  const scheduledAt = new Date(parsed.startsAtIso);
  if (Number.isNaN(scheduledAt.getTime())) return null;
  const res = parsed.residentUserId
    ? (residents.find((r) => r.id === parsed.residentUserId) ?? null)
    : null;
  const house: CareHouse = parsed.house ? parsed.house : (res?.house ?? 'A');
  return {
    id: parsed.id,
    title: parsed.title,
    scheduledAt,
    type: parsed.type,
    residentId: res?.id ?? parsed.residentUserId,
    residentName: res?.name ?? null,
    residentInitials: res?.initials ?? null,
    house,
    location: parsed.location,
    responsible: parsed.responsible,
  };
}

export default function KalenderWidget({ variant = 'live' }: KalenderWidgetProps) {
  const { department: houseFilter } = useCarePortalDepartment();
  const [hydrated, setHydrated] = useState(false);
  const [today, setToday] = useState<Date>(() => new Date());
  const [appointments, setAppointments] = useState<CareAppointment[]>([]);
  const [residentOptions, setResidentOptions] = useState<ResidentOption[]>(DEMO_RESIDENT_OPTIONS);
  const [orgId, setOrgId] = useState<string | null>(null);
  const [scopeError, setScopeError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [residentFilter, setResidentFilter] = useState<string>('alle');
  const [showForm, setShowForm] = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [formTime, setFormTime] = useState('12:00');
  const [formType, setFormType] = useState<AppointmentTypeId>('aktivitet');
  const [formResidentId, setFormResidentId] = useState('');
  const [formResponsible, setFormResponsible] = useState('');
  const [formLocation, setFormLocation] = useState('');

  const demoCalendarSeed = useMemo(() => {
    const d = new Date();
    return {
      today: d,
      appointments: createMockAppointments(d),
      residents: DEMO_RESIDENT_OPTIONS,
    };
  }, []);

  useEffect(() => {
    if (variant !== 'demo') return;
    setToday((prev) => (prev === demoCalendarSeed.today ? prev : demoCalendarSeed.today));
    setAppointments((prev) =>
      prev === demoCalendarSeed.appointments ? prev : demoCalendarSeed.appointments
    );
    setResidentOptions((prev) =>
      prev === demoCalendarSeed.residents ? prev : demoCalendarSeed.residents
    );
    setOrgId(null);
    setScopeError((e) => (e === null ? e : null));
    setHydrated((h) => (h ? h : true));
  }, [variant, demoCalendarSeed]);

  const loadLive = useCallback(async () => {
    const d = new Date();
    setToday(d);

    const supabase = createClient();
    if (!supabase) {
      setScopeError('Kunne ikke oprette forbindelse');
      setOrgId(null);
      setAppointments([]);
      setResidentOptions([]);
      setHydrated(true);
      return;
    }

    const {
      orgId: resolvedOrg,
      error: orgErr,
      queryMessage,
    } = await resolveStaffOrgResidents(supabase);
    if (orgErr || !resolvedOrg) {
      setScopeError(
        orgErr === 'no_org'
          ? 'Organisation mangler på din bruger — kontakt administrator'
          : orgErr === 'no_session'
            ? 'Log ind for at se aftaler'
            : (queryMessage ?? 'Kunne ikke hente organisation')
      );
      setOrgId(null);
      setAppointments([]);
      setResidentOptions([]);
      setHydrated(true);
      return;
    }

    setOrgId(resolvedOrg);
    setScopeError(null);

    const { data: rows, error: resErr } = await supabase
      .from('care_residents')
      .select('user_id, display_name, onboarding_data')
      .eq('org_id', resolvedOrg)
      .order('display_name');

    if (resErr) {
      setScopeError(resErr.message);
      setAppointments([]);
      setResidentOptions([]);
      setHydrated(true);
      return;
    }

    const opts: ResidentOption[] = [];
    for (const row of rows ?? []) {
      const opt = residentOptionFromRow(
        row as {
          user_id: unknown;
          display_name: unknown;
          onboarding_data: unknown;
        }
      );
      if (opt) opts.push(opt);
    }
    setResidentOptions(opts);

    const window = plannerDayWindow(d);
    const { data: entryRows, error: entryErr } = await supabase
      .from('care_planner_entries')
      .select('id, title, category, starts_at, resident_user_id, location, responsible, house')
      .eq('org_id', resolvedOrg)
      .gte('starts_at', window.startIso)
      .lt('starts_at', window.endIso)
      .order('starts_at', { ascending: true });

    if (entryErr) {
      if (/column .* does not exist/i.test(entryErr.message)) {
        const { data: fallbackRows, error: fallbackErr } = await supabase
          .from('care_planner_entries')
          .select('id, title, category, starts_at, resident_user_id')
          .eq('org_id', resolvedOrg)
          .gte('starts_at', window.startIso)
          .lt('starts_at', window.endIso)
          .order('starts_at', { ascending: true });
        if (fallbackErr) {
          setScopeError(
            `${fallbackErr.message} — kør seneste Supabase-migration (care_planner_entries).`
          );
          setAppointments([]);
        } else {
          setAppointments(
            (fallbackRows ?? [])
              .map((row) => appointmentFromPlannerRow((row ?? {}) as Record<string, unknown>, opts))
              .filter((a): a is CareAppointment => a !== null)
          );
        }
      } else {
        setScopeError(entryErr.message);
        setAppointments([]);
      }
    } else {
      setAppointments(
        (entryRows ?? [])
          .map((row) => appointmentFromPlannerRow((row ?? {}) as Record<string, unknown>, opts))
          .filter((a): a is CareAppointment => a !== null)
      );
    }

    setHydrated(true);
  }, []);

  useEffect(() => {
    if (variant === 'demo') return;
    void loadLive();
  }, [variant, loadLive]);

  const dateLabel = useMemo(() => formatDanishLongDate(today), [today]);

  const filtered = useMemo(() => {
    let list = [...appointments].sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());
    if (houseFilter !== 'alle') list = list.filter((a) => a.house === houseFilter);
    if (residentFilter !== 'alle') list = list.filter((a) => a.residentId === residentFilter);
    return list;
  }, [appointments, houseFilter, residentFilter]);

  const resetForm = useCallback(() => {
    setFormTitle('');
    setFormTime('12:00');
    setFormType('aktivitet');
    setFormResidentId('');
    setFormResponsible('');
    setFormLocation('');
    setShowForm(false);
  }, []);

  const addAppointment = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!formTitle.trim() || !formResponsible.trim()) return;
      const [hh, mm] = formTime.split(':').map(Number);
      const scheduledAt = new Date(today);
      scheduledAt.setHours(hh ?? 12, mm ?? 0, 0, 0);
      const res = formResidentId ? residentOptions.find((r) => r.id === formResidentId) : null;
      const house = res?.house ?? (houseFilter !== 'alle' ? houseFilter : 'A');
      const type: PlannerAppointmentType = isPlannerAppointmentType(formType) ? formType : 'andet';

      if (variant === 'demo') {
        setAppointments((prev) => [
          ...prev,
          {
            id: `cal-${Date.now()}`,
            title: formTitle.trim(),
            scheduledAt,
            type,
            residentId: res?.id ?? null,
            residentName: res?.name ?? null,
            residentInitials: res?.initials ?? null,
            house,
            location: formLocation.trim() || '—',
            responsible: formResponsible.trim(),
          },
        ]);
        resetForm();
        return;
      }

      if (!orgId) {
        toast.error('Organisation mangler — kan ikke gemme aftale');
        return;
      }
      const insertRow = buildPlannerInsertRow({
        orgId,
        title: formTitle,
        type,
        scheduledAt,
        residentUserId: res?.id ?? null,
        location: formLocation,
        responsible: formResponsible,
        house: isPlannerHouse(house) ? house : '',
      });
      if (!insertRow) {
        toast.error('Udfyld titel og ansvarlig');
        return;
      }

      const supabase = createClient();
      if (!supabase) {
        toast.error('Ingen forbindelse');
        return;
      }

      setSaving(true);
      let { error } = await supabase.from('care_planner_entries').insert(insertRow);
      if (error && plannerInsertNeedsColumnFallback(error.message)) {
        const retry = await supabase
          .from('care_planner_entries')
          .insert(plannerInsertWithoutExtendedColumns(insertRow));
        error = retry.error;
      }
      setSaving(false);
      if (error) {
        toast.error(
          error.message.includes('care_planner_entries')
            ? 'Databasen mangler kalenderfelter — kør migration care_planner_entries_staff_fields'
            : 'Kunne ikke gemme aftale'
        );
        return;
      }
      toast.success('Aftale gemt');
      resetForm();
      await loadLive();
    },
    [
      formTitle,
      formTime,
      formType,
      formResidentId,
      formResponsible,
      formLocation,
      today,
      houseFilter,
      residentOptions,
      variant,
      orgId,
      resetForm,
      loadLive,
    ]
  );

  if (!hydrated) {
    return (
      <div className="cp-card-elevated w-full animate-pulse p-5">
        <div className="mb-4 flex justify-between">
          <div className="h-10 w-56 rounded-lg" style={{ backgroundColor: 'var(--cp-bg3)' }} />
          <div className="h-8 w-24 rounded-lg" style={{ backgroundColor: 'var(--cp-bg3)' }} />
        </div>
        <div className="h-32 rounded-xl" style={{ backgroundColor: 'var(--cp-bg3)' }} />
      </div>
    );
  }

  return (
    <section
      id="budr-planlaegger"
      className="cp-card-elevated w-full scroll-mt-24 p-5"
      aria-label="Dagens aftaler"
    >
      {/* Header */}
      <div
        className="mb-4 flex flex-col gap-4 pb-4 sm:flex-row sm:items-start sm:justify-between"
        style={{ borderBottom: '1px solid var(--cp-border)' }}
      >
        <div className="flex min-w-0 items-start gap-2.5">
          <CalendarDays
            className="mt-0.5 h-5 w-5 shrink-0"
            style={{ color: 'var(--cp-blue)' }}
            aria-hidden
          />
          <div>
            <h2 className="text-sm font-semibold" style={{ color: 'var(--cp-text)' }}>
              Dagens aftaler
            </h2>
            <p className="text-xs" style={{ color: 'var(--cp-muted)' }}>
              {dateLabel}
            </p>
            {scopeError && variant === 'live' && (
              <p className="mt-1 text-xs" style={{ color: 'var(--cp-amber)' }}>
                {scopeError}
              </p>
            )}
          </div>
        </div>
        <div className="flex flex-col items-stretch gap-2 sm:items-end">
          <button
            type="button"
            onClick={() => setShowForm((s) => !s)}
            aria-expanded={showForm}
            className="inline-flex items-center justify-center gap-1 self-start rounded-lg px-3 py-1.5 text-xs font-medium text-white transition-all duration-200 hover:opacity-90 sm:self-end"
            style={{ backgroundColor: 'var(--cp-green)' }}
          >
            <Plus className="h-3.5 w-3.5" aria-hidden />
            Tilføj aftale
          </button>
        </div>
      </div>

      {/* Resident filter */}
      <div className="mb-4 relative inline-block w-full max-w-xs">
        <label htmlFor="kal-resident-filter" className="sr-only">
          Filtrer efter beboer
        </label>
        <select
          id="kal-resident-filter"
          value={residentFilter}
          onChange={(e) => setResidentFilter(e.target.value)}
          style={{ ...INPUT_STYLE, paddingRight: '2rem', appearance: 'none' }}
        >
          <option value="alle">Alle beboere</option>
          {residentOptions.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      </div>

      {/* Form */}
      <div
        className={`grid transition-all duration-200 ease-out ${showForm ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
      >
        <div className="min-h-0 overflow-hidden">
          <form
            onSubmit={addAppointment}
            className="mb-4 space-y-3 rounded-xl p-4"
            style={{ backgroundColor: 'var(--cp-bg3)', border: '1px solid var(--cp-border)' }}
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label
                  htmlFor="kal-titel"
                  className="mb-1 block text-xs font-medium"
                  style={{ color: 'var(--cp-muted)' }}
                >
                  Titel
                </label>
                <input
                  id="kal-titel"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  style={INPUT_STYLE}
                  placeholder="Fx vagtmøde, lægebesøg…"
                />
              </div>
              <div>
                <label
                  htmlFor="kal-tid"
                  className="mb-1 block text-xs font-medium"
                  style={{ color: 'var(--cp-muted)' }}
                >
                  Tidspunkt
                </label>
                <div className="relative">
                  <Clock
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
                    style={{ color: 'var(--cp-muted2)' }}
                  />
                  <input
                    id="kal-tid"
                    type="time"
                    value={formTime}
                    onChange={(e) => setFormTime(e.target.value)}
                    style={{ ...INPUT_STYLE, paddingLeft: '2.25rem' }}
                  />
                </div>
              </div>
              <div>
                <label
                  htmlFor="kal-type"
                  className="mb-1 block text-xs font-medium"
                  style={{ color: 'var(--cp-muted)' }}
                >
                  Type
                </label>
                <select
                  id="kal-type"
                  value={formType}
                  onChange={(e) => setFormType(e.target.value as AppointmentTypeId)}
                  style={{ ...INPUT_STYLE, appearance: 'none' }}
                >
                  {APPT_TYPES.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor="kal-beboer"
                  className="mb-1 block text-xs font-medium"
                  style={{ color: 'var(--cp-muted)' }}
                >
                  Beboer (valgfri)
                </label>
                <select
                  id="kal-beboer"
                  value={formResidentId}
                  onChange={(e) => setFormResidentId(e.target.value)}
                  style={{ ...INPUT_STYLE, appearance: 'none' }}
                >
                  <option value="">Ingen</option>
                  {residentOptions.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label
                  htmlFor="kal-ansv"
                  className="mb-1 block text-xs font-medium"
                  style={{ color: 'var(--cp-muted)' }}
                >
                  Ansvarlig
                </label>
                <div className="relative">
                  <User
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
                    style={{ color: 'var(--cp-muted2)' }}
                  />
                  <input
                    id="kal-ansv"
                    value={formResponsible}
                    onChange={(e) => setFormResponsible(e.target.value)}
                    style={{ ...INPUT_STYLE, paddingLeft: '2.25rem' }}
                    placeholder="Navn"
                  />
                </div>
              </div>
              <div className="sm:col-span-2">
                <label
                  htmlFor="kal-lok"
                  className="mb-1 block text-xs font-medium"
                  style={{ color: 'var(--cp-muted)' }}
                >
                  Lokation
                </label>
                <div className="relative">
                  <MapPin
                    className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2"
                    style={{ color: 'var(--cp-muted2)' }}
                  />
                  <input
                    id="kal-lok"
                    value={formLocation}
                    onChange={(e) => setFormLocation(e.target.value)}
                    style={{ ...INPUT_STYLE, paddingLeft: '2.25rem' }}
                    placeholder="Fx stue, køretøj…"
                  />
                </div>
              </div>
            </div>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex w-full items-center justify-center gap-2 rounded-lg py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:opacity-90 disabled:opacity-60"
              style={{ backgroundColor: 'var(--cp-green)' }}
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> : null}
              {saving ? 'Gemmer…' : 'Gem aftale'}
            </button>
          </form>
        </div>
      </div>

      {/* List */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <CalendarDays
            className="mb-2 h-10 w-10"
            style={{ color: 'var(--cp-muted2)' }}
            aria-hidden
          />
          <p className="text-sm" style={{ color: 'var(--cp-muted)' }}>
            Ingen aftaler i dag
          </p>
        </div>
      ) : (
        <div
          className="rounded-xl"
          style={{ border: '1px solid var(--cp-border)', backgroundColor: 'var(--cp-bg3)' }}
        >
          <ul className="list-none p-0 m-0">
            {filtered.map((a) => (
              <li
                key={a.id}
                className="group grid grid-cols-[4.25rem_18px_minmax(0,1fr)] gap-x-2 border-b px-2 py-3 transition-colors duration-200 last:border-b-0 sm:grid-cols-[4.25rem_18px_minmax(0,1fr)_10.5rem] sm:gap-x-3 sm:px-3"
                style={{ borderColor: 'var(--cp-border)' }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLElement).style.backgroundColor = 'var(--cp-bg2)';
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLElement).style.backgroundColor = '';
                }}
              >
                {/* Kolonne 1: tid — samme række som indhold, vertikalt centreret */}
                <div className="flex items-center justify-end sm:pr-0.5">
                  <time
                    dateTime={a.scheduledAt.toISOString()}
                    className="font-mono text-[11px] font-semibold tabular-nums leading-none sm:text-xs"
                    style={{ color: 'var(--cp-text)' }}
                  >
                    {formatTime(a.scheduledAt)}
                  </time>
                </div>

                {/* Kolonne 2: tidslinje + prik (fuld rækkehøjde) */}
                <div className="relative flex justify-center">
                  <div
                    className="absolute bottom-0 left-1/2 top-0 w-px -translate-x-1/2"
                    style={{ backgroundColor: 'var(--cp-border2)' }}
                    aria-hidden
                  />
                  <div
                    className="relative z-[1] my-auto h-2.5 w-2.5 shrink-0 rounded-full shadow-[0_0_0_3px_var(--cp-bg3)] transition-shadow group-hover:shadow-[0_0_0_3px_var(--cp-bg2)]"
                    style={{
                      backgroundColor: typeColor(a.type),
                    }}
                    aria-hidden
                  />
                </div>

                {/* Kolonne 3: titel + beboer */}
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className="text-sm font-semibold leading-snug"
                      style={{ color: 'var(--cp-text)' }}
                    >
                      {a.title}
                    </span>
                    {a.residentInitials && (
                      <span
                        title={a.residentName ?? undefined}
                        className="inline-flex cursor-help items-center rounded-full px-2 py-0.5 text-[11px] font-medium"
                        style={{
                          backgroundColor: 'var(--cp-green-dim)',
                          color: 'var(--cp-green)',
                        }}
                      >
                        {a.residentInitials}
                      </span>
                    )}
                  </div>
                  {/* Meta på smalle skærme under titel */}
                  <div
                    className="mt-2 space-y-1 text-xs leading-snug sm:hidden"
                    style={{ color: 'var(--cp-muted2)' }}
                  >
                    <span className="flex items-start gap-1.5">
                      <MapPin className="mt-0.5 h-3 w-3 shrink-0 opacity-80" aria-hidden />
                      <span>{a.location}</span>
                    </span>
                    <span className="flex items-start gap-1.5">
                      <User className="mt-0.5 h-3 w-3 shrink-0 opacity-80" aria-hidden />
                      <span>{a.responsible}</span>
                    </span>
                  </div>
                </div>

                {/* Kolonne 4: lokation + ansvarlig (desktop) */}
                <div
                  className="hidden min-w-0 flex-col items-end justify-center gap-1.5 text-right text-xs leading-snug sm:flex"
                  style={{ color: 'var(--cp-muted2)' }}
                >
                  <span className="flex items-start justify-end gap-1.5">
                    <MapPin className="mt-0.5 h-3 w-3 shrink-0 opacity-80" aria-hidden />
                    <span className="break-words">{a.location}</span>
                  </span>
                  <span className="flex items-start justify-end gap-1.5">
                    <User className="mt-0.5 h-3 w-3 shrink-0 opacity-80" aria-hidden />
                    <span>{a.responsible}</span>
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}
