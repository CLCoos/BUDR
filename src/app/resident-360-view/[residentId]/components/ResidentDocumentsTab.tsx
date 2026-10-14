'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Check,
  Copy,
  FileText,
  Loader2,
  Lock,
  Plus,
  Printer,
  Sparkles,
} from 'lucide-react';
import { useCurrentOrg } from '@/lib/org/useCurrentOrg';
import {
  STATUS_REPORT_SECTIONS,
  type StatusReportSectionDefinition,
  type StatusReportSectionKey,
  type StatusReportSections,
} from '@/lib/statusReport/sections';
import {
  formatDanishDate,
  renderStatusReportHtml,
  renderStatusReportText,
  type StatusReportHeader,
} from '@/lib/statusReport/render';
import type { StatusReportRow } from '@/lib/statusReport/types';

type Props = { residentId: string; residentName: string };

const PARAGRAPHS = ['§107', '§108', '§85', 'Andet'];

function todayYmd(): string {
  return new Date().toLocaleDateString('sv-SE', { timeZone: 'Europe/Copenhagen' });
}

function addDays(ymd: string, days: number): string {
  const d = new Date(`${ymd}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function monthsAgo(months: number): string {
  const d = new Date(`${todayYmd()}T12:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() - months);
  return d.toISOString().slice(0, 10);
}

const cardStyle: React.CSSProperties = {
  borderColor: 'var(--cp-border)',
  backgroundColor: 'var(--cp-bg2)',
};
const inputStyle: React.CSSProperties = {
  borderColor: 'var(--cp-border)',
  backgroundColor: 'var(--cp-bg3)',
  color: 'var(--cp-text)',
};
const ghostButton =
  'inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-sm font-medium transition-opacity disabled:opacity-50';
const primaryButton =
  'inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-semibold text-white transition-opacity disabled:opacity-50';

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { 'content-type': 'application/json', ...(init?.headers ?? {}) },
  });
  const json = (await res.json().catch(() => ({}))) as T & { error?: string };
  if (!res.ok) throw new Error(json.error ?? `Fejl (${res.status})`);
  return json;
}

export default function ResidentDocumentsTab({ residentId, residentName }: Props) {
  const [reports, setReports] = useState<StatusReportRow[] | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const json = await api<{ reports: StatusReportRow[] }>(
        `/api/portal/status-reports?resident_id=${encodeURIComponent(residentId)}`
      );
      setReports(json.reports);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kunne ikke hente dokumenter');
      setReports([]);
    }
  }, [residentId]);

  useEffect(() => {
    void load();
  }, [load]);

  const open = reports?.find((r) => r.id === openId) ?? null;

  if (open) {
    return (
      <StatusReportEditor
        key={open.id}
        report={open}
        residentName={residentName}
        onBack={() => setOpenId(null)}
        onChange={(next) =>
          setReports((prev) => prev?.map((r) => (r.id === next.id ? next : r)) ?? null)
        }
      />
    );
  }

  if (reports === null) {
    return (
      <p className="flex items-center gap-2 text-sm" style={{ color: 'var(--cp-muted)' }}>
        <Loader2 size={14} className="animate-spin" aria-hidden /> Henter dokumenter…
      </p>
    );
  }

  const lastEnd = reports.find((r) => r.status === 'faerdig')?.period_end ?? null;

  return (
    <div className="space-y-5">
      <div className="rounded-xl border p-5" style={cardStyle}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="max-w-xl">
            <h2 className="text-lg font-semibold" style={{ color: 'var(--cp-text)' }}>
              Statusudtalelse
            </h2>
            <p className="mt-1 text-sm leading-relaxed" style={{ color: 'var(--cp-muted)' }}>
              Til kommunen før opfølgningsmødet. BUDR skriver et udkast ud fra journal, VUM, mål og
              {` ${residentName.split(' ')[0]}s`} egne check-ins i perioden. Du retter til og
              printer eller gemmer som PDF.
            </p>
          </div>
          {!creating && (
            <button
              type="button"
              onClick={() => setCreating(true)}
              className={primaryButton}
              style={{ backgroundColor: 'var(--cp-green)' }}
            >
              <Plus size={16} aria-hidden /> Ny statusudtalelse
            </button>
          )}
        </div>

        {creating && (
          <NewReportForm
            residentId={residentId}
            defaultStart={lastEnd ? addDays(lastEnd, 1) : monthsAgo(6)}
            onCancel={() => setCreating(false)}
            onCreated={(report) => {
              setReports((prev) => [report, ...(prev ?? [])]);
              setCreating(false);
              setOpenId(report.id);
            }}
          />
        )}
      </div>

      {error && (
        <p className="text-sm" role="alert" style={{ color: 'var(--cp-red)' }}>
          {error}
        </p>
      )}

      {reports.length > 0 && (
        <ul className="space-y-2">
          {reports.map((r) => (
            <li key={r.id}>
              <button
                type="button"
                onClick={() => setOpenId(r.id)}
                className="flex w-full items-center gap-3 rounded-xl border p-4 text-left transition-colors hover:brightness-110"
                style={cardStyle}
              >
                <FileText size={18} style={{ color: 'var(--cp-green)' }} aria-hidden />
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-medium" style={{ color: 'var(--cp-text)' }}>
                    Statusudtalelse {formatDanishDate(r.period_start)} –{' '}
                    {formatDanishDate(r.period_end)}
                  </span>
                  <span className="block text-xs" style={{ color: 'var(--cp-muted)' }}>
                    {r.meeting_date ? `Møde ${formatDanishDate(r.meeting_date)} · ` : ''}
                    Senest ændret {new Date(r.updated_at).toLocaleDateString('da-DK')}
                  </span>
                </span>
                <StatusChip status={r.status} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function StatusChip({ status }: { status: StatusReportRow['status'] }) {
  const done = status === 'faerdig';
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium"
      style={{
        backgroundColor: done ? 'var(--cp-green-dim)' : 'var(--cp-amber-dim)',
        color: done ? 'var(--cp-green)' : 'var(--cp-amber)',
      }}
    >
      {done ? <Lock size={11} aria-hidden /> : null}
      {done ? 'Færdig' : 'Kladde'}
    </span>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1 text-xs font-medium" style={{ color: 'var(--cp-muted)' }}>
      {label}
      {children}
    </label>
  );
}

function NewReportForm({
  residentId,
  defaultStart,
  onCancel,
  onCreated,
}: {
  residentId: string;
  defaultStart: string;
  onCancel: () => void;
  onCreated: (r: StatusReportRow) => void;
}) {
  const [periodStart, setPeriodStart] = useState(defaultStart);
  const [periodEnd, setPeriodEnd] = useState(todayYmd());
  const [meetingDate, setMeetingDate] = useState('');
  const [paragraph, setParagraph] = useState('§108');
  const [contact, setContact] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const json = await api<{ report: StatusReportRow }>('/api/portal/status-reports', {
        method: 'POST',
        body: JSON.stringify({
          resident_id: residentId,
          period_start: periodStart,
          period_end: periodEnd,
          meeting_date: meetingDate || null,
          paragraph,
          contact_person: contact,
        }),
      });
      onCreated(json.report);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunne ikke oprette');
      setBusy(false);
    }
  };

  return (
    <form
      onSubmit={(e) => void submit(e)}
      className="mt-5 border-t pt-5"
      style={{ borderColor: 'var(--cp-border)' }}
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Field label="Periode fra">
          <input
            type="date"
            required
            value={periodStart}
            onChange={(e) => setPeriodStart(e.target.value)}
            className="rounded-lg border px-3 py-2 text-sm"
            style={inputStyle}
          />
        </Field>
        <Field label="Periode til">
          <input
            type="date"
            required
            value={periodEnd}
            onChange={(e) => setPeriodEnd(e.target.value)}
            className="rounded-lg border px-3 py-2 text-sm"
            style={inputStyle}
          />
        </Field>
        <Field label="Opfølgningsmøde">
          <input
            type="date"
            value={meetingDate}
            onChange={(e) => setMeetingDate(e.target.value)}
            className="rounded-lg border px-3 py-2 text-sm"
            style={inputStyle}
          />
        </Field>
        <Field label="Paragraf">
          <select
            value={paragraph}
            onChange={(e) => setParagraph(e.target.value)}
            className="rounded-lg border px-3 py-2 text-sm"
            style={inputStyle}
          >
            {PARAGRAPHS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Kontaktperson">
          <input
            type="text"
            value={contact}
            maxLength={200}
            onChange={(e) => setContact(e.target.value)}
            placeholder="Navn"
            className="rounded-lg border px-3 py-2 text-sm"
            style={inputStyle}
          />
        </Field>
      </div>
      {error && (
        <p className="mt-3 text-sm" role="alert" style={{ color: 'var(--cp-red)' }}>
          {error}
        </p>
      )}
      <div className="mt-4 flex gap-2">
        <button
          type="submit"
          disabled={busy}
          className={primaryButton}
          style={{ backgroundColor: 'var(--cp-green)' }}
        >
          {busy ? (
            <Loader2 size={15} className="animate-spin" aria-hidden />
          ) : (
            <Plus size={15} aria-hidden />
          )}
          Opret
        </button>
        <button
          type="button"
          onClick={onCancel}
          className={ghostButton}
          style={{ borderColor: 'var(--cp-border)', color: 'var(--cp-text)' }}
        >
          Annullér
        </button>
      </div>
    </form>
  );
}

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

function StatusReportEditor({
  report,
  residentName,
  onBack,
  onChange,
}: {
  report: StatusReportRow;
  residentName: string;
  onBack: () => void;
  onChange: (r: StatusReportRow) => void;
}) {
  const org = useCurrentOrg();
  const [sections, setSections] = useState<StatusReportSections>(report.sections ?? {});
  const [meta, setMeta] = useState({
    meeting_date: report.meeting_date ?? '',
    paragraph: report.paragraph ?? '',
    contact_person: report.contact_person ?? '',
  });
  const [drafting, setDrafting] = useState<Set<StatusReportSectionKey>>(new Set());
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const locked = report.status === 'faerdig';

  const pending = useRef<StatusReportSections>({});
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // onChange er en ny funktion ved hver render hos forælderen; hold den i en ref,
  // så `patch`/`flush` er stabile og oprydnings-effekten kun kører ved unmount.
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const patch = useCallback(
    async (body: Record<string, unknown>) => {
      setSaveState('saving');
      try {
        const json = await api<{ report: StatusReportRow }>(
          `/api/portal/status-reports/${report.id}`,
          {
            method: 'PATCH',
            body: JSON.stringify(body),
          }
        );
        onChangeRef.current(json.report);
        setSaveState('saved');
        return json.report;
      } catch (e) {
        setSaveState('error');
        setError(e instanceof Error ? e.message : 'Kunne ikke gemme');
        return null;
      }
    },
    [report.id]
  );

  const flush = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const toSave = pending.current;
    pending.current = {};
    if (Object.keys(toSave).length > 0) await patch({ sections: toSave });
  }, [patch]);

  const setSection = useCallback(
    (key: StatusReportSectionKey, text: string) => {
      setSections((prev) => ({ ...prev, [key]: text }));
      pending.current = { ...pending.current, [key]: text };
      setSaveState('saving');
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void flush(), 900);
    },
    [flush]
  );

  // Gem ventende ændringer, når man forlader udtalelsen.
  useEffect(() => () => void flush(), [flush]);

  const draftSection = useCallback(
    async (key: StatusReportSectionKey) => {
      setDrafting((prev) => new Set(prev).add(key));
      setError(null);
      try {
        const json = await api<{ text: string }>(`/api/portal/status-reports/${report.id}/draft`, {
          method: 'POST',
          body: JSON.stringify({ section: key }),
        });
        setSection(key, json.text);
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Kunne ikke skrive udkast');
      } finally {
        setDrafting((prev) => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
      }
    },
    [report.id, setSection]
  );

  const aiSections = STATUS_REPORT_SECTIONS.filter((s) => s.aiDraft);
  const emptyAiSections = aiSections.filter((s) => !(sections[s.key] ?? '').trim());

  const draftAllEmpty = () => {
    for (const s of emptyAiSections) void draftSection(s.key);
  };

  const header: StatusReportHeader = {
    residentName,
    orgName: org?.name ?? null,
    periodStart: report.period_start,
    periodEnd: report.period_end,
    meetingDate: meta.meeting_date || null,
    paragraph: meta.paragraph || null,
    contactPerson: meta.contact_person || null,
    finished: locked,
  };

  const print = async () => {
    await flush();
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(renderStatusReportHtml(header, sections));
    w.document.close();
    w.focus();
    w.print();
  };

  const copy = async () => {
    await navigator.clipboard.writeText(renderStatusReportText(header, sections));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const finish = async () => {
    if (!window.confirm('Markér som færdig? Udtalelsen kan derefter ikke redigeres.')) return;
    await flush();
    await patch({ status: 'faerdig' });
  };

  const saveMeta = (field: keyof typeof meta) => {
    if ((report[field] ?? '') === meta[field]) return;
    void patch({ [field]: meta[field] || null });
  };

  const anyDrafting = drafting.size > 0;

  return (
    <div className="space-y-4">
      <div
        className="sticky top-0 z-10 -mx-1 rounded-xl border px-4 py-3 backdrop-blur"
        style={{
          ...cardStyle,
          backgroundColor: 'color-mix(in srgb, var(--cp-bg2) 92%, transparent)',
        }}
      >
        <div className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={() => void flush().then(onBack)}
            className="inline-flex items-center gap-1 text-sm"
            style={{ color: 'var(--cp-muted)' }}
          >
            <ArrowLeft size={15} aria-hidden /> Dokumenter
          </button>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold" style={{ color: 'var(--cp-text)' }}>
              Statusudtalelse · {formatDanishDate(report.period_start)} –{' '}
              {formatDanishDate(report.period_end)}
            </p>
          </div>
          <SaveIndicator state={saveState} />
          <StatusChip status={report.status} />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {!locked && emptyAiSections.length > 0 && (
            <button
              type="button"
              onClick={draftAllEmpty}
              disabled={anyDrafting}
              className={primaryButton}
              style={{ backgroundColor: 'var(--cp-green)' }}
            >
              {anyDrafting ? (
                <Loader2 size={15} className="animate-spin" aria-hidden />
              ) : (
                <Sparkles size={15} aria-hidden />
              )}
              {emptyAiSections.length === aiSections.length
                ? 'Skriv udkast til hele udtalelsen'
                : `Skriv udkast til ${emptyAiSections.length} tomme afsnit`}
            </button>
          )}
          <button
            type="button"
            onClick={() => void print()}
            className={ghostButton}
            style={{ borderColor: 'var(--cp-border)', color: 'var(--cp-text)' }}
          >
            <Printer size={15} aria-hidden /> Print / PDF
          </button>
          <button
            type="button"
            onClick={() => void copy()}
            className={ghostButton}
            style={{ borderColor: 'var(--cp-border)', color: 'var(--cp-text)' }}
          >
            {copied ? <Check size={15} aria-hidden /> : <Copy size={15} aria-hidden />}
            {copied ? 'Kopieret' : 'Kopiér tekst'}
          </button>
          {!locked && (
            <button
              type="button"
              onClick={() => void finish()}
              disabled={anyDrafting}
              className={ghostButton}
              style={{ borderColor: 'var(--cp-border)', color: 'var(--cp-text)' }}
            >
              <Lock size={15} aria-hidden /> Markér som færdig
            </button>
          )}
        </div>
      </div>

      {error && (
        <p className="text-sm" role="alert" style={{ color: 'var(--cp-red)' }}>
          {error}
        </p>
      )}

      <div className="grid gap-3 rounded-xl border p-4 sm:grid-cols-3" style={cardStyle}>
        <Field label="Opfølgningsmøde">
          <input
            type="date"
            disabled={locked}
            value={meta.meeting_date}
            onChange={(e) => setMeta((m) => ({ ...m, meeting_date: e.target.value }))}
            onBlur={() => saveMeta('meeting_date')}
            className="rounded-lg border px-3 py-2 text-sm"
            style={inputStyle}
          />
        </Field>
        <Field label="Paragraf">
          <select
            disabled={locked}
            value={meta.paragraph}
            onChange={(e) => setMeta((m) => ({ ...m, paragraph: e.target.value }))}
            onBlur={() => saveMeta('paragraph')}
            className="rounded-lg border px-3 py-2 text-sm"
            style={inputStyle}
          >
            <option value="">—</option>
            {PARAGRAPHS.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Kontaktperson">
          <input
            type="text"
            disabled={locked}
            maxLength={200}
            value={meta.contact_person}
            onChange={(e) => setMeta((m) => ({ ...m, contact_person: e.target.value }))}
            onBlur={() => saveMeta('contact_person')}
            className="rounded-lg border px-3 py-2 text-sm"
            style={inputStyle}
          />
        </Field>
      </div>

      {STATUS_REPORT_SECTIONS.map((s, i) => (
        <SectionCard
          key={s.key}
          index={i + 1}
          section={s}
          value={sections[s.key] ?? ''}
          drafting={drafting.has(s.key)}
          locked={locked}
          onChange={(text) => setSection(s.key, text)}
          onDraft={() => {
            const current = (sections[s.key] ?? '').trim();
            if (current && !window.confirm('Erstat den nuværende tekst med et nyt udkast?')) return;
            void draftSection(s.key);
          }}
        />
      ))}

      <p className="pb-4 text-xs leading-relaxed" style={{ color: 'var(--cp-muted2)' }}>
        Udkast skrives af AI ud fra godkendte journalnotater, VUM, mål og borgerens check-ins i
        perioden. Borgerens navn erstattes med «Borgeren», før data sendes. Læs altid teksten
        igennem og ret markeringer i [firkantede parenteser] før udtalelsen sendes.
      </p>
    </div>
  );
}

function SaveIndicator({ state }: { state: SaveState }) {
  if (state === 'idle') return null;
  const label = state === 'saving' ? 'Gemmer…' : state === 'saved' ? 'Gemt' : 'Ikke gemt';
  return (
    <span
      className="text-xs"
      style={{ color: state === 'error' ? 'var(--cp-red)' : 'var(--cp-muted)' }}
      aria-live="polite"
    >
      {label}
    </span>
  );
}

function SectionCard({
  index,
  section,
  value,
  drafting,
  locked,
  onChange,
  onDraft,
}: {
  index: number;
  section: StatusReportSectionDefinition;
  value: string;
  drafting: boolean;
  locked: boolean;
  onChange: (text: string) => void;
  onDraft: () => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);

  // Tekstfeltet vokser med indholdet, så hele afsnittet kan læses uden at scrolle i feltet.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.max(el.scrollHeight, 96)}px`;
  }, [value]);

  return (
    <section className="rounded-xl border p-4 sm:p-5" style={cardStyle}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-[15px] font-semibold" style={{ color: 'var(--cp-text)' }}>
            <span style={{ color: 'var(--cp-muted2)' }}>{index}. </span>
            {section.title}
          </h3>
          <p className="mt-0.5 text-xs" style={{ color: 'var(--cp-muted)' }}>
            {section.help}
          </p>
        </div>
        {section.aiDraft && !locked && (
          <button
            type="button"
            onClick={onDraft}
            disabled={drafting}
            className={ghostButton}
            style={{ borderColor: 'var(--cp-border)', color: 'var(--cp-green)' }}
          >
            {drafting ? (
              <Loader2 size={14} className="animate-spin" aria-hidden />
            ) : (
              <Sparkles size={14} aria-hidden />
            )}
            {drafting ? 'Skriver…' : value.trim() ? 'Nyt udkast' : 'Skriv udkast'}
          </button>
        )}
      </div>
      <div className="relative mt-3">
        <textarea
          ref={ref}
          value={value}
          readOnly={locked}
          disabled={drafting}
          onChange={(e) => onChange(e.target.value)}
          placeholder={section.aiDraft ? 'Tryk «Skriv udkast», eller skriv selv…' : 'Skriv her…'}
          className="w-full resize-none rounded-lg border px-3.5 py-3 text-sm leading-relaxed outline-none focus:ring-2"
          style={{ ...inputStyle, minHeight: 96 }}
        />
        {drafting && (
          <div
            className="pointer-events-none absolute inset-0 flex items-center justify-center rounded-lg"
            style={{ backgroundColor: 'color-mix(in srgb, var(--cp-bg3) 70%, transparent)' }}
          >
            <span className="flex items-center gap-2 text-sm" style={{ color: 'var(--cp-muted)' }}>
              <Loader2 size={15} className="animate-spin" aria-hidden /> BUDR skriver et udkast…
            </span>
          </div>
        )}
      </div>
    </section>
  );
}
