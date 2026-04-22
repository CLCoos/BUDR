'use client';

import React, { useCallback, useId, useMemo, useState } from 'react';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/client';
import {
  Upload,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  AlertCircle,
  Loader2,
  X,
} from 'lucide-react';

// ── CSV (én funktion, ingen eksterne libs) ─────────────────────

export type CsvResidentRow = { display_name: string; nickname: string | null };

function parseCsvRecords(text: string): string[][] {
  const lines: string[][] = [];
  let row: string[] = [];
  let cur = '';
  let inQ = false;

  const pushField = () => {
    row.push(cur);
    cur = '';
  };

  const pushLine = () => {
    pushField();
    if (row.some((c) => c.length > 0)) {
      lines.push(row);
    }
    row = [];
    cur = '';
  };

  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (inQ) {
      if (c === '"') {
        if (text[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQ = false;
        }
      } else {
        cur += c;
      }
    } else if (c === '"') {
      inQ = true;
    } else if (c === ',') {
      pushField();
    } else if (c === '\r') {
      if (text[i + 1] === '\n') i++;
      pushLine();
    } else if (c === '\n') {
      pushLine();
    } else {
      cur += c;
    }
  }

  pushField();
  if (row.some((c) => c.length > 0)) {
    lines.push(row);
  }

  return lines;
}

/**
 * Parser beboer-CSV: forventet `display_name` (obligatorisk kolonne), valgfri `nickname`.
 * Første række = header (navne case-insensitive).
 */
export function parseResidentsCsv(text: string): {
  rows: CsvResidentRow[];
  error?: string;
} {
  const raw = text.replace(/^\uFEFF/, '').replace(/\r\n/g, '\n');
  const records = parseCsvRecords(raw);
  if (records.length === 0) {
    return { rows: [], error: 'Filen er tom.' };
  }

  const header = records[0].map((h) => h.trim().toLowerCase());
  const dnIdx = header.indexOf('display_name');
  if (dnIdx === -1) {
    return {
      rows: [],
      error: 'CSV skal have kolonnen display_name (første række er overskrifter).',
    };
  }
  const nickIdx = header.indexOf('nickname');

  const rows: CsvResidentRow[] = [];
  for (let r = 1; r < records.length; r++) {
    const rec = records[r];
    const pad = (idx: number) => (idx >= 0 && idx < rec.length ? rec[idx] : '') ?? '';
    const display_name = pad(dnIdx).trim();
    const nickRaw = nickIdx >= 0 ? pad(nickIdx).trim() : '';
    rows.push({
      display_name,
      nickname: nickRaw === '' ? null : nickRaw,
    });
  }

  return { rows };
}

function validateRows(rows: CsvResidentRow[]): string[] {
  const errs: string[] = [];
  rows.forEach((row, idx) => {
    const lineNo = idx + 2;
    if (!row.display_name.trim()) {
      errs.push(`Række ${lineNo}: display_name er tom`);
    }
  });
  return errs;
}

// ── Import stream ──────────────────────────────────────────────

type StreamRowEvent = {
  type: 'row';
  index: number;
  ok: boolean;
  display_name: string;
  error?: string;
};

type StreamDoneEvent = {
  type: 'done';
  imported: number;
  errors: Array<{ row: number; name: string; error: string }>;
};

type ImportRowStatus = 'pending' | 'importing' | 'ok' | 'error';
type PinStatus = 'idle' | 'saving' | 'saved' | 'error';

type WizardRow = CsvResidentRow & { clientKey: string };
type ImportedResidentPinRow = {
  key: string;
  residentId: string;
  displayName: string;
  pin: string;
  status: PinStatus;
  error?: string;
};

let keySeq = 0;
function nextKey() {
  keySeq += 1;
  return `r-${keySeq}`;
}

const STEPS = [
  { n: 1, label: 'Upload' },
  { n: 2, label: 'Gennemse' },
  { n: 3, label: 'Resultat' },
] as const;

export default function ImportWizard() {
  const inputId = useId();
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [dragging, setDragging] = useState(false);
  const [parseErr, setParseErr] = useState<string | null>(null);
  const [rowErrors, setRowErrors] = useState<string[]>([]);
  const [rows, setRows] = useState<WizardRow[]>([]);
  const [importRunning, setImportRunning] = useState(false);
  const [importDone, setImportDone] = useState(false);
  const [fatalImportErr, setFatalImportErr] = useState<string | null>(null);
  const [rowStatus, setRowStatus] = useState<ImportRowStatus[]>([]);
  const [rowErrMsg, setRowErrMsg] = useState<(string | undefined)[]>([]);
  /** Sidste række serveren har sendt svar for (-1 før første event). */
  const [lastDoneIndex, setLastDoneIndex] = useState(-1);
  const [summary, setSummary] = useState<{ imported: number; failed: number } | null>(null);
  const [doneErrors, setDoneErrors] = useState<Array<{ row: number; name: string; error: string }>>(
    []
  );
  const [showPinSetup, setShowPinSetup] = useState(false);
  const [pinRows, setPinRows] = useState<ImportedResidentPinRow[]>([]);
  const [pinLoadError, setPinLoadError] = useState<string | null>(null);

  const validStep1 = rowErrors.length === 0 && rows.length > 0 && !parseErr;

  const resetWizard = useCallback(() => {
    setStep(1);
    setRows([]);
    setParseErr(null);
    setRowErrors([]);
    setImportRunning(false);
    setImportDone(false);
    setFatalImportErr(null);
    setRowStatus([]);
    setRowErrMsg([]);
    setLastDoneIndex(-1);
    setSummary(null);
    setDoneErrors([]);
    setShowPinSetup(false);
    setPinRows([]);
    setPinLoadError(null);
  }, []);

  const applyFile = useCallback(async (file: File) => {
    setParseErr(null);
    setRowErrors([]);
    setRows([]);
    if (!file.name.toLowerCase().endsWith('.csv')) {
      setParseErr('Vælg en .csv-fil.');
      return;
    }
    const text = await file.text();
    const parsed = parseResidentsCsv(text);
    if (parsed.error) {
      setParseErr(parsed.error);
      return;
    }
    const v = validateRows(parsed.rows);
    setRowErrors(v);
    setRows(
      parsed.rows.map((r) => ({
        ...r,
        clientKey: nextKey(),
      }))
    );
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const f = e.dataTransfer.files[0];
      if (f) void applyFile(f);
    },
    [applyFile]
  );

  const onFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) void applyFile(f);
    e.target.value = '';
  };

  function removeRow(key: string) {
    setRows((prev) => prev.filter((r) => r.clientKey !== key));
  }

  async function runImport() {
    if (rows.length === 0) return;
    setStep(3);
    setImportRunning(true);
    setImportDone(false);
    setFatalImportErr(null);
    setSummary(null);
    setDoneErrors([]);
    setLastDoneIndex(-1);
    const n = rows.length;
    setRowStatus(Array.from({ length: n }, () => 'pending'));
    setRowErrMsg(Array.from({ length: n }, () => undefined));

    const payload = {
      residents: rows.map((r) => ({
        display_name: r.display_name.trim(),
        nickname: r.nickname ?? '',
      })),
    };

    let res: Response;
    try {
      res = await fetch('/api/portal/import-residents', {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
    } catch {
      setFatalImportErr('Netværksfejl — prøv igen.');
      setImportRunning(false);
      setImportDone(true);
      return;
    }

    if (!res.ok) {
      try {
        const j = (await res.json()) as { error?: string };
        setFatalImportErr(
          j.error === 'unauthorized'
            ? 'Du er ikke logget ind.'
            : j.error === 'no_org'
              ? 'Ingen organisation tilknyttet din bruger.'
              : j.error === 'service_role_required'
                ? 'Serveren kan ikke importere (mangler service role).'
                : typeof j.error === 'string'
                  ? j.error
                  : `Fejl (${res.status})`
        );
      } catch {
        setFatalImportErr(`Import fejlede (${res.status}).`);
      }
      setImportRunning(false);
      setImportDone(true);
      return;
    }

    const reader = res.body?.getReader();
    if (!reader) {
      setFatalImportErr('Uventet svar fra serveren.');
      setImportRunning(false);
      setImportDone(true);
      return;
    }

    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split('\n');
        buffer = parts.pop() ?? '';
        for (const line of parts) {
          const t = line.trim();
          if (!t) continue;
          let evt: StreamRowEvent | StreamDoneEvent;
          try {
            evt = JSON.parse(t) as StreamRowEvent | StreamDoneEvent;
          } catch {
            continue;
          }
          if (evt.type === 'row') {
            const idx = evt.index;
            setLastDoneIndex(idx);
            setRowStatus((prev) => {
              const next = [...prev];
              if (idx >= 0 && idx < next.length) {
                next[idx] = evt.ok ? 'ok' : 'error';
              }
              return next;
            });
            setRowErrMsg((prev) => {
              const next = [...prev];
              if (idx >= 0 && idx < next.length) {
                next[idx] = evt.ok ? undefined : evt.error;
              }
              return next;
            });
          } else if (evt.type === 'done') {
            const failed = evt.errors?.length ?? 0;
            setSummary({ imported: evt.imported, failed });
            setDoneErrors(evt.errors ?? []);
          }
        }
      }
      const tail = buffer.trim();
      if (tail) {
        try {
          const evt = JSON.parse(tail) as StreamDoneEvent;
          if (evt.type === 'done') {
            const failed = evt.errors?.length ?? 0;
            setSummary({ imported: evt.imported, failed });
            setDoneErrors(evt.errors ?? []);
          }
        } catch {
          /* ignore */
        }
      }
    } catch {
      setFatalImportErr('Import afbrudt.');
    } finally {
      setImportRunning(false);
      setImportDone(true);
    }
  }

  const stepperIndex = useMemo(() => {
    if (step === 1) return 1;
    if (step === 2) return 2;
    return 3;
  }, [step]);

  function rowUiStatus(i: number): ImportRowStatus {
    const s = rowStatus[i];
    if (s === 'ok' || s === 'error') return s;
    if (!importRunning) return 'pending';
    return i === lastDoneIndex + 1 ? 'importing' : 'pending';
  }

  const hydrateImportedResidentsForPin = useCallback(async () => {
    const successfulNames = rows
      .map((r, i) => ({ name: r.display_name.trim(), ok: rowStatus[i] === 'ok' }))
      .filter((r) => r.ok && r.name.length > 0)
      .map((r) => r.name);
    if (successfulNames.length === 0) return;

    setPinLoadError(null);

    const supabase = createClient();
    if (!supabase) {
      setPinLoadError('Supabase client mangler i miljøet.');
      return;
    }

    const uniqueNames = Array.from(new Set(successfulNames));
    const { data, error } = await supabase
      .from('care_residents')
      .select('user_id, display_name, created_at')
      .in('display_name', uniqueNames)
      .order('created_at', { ascending: false });

    if (error || !data) {
      setPinLoadError('Kunne ikke hente importerede beboere til PIN-trinnet.');
      return;
    }

    const byName = new Map<string, Array<{ user_id: string; display_name: string }>>();
    for (const row of data) {
      const name = typeof row.display_name === 'string' ? row.display_name.trim() : '';
      const id = typeof row.user_id === 'string' ? row.user_id : '';
      if (!name || !id) continue;
      const list = byName.get(name) ?? [];
      list.push({ user_id: id, display_name: name });
      byName.set(name, list);
    }

    const next: ImportedResidentPinRow[] = [];
    for (let i = 0; i < successfulNames.length; i += 1) {
      const name = successfulNames[i]!;
      const picks = byName.get(name) ?? [];
      const picked = picks.shift();
      if (!picked) continue;
      next.push({
        key: `${picked.user_id}-${i}`,
        residentId: picked.user_id,
        displayName: picked.display_name,
        pin: '',
        status: 'idle',
      });
    }

    if (next.length === 0) {
      setPinLoadError('Ingen importerede beboere fundet til PIN-trinnet.');
      return;
    }

    if (next.length < successfulNames.length) {
      setPinLoadError('Nogle beboere kunne ikke matches automatisk. Tjek navnene og prøv igen.');
    }

    setPinRows(next);
    setShowPinSetup(true);
  }, [rows, rowStatus]);

  const saveResidentPin = useCallback(
    async (rowKey: string) => {
      const target = pinRows.find((r) => r.key === rowKey);
      if (!target) return;
      if (!/^\d{4}$/.test(target.pin)) {
        setPinRows((prev) =>
          prev.map((r) =>
            r.key === rowKey ? { ...r, status: 'error', error: 'PIN skal være præcis 4 cifre.' } : r
          )
        );
        return;
      }

      setPinRows((prev) =>
        prev.map((r) => (r.key === rowKey ? { ...r, status: 'saving', error: undefined } : r))
      );

      const supabase = createClient();
      if (!supabase) {
        setPinRows((prev) =>
          prev.map((r) =>
            r.key === rowKey ? { ...r, status: 'error', error: 'Supabase client mangler.' } : r
          )
        );
        return;
      }

      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setPinRows((prev) =>
          prev.map((r) =>
            r.key === rowKey ? { ...r, status: 'error', error: 'Du er ikke logget ind.' } : r
          )
        );
        return;
      }

      try {
        const res = await fetch(
          `${process.env.NEXT_PUBLIC_SUPABASE_URL}/functions/v1/resident-pin-set`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              resident_id: target.residentId,
              pin: target.pin,
              staff_token: session.access_token,
            }),
          }
        );
        const json = (await res.json()) as { data?: { success: boolean }; error?: string };
        if (!res.ok || !json.data?.success) {
          setPinRows((prev) =>
            prev.map((r) =>
              r.key === rowKey
                ? { ...r, status: 'error', error: json.error ?? 'Kunne ikke gemme PIN.' }
                : r
            )
          );
          return;
        }

        setPinRows((prev) =>
          prev.map((r) => (r.key === rowKey ? { ...r, status: 'saved', error: undefined } : r))
        );
      } catch {
        setPinRows((prev) =>
          prev.map((r) =>
            r.key === rowKey ? { ...r, status: 'error', error: 'Netværksfejl — prøv igen.' } : r
          )
        );
      }
    },
    [pinRows]
  );

  const allPinsSaved = pinRows.length > 0 && pinRows.every((r) => r.status === 'saved');

  return (
    <div className="max-w-3xl p-6" style={{ color: 'var(--cp-text)' }}>
      <div className="mb-6">
        <h1
          className="text-xl font-bold tracking-tight"
          style={{ fontFamily: "'DM Serif Display', serif", color: 'var(--cp-text)' }}
        >
          Importer beboere
        </h1>
        <p className="mt-1 text-sm" style={{ color: 'var(--cp-muted)' }}>
          Upload en CSV med navne — beboerne oprettes uden login; PIN sættes bagefter.
        </p>
      </div>

      {/* Stepper */}
      <div className="mb-8 flex items-center gap-0">
        {STEPS.map((s, i) => (
          <React.Fragment key={s.n}>
            <div className="flex flex-shrink-0 items-center gap-2">
              <div
                className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full text-xs font-bold transition-all"
                style={
                  stepperIndex > s.n
                    ? { backgroundColor: '#1D9E75', color: '#fff' }
                    : stepperIndex === s.n
                      ? { backgroundColor: '#0F1B2D', color: '#fff' }
                      : { backgroundColor: 'var(--cp-bg3)', color: 'var(--cp-muted)' }
                }
              >
                {stepperIndex > s.n ? <CheckCircle2 size={15} /> : s.n}
              </div>
              <span
                className="hidden text-xs font-medium sm:inline"
                style={{
                  color: stepperIndex === s.n ? 'var(--cp-text)' : 'var(--cp-muted)',
                }}
              >
                Trin {s.n}: {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className="mx-2 h-px min-w-[12px] flex-1"
                style={{
                  backgroundColor: stepperIndex > s.n ? '#1D9E75' : 'var(--cp-border)',
                }}
              />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* Trin 1 */}
      {step === 1 && (
        <div className="space-y-5">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            className="flex flex-col items-center gap-4 rounded-2xl border-2 border-dashed p-10 transition-all"
            style={
              dragging
                ? {
                    borderColor: '#1D9E75',
                    backgroundColor: 'rgba(29, 158, 117, 0.12)',
                  }
                : {
                    borderColor: 'var(--cp-border)',
                    backgroundColor: 'var(--cp-bg2)',
                  }
            }
          >
            <Upload size={28} className="text-[#1D9E75]" aria-hidden />
            <div className="text-center">
              <p className="text-sm font-semibold" style={{ color: 'var(--cp-text)' }}>
                Træk CSV hertil
              </p>
              <p className="mt-1 text-xs" style={{ color: 'var(--cp-muted)' }}>
                Kun .csv
              </p>
            </div>
            <label
              htmlFor={inputId}
              className="cursor-pointer rounded-xl bg-[#0F1B2D] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1a2d47]"
            >
              Vælg fil
            </label>
            <input
              id={inputId}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={onFileInput}
            />
          </div>

          <div
            className="rounded-xl border p-4 font-mono text-xs leading-relaxed"
            style={{
              backgroundColor: 'var(--cp-bg2)',
              borderColor: 'var(--cp-border)',
              color: 'var(--cp-muted)',
            }}
          >
            <p className="mb-2 font-sans text-xs font-semibold" style={{ color: 'var(--cp-text)' }}>
              Forventet format
            </p>
            <pre className="whitespace-pre-wrap">
              {`display_name,nickname
Thomas Vang,Tommy
Camilla Frost,`}
            </pre>
          </div>

          {parseErr && (
            <div
              className="flex items-center gap-2 rounded-xl border px-4 py-3 text-sm"
              style={{
                color: '#f87171',
                backgroundColor: 'rgba(248, 113, 113, 0.1)',
                borderColor: 'rgba(248, 113, 113, 0.28)',
              }}
            >
              <AlertCircle size={15} className="flex-shrink-0" />
              {parseErr}
            </div>
          )}

          {rowErrors.length > 0 && (
            <div
              className="rounded-xl border px-4 py-3 text-sm"
              style={{
                borderColor: 'rgba(248, 113, 113, 0.35)',
                backgroundColor: 'rgba(248, 113, 113, 0.08)',
                color: '#fca5a5',
              }}
            >
              <p className="mb-2 font-medium">Ret CSV og upload igen:</p>
              <ul className="list-inside list-disc space-y-1 text-xs">
                {rowErrors.map((e) => (
                  <li key={e}>{e}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="flex justify-end">
            <button
              type="button"
              disabled={!validStep1}
              onClick={() => setStep(2)}
              className="flex items-center gap-2 rounded-xl bg-[#0F1B2D] px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#1a2d47] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Næste <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {/* Trin 2 */}
      {step === 2 && (
        <div className="space-y-5">
          <div
            className="overflow-hidden rounded-xl border"
            style={{ backgroundColor: 'var(--cp-bg2)', borderColor: 'var(--cp-border)' }}
          >
            <div
              className="flex items-center justify-between border-b px-4 py-3"
              style={{ borderColor: 'var(--cp-border)', backgroundColor: 'var(--cp-bg3)' }}
            >
              <span className="text-sm font-semibold" style={{ color: 'var(--cp-text)' }}>
                {rows.length} beboere klar til import
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b" style={{ borderColor: 'var(--cp-border)' }}>
                    <th
                      className="px-4 py-2.5 text-left text-xs font-medium"
                      style={{ color: 'var(--cp-muted)' }}
                    >
                      Navn
                    </th>
                    <th
                      className="px-3 py-2.5 text-left text-xs font-medium"
                      style={{ color: 'var(--cp-muted)' }}
                    >
                      Kaldenavn
                    </th>
                    <th
                      className="px-3 py-2.5 text-left text-xs font-medium"
                      style={{ color: 'var(--cp-muted)' }}
                    >
                      Status
                    </th>
                    <th className="w-10 px-2 py-2.5" />
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr
                      key={r.clientKey}
                      className="border-b"
                      style={{ borderColor: 'var(--cp-border)' }}
                    >
                      <td className="px-4 py-2.5 font-medium" style={{ color: 'var(--cp-text)' }}>
                        {r.display_name}
                      </td>
                      <td className="px-3 py-2.5" style={{ color: 'var(--cp-muted)' }}>
                        {r.nickname ?? '—'}
                      </td>
                      <td className="px-3 py-2.5">
                        <span
                          className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium"
                          style={{
                            backgroundColor: 'rgba(29, 158, 117, 0.15)',
                            color: '#1D9E75',
                          }}
                        >
                          Klar
                        </span>
                      </td>
                      <td className="px-2 py-2.5 text-right">
                        <button
                          type="button"
                          onClick={() => removeRow(r.clientKey)}
                          className="rounded p-1 transition-opacity hover:opacity-80"
                          style={{ color: 'var(--cp-muted)' }}
                          aria-label="Fjern række"
                        >
                          <X size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="flex items-center gap-1.5 text-sm transition-opacity hover:opacity-90"
              style={{ color: 'var(--cp-muted)' }}
            >
              <ChevronLeft size={16} /> Tilbage
            </button>
            <button
              type="button"
              disabled={rows.length === 0}
              onClick={() => void runImport()}
              className="rounded-xl bg-[#1D9E75] px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[#18886a] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Importer
            </button>
          </div>
        </div>
      )}

      {/* Trin 3 */}
      {step === 3 && (
        <div className="space-y-5">
          {importRunning && (
            <div
              className="flex items-center gap-2 rounded-xl border px-4 py-3 text-sm"
              style={{ borderColor: 'var(--cp-border)', backgroundColor: 'var(--cp-bg2)' }}
            >
              <Loader2 className="h-4 w-4 flex-shrink-0 animate-spin text-[#1D9E75]" />
              <span style={{ color: 'var(--cp-text)' }}>Importerer beboere…</span>
            </div>
          )}

          {(importRunning || (importDone && !fatalImportErr && rows.length > 0)) && (
            <div
              className="max-h-80 overflow-y-auto rounded-xl border"
              style={{ borderColor: 'var(--cp-border)', backgroundColor: 'var(--cp-bg2)' }}
            >
              <ul className="divide-y" style={{ borderColor: 'var(--cp-border)' }}>
                {rows.map((r, i) => {
                  const st = rowUiStatus(i);
                  return (
                    <li key={r.clientKey} className="flex items-center gap-3 px-4 py-2.5 text-sm">
                      <span className="w-6 flex-shrink-0">
                        {st === 'pending' && (
                          <span
                            className="mx-auto block h-2 w-2 rounded-full"
                            style={{ backgroundColor: 'var(--cp-border)' }}
                          />
                        )}
                        {st === 'importing' && (
                          <Loader2 className="h-4 w-4 animate-spin text-[#1D9E75]" />
                        )}
                        {st === 'ok' && <CheckCircle2 className="h-4 w-4 text-[#1D9E75]" />}
                        {st === 'error' && <AlertCircle className="h-4 w-4 text-red-400" />}
                      </span>
                      <span className="min-w-0 flex-1 truncate" style={{ color: 'var(--cp-text)' }}>
                        {r.display_name}
                      </span>
                      {st === 'error' && rowErrMsg[i] && (
                        <span className="max-w-[200px] truncate text-xs text-red-400">
                          {rowErrMsg[i]}
                        </span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          )}

          {importDone && (
            <>
              {fatalImportErr && (
                <div
                  className="rounded-xl border px-4 py-3 text-sm"
                  style={{
                    borderColor: 'rgba(248, 113, 113, 0.35)',
                    backgroundColor: 'rgba(248, 113, 113, 0.1)',
                    color: '#fca5a5',
                  }}
                >
                  {fatalImportErr}
                </div>
              )}

              {!fatalImportErr && summary && (
                <div
                  className="rounded-2xl border p-6 text-center"
                  style={{
                    borderColor:
                      summary.failed === 0
                        ? 'rgba(29, 158, 117, 0.35)'
                        : 'rgba(245, 158, 11, 0.35)',
                    backgroundColor:
                      summary.failed === 0 ? 'rgba(29, 158, 117, 0.12)' : 'rgba(245, 158, 11, 0.1)',
                  }}
                >
                  <h2
                    className="text-lg font-bold"
                    style={{ fontFamily: "'DM Serif Display', serif", color: 'var(--cp-text)' }}
                  >
                    Import afsluttet
                  </h2>
                  <p className="mt-2 text-sm" style={{ color: 'var(--cp-muted)' }}>
                    {summary.imported} importeret
                    {summary.failed > 0 ? `, ${summary.failed} fejlede` : ''}
                  </p>
                </div>
              )}

              {doneErrors.length > 0 && (
                <div
                  className="overflow-hidden rounded-xl border"
                  style={{ borderColor: 'rgba(248, 113, 113, 0.35)' }}
                >
                  <div
                    className="border-b px-4 py-2 text-xs font-semibold"
                    style={{
                      borderColor: 'rgba(248, 113, 113, 0.25)',
                      backgroundColor: 'rgba(248, 113, 113, 0.08)',
                      color: '#fca5a5',
                    }}
                  >
                    Fejlede rækker
                  </div>
                  <ul
                    className="max-h-48 divide-y overflow-y-auto text-xs"
                    style={{ borderColor: 'var(--cp-border)' }}
                  >
                    {doneErrors.map((e, i) => (
                      <li key={i} className="px-4 py-2" style={{ color: '#fecaca' }}>
                        <span className="font-medium">Række {e.row}</span>
                        {e.name !== '(tom)' ? (
                          <>
                            {' — '}
                            <span className="opacity-90">{e.name}</span>: {e.error}
                          </>
                        ) : (
                          <> — {e.error}</>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="flex flex-wrap gap-3">
                <Link
                  href="/care-portal-dashboard"
                  className="inline-flex flex-1 items-center justify-center rounded-xl bg-[#0F1B2D] px-5 py-2.5 text-center text-sm font-semibold text-white transition-colors hover:bg-[#1a2d47]"
                >
                  Gå til dashboard
                </Link>
                <button
                  type="button"
                  onClick={resetWizard}
                  className="rounded-xl border px-4 py-2.5 text-sm transition-colors"
                  style={{
                    borderColor: 'var(--cp-border)',
                    color: 'var(--cp-muted)',
                    backgroundColor: 'var(--cp-bg3)',
                  }}
                >
                  Ny import
                </button>
                {!fatalImportErr && (summary?.imported ?? 0) > 0 && (
                  <button
                    type="button"
                    onClick={() => void hydrateImportedResidentsForPin()}
                    className="rounded-xl border px-4 py-2.5 text-sm font-semibold transition-colors"
                    style={{
                      borderColor: 'rgba(29, 158, 117, 0.4)',
                      color: '#1D9E75',
                      backgroundColor: 'rgba(29, 158, 117, 0.12)',
                    }}
                  >
                    Sæt PIN for beboere
                  </button>
                )}
              </div>

              {showPinSetup && (
                <div
                  className="rounded-2xl border p-4 sm:p-5"
                  style={{
                    borderColor: 'var(--cp-border)',
                    backgroundColor: 'var(--cp-bg2)',
                  }}
                >
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <h3 className="text-sm font-semibold" style={{ color: 'var(--cp-text)' }}>
                      PIN-opsætning ({pinRows.length} beboere)
                    </h3>
                    {allPinsSaved && (
                      <span
                        className="inline-flex items-center rounded-full px-2 py-0.5 text-xs font-semibold"
                        style={{ backgroundColor: 'rgba(29,158,117,0.16)', color: '#1D9E75' }}
                      >
                        Alle PIN sat ✓
                      </span>
                    )}
                  </div>

                  {pinLoadError && (
                    <p className="mb-3 text-xs" style={{ color: '#fca5a5' }}>
                      {pinLoadError}
                    </p>
                  )}

                  <div className="space-y-2">
                    {pinRows.map((r) => (
                      <div
                        key={r.key}
                        className="rounded-xl border p-3"
                        style={{
                          borderColor: 'var(--cp-border)',
                          backgroundColor: 'var(--cp-bg3)',
                        }}
                      >
                        <div className="mb-2 flex items-center justify-between gap-3">
                          <p className="text-sm font-medium" style={{ color: 'var(--cp-text)' }}>
                            {r.displayName}
                          </p>
                          {r.status === 'saved' && (
                            <span className="text-xs font-semibold" style={{ color: '#1D9E75' }}>
                              ✓ Gemt
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            inputMode="numeric"
                            pattern="\d{4}"
                            maxLength={4}
                            value={r.pin}
                            disabled={r.status === 'saving' || r.status === 'saved'}
                            onChange={(e) => {
                              const digits = e.target.value.replace(/\D/g, '').slice(0, 4);
                              setPinRows((prev) =>
                                prev.map((x) =>
                                  x.key === r.key
                                    ? {
                                        ...x,
                                        pin: digits,
                                        status: x.status === 'saved' ? 'saved' : 'idle',
                                        error: undefined,
                                      }
                                    : x
                                )
                              );
                            }}
                            className="h-9 w-24 rounded-lg border px-2 text-center text-sm tracking-[0.2em]"
                            style={{
                              borderColor: 'var(--cp-border)',
                              backgroundColor: 'var(--cp-bg2)',
                              color: 'var(--cp-text)',
                            }}
                            placeholder="0000"
                          />
                          <button
                            type="button"
                            onClick={() => void saveResidentPin(r.key)}
                            disabled={r.status === 'saving' || r.status === 'saved'}
                            className="rounded-lg px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
                            style={{ backgroundColor: 'var(--cp-green)' }}
                          >
                            {r.status === 'saving' ? 'Gemmer…' : 'Gem PIN'}
                          </button>
                        </div>
                        {r.status === 'error' && r.error && (
                          <p className="mt-2 text-xs" style={{ color: '#fca5a5' }}>
                            {r.error}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
