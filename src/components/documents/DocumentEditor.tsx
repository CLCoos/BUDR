'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Check,
  CheckCircle2,
  ChevronDown,
  Copy,
  CornerUpLeft,
  FilePlus2,
  History,
  Loader2,
  Printer,
  Send,
  Sparkles,
  Undo2,
} from 'lucide-react';
import { sortSources } from '@/lib/documents/citations';
import {
  getDocumentType,
  incompleteSections,
  type DocumentSectionDefinition,
  type DocumentTypeDefinition,
} from '@/lib/documents/registry';
import {
  formatDanishDate,
  formatDanishDateTime,
  renderDocumentHtml,
  renderDocumentText,
  type DocumentHeader,
} from '@/lib/documents/render';
import {
  DOCUMENT_EVENT_LABELS,
  type DocumentEventRow,
  type DocumentMeta,
  type DocumentSectionSources,
  type DocumentSections,
  type ResidentDocumentRow,
  type SourceRef,
} from '@/lib/documents/types';
import {
  ApiError,
  DueChip,
  Field,
  StatusChip,
  api,
  cardStyle,
  ghostButton,
  inputStyle,
  primaryButton,
} from './shared';
import { MetaInput } from './MetaInput';
import { createSerialQueue } from '@/lib/documents/serialQueue';

type StaffRow = { id: string; full_name: string | null; role: string | null };

type Loaded = {
  document: ResidentDocumentRow;
  events: DocumentEventRow[];
  staff: StaffRow[];
  org: { name: string | null; logo_url: string | null } | null;
  canApprove: boolean;
  me: string;
};

type SaveState = 'idle' | 'saving' | 'saved' | 'error';

type Props = {
  documentId: string;
  residentName: string;
  onBack: () => void;
  onChange: (doc: ResidentDocumentRow) => void;
  onOpen: (id: string) => void;
};

export default function DocumentEditor(props: Props) {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      setLoaded(await api<Loaded>(`/api/portal/documents/${props.documentId}`));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kunne ikke hente dokumentet');
    }
  }, [props.documentId]);

  useEffect(() => {
    void load();
  }, [load]);

  if (!loaded) {
    return (
      <div className="space-y-3">
        <BackButton onBack={props.onBack} />
        {error ? (
          <p className="text-sm" role="alert" style={{ color: 'var(--cp-red)' }}>
            {error}
          </p>
        ) : (
          <p className="flex items-center gap-2 text-sm" style={{ color: 'var(--cp-muted)' }}>
            <Loader2 size={14} className="animate-spin" aria-hidden /> Henter dokument…
          </p>
        )}
      </div>
    );
  }

  const type = getDocumentType(loaded.document.doc_type);
  if (!type) return null;
  return (
    <Editor
      key={`${loaded.document.id}:${loaded.document.status}`}
      {...props}
      type={type}
      loaded={loaded}
      reload={load}
    />
  );
}

function BackButton({ onBack }: { onBack: () => void }) {
  return (
    <button
      type="button"
      onClick={onBack}
      className="inline-flex min-h-[40px] items-center gap-1 text-sm"
      style={{ color: 'var(--cp-muted)' }}
    >
      <ArrowLeft size={15} aria-hidden /> Alle dokumenter
    </button>
  );
}

function Editor({
  type,
  loaded,
  reload,
  residentName,
  onBack,
  onChange,
  onOpen,
}: Props & { type: DocumentTypeDefinition; loaded: Loaded; reload: () => Promise<void> }) {
  const doc = loaded.document;
  const editable = doc.status === 'kladde' || doc.status === 'til_godkendelse';
  const staffName = useCallback(
    (id: string | null) => loaded.staff.find((s) => s.id === id)?.full_name?.trim() || null,
    [loaded.staff]
  );

  const [sections, setSections] = useState<DocumentSections>(doc.sections ?? {});
  const [sources, setSources] = useState<DocumentSectionSources>(doc.section_sources ?? {});
  const [meta, setMeta] = useState<DocumentMeta>(doc.meta ?? {});
  const [dueDate, setDueDate] = useState(doc.due_date ?? '');
  const [drafting, setDrafting] = useState<Set<string>>(new Set());
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [returnNote, setReturnNote] = useState<string | null>(null);

  const pending = useRef<{ sections: DocumentSections; sources: DocumentSectionSources }>({
    sections: {},
    sources: {},
  });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Én gem ad gangen. Ellers kan et langsomt kald, der læste den gamle tekst,
  // blive færdigt sidst og overskrive det, der blev skrevet bagefter.
  const enqueue = useMemo(() => createSerialQueue(), []);
  // onChange skifter identitet ved hver render hos forælderen; hold den i en ref,
  // så `patch`/`flush` er stabile og oprydnings-effekten kun kører ved unmount.
  const onChangeRef = useRef(onChange);
  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  const patch = useCallback(
    (body: Record<string, unknown>) =>
      enqueue(async () => {
        setSaveState('saving');
        try {
          const json = await api<{ document: ResidentDocumentRow }>(
            `/api/portal/documents/${doc.id}`,
            { method: 'PATCH', body: JSON.stringify(body) }
          );
          onChangeRef.current(json.document);
          setSaveState('saved');
          return json.document;
        } catch (e) {
          setSaveState('error');
          setError(e instanceof Error ? e.message : 'Kunne ikke gemme');
          return null;
        }
      }),
    [doc.id, enqueue]
  );

  const flush = useCallback(async () => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const { sections: s, sources: src } = pending.current;
    pending.current = { sections: {}, sources: {} };
    const body: Record<string, unknown> = {};
    if (Object.keys(s).length > 0) body.sections = s;
    if (Object.keys(src).length > 0) body.section_sources = src;
    if (Object.keys(body).length > 0) await patch(body);
    else await enqueue(async () => undefined);
  }, [patch, enqueue]);

  const setSection = useCallback(
    (key: string, text: string, newSources?: SourceRef[]) => {
      setSections((prev) => ({ ...prev, [key]: text }));
      pending.current.sections = { ...pending.current.sections, [key]: text };
      // Tømmer man afsnittet, hører kilderne ikke længere til teksten.
      const nextSources = newSources ?? (text.trim() ? undefined : []);
      if (nextSources) {
        setSources((prev) => ({ ...prev, [key]: nextSources }));
        pending.current.sources = { ...pending.current.sources, [key]: nextSources };
      }
      setSaveState('saving');
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => void flush(), 900);
    },
    [flush]
  );

  useEffect(() => () => void flush(), [flush]);

  const draftSection = useCallback(
    async (key: string) => {
      setDrafting((prev) => new Set(prev).add(key));
      setError(null);
      try {
        const json = await api<{ text: string; sources: SourceRef[] }>(
          `/api/portal/documents/${doc.id}/draft`,
          { method: 'POST', body: JSON.stringify({ section: key }) }
        );
        setSection(key, json.text, json.sources ?? []);
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
    [doc.id, setSection]
  );

  const aiSections = type.sections.filter((s) => s.aiDraft);
  const emptyAiSections = aiSections.filter((s) => !(sections[s.key] ?? '').trim());
  const check = useMemo(() => incompleteSections(type, sections), [type, sections]);
  const filled = type.sections.length - check.missing.length;
  const anyDrafting = drafting.size > 0;

  const draftAllEmpty = () => {
    for (const s of emptyAiSections) void draftSection(s.key);
  };

  const header: DocumentHeader = {
    residentName,
    orgName: loaded.org?.name ?? null,
    orgLogoUrl: loaded.org?.logo_url ?? null,
    status: doc.status,
    version: doc.version,
    approvedByName: staffName(doc.approved_by),
    approvedAt: doc.approved_at,
  };

  const print = async () => {
    await flush();
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(renderDocumentHtml(type, header, meta, sections));
    w.document.close();
    w.focus();
    w.print();
  };

  const copy = async () => {
    await navigator.clipboard.writeText(renderDocumentText(type, header, meta, sections));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const transition = async (action: 'submit' | 'return' | 'approve', note?: string) => {
    await flush();
    setBusy(true);
    setError(null);
    try {
      const json = await api<{ document: ResidentDocumentRow }>(
        `/api/portal/documents/${doc.id}/transition`,
        { method: 'POST', body: JSON.stringify({ action, note }) }
      );
      onChangeRef.current(json.document);
      await reload();
    } catch (e) {
      if (e instanceof ApiError && e.status === 422) {
        const missing = (e.data.missing as string[] | undefined) ?? [];
        const placeholders = (e.data.placeholders as string[] | undefined) ?? [];
        const parts = [
          missing.length ? `Mangler tekst: ${missing.join(', ')}.` : '',
          placeholders.length ? `Har gule markeringer: ${placeholders.join(', ')}.` : '',
        ];
        setError(`${e.message}. ${parts.filter(Boolean).join(' ')}`);
      } else {
        setError(e instanceof Error ? e.message : 'Noget gik galt');
      }
    } finally {
      setBusy(false);
    }
  };

  const newVersion = async () => {
    setBusy(true);
    setError(null);
    try {
      const json = await api<{ document: ResidentDocumentRow }>(
        `/api/portal/documents/${doc.id}/new-version`,
        { method: 'POST' }
      );
      onChangeRef.current(json.document);
      onOpen(json.document.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kunne ikke lave ny version');
      setBusy(false);
    }
  };

  const saveMeta = (key: string, value: string) => {
    const next = value || null;
    if ((doc.meta?.[key] ?? null) === next) return;
    setMeta((m) => ({ ...m, [key]: next }));
    void patch({ meta: { [key]: next } });
  };

  const scrollToSection = (title: string) => {
    const s = type.sections.find((x) => x.title === title);
    if (s) document.getElementById(`doc-section-${s.key}`)?.scrollIntoView({ behavior: 'smooth' });
  };

  const isAuthor = doc.responsible_id === loaded.me || doc.created_by === loaded.me;
  const period =
    type.period && meta[type.period.start]
      ? `${formatDanishDate(meta[type.period.start])} – ${formatDanishDate(meta[type.period.end])}`
      : null;

  return (
    <div className="space-y-4">
      {/* Værktøjslinje */}
      <div
        className="sticky top-0 z-10 -mx-1 rounded-xl border px-4 py-3 backdrop-blur"
        style={{
          ...cardStyle,
          backgroundColor: 'color-mix(in srgb, var(--cp-bg2) 92%, transparent)',
        }}
      >
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <BackButton onBack={() => void flush().then(onBack)} />
          <div className="order-last min-w-0 flex-1 basis-full sm:order-none sm:basis-0">
            <p className="text-sm font-semibold sm:truncate" style={{ color: 'var(--cp-text)' }}>
              {type.title}
              {period ? ` · ${period}` : ''}
              {doc.version > 1 ? ` · version ${doc.version}` : ''}
            </p>
          </div>
          <SaveIndicator state={saveState} />
          <DueChip dueDate={doc.due_date} status={doc.status} />
          <StatusChip status={doc.status} />
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
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
          <button
            type="button"
            onClick={() => setShowHistory((v) => !v)}
            className={ghostButton}
            style={{ borderColor: 'var(--cp-border)', color: 'var(--cp-text)' }}
            aria-expanded={showHistory}
          >
            <History size={15} aria-hidden /> Historik
          </button>
        </div>
      </div>

      <Stepper status={doc.status} />

      {/* Næste skridt: portalen siger altid, hvad der skal ske nu */}
      <NextStep>
        {doc.status === 'kladde' && doc.review_note && (
          <Callout tone="amber" title="Sendt retur til rettelse">
            {doc.review_note}
          </Callout>
        )}
        {doc.status === 'kladde' && emptyAiSections.length > 0 && (
          <Guide
            title={
              emptyAiSections.length === aiSections.length
                ? 'Lad BUDR skrive udkastet'
                : `${emptyAiSections.length} afsnit mangler stadig tekst`
            }
            text={`BUDR skriver ud fra godkendte notater, VUM, mål og ${residentName.split(' ')[0]}s egne check-ins. Du retter bagefter til.`}
          >
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
              {anyDrafting
                ? `Skriver ${drafting.size} afsnit…`
                : emptyAiSections.length === aiSections.length
                  ? 'Skriv udkast til hele dokumentet'
                  : `Skriv de ${emptyAiSections.length} tomme afsnit`}
            </button>
          </Guide>
        )}
        {editable && emptyAiSections.length === 0 && check.missing.length > 0 && (
          <Guide
            title="Udfyld de sidste afsnit"
            text={`Disse afsnit skal du skrive selv: ${check.missing.join(', ')}.`}
          >
            <button
              type="button"
              onClick={() => scrollToSection(check.missing[0])}
              className={ghostButton}
              style={{ borderColor: 'var(--cp-border)', color: 'var(--cp-text)' }}
            >
              Gå til {check.missing[0]}
            </button>
          </Guide>
        )}
        {editable && check.missing.length === 0 && check.placeholders.length > 0 && (
          <Guide
            title="Gennemgå de gule markeringer"
            text={`Der står stadig noget, personalet skal udfylde eller tjekke, i: ${check.placeholders.join(', ')}. Ret teksten og slet markeringen, når det er gjort.`}
          >
            <button
              type="button"
              onClick={() => scrollToSection(check.placeholders[0])}
              className={ghostButton}
              style={{ borderColor: 'var(--cp-border)', color: 'var(--cp-text)' }}
            >
              Gå til {check.placeholders[0]}
            </button>
          </Guide>
        )}
        {doc.status === 'kladde' &&
          check.missing.length === 0 &&
          check.placeholders.length === 0 && (
            <Guide
              title={loaded.canApprove ? 'Klar til at blive godkendt' : 'Klar til godkendelse'}
              text={
                loaded.canApprove
                  ? 'Læs dokumentet igennem. Du kan godkende det selv eller sende det til en kollega.'
                  : 'Når du sender dokumentet, får lederen besked og kan godkende det.'
              }
            >
              {loaded.canApprove && (
                <button
                  type="button"
                  onClick={() => void transition('approve')}
                  disabled={busy || anyDrafting || check.placeholders.length > 0}
                  className={primaryButton}
                  style={{ backgroundColor: 'var(--cp-green)' }}
                >
                  <CheckCircle2 size={15} aria-hidden /> Godkend og lås
                </button>
              )}
              <button
                type="button"
                onClick={() => void transition('submit')}
                disabled={busy || anyDrafting}
                className={loaded.canApprove ? ghostButton : primaryButton}
                style={
                  loaded.canApprove
                    ? { borderColor: 'var(--cp-border)', color: 'var(--cp-text)' }
                    : { backgroundColor: 'var(--cp-green)' }
                }
              >
                <Send size={15} aria-hidden /> Send til godkendelse
              </button>
            </Guide>
          )}
        {doc.status === 'til_godkendelse' && loaded.canApprove && (
          <Guide
            title="Venter på din godkendelse"
            text={`Sendt af ${staffName(doc.submitted_by) ?? 'en kollega'} ${formatDanishDateTime(doc.submitted_at)}. Læs dokumentet igennem og ret småting direkte, eller send det retur med en besked.`}
          >
            <button
              type="button"
              onClick={() => void transition('approve')}
              disabled={busy || check.missing.length > 0 || check.placeholders.length > 0}
              className={primaryButton}
              style={{ backgroundColor: 'var(--cp-green)' }}
            >
              <CheckCircle2 size={15} aria-hidden /> Godkend og lås
            </button>
            <button
              type="button"
              onClick={() => setReturnNote((v) => (v === null ? '' : null))}
              disabled={busy}
              className={ghostButton}
              style={{ borderColor: 'var(--cp-border)', color: 'var(--cp-text)' }}
            >
              <CornerUpLeft size={15} aria-hidden /> Send retur
            </button>
          </Guide>
        )}
        {doc.status === 'til_godkendelse' && !loaded.canApprove && (
          <Guide
            title="Venter på godkendelse"
            text="Lederen har fået besked. Du kan stadig rette i teksten, eller trække dokumentet tilbage."
          >
            {isAuthor && (
              <button
                type="button"
                onClick={() => void transition('return')}
                disabled={busy}
                className={ghostButton}
                style={{ borderColor: 'var(--cp-border)', color: 'var(--cp-text)' }}
              >
                <Undo2 size={15} aria-hidden /> Træk tilbage
              </button>
            )}
          </Guide>
        )}
        {returnNote !== null && (
          <div className="rounded-lg border p-3" style={{ borderColor: 'var(--cp-border)' }}>
            <Field label="Besked til den ansvarlige">
              <textarea
                value={returnNote}
                onChange={(e) => setReturnNote(e.target.value)}
                rows={3}
                maxLength={2000}
                placeholder="Fx: Tilføj borgerens egne ord i afsnit 5."
                className="rounded-lg border px-3 py-2 text-sm"
                style={inputStyle}
              />
            </Field>
            <div className="mt-2 flex gap-2">
              <button
                type="button"
                onClick={() =>
                  void transition('return', returnNote).then(() => setReturnNote(null))
                }
                disabled={busy}
                className={primaryButton}
                style={{ backgroundColor: 'var(--cp-amber)' }}
              >
                <CornerUpLeft size={15} aria-hidden /> Send retur
              </button>
              <button
                type="button"
                onClick={() => setReturnNote(null)}
                className={ghostButton}
                style={{ borderColor: 'var(--cp-border)', color: 'var(--cp-text)' }}
              >
                Annullér
              </button>
            </div>
          </div>
        )}
        {doc.status === 'godkendt' && (
          <Guide
            title={`Godkendt af ${staffName(doc.approved_by) ?? 'personalet'}`}
            text={`${formatDanishDateTime(doc.approved_at)}. Dokumentet er låst. Skal der ændres noget, laver du en ny version; den gamle gemmes i historikken.`}
          >
            <button
              type="button"
              onClick={() => void print()}
              className={primaryButton}
              style={{ backgroundColor: 'var(--cp-green)' }}
            >
              <Printer size={15} aria-hidden /> Print / gem som PDF
            </button>
            <button
              type="button"
              onClick={() => void newVersion()}
              disabled={busy}
              className={ghostButton}
              style={{ borderColor: 'var(--cp-border)', color: 'var(--cp-text)' }}
            >
              <FilePlus2 size={15} aria-hidden /> Lav ny version
            </button>
          </Guide>
        )}
        {doc.status === 'erstattet' && (
          <Guide
            title="Der findes en nyere version"
            text="Denne version er gemt til historikken og kan ikke ændres."
          />
        )}
      </NextStep>

      {error && (
        <p className="text-sm" role="alert" style={{ color: 'var(--cp-red)' }}>
          {error}
        </p>
      )}

      {showHistory && (
        <HistoryPanel events={loaded.events} staffName={staffName} sections={type.sections} />
      )}

      {/* Oplysninger */}
      <div className="rounded-xl border p-4" style={cardStyle}>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {type.metaFields.map((f) => (
            <MetaInput
              key={f.key}
              field={f}
              value={meta[f.key] ?? ''}
              disabled={!editable}
              onCommit={(v) => saveMeta(f.key, v)}
            />
          ))}
          <Field label="Frist" hint="Hvornår skal dokumentet være godkendt?">
            <input
              type="date"
              disabled={!editable}
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              onBlur={() => {
                if ((doc.due_date ?? '') !== dueDate) void patch({ due_date: dueDate || null });
              }}
              className="min-h-[40px] rounded-lg border px-3 py-2 text-sm"
              style={inputStyle}
            />
          </Field>
          <Field label="Ansvarlig">
            <select
              disabled={!editable}
              value={doc.responsible_id ?? ''}
              onChange={(e) => void patch({ responsible_id: e.target.value || null })}
              className="min-h-[40px] rounded-lg border px-3 py-2 text-sm"
              style={inputStyle}
            >
              <option value="">Ingen</option>
              {loaded.staff.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.full_name?.trim() || 'Uden navn'}
                </option>
              ))}
            </select>
          </Field>
        </div>
        <p className="mt-3 text-xs" style={{ color: 'var(--cp-muted)' }}>
          {filled} af {type.sections.length} afsnit udfyldt
        </p>
        <div
          className="mt-1.5 h-1.5 overflow-hidden rounded-full"
          style={{ backgroundColor: 'var(--cp-bg3)' }}
          aria-hidden
        >
          <div
            className="h-full rounded-full transition-all"
            style={{
              width: `${(filled / Math.max(1, type.sections.length)) * 100}%`,
              backgroundColor: 'var(--cp-green)',
            }}
          />
        </div>
      </div>

      {type.sections.map((s, i) => (
        <SectionCard
          key={s.key}
          index={i + 1}
          section={s}
          value={sections[s.key] ?? ''}
          sources={sources[s.key] ?? []}
          drafting={drafting.has(s.key)}
          locked={!editable}
          onChange={(text) => setSection(s.key, text)}
          onDraft={() => {
            const current = (sections[s.key] ?? '').trim();
            if (current && !window.confirm('Erstat den nuværende tekst med et nyt udkast?')) return;
            void draftSection(s.key);
          }}
        />
      ))}

      <p className="pb-4 text-xs leading-relaxed" style={{ color: 'var(--cp-muted2)' }}>
        Udkast skrives af AI ud fra godkendte journalnotater, VUM, mål og borgerens check-ins.
        Borgerens navn erstattes med «Borgeren», før data sendes, og private noter sendes aldrig
        med. AI skriver kun udkast: dokumentet er først gældende, når en medarbejder har godkendt
        det.
      </p>
    </div>
  );
}

function Stepper({ status }: { status: ResidentDocumentRow['status'] }) {
  const steps = ['Udkast', 'Til godkendelse', 'Godkendt'];
  const current = status === 'kladde' ? 0 : status === 'til_godkendelse' ? 1 : 2;
  return (
    <ol className="flex items-center gap-2 text-xs" aria-label="Dokumentets status">
      {steps.map((label, i) => {
        const done = i < current || (i === 2 && current === 2);
        const active = i === current;
        return (
          <li key={label} className="flex min-w-0 flex-1 items-center gap-2">
            <span
              className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold"
              style={{
                backgroundColor: done || active ? 'var(--cp-green)' : 'var(--cp-bg3)',
                color: done || active ? '#fff' : 'var(--cp-muted)',
              }}
              aria-current={active ? 'step' : undefined}
            >
              {done ? <Check size={13} aria-hidden /> : i + 1}
            </span>
            <span
              className="truncate font-medium"
              style={{ color: active ? 'var(--cp-text)' : 'var(--cp-muted)' }}
            >
              {label}
            </span>
            {i < steps.length - 1 && (
              <span
                className="h-px flex-1"
                style={{ backgroundColor: i < current ? 'var(--cp-green)' : 'var(--cp-border)' }}
                aria-hidden
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}

function NextStep({ children }: { children: React.ReactNode }) {
  const items = React.Children.toArray(children).filter(Boolean);
  if (items.length === 0) return null;
  return (
    <div
      className="space-y-3 rounded-xl border p-4"
      style={{
        ...cardStyle,
        borderColor: 'color-mix(in srgb, var(--cp-green) 40%, var(--cp-border))',
      }}
    >
      <p
        className="text-[11px] font-semibold uppercase tracking-wide"
        style={{ color: 'var(--cp-green)' }}
      >
        Næste skridt
      </p>
      {items}
    </div>
  );
}

function Guide({
  title,
  text,
  children,
}: {
  title: string;
  text: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div className="min-w-0 max-w-2xl">
        <p className="text-[15px] font-semibold" style={{ color: 'var(--cp-text)' }}>
          {title}
        </p>
        <p className="mt-0.5 text-sm leading-relaxed" style={{ color: 'var(--cp-muted)' }}>
          {text}
        </p>
      </div>
      {children ? <div className="flex flex-wrap gap-2">{children}</div> : null}
    </div>
  );
}

function Callout({
  tone,
  title,
  children,
}: {
  tone: 'amber';
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="rounded-lg px-3 py-2.5 text-sm"
      style={{ backgroundColor: `var(--cp-${tone}-dim)`, color: 'var(--cp-text)' }}
      role="status"
    >
      <p className="font-semibold" style={{ color: `var(--cp-${tone})` }}>
        {title}
      </p>
      <p className="mt-0.5 whitespace-pre-wrap">{children}</p>
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

function HistoryPanel({
  events,
  staffName,
  sections,
}: {
  events: DocumentEventRow[];
  staffName: (id: string | null) => string | null;
  sections: readonly DocumentSectionDefinition[];
}) {
  return (
    <div className="rounded-xl border p-4" style={cardStyle}>
      <h3 className="text-sm font-semibold" style={{ color: 'var(--cp-text)' }}>
        Historik
      </h3>
      <ol className="mt-3 space-y-2">
        {[...events].reverse().map((e) => {
          const sectionKey = typeof e.detail?.section === 'string' ? e.detail.section : null;
          const sectionTitle = sectionKey
            ? sections.find((s) => s.key === sectionKey)?.title
            : null;
          const note = typeof e.detail?.note === 'string' ? e.detail.note : null;
          return (
            <li key={e.id} className="text-sm" style={{ color: 'var(--cp-text)' }}>
              <span className="font-medium">{DOCUMENT_EVENT_LABELS[e.action]}</span>
              {sectionTitle ? ` · ${sectionTitle}` : ''}
              {e.action === 'godkendt' && e.detail?.version
                ? ` · version ${String(e.detail.version)}`
                : ''}
              <span className="block text-xs" style={{ color: 'var(--cp-muted)' }}>
                {staffName(e.actor_id) ?? 'Ukendt'} · {formatDanishDateTime(e.created_at)}
              </span>
              {note ? (
                <span className="block text-xs italic" style={{ color: 'var(--cp-muted)' }}>
                  «{note}»
                </span>
              ) : null}
            </li>
          );
        })}
      </ol>
    </div>
  );
}

const SOURCE_KIND_LABEL: Record<SourceRef['kind'], string> = {
  journal: 'Notat',
  checkin: 'Check-in',
  bekymring: 'Bekymring',
  krise: 'Krise',
  naeste_skridt: 'Mål',
};

function SectionCard({
  index,
  section,
  value,
  sources,
  drafting,
  locked,
  onChange,
  onDraft,
}: {
  index: number;
  section: DocumentSectionDefinition;
  value: string;
  sources: SourceRef[];
  drafting: boolean;
  locked: boolean;
  onChange: (text: string) => void;
  onDraft: () => void;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [showSources, setShowSources] = useState(false);
  const hasMarker = /\[[^\]]+\]/.test(value);

  // Tekstfeltet vokser med indholdet, så hele afsnittet kan læses uden at scrolle i feltet.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.max(el.scrollHeight, 96)}px`;
  }, [value]);

  const sorted = useMemo(() => sortSources(sources), [sources]);

  return (
    <section
      id={`doc-section-${section.key}`}
      className="scroll-mt-40 rounded-xl border p-4 sm:p-5"
      style={cardStyle}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <h3 className="text-[15px] font-semibold" style={{ color: 'var(--cp-text)' }}>
            <span style={{ color: 'var(--cp-muted2)' }}>{index}. </span>
            {section.title}
            {value.trim() && !hasMarker ? (
              <CheckCircle2
                size={14}
                className="ml-1.5 inline -translate-y-px"
                style={{ color: 'var(--cp-green)' }}
                aria-label="Udfyldt"
              />
            ) : null}
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
          className="w-full resize-none rounded-lg border px-3.5 py-3 text-[15px] leading-relaxed outline-none focus:ring-2"
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
      {hasMarker && !locked && (
        <p className="mt-2 text-xs" style={{ color: 'var(--cp-amber)' }}>
          Teksten indeholder en markering i [firkantede parenteser], som skal udfyldes eller slettes
          før godkendelse.
        </p>
      )}
      {sorted.length > 0 && (
        <div className="mt-3">
          <button
            type="button"
            onClick={() => setShowSources((v) => !v)}
            className="inline-flex min-h-[32px] items-center gap-1 text-xs font-medium"
            style={{ color: 'var(--cp-muted)' }}
            aria-expanded={showSources}
          >
            <ChevronDown
              size={14}
              className={`transition-transform ${showSources ? 'rotate-180' : ''}`}
              aria-hidden
            />
            Bygger på {sorted.length} {sorted.length === 1 ? 'kilde' : 'kilder'}
          </button>
          {showSources && (
            <ul className="mt-2 space-y-1.5">
              {sorted.map((s) => (
                <li
                  key={s.ref}
                  className="rounded-lg px-3 py-2 text-xs"
                  style={{ backgroundColor: 'var(--cp-bg3)', color: 'var(--cp-text)' }}
                >
                  <span className="font-medium">
                    {SOURCE_KIND_LABEL[s.kind]} · {s.date ? formatDanishDate(s.date) : 'uden dato'}
                    {s.label && s.label !== SOURCE_KIND_LABEL[s.kind] ? ` · ${s.label}` : ''}
                  </span>
                  {s.excerpt ? (
                    <span className="mt-0.5 block" style={{ color: 'var(--cp-muted)' }}>
                      {s.excerpt}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </section>
  );
}
