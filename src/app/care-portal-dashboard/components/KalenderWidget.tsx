'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, Clock, MapPin, Plus, User } from 'lucide-react';

const HOUSES = ['A', 'B', 'C', 'D'] as const;
export type CareHouse = (typeof HOUSES)[number];

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

const RESIDENT_OPTIONS = [
  { id: 'res-001', name: 'Anders M.', initials: 'AM' },
  { id: 'res-002', name: 'Finn L.', initials: 'FL' },
  { id: 'res-003', name: 'Kirsten R.', initials: 'KR' },
  { id: 'res-004', name: 'Maja T.', initials: 'MT' },
  { id: 'res-005', name: 'Thomas B.', initials: 'TB' },
  { id: 'res-006', name: 'Lena P.', initials: 'LP' },
];

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
  return [
    {
      id: 'cal-001',
      title: 'Kontrol hos psykiater',
      scheduledAt: todayAt(day, 8, 0),
      type: 'laege',
      residentId: 'res-002',
      residentName: 'Finn L.',
      residentInitials: 'FL',
      house: 'A',
      location: 'Regionshospitalet',
      responsible: 'Sara K.',
    },
    {
      id: 'cal-002',
      title: 'Morgengymnastik fælles',
      scheduledAt: todayAt(day, 9, 30),
      type: 'aktivitet',
      residentId: null,
      residentName: null,
      residentInitials: null,
      house: 'B',
      location: 'Træningsrummet',
      responsible: 'PT Madsen',
    },
    {
      id: 'cal-003',
      title: 'Tandlæge',
      scheduledAt: todayAt(day, 10, 15),
      type: 'laege',
      residentId: 'res-003',
      residentName: 'Kirsten R.',
      residentInitials: 'KR',
      house: 'A',
      location: 'Tandklinikken, st.',
      responsible: 'Lena P.',
    },
    {
      id: 'cal-004',
      title: 'Vagtoverdragelse + trivsel',
      scheduledAt: todayAt(day, 12, 0),
      type: 'intern',
      residentId: null,
      residentName: null,
      residentInitials: null,
      house: 'C',
      location: 'Kontor Hus C',
      responsible: 'Alle team',
    },
    {
      id: 'cal-005',
      title: 'Transport til indkøb',
      scheduledAt: todayAt(day, 14, 0),
      type: 'transport',
      residentId: 'res-005',
      residentName: 'Thomas B.',
      residentInitials: 'TB',
      house: 'D',
      location: 'Rema 1000',
      responsible: 'Henrik S.',
    },
    {
      id: 'cal-006',
      title: 'Kreativ workshop',
      scheduledAt: todayAt(day, 15, 30),
      type: 'aktivitet',
      residentId: 'res-004',
      residentName: 'Maja T.',
      residentInitials: 'MT',
      house: 'B',
      location: 'Aktivitetsrummet',
      responsible: 'Birgit N.',
    },
    {
      id: 'cal-007',
      title: 'Samtale pårørende',
      scheduledAt: todayAt(day, 18, 45),
      type: 'andet',
      residentId: 'res-001',
      residentName: 'Anders M.',
      residentInitials: 'AM',
      house: 'A',
      location: 'Telefon / stue 104',
      responsible: 'Sara K.',
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

export default function KalenderWidget() {
  const [hydrated, setHydrated] = useState(false);
  const [today, setToday] = useState<Date>(() => new Date());
  const [appointments, setAppointments] = useState<CareAppointment[]>([]);
  const [houseFilter, setHouseFilter] = useState<'alle' | CareHouse>('alle');
  const [residentFilter, setResidentFilter] = useState<string>('alle');
  const [showForm, setShowForm] = useState(false);
  const [formTitle, setFormTitle] = useState('');
  const [formTime, setFormTime] = useState('12:00');
  const [formType, setFormType] = useState<AppointmentTypeId>('aktivitet');
  const [formResidentId, setFormResidentId] = useState('');
  const [formResponsible, setFormResponsible] = useState('');
  const [formLocation, setFormLocation] = useState('');

  useEffect(() => {
    const d = new Date();
    setToday(d);
    setAppointments(createMockAppointments(d));
    setHydrated(true);
  }, []);

  const dateLabel = useMemo(() => formatDanishLongDate(today), [today]);

  const filtered = useMemo(() => {
    let list = [...appointments].sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());
    if (houseFilter !== 'alle') list = list.filter((a) => a.house === houseFilter);
    if (residentFilter !== 'alle') list = list.filter((a) => a.residentId === residentFilter);
    return list;
  }, [appointments, houseFilter, residentFilter]);

  const addAppointment = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!formTitle.trim() || !formResponsible.trim()) return;
      const [hh, mm] = formTime.split(':').map(Number);
      const scheduledAt = new Date(today);
      scheduledAt.setHours(hh ?? 12, mm ?? 0, 0, 0);
      const res = formResidentId ? RESIDENT_OPTIONS.find((r) => r.id === formResidentId) : null;
      setAppointments((prev) => [
        ...prev,
        {
          id: `cal-${Date.now()}`,
          title: formTitle.trim(),
          scheduledAt,
          type: formType,
          residentId: res?.id ?? null,
          residentName: res?.name ?? null,
          residentInitials: res?.initials ?? null,
          house: houseFilter !== 'alle' ? houseFilter : 'A',
          location: formLocation.trim() || '—',
          responsible: formResponsible.trim(),
        },
      ]);
      setFormTitle('');
      setFormTime('12:00');
      setFormType('aktivitet');
      setFormResidentId('');
      setFormResponsible('');
      setFormLocation('');
      setShowForm(false);
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
          <div className="flex flex-wrap justify-start gap-1.5 sm:justify-end">
            {(['alle', ...HOUSES] as const).map((key) => {
              const label = key === 'alle' ? 'Alle' : `Hus ${key}`;
              const selected = houseFilter === key;
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => setHouseFilter(key)}
                  className="rounded-full px-2.5 py-1 text-xs font-medium transition-all duration-200"
                  style={
                    selected
                      ? { backgroundColor: 'var(--cp-green)', color: '#fff' }
                      : {
                          backgroundColor: 'var(--cp-bg3)',
                          color: 'var(--cp-muted)',
                          border: '1px solid var(--cp-border)',
                        }
                  }
                >
                  {label}
                </button>
              );
            })}
          </div>
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
          {RESIDENT_OPTIONS.map((r) => (
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
                  {RESIDENT_OPTIONS.map((r) => (
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
              className="w-full rounded-lg py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:opacity-90"
              style={{ backgroundColor: 'var(--cp-green)' }}
            >
              Gem aftale
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
                        className="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium"
                        style={{
                          backgroundColor: 'var(--cp-green-dim)',
                          color: 'var(--cp-green)',
                        }}
                      >
                        {a.residentInitials}
                      </span>
                    )}
                  </div>
                  {a.residentName && (
                    <p className="mt-1 text-xs leading-snug" style={{ color: 'var(--cp-muted)' }}>
                      {a.residentName}
                    </p>
                  )}
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
