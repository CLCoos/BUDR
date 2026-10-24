'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  CalendarClock,
  Check,
  CheckSquare,
  ClipboardList,
  FileText,
  Loader2,
  MessageCircle,
  Mic,
} from 'lucide-react';
import { api } from '@/components/documents/shared';
import ResidentInitials from '@/components/residents/ResidentInitials';
import { initialsOfName } from '@/lib/residents/formatName';
import { useFortael } from '@/components/fortael/Fortael';
import { defaultMoment, type ShiftNow, type VagtMoment } from '@/lib/vagt';

type Vagt = {
  staffFirstName: string;
  shift: ShiftNow;
  shiftName: string;
  today: string;
  residentsTotal: number;
  residentFullNames?: Record<string, string>;
  handovers: {
    residentId: string;
    name: string | null;
    body: string;
    flag: string | null;
    shiftLabel: string;
    shiftDate: string;
  }[];
  lysConcerns: {
    residentId: string;
    name: string | null;
    traffic: string | null;
    mood: number | null;
    at: string;
  }[];
  tasks: {
    id: string;
    title: string;
    residentId: string | null;
    name: string | null;
    deadline: string;
    overdue: boolean;
    priority: string;
    assignedTo: string | null;
  }[];
  appointments: {
    id: string;
    title: string;
    at: string;
    residentId: string | null;
    name: string | null;
    location: string;
  }[];
  residentMessages: {
    id: string;
    residentId: string;
    name: string | null;
    text: string;
    at: string;
  }[];
  myDraftsToday: number;
  handoverWrittenCount: number;
};

const panel = { backgroundColor: 'var(--cp-card-bg)', borderColor: 'var(--cp-border)' } as const;
const muted = { color: 'var(--cp-muted)' } as const;
const text = { color: 'var(--cp-text)' } as const;

const SHIFT_DA: Record<string, string> = {
  dag: 'dagvagten',
  aften: 'aftenvagten',
  nat: 'nattevagten',
  doegnnotat: 'døgnnotatet',
};
const NEXT_SHIFT: Record<ShiftNow, string> = {
  dag: 'aftenvagten',
  aften: 'nattevagten',
  nat: 'dagvagten',
};

const TONE = {
  red: { bg: 'var(--cp-red-dim)', fg: 'var(--cp-red)' },
  amber: { bg: 'var(--cp-amber-dim)', fg: 'var(--cp-amber)' },
  green: { bg: 'var(--cp-green-dim)', fg: 'var(--cp-green)' },
} as const;

function clock(iso: string): string {
  return new Date(iso)
    .toLocaleTimeString('da-DK', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Copenhagen',
    })
    .replace(':', '.');
}

function initials(name: string | null): string {
  return name?.trim() ? initialsOfName(name) : 'B';
}

/** Borgerens initialer; hover viser det fulde navn, og et klik åbner borgerens side. */
function Who({
  v,
  id,
  name,
  link = true,
  className,
}: {
  v: Vagt;
  id: string | null;
  name: string | null;
  link?: boolean;
  className?: string;
}) {
  if (!name) return null;
  return (
    <ResidentInitials
      initials={name}
      fullName={id ? v.residentFullNames?.[id] : null}
      href={link && id ? residentHref(id) : null}
      className={className}
    />
  );
}

function joinWho(v: Vagt, id: string | null, name: string | null, rest: (string | null)[]) {
  const tail = rest.filter(Boolean).join(' · ');
  return (
    <>
      <Who v={v} id={id} name={name} />
      {name && tail ? ' · ' : ''}
      {tail}
    </>
  );
}

function residentHref(id: string | null): string {
  return id ? `/resident-360-view/${id}` : '/care-portal-residents';
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[11px] font-semibold uppercase tracking-[0.08em]" style={muted}>
      {children}
    </p>
  );
}

function Empty({ children }: { children: React.ReactNode }) {
  return (
    <p className="px-5 py-4 text-sm" style={muted}>
      {children}
    </p>
  );
}

function MomentSwitch({
  moment,
  onChange,
}: {
  moment: VagtMoment;
  onChange: (m: VagtMoment) => void;
}) {
  const items: { id: VagtMoment; label: string; hint: string }[] = [
    { id: 'moed', label: 'Mød ind', hint: 'Siden sidst' },
    { id: 'nu', label: 'Nu', hint: 'Det, der skal ske' },
    { id: 'hjem', label: 'Gå hjem', hint: 'Før du går' },
  ];
  return (
    <div
      role="tablist"
      aria-label="Vagtens øjeblikke"
      className="grid grid-cols-3 gap-1 rounded-2xl border p-1"
      style={{ borderColor: 'var(--cp-border)', backgroundColor: 'var(--cp-bg2)' }}
    >
      {items.map((it) => {
        const on = it.id === moment;
        return (
          <button
            key={it.id}
            type="button"
            role="tab"
            aria-selected={on}
            onClick={() => onChange(it.id)}
            className="flex min-h-[52px] flex-col items-center justify-center rounded-xl px-2 transition-colors"
            style={{
              backgroundColor: on ? 'var(--cp-ink)' : 'transparent',
              color: on ? '#fff' : 'var(--cp-text)',
            }}
          >
            <span className="text-[15px] font-semibold">{it.label}</span>
            <span
              className="text-[11px]"
              style={{ color: on ? 'var(--cp-ink-accent)' : 'var(--cp-muted)' }}
            >
              {it.hint}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/** Beskeder fra borgerne i Lys. «Set» giver borgeren en kvittering i Lys. */
function ResidentMessages({
  v,
  messages,
  onSeen,
}: {
  v: Vagt;
  messages: Vagt['residentMessages'];
  onSeen: (id: string) => void;
}) {
  const [busy, setBusy] = useState<string | null>(null);
  const markSeen = async (id: string) => {
    setBusy(id);
    try {
      await api(`/api/portal/notifications/${id}/acknowledge`, { method: 'POST' });
      onSeen(id);
    } catch {
      // Beskeden bliver stående, så man kan prøve igen.
    } finally {
      setBusy(null);
    }
  };
  return (
    <section
      className="rounded-2xl border"
      style={{ ...panel, borderColor: 'var(--cp-amber)' }}
      aria-labelledby="vagt-beskeder"
    >
      <div
        className="flex items-center gap-2 border-b px-5 py-4"
        style={{ borderColor: 'var(--cp-border)' }}
      >
        <MessageCircle size={18} style={{ color: 'var(--cp-amber)' }} aria-hidden />
        <h2 id="vagt-beskeder" className="text-base font-semibold" style={text}>
          Beskeder fra borgerne
        </h2>
        <span className="text-xs" style={muted}>
          Borgeren kan se, når du har trykket «Set»
        </span>
      </div>
      <ul>
        {messages.map((m) => (
          <li
            key={m.id}
            className="flex flex-col gap-3 border-b px-5 py-3.5 last:border-b-0 sm:flex-row sm:items-center"
            style={{ borderColor: 'var(--cp-border)' }}
          >
            <span className="min-w-0 flex-1">
              <Who v={v} id={m.residentId} name={m.name} className="text-[15px] font-semibold" />
              <span className="ml-2 text-xs" style={muted}>
                kl. {clock(m.at)}
              </span>
              <span className="block text-[15px] leading-snug" style={text}>
                «{m.text}»
              </span>
            </span>
            <button
              type="button"
              onClick={() => void markSeen(m.id)}
              disabled={busy === m.id}
              className="inline-flex min-h-[44px] shrink-0 items-center justify-center gap-2 rounded-xl px-4 text-sm font-semibold disabled:opacity-60"
              style={{ backgroundColor: 'var(--cp-green)', color: 'var(--cp-on-green)' }}
            >
              <Check size={16} aria-hidden />
              Set
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}

function MoedInd({ v, onReady }: { v: Vagt; onReady: () => void }) {
  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
      <section className="rounded-2xl border" style={panel} aria-labelledby="moed-siden">
        <div className="border-b px-5 py-4" style={{ borderColor: 'var(--cp-border)' }}>
          <Eyebrow>Siden sidst</Eyebrow>
          <h2 id="moed-siden" className="mt-1 text-base font-semibold" style={text}>
            Det skrev kollegerne
          </h2>
        </div>
        {v.handovers.length === 0 ? (
          <Empty>Ingen overlevering fra sidste vagt endnu.</Empty>
        ) : (
          <ul>
            {v.handovers.map((h) => {
              const tone =
                h.flag === 'roed' ? TONE.red : h.flag === 'gul' ? TONE.amber : TONE.green;
              return (
                <li
                  key={`${h.residentId}-${h.shiftLabel}`}
                  className="border-b px-5 py-3.5 last:border-b-0"
                  style={{ borderColor: 'var(--cp-border)' }}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="h-2 w-2 shrink-0 rounded-full"
                      style={{ backgroundColor: tone.fg }}
                      aria-hidden
                    />
                    <Who
                      v={v}
                      id={h.residentId}
                      name={h.name}
                      className="text-[15px] font-semibold"
                    />
                    <span className="text-xs" style={muted}>
                      fra {SHIFT_DA[h.shiftLabel] ?? h.shiftLabel}
                    </span>
                  </div>
                  {h.body && (
                    <p className="mt-1 whitespace-pre-line text-[15px] leading-snug" style={text}>
                      {h.body}
                    </p>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <div className="flex flex-col gap-6">
        <section className="rounded-2xl border" style={panel} aria-labelledby="moed-hvem">
          <div className="border-b px-5 py-4" style={{ borderColor: 'var(--cp-border)' }}>
            <h2 id="moed-hvem" className="text-base font-semibold" style={text}>
              Hvem har brug for dig
            </h2>
            <p className="text-xs" style={muted}>
              Gult eller rødt i Lys det seneste døgn
            </p>
          </div>
          {v.lysConcerns.length === 0 ? (
            <Empty>Ingen borgere har meldt gult eller rødt i Lys.</Empty>
          ) : (
            <ul>
              {v.lysConcerns.map((c) => {
                const tone = c.traffic === 'rød' ? TONE.red : TONE.amber;
                return (
                  <li
                    key={c.residentId}
                    className="border-b last:border-b-0"
                    style={{ borderColor: 'var(--cp-border)' }}
                  >
                    <Link
                      href={residentHref(c.residentId)}
                      className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-[var(--cp-bg3)]"
                    >
                      <span
                        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-[13px] font-semibold"
                        style={{ backgroundColor: tone.bg, color: tone.fg }}
                      >
                        {initials(c.name)}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[15px] font-semibold" style={text}>
                          <Who v={v} id={c.residentId} name={c.name} link={false} />
                        </span>
                        <span className="block text-sm" style={muted}>
                          {c.traffic === 'rød' ? 'Rød' : 'Gul'} i Lys kl. {clock(c.at)}
                          {c.mood != null ? ` · humør ${c.mood}/10` : ''}
                        </span>
                      </span>
                      <ArrowRight size={18} className="shrink-0" style={muted} aria-hidden />
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <Appointments v={v} compact />

        <button
          type="button"
          onClick={onReady}
          className="inline-flex min-h-[52px] w-full items-center justify-center gap-2 rounded-2xl px-6 text-[15px] font-semibold"
          style={{ backgroundColor: 'var(--cp-green)', color: 'var(--cp-on-green)' }}
        >
          Jeg er klar, vis min vagt
          <ArrowRight size={18} aria-hidden />
        </button>
      </div>
    </div>
  );
}

function Appointments({ v, compact = false }: { v: Vagt; compact?: boolean }) {
  return (
    <section className="rounded-2xl border" style={panel} aria-labelledby="vagt-aftaler">
      <div
        className="flex items-center gap-2 border-b px-5 py-4"
        style={{ borderColor: 'var(--cp-border)' }}
      >
        <CalendarClock size={18} style={{ color: 'var(--cp-green)' }} aria-hidden />
        <h2 id="vagt-aftaler" className="text-base font-semibold" style={text}>
          Aftaler i dag
        </h2>
        <span className="cp-num ml-auto text-xs" style={muted}>
          {v.appointments.length}
        </span>
      </div>
      {v.appointments.length === 0 ? (
        <Empty>Ingen aftaler i kalenderen i dag.</Empty>
      ) : (
        <ul>
          {v.appointments.slice(0, compact ? 4 : 30).map((a) => (
            <li
              key={a.id}
              className="flex items-start gap-3 border-b px-5 py-3 last:border-b-0"
              style={{ borderColor: 'var(--cp-border)' }}
            >
              <span className="cp-num w-12 shrink-0 pt-0.5 text-sm font-semibold" style={text}>
                {clock(a.at)}
              </span>
              <span className="min-w-0 text-[15px]" style={text}>
                {a.title}
                <span className="block text-sm" style={muted}>
                  {joinWho(v, a.residentId, a.name, [a.location])}
                </span>
              </span>
            </li>
          ))}
        </ul>
      )}
      {compact && v.appointments.length > 4 && (
        <Link
          href="/care-portal-planner"
          className="block border-t px-5 py-3 text-sm font-medium"
          style={{ borderColor: 'var(--cp-border)', color: 'var(--cp-green)' }}
        >
          Se alle {v.appointments.length} aftaler
        </Link>
      )}
    </section>
  );
}

function Nu({ v, assistant }: { v: Vagt; assistant: React.ReactNode }) {
  const nowIso = new Date().toISOString();
  const nextAppointment = v.appointments.find((a) => a.at >= nowIso);
  const firstTask = v.tasks[0];

  return (
    <div className="flex flex-col gap-6">
      {(firstTask || nextAppointment) && (
        <section
          className="rounded-2xl p-5"
          style={{ backgroundColor: 'var(--cp-ink)', color: '#fff' }}
          aria-labelledby="nu-naeste"
        >
          <p
            className="text-[11px] font-semibold uppercase tracking-[0.08em]"
            style={{ color: 'var(--cp-ink-accent)' }}
          >
            Det næste
          </p>
          <h2 id="nu-naeste" className="mt-1 text-xl font-semibold leading-snug">
            {firstTask ? firstTask.title : nextAppointment!.title}
          </h2>
          <p className="mt-1 text-sm" style={{ color: 'rgba(255,255,255,0.75)' }}>
            {firstTask
              ? [firstTask.name, firstTask.overdue ? 'frist overskredet' : 'frist i dag']
                  .filter(Boolean)
                  .join(' · ')
              : [`kl. ${clock(nextAppointment!.at)}`, nextAppointment!.name]
                  .filter(Boolean)
                  .join(' · ')}
          </p>
          {(firstTask?.residentId ?? nextAppointment?.residentId) && (
            <Link
              href={residentHref(firstTask?.residentId ?? nextAppointment?.residentId ?? null)}
              className="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-xl px-4 text-sm font-semibold"
              style={{ backgroundColor: 'var(--cp-ink-accent)', color: 'var(--cp-ink)' }}
            >
              Åbn borgeren <ArrowRight size={16} aria-hidden />
            </Link>
          )}
        </section>
      )}

      {assistant}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border" style={panel} aria-labelledby="nu-opgaver">
          <div
            className="flex items-center gap-2 border-b px-5 py-4"
            style={{ borderColor: 'var(--cp-border)' }}
          >
            <CheckSquare size={18} style={{ color: 'var(--cp-green)' }} aria-hidden />
            <h2 id="nu-opgaver" className="text-base font-semibold" style={text}>
              Opgaver i dag
            </h2>
            <span className="cp-num ml-auto text-xs" style={muted}>
              {v.tasks.length}
            </span>
          </div>
          {v.tasks.length === 0 ? (
            <Empty>Ingen åbne opgaver med frist i dag.</Empty>
          ) : (
            <ul>
              {v.tasks.slice(0, 8).map((t) => (
                <li
                  key={t.id}
                  className="border-b px-5 py-3 last:border-b-0"
                  style={{ borderColor: 'var(--cp-border)' }}
                >
                  <p className="text-[15px]" style={text}>
                    {t.title}
                  </p>
                  <p
                    className="text-sm"
                    style={{ color: t.overdue ? 'var(--cp-red)' : 'var(--cp-muted)' }}
                  >
                    {joinWho(v, t.residentId, t.name, [
                      t.overdue ? 'Overskredet' : 'I dag',
                      t.assignedTo,
                    ])}
                  </p>
                </li>
              ))}
            </ul>
          )}
          <Link
            href="#dash-live-opgaver"
            className="block border-t px-5 py-3 text-sm font-medium"
            style={{ borderColor: 'var(--cp-border)', color: 'var(--cp-green)' }}
            onClick={() => document.getElementById('alt-overblik')?.setAttribute('open', '')}
          >
            Alle opgaver
          </Link>
        </section>
        <Appointments v={v} />
      </div>
    </div>
  );
}

function GaaHjem({ v, onFortael }: { v: Vagt; onFortael: () => void }) {
  const missing = Math.max(0, v.residentsTotal - v.handoverWrittenCount);
  const items: { done: boolean; label: React.ReactNode }[] = [
    {
      done: missing === 0 && v.residentsTotal > 0,
      label: (
        <>
          Overlevering skrevet for {v.handoverWrittenCount} af {v.residentsTotal} borgere.{' '}
          <Link
            href="/handover-workspace"
            className="font-semibold underline"
            style={{ color: 'var(--cp-green)' }}
          >
            {missing === 0 ? 'Se overleveringen' : 'Skriv overlevering'}
          </Link>
        </>
      ),
    },
    {
      done: v.myDraftsToday === 0,
      label:
        v.myDraftsToday === 0 ? (
          'Ingen af dine journalkladder venter på godkendelse.'
        ) : (
          <>
            {v.myDraftsToday} {v.myDraftsToday === 1 ? 'journalkladde' : 'journalkladder'} fra i dag
            venter.{' '}
            <Link
              href="/care-portal-journal"
              className="font-semibold underline"
              style={{ color: 'var(--cp-green)' }}
            >
              Godkend
            </Link>
          </>
        ),
    },
    {
      done: v.tasks.length === 0,
      label:
        v.tasks.length === 0 ? (
          'Ingen åbne opgaver med frist i dag.'
        ) : (
          <>
            {v.tasks.length} {v.tasks.length === 1 ? 'opgave er' : 'opgaver er'} stadig åbne med
            frist i dag. Luk dem eller giv dem videre i overleveringen.
          </>
        ),
    },
  ];

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
      <section className="rounded-2xl border p-5" style={panel} aria-labelledby="hjem-tjek">
        <Eyebrow>Før du går</Eyebrow>
        <h2 id="hjem-tjek" className="mt-1 text-base font-semibold" style={text}>
          Klar til {NEXT_SHIFT[v.shift]}?
        </h2>
        <ul className="mt-4 flex flex-col gap-3.5 text-[15px]">
          {items.map((it, i) => (
            <li key={i} className="flex items-start gap-2.5" style={text}>
              {it.done ? (
                <Check
                  size={18}
                  className="mt-0.5 shrink-0"
                  style={{ color: 'var(--cp-green)' }}
                  aria-hidden
                />
              ) : (
                <span
                  className="mt-1 h-4 w-4 shrink-0 rounded-full border-2"
                  style={{ borderColor: 'var(--cp-amber)' }}
                  aria-hidden
                />
              )}
              <span>{it.label}</span>
            </li>
          ))}
        </ul>
      </section>

      <div className="flex flex-col gap-3">
        <button
          type="button"
          onClick={onFortael}
          className="inline-flex min-h-[56px] items-center justify-center gap-2 rounded-2xl px-6 text-base font-semibold"
          style={{ backgroundColor: 'var(--cp-green)', color: 'var(--cp-on-green)' }}
        >
          <Mic size={20} aria-hidden />
          Fortæl det sidste fra vagten
        </button>
        <Link
          href="/handover-workspace"
          className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-2xl border px-6 text-[15px] font-semibold"
          style={{ borderColor: 'var(--cp-border2)', color: 'var(--cp-text)' }}
        >
          <ClipboardList size={18} aria-hidden />
          Åbn vagtoverleveringen
        </Link>
        <Link
          href="/care-portal-fagsystem"
          className="inline-flex min-h-[52px] items-center justify-center gap-2 rounded-2xl border px-6 text-[15px] font-semibold"
          style={{ borderColor: 'var(--cp-border2)', color: 'var(--cp-text)' }}
        >
          <FileText size={18} aria-hidden />
          Til fagsystem
        </Link>
      </div>
    </div>
  );
}

/**
 * «Vagten» på forsiden: Mød ind (siden sidst), Nu (det, der skal ske) og Gå hjem (før du
 * går). Øjeblikket vælges efter klokken, men man kan altid skifte selv.
 */
export default function VagtPanel({ assistant }: { assistant: React.ReactNode }) {
  const [v, setV] = useState<Vagt | null>(null);
  const [failed, setFailed] = useState(false);
  const [moment, setMoment] = useState<VagtMoment | null>(null);
  const fortael = useFortael();

  const load = useCallback(async () => {
    try {
      const data = await api<Vagt>('/api/portal/vagt');
      setV(data);
      setMoment((m) => m ?? defaultMoment(data.shift));
    } catch {
      setFailed(true);
    }
  }, []);

  useEffect(() => {
    void load();
    const refresh = () => void load();
    window.addEventListener('portal-journal-updated', refresh);
    return () => window.removeEventListener('portal-journal-updated', refresh);
  }, [load]);

  if (failed) return <div className="mb-6">{assistant}</div>;

  if (!v || !moment) {
    return (
      <div
        className="mb-6 flex min-h-[160px] items-center justify-center rounded-2xl border"
        style={panel}
        aria-busy
      >
        <Loader2 size={20} className="animate-spin" style={muted} aria-label="Henter vagten" />
      </div>
    );
  }

  return (
    <div className="mb-8 flex flex-col gap-5" id="vagten">
      <div className="flex flex-col gap-1">
        <p className="text-sm" style={muted}>
          {v.shiftName}
        </p>
        <MomentSwitch moment={moment} onChange={setMoment} />
      </div>
      {v.residentMessages.length > 0 && (
        <ResidentMessages
          v={v}
          messages={v.residentMessages}
          onSeen={(id) =>
            setV((prev) =>
              prev
                ? { ...prev, residentMessages: prev.residentMessages.filter((m) => m.id !== id) }
                : prev
            )
          }
        />
      )}
      {moment === 'moed' && <MoedInd v={v} onReady={() => setMoment('nu')} />}
      {moment === 'nu' && <Nu v={v} assistant={assistant} />}
      {moment === 'hjem' && (
        <GaaHjem v={v} onFortael={fortael.enabled ? fortael.openFortael : () => setMoment('nu')} />
      )}
    </div>
  );
}
