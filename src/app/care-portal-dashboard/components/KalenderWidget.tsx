'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarDays, Clock, MapPin, Plus, User } from 'lucide-react';

const HOUSES = ['A', 'B', 'C', 'D'] as const;
export type CareHouse = (typeof HOUSES)[number];

const APPT_TYPES = [
  { id: 'laege', label: 'Læge/Psykiater', dot: 'bg-blue-500' },
  { id: 'aktivitet', label: 'Aktivitet', dot: 'bg-budr-teal' },
  { id: 'intern', label: 'Intern møde', dot: 'bg-budr-purple' },
  { id: 'transport', label: 'Transport', dot: 'bg-amber-500' },
  { id: 'andet', label: 'Andet', dot: 'bg-gray-400' },
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

const RESIDENT_OPTIONS: { id: string; name: string; initials: string }[] = [
  { id: 'res-001', name: 'Anders M.', initials: 'AM' },
  { id: 'res-002', name: 'Finn L.', initials: 'FL' },
  { id: 'res-003', name: 'Kirsten R.', initials: 'KR' },
  { id: 'res-004', name: 'Maja T.', initials: 'MT' },
  { id: 'res-005', name: 'Thomas B.', initials: 'TB' },
  { id: 'res-006', name: 'Lena P.', initials: 'LP' },
];

function formatDanishLongDate(d: Date): string {
  const wd = d.toLocaleDateString('da-DK', { weekday: 'long' });
  const day = d.getDate();
  const month = d.toLocaleDateString('da-DK', { month: 'long' });
  const year = d.getFullYear();
  const cap = wd.charAt(0).toUpperCase() + wd.slice(1);
  return `${cap} d. ${day}. ${month} ${year}`;
}

function formatTime(d: Date): string {
  return d.toLocaleTimeString('da-DK', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

function typeDotClass(type: AppointmentTypeId): string {
  return APPT_TYPES.find(t => t.id === type)?.dot ?? 'bg-gray-400';
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
    let list = [...appointments].sort(
      (a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime(),
    );
    if (houseFilter !== 'alle') {
      list = list.filter(a => a.house === houseFilter);
    }
    if (residentFilter !== 'alle') {
      list = list.filter(a => a.residentId === residentFilter);
    }
    return list;
  }, [appointments, houseFilter, residentFilter]);

  const addAppointment = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!formTitle.trim() || !formResponsible.trim()) return;
      const [hh, mm] = formTime.split(':').map(Number);
      const scheduledAt = new Date(today);
      scheduledAt.setHours(hh ?? 12, mm ?? 0, 0, 0);
      const res = formResidentId
        ? RESIDENT_OPTIONS.find(r => r.id === formResidentId)
        : null;
      const newAppt: CareAppointment = {
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
      };
      setAppointments(prev => [...prev, newAppt]);
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
    ],
  );

  if (!hydrated) {
    return (
      <div className="mb-6 w-full max-w-2xl animate-pulse rounded-xl border border-gray-100 bg-white p-5 shadow-sm">
        <div className="mb-4 flex justify-between">
          <div className="h-10 w-56 rounded-lg bg-gray-100" />
          <div className="h-8 w-24 rounded-lg bg-gray-100" />
        </div>
        <div className="h-32 rounded-xl bg-gray-100" />
      </div>
    );
  }

  return (
    <section
      className="mb-6 w-full max-w-2xl rounded-xl border border-gray-100 bg-white p-5 shadow-sm"
      aria-label="Dagens aftaler"
    >
      <div className="mb-4 flex flex-col gap-4 border-b border-gray-100 pb-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-2.5">
          <CalendarDays className="mt-0.5 h-5 w-5 shrink-0 text-budr-purple" aria-hidden />
          <div>
            <h2 className="text-sm font-semibold text-gray-900">Dagens aftaler</h2>
            <p className="text-sm text-gray-500">{dateLabel}</p>
          </div>
        </div>
        <div className="flex flex-col items-stretch gap-2 sm:items-end">
          <button
            type="button"
            onClick={() => setShowForm(s => !s)}
            aria-expanded={showForm}
            className="inline-flex items-center justify-center gap-1 self-start rounded-lg bg-budr-purple px-3 py-1.5 text-sm font-medium text-white transition-all duration-200 hover:opacity-90 sm:self-end"
          >
            <Plus className="h-3.5 w-3.5" aria-hidden />
            Tilføj aftale
          </button>
          <div className="flex flex-wrap justify-start gap-1.5 sm:justify-end">
            {(['alle', ...HOUSES] as const).map(key => {
              const label = key === 'alle' ? 'Alle' : `Hus ${key}`;
              const selected = houseFilter === key;
              return (
                <button
                  key={label}
                  type="button"
                  onClick={() => setHouseFilter(key)}
                  className={`rounded-full px-2.5 py-1 text-xs font-medium transition-all duration-200 ${
                    selected
                      ? 'bg-budr-purple text-white shadow-sm'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                  }`}
                >
                  {label}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      <div className="mb-4">
        <label htmlFor="kal-resident-filter" className="sr-only">
          Filtrer efter beboer
        </label>
        <select
          id="kal-resident-filter"
          value={residentFilter}
          onChange={e => setResidentFilter(e.target.value)}
          className="w-full max-w-xs rounded-lg border border-gray-200 bg-white py-2 pl-3 pr-8 text-sm text-gray-800 transition-all duration-200 focus:border-budr-teal focus:outline-none focus:ring-1 focus:ring-budr-teal sm:w-auto"
        >
          <option value="alle">Alle beboere</option>
          {RESIDENT_OPTIONS.map(r => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      </div>

      <div
        className={`grid transition-all duration-200 ease-out ${showForm ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}
      >
        <div className="min-h-0 overflow-hidden">
          <form
            onSubmit={addAppointment}
            className="mb-4 space-y-3 rounded-xl border border-gray-100 bg-gray-50/60 p-4"
          >
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label htmlFor="kal-titel" className="mb-1 block text-xs font-medium text-gray-500">
                  Titel
                </label>
                <input
                  id="kal-titel"
                  value={formTitle}
                  onChange={e => setFormTitle(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm transition-all duration-200 focus:border-budr-teal focus:outline-none focus:ring-1 focus:ring-budr-teal"
                  placeholder="Fx vagtmøde, lægebesøg…"
                />
              </div>
              <div>
                <label htmlFor="kal-tid" className="mb-1 block text-xs font-medium text-gray-500">
                  Tidspunkt
                </label>
                <div className="relative">
                  <Clock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    id="kal-tid"
                    type="time"
                    value={formTime}
                    onChange={e => setFormTime(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm transition-all duration-200 focus:border-budr-teal focus:outline-none focus:ring-1 focus:ring-budr-teal"
                  />
                </div>
              </div>
              <div>
                <label htmlFor="kal-type" className="mb-1 block text-xs font-medium text-gray-500">
                  Type
                </label>
                <select
                  id="kal-type"
                  value={formType}
                  onChange={e => setFormType(e.target.value as AppointmentTypeId)}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm transition-all duration-200 focus:border-budr-teal focus:outline-none focus:ring-1 focus:ring-budr-teal"
                >
                  {APPT_TYPES.map(t => (
                    <option key={t.id} value={t.id}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="kal-beboer" className="mb-1 block text-xs font-medium text-gray-500">
                  Beboer (valgfri)
                </label>
                <select
                  id="kal-beboer"
                  value={formResidentId}
                  onChange={e => setFormResidentId(e.target.value)}
                  className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm transition-all duration-200 focus:border-budr-teal focus:outline-none focus:ring-1 focus:ring-budr-teal"
                >
                  <option value="">Ingen</option>
                  {RESIDENT_OPTIONS.map(r => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label htmlFor="kal-ansv" className="mb-1 block text-xs font-medium text-gray-500">
                  Ansvarlig
                </label>
                <div className="relative">
                  <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    id="kal-ansv"
                    value={formResponsible}
                    onChange={e => setFormResponsible(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm transition-all duration-200 focus:border-budr-teal focus:outline-none focus:ring-1 focus:ring-budr-teal"
                    placeholder="Navn"
                  />
                </div>
              </div>
              <div className="sm:col-span-2">
                <label htmlFor="kal-lok" className="mb-1 block text-xs font-medium text-gray-500">
                  Lokation
                </label>
                <div className="relative">
                  <MapPin className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                  <input
                    id="kal-lok"
                    value={formLocation}
                    onChange={e => setFormLocation(e.target.value)}
                    className="w-full rounded-lg border border-gray-200 bg-white py-2 pl-9 pr-3 text-sm transition-all duration-200 focus:border-budr-teal focus:outline-none focus:ring-1 focus:ring-budr-teal"
                    placeholder="Fx stue, køretøj…"
                  />
                </div>
              </div>
            </div>
            <button
              type="submit"
              className="w-full rounded-lg bg-budr-teal py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:opacity-90"
            >
              Gem aftale
            </button>
          </form>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 text-center">
          <CalendarDays className="mb-2 h-10 w-10 text-gray-300" aria-hidden />
          <p className="text-sm text-gray-400">Ingen aftaler i dag</p>
        </div>
      ) : (
        <div className="flex">
          <div className="w-14 shrink-0">
            {filtered.map(a => (
              <div
                key={`t-${a.id}`}
                className="py-2.5 font-mono text-sm font-semibold tabular-nums text-gray-900"
              >
                {formatTime(a.scheduledAt)}
              </div>
            ))}
          </div>
          <div className="relative min-w-0 flex-1 border-l-2 border-gray-100 ml-2">
            {filtered.map(a => (
              <div
                key={a.id}
                className="group relative border-b border-gray-50 py-2.5 pl-5 pr-1 transition-all duration-200 last:border-b-0 hover:rounded-lg hover:bg-gray-50"
              >
                <div
                  className={`absolute left-[-5px] top-1/2 h-2 w-2 -translate-x-1/2 -translate-y-1/2 rounded-full ring-2 ring-white ${typeDotClass(a.type)}`}
                  aria-hidden
                />
                <div className="flex flex-col gap-1 sm:flex-row sm:items-start sm:justify-between sm:gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-gray-900">{a.title}</span>
                      {a.residentInitials ? (
                        <span className="inline-flex items-center rounded-full bg-budr-lavender px-2 py-0.5 text-xs font-medium text-budr-purple">
                          {a.residentInitials}
                        </span>
                      ) : null}
                    </div>
                    {a.residentName ? (
                      <p className="mt-0.5 text-xs text-gray-500">{a.residentName}</p>
                    ) : null}
                  </div>
                  <div className="max-w-[42%] shrink-0 text-right text-xs leading-snug text-gray-400">
                    <span className="flex items-start justify-end gap-1">
                      <MapPin className="mt-0.5 h-3 w-3 shrink-0 opacity-80" aria-hidden />
                      <span>{a.location}</span>
                    </span>
                    <span className="mt-1 flex items-start justify-end gap-1">
                      <User className="mt-0.5 h-3 w-3 shrink-0 opacity-80" aria-hidden />
                      <span>{a.responsible}</span>
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/*
        Supabase — care_appointments (wire later):

        Columns: id, facility_id, resident_id (nullable), title, scheduled_at, type,
                 location, responsible_staff, created_at

        1) Fetch today (local or UTC window):
           const start = startOfDay; const end = endOfDay;
           supabase.from('care_appointments')
             .select('*')
             .gte('scheduled_at', start.toISOString())
             .lte('scheduled_at', end.toISOString())
             .in('facility_id', care_visible_facility_ids())
             .order('scheduled_at', { ascending: true })

        2) Insert on add:
           supabase.from('care_appointments').insert({
             facility_id, resident_id, title, scheduled_at, type, location, responsible_staff,
           })

        3) RLS: facility_id in care_visible_facility_ids() for the current staff session.
      */}
    </section>
  );
}
