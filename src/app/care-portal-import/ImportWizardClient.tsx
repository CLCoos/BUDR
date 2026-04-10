'use client';

import React, { useCallback, useState } from 'react';
import Link from 'next/link';
import * as XLSX from 'xlsx';
import {
  Upload,
  ChevronRight,
  ChevronLeft,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FileSpreadsheet,
  X,
} from 'lucide-react';
import { importResidentsAction, type ImportRow, type ImportResult } from './actions';

// ── Types ─────────────────────────────────────────────────────

type Step = 1 | 2 | 3 | 4;

interface BudrField {
  key: keyof ImportRow;
  label: string;
  required: boolean;
  hint: string;
}

const BUDR_FIELDS: BudrField[] = [
  { key: 'display_name', label: 'Navn', required: true, hint: 'Beboerens fulde navn' },
  { key: 'room', label: 'Værelse', required: false, hint: 'Værelsesnummer eller betegnelse' },
  {
    key: 'move_in_date',
    label: 'Indflyttet',
    required: false,
    hint: 'Dato for indflytning, fx 14/03/2023',
  },
  {
    key: 'primary_contact',
    label: 'Primær kontakt',
    required: false,
    hint: 'Kontaktpersonens navn',
  },
  {
    key: 'primary_contact_phone',
    label: 'Kontakt telefon',
    required: false,
    hint: 'Telefonnummer',
  },
  {
    key: 'primary_contact_relation',
    label: 'Relation',
    required: false,
    hint: 'Fx Mor, Bror, Ægtefælle',
  },
];

// Known column aliases per BUDR field for auto-detection
const ALIASES: Record<keyof ImportRow, string[]> = {
  display_name: [
    'navn',
    'name',
    'beboer',
    'borger',
    'resident',
    'fulde navn',
    'full name',
    'cpr navn',
    'person',
  ],
  room: ['værelse', 'rum', 'room', 'bolig', 'lejlighed', 'nr.', 'nummer', 'værelses'],
  move_in_date: [
    'indflyttet',
    'indflytningsdato',
    'startdato',
    'move in',
    'move-in',
    'dato',
    'indflytning',
  ],
  primary_contact: [
    'primær kontakt',
    'kontakt',
    'pårørende',
    'kontakt navn',
    'kontaktperson',
    'contact',
    'nærmeste pårørende',
  ],
  primary_contact_phone: [
    'kontakt telefon',
    'telefon',
    'tlf',
    'tlf.',
    'mobil',
    'phone',
    'kontakt tlf',
  ],
  primary_contact_relation: [
    'relation',
    'kontaktrelation',
    'pårørenderelation',
    'slægtskab',
    'tilknytning',
  ],
};

// ── Helpers ───────────────────────────────────────────────────

function autoMap(headers: string[]): Record<keyof ImportRow, string> {
  const result = {} as Record<keyof ImportRow, string>;
  for (const field of BUDR_FIELDS) {
    for (const header of headers) {
      const h = header.toLowerCase().trim();
      if (ALIASES[field.key].some((alias) => h.includes(alias) || alias.includes(h))) {
        result[field.key] = header;
        break;
      }
    }
    if (!result[field.key]) result[field.key] = '';
  }
  return result;
}

async function parseFile(
  file: File
): Promise<{ headers: string[]; rows: Record<string, string>[] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const json = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: '' });
        if (!json.length) {
          reject(new Error('Filen er tom eller kan ikke læses'));
          return;
        }
        resolve({ headers: Object.keys(json[0]), rows: json });
      } catch {
        reject(new Error('Filen kunne ikke læses — prøv at gemme som .xlsx eller .csv'));
      }
    };
    reader.onerror = () => reject(new Error('Kunne ikke åbne filen'));
    reader.readAsArrayBuffer(file);
  });
}

function applyMapping(
  rows: Record<string, string>[],
  mapping: Record<keyof ImportRow, string>
): ImportRow[] {
  return rows
    .map((row) => {
      const get = (key: keyof ImportRow) => {
        const col = mapping[key];
        return col ? String(row[col] ?? '').trim() : '';
      };
      return {
        display_name: get('display_name'),
        room: get('room'),
        move_in_date: get('move_in_date'),
        primary_contact: get('primary_contact'),
        primary_contact_phone: get('primary_contact_phone'),
        primary_contact_relation: get('primary_contact_relation'),
      };
    })
    .filter((r) => r.display_name); // drop blank-name rows
}

// ── Step indicators ───────────────────────────────────────────

const STEPS = [
  { n: 1, label: 'Upload fil' },
  { n: 2, label: 'Kolonner' },
  { n: 3, label: 'Forhåndsvisning' },
  { n: 4, label: 'Importér' },
];

// ── Component ────────────────────────────────────────────────

export default function ImportWizardClient() {
  const [step, setStep] = useState<Step>(1);
  const [dragging, setDragging] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [headers, setHeaders] = useState<string[]>([]);
  const [rawRows, setRawRows] = useState<Record<string, string>[]>([]);
  const [mapping, setMapping] = useState<Record<keyof ImportRow, string>>(
    {} as Record<keyof ImportRow, string>
  );
  const [mappedRows, setMappedRows] = useState<ImportRow[]>([]);
  const [previewPage, setPreviewPage] = useState(0);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);

  // ── Step 1: File upload ──────────────────────────────────────

  async function handleFile(f: File) {
    setFile(f);
    setParseError(null);
    try {
      const { headers: h, rows: r } = await parseFile(f);
      setHeaders(h);
      setRawRows(r);
      setMapping(autoMap(h));
      setStep(2);
    } catch (e) {
      setParseError(e instanceof Error ? e.message : 'Ukendt fejl');
      setFile(null);
    }
  }

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files[0];
    if (f) void handleFile(f);
  }, []);

  const onFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) void handleFile(f);
    e.target.value = '';
  };

  // ── Step 2 → 3: Apply mapping ────────────────────────────────

  function goToPreview() {
    setMappedRows(applyMapping(rawRows, mapping));
    setPreviewPage(0);
    setStep(3);
  }

  // ── Step 3 → 4: Import ───────────────────────────────────────

  async function runImport() {
    setImporting(true);
    const res = await importResidentsAction(mappedRows);
    setResult(res);
    setImporting(false);
    setStep(4);
  }

  // ── Render helpers ───────────────────────────────────────────

  const PAGE_SIZE = 8;
  const totalPages = Math.ceil(mappedRows.length / PAGE_SIZE);
  const pageRows = mappedRows.slice(previewPage * PAGE_SIZE, (previewPage + 1) * PAGE_SIZE);

  const namesMapped = !!mapping.display_name;

  // ── Render ───────────────────────────────────────────────────

  return (
    <div className="p-6 max-w-3xl" style={{ color: 'var(--cp-text)' }}>
      {/* Page title */}
      <div className="mb-6">
        <h1 className="text-xl font-bold" style={{ color: 'var(--cp-text)' }}>
          Dataimport
        </h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--cp-muted)' }}>
          Importér beboere fra Planner4You, Excel eller CSV-eksport
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-0 mb-8">
        {STEPS.map((s, i) => (
          <React.Fragment key={s.n}>
            <div className="flex items-center gap-2">
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-all"
                style={
                  step > s.n
                    ? { backgroundColor: '#1D9E75', color: '#fff' }
                    : step === s.n
                      ? { backgroundColor: '#0F1B2D', color: '#fff' }
                      : { backgroundColor: 'var(--cp-bg3)', color: 'var(--cp-muted)' }
                }
              >
                {step > s.n ? <CheckCircle2 size={14} /> : s.n}
              </div>
              <span
                className="text-xs font-medium whitespace-nowrap"
                style={{ color: step === s.n ? 'var(--cp-text)' : 'var(--cp-muted)' }}
              >
                {s.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div
                className="flex-1 h-px mx-3"
                style={{ backgroundColor: step > s.n ? '#1D9E75' : 'var(--cp-border)' }}
              />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* ── STEP 1: Upload ──────────────────────────────────────── */}
      {step === 1 && (
        <div className="space-y-5">
          {/* Drop zone */}
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            className="rounded-2xl border-2 border-dashed transition-all p-12 flex flex-col items-center gap-4"
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
            <div
              className="w-14 h-14 rounded-2xl border flex items-center justify-center shadow-sm"
              style={{
                backgroundColor: 'var(--cp-bg3)',
                borderColor: 'var(--cp-border)',
              }}
            >
              <FileSpreadsheet size={26} className="text-[#1D9E75]" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold" style={{ color: 'var(--cp-text)' }}>
                Træk fil hertil
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--cp-muted)' }}>
                Understøtter .xlsx, .xls og .csv
              </p>
            </div>
            <label className="cursor-pointer px-5 py-2 bg-[#0F1B2D] text-white text-sm font-semibold rounded-xl hover:bg-[#1a2d47] transition-colors">
              Vælg fil
              <input
                type="file"
                className="hidden"
                accept=".xlsx,.xls,.csv"
                onChange={onFileInput}
              />
            </label>
          </div>

          {parseError && (
            <div
              className="flex items-center gap-2 text-sm rounded-xl px-4 py-3 border"
              style={{
                color: '#f87171',
                backgroundColor: 'rgba(248, 113, 113, 0.1)',
                borderColor: 'rgba(248, 113, 113, 0.28)',
              }}
            >
              <AlertCircle size={15} className="flex-shrink-0" />
              {parseError}
            </div>
          )}

          {/* Format hint */}
          <div
            className="rounded-xl p-4 border"
            style={{
              backgroundColor: 'rgba(59, 130, 246, 0.1)',
              borderColor: 'rgba(59, 130, 246, 0.28)',
            }}
          >
            <p className="text-xs font-semibold mb-2" style={{ color: 'var(--cp-text)' }}>
              Sådan eksporterer du fra Planner4You
            </p>
            <ol
              className="text-xs space-y-1 list-decimal list-inside"
              style={{ color: 'var(--cp-muted)' }}
            >
              <li>Åbn Planner4You → Administration → Beboere</li>
              <li>Klik &ldquo;Eksporter&rdquo; og vælg Excel (.xlsx) eller CSV</li>
              <li>Gem filen og upload den her</li>
            </ol>
            <p className="text-xs mt-2" style={{ color: 'var(--cp-muted2)' }}>
              Kolonnenavnene behøver ikke matche præcist — du kan mappe dem i næste trin.
            </p>
          </div>
        </div>
      )}

      {/* ── STEP 2: Column mapping ──────────────────────────────── */}
      {step === 2 && (
        <div className="space-y-5">
          <div
            className="rounded-xl border overflow-hidden"
            style={{ backgroundColor: 'var(--cp-bg2)', borderColor: 'var(--cp-border)' }}
          >
            <div
              className="px-4 py-3 border-b flex items-center justify-between"
              style={{ borderColor: 'var(--cp-border)', backgroundColor: 'var(--cp-bg3)' }}
            >
              <div>
                <span className="text-sm font-semibold" style={{ color: 'var(--cp-text)' }}>
                  Kolonne-mapping
                </span>
                <span className="ml-2 text-xs" style={{ color: 'var(--cp-muted)' }}>
                  {rawRows.length} rækker fundet i {file?.name}
                </span>
              </div>
              <button
                type="button"
                onClick={() => {
                  setFile(null);
                  setStep(1);
                }}
                className="text-xs flex items-center gap-1 transition-colors hover:opacity-90"
                style={{ color: 'var(--cp-muted)' }}
              >
                <X size={12} /> Skift fil
              </button>
            </div>

            <div className="divide-y divide-[var(--cp-border)]">
              {BUDR_FIELDS.map((field) => (
                <div key={field.key} className="px-4 py-3 flex items-center gap-4">
                  <div className="w-40 flex-shrink-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium" style={{ color: 'var(--cp-text)' }}>
                        {field.label}
                      </span>
                      {field.required && <span className="text-red-400 text-xs">*</span>}
                    </div>
                    <span className="text-xs" style={{ color: 'var(--cp-muted)' }}>
                      {field.hint}
                    </span>
                  </div>
                  <ChevronRight
                    size={14}
                    className="flex-shrink-0"
                    style={{ color: 'var(--cp-border)' }}
                  />
                  <select
                    value={mapping[field.key] ?? ''}
                    onChange={(e) =>
                      setMapping((prev) => ({ ...prev, [field.key]: e.target.value }))
                    }
                    className="flex-1 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-[#1D9E75] transition-colors"
                    style={{
                      backgroundColor: 'var(--cp-bg3)',
                      border: '1px solid var(--cp-border)',
                      color: 'var(--cp-text)',
                    }}
                  >
                    <option value="">— Ignorér dette felt —</option>
                    {headers.map((h) => (
                      <option key={h} value={h}>
                        {h}
                      </option>
                    ))}
                  </select>
                  {mapping[field.key] ? (
                    <CheckCircle2 size={16} className="text-[#1D9E75] flex-shrink-0" />
                  ) : (
                    <div
                      className="w-4 h-4 rounded-full border-2 flex-shrink-0"
                      style={{ borderColor: 'var(--cp-border)' }}
                    />
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="flex items-center gap-1.5 text-sm transition-colors hover:opacity-90"
              style={{ color: 'var(--cp-muted)' }}
            >
              <ChevronLeft size={15} /> Tilbage
            </button>
            <button
              type="button"
              disabled={!namesMapped}
              onClick={goToPreview}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#0F1B2D] text-white text-sm font-semibold rounded-xl hover:bg-[#1a2d47] transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Forhåndsvisning <ChevronRight size={15} />
            </button>
          </div>
          {!namesMapped && (
            <p className="text-xs text-red-400 text-right">
              Feltet &ldquo;Navn&rdquo; skal mappes for at fortsætte
            </p>
          )}
        </div>
      )}

      {/* ── STEP 3: Preview ─────────────────────────────────────── */}
      {step === 3 && (
        <div className="space-y-5">
          <div
            className="rounded-xl border overflow-hidden"
            style={{ backgroundColor: 'var(--cp-bg2)', borderColor: 'var(--cp-border)' }}
          >
            <div
              className="px-4 py-3 border-b flex items-center justify-between"
              style={{ borderColor: 'var(--cp-border)', backgroundColor: 'var(--cp-bg3)' }}
            >
              <span className="text-sm font-semibold" style={{ color: 'var(--cp-text)' }}>
                Forhåndsvisning — {mappedRows.length} beboere klar til import
              </span>
              <span className="text-xs" style={{ color: 'var(--cp-muted)' }}>
                Side {previewPage + 1} / {totalPages}
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b" style={{ borderColor: 'var(--cp-border)' }}>
                    <th
                      className="text-left text-xs font-medium px-4 py-2.5"
                      style={{ color: 'var(--cp-muted)' }}
                    >
                      Navn
                    </th>
                    <th
                      className="text-left text-xs font-medium px-3 py-2.5"
                      style={{ color: 'var(--cp-muted)' }}
                    >
                      Værelse
                    </th>
                    <th
                      className="text-left text-xs font-medium px-3 py-2.5"
                      style={{ color: 'var(--cp-muted)' }}
                    >
                      Indflyttet
                    </th>
                    <th
                      className="text-left text-xs font-medium px-3 py-2.5"
                      style={{ color: 'var(--cp-muted)' }}
                    >
                      Kontakt
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((row, i) => {
                    const initials = row.display_name
                      .split(/\s+/)
                      .filter(Boolean)
                      .slice(0, 2)
                      .map((p) => p[0].toUpperCase())
                      .join('');
                    return (
                      <tr key={i} className="border-b" style={{ borderColor: 'var(--cp-border)' }}>
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            <div
                              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0"
                              style={{
                                backgroundColor: 'var(--cp-bg3)',
                                color: 'var(--cp-muted)',
                              }}
                            >
                              {initials}
                            </div>
                            <span className="font-medium" style={{ color: 'var(--cp-text)' }}>
                              {row.display_name}
                            </span>
                          </div>
                        </td>
                        <td className="px-3 py-2.5" style={{ color: 'var(--cp-muted)' }}>
                          {row.room || '—'}
                        </td>
                        <td className="px-3 py-2.5" style={{ color: 'var(--cp-muted)' }}>
                          {row.move_in_date || '—'}
                        </td>
                        <td className="px-3 py-2.5" style={{ color: 'var(--cp-muted)' }}>
                          {row.primary_contact
                            ? `${row.primary_contact}${row.primary_contact_relation ? ` · ${row.primary_contact_relation}` : ''}`
                            : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {totalPages > 1 && (
              <div
                className="flex items-center justify-center gap-2 px-4 py-3 border-t"
                style={{ borderColor: 'var(--cp-border)' }}
              >
                <button
                  type="button"
                  disabled={previewPage === 0}
                  onClick={() => setPreviewPage((p) => p - 1)}
                  className="px-3 py-1 text-xs rounded-lg border disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  style={{
                    borderColor: 'var(--cp-border)',
                    color: 'var(--cp-muted)',
                    backgroundColor: 'var(--cp-bg3)',
                  }}
                >
                  ← Forrige
                </button>
                <button
                  type="button"
                  disabled={previewPage === totalPages - 1}
                  onClick={() => setPreviewPage((p) => p + 1)}
                  className="px-3 py-1 text-xs rounded-lg border disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                  style={{
                    borderColor: 'var(--cp-border)',
                    color: 'var(--cp-muted)',
                    backgroundColor: 'var(--cp-bg3)',
                  }}
                >
                  Næste →
                </button>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="flex items-center gap-1.5 text-sm transition-colors hover:opacity-90"
              style={{ color: 'var(--cp-muted)' }}
            >
              <ChevronLeft size={15} /> Tilbage
            </button>
            <button
              type="button"
              disabled={importing}
              onClick={() => void runImport()}
              className="flex items-center gap-2 px-6 py-2.5 bg-[#1D9E75] text-white text-sm font-semibold rounded-xl hover:bg-[#18886a] transition-colors disabled:opacity-60"
            >
              {importing ? (
                <>
                  <Loader2 size={15} className="animate-spin" /> Importerer…
                </>
              ) : (
                <>
                  <Upload size={15} />
                  Importér {mappedRows.length} beboere
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* ── STEP 4: Result ──────────────────────────────────────── */}
      {step === 4 && result && (
        <div className="space-y-4">
          {/* Summary card */}
          <div
            className="rounded-2xl border p-6 text-center"
            style={
              result.errors.length === 0
                ? {
                    backgroundColor: 'rgba(29, 158, 117, 0.14)',
                    borderColor: 'rgba(29, 158, 117, 0.35)',
                  }
                : {
                    backgroundColor: 'rgba(245, 158, 11, 0.12)',
                    borderColor: 'rgba(245, 158, 11, 0.35)',
                  }
            }
          >
            {result.errors.length === 0 ? (
              <CheckCircle2 size={36} className="text-[#1D9E75] mx-auto mb-3" />
            ) : (
              <AlertCircle size={36} className="text-amber-400 mx-auto mb-3" />
            )}
            <h2 className="text-lg font-bold mb-1" style={{ color: 'var(--cp-text)' }}>
              {result.errors.length === 0 ? 'Import gennemført' : 'Import delvist gennemført'}
            </h2>
            <div className="flex items-center justify-center gap-6 mt-3 text-sm">
              <div>
                <div className="text-2xl font-extrabold text-[#1D9E75]">{result.inserted}</div>
                <div className="text-xs" style={{ color: 'var(--cp-muted)' }}>
                  importeret
                </div>
              </div>
              {result.skipped > 0 && (
                <div>
                  <div className="text-2xl font-extrabold" style={{ color: 'var(--cp-muted)' }}>
                    {result.skipped}
                  </div>
                  <div className="text-xs" style={{ color: 'var(--cp-muted)' }}>
                    sprunget over
                  </div>
                </div>
              )}
              {result.errors.length > 0 && (
                <div>
                  <div className="text-2xl font-extrabold text-red-400">{result.errors.length}</div>
                  <div className="text-xs" style={{ color: 'var(--cp-muted)' }}>
                    fejl
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Errors */}
          {result.errors.length > 0 && (
            <div
              className="rounded-xl border overflow-hidden"
              style={{
                backgroundColor: 'var(--cp-bg2)',
                borderColor: 'rgba(248, 113, 113, 0.35)',
              }}
            >
              <div
                className="px-4 py-3 border-b"
                style={{
                  borderColor: 'rgba(248, 113, 113, 0.25)',
                  backgroundColor: 'rgba(248, 113, 113, 0.1)',
                }}
              >
                <span className="text-xs font-semibold text-red-300">Fejl ved import</span>
              </div>
              <div
                className="divide-y max-h-48 overflow-y-auto"
                style={{ borderColor: 'var(--cp-border)' }}
              >
                {result.errors.map((e, i) => (
                  <div key={i} className="px-4 py-2 text-xs text-red-300">
                    {e}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <Link
              href="/resident-360-view"
              className="flex-1 text-center py-2.5 bg-[#0F1B2D] text-white text-sm font-semibold rounded-xl hover:bg-[#1a2d47] transition-colors"
            >
              Se importerede beboere →
            </Link>
            <button
              type="button"
              onClick={() => {
                setStep(1);
                setFile(null);
                setResult(null);
              }}
              className="px-4 py-2.5 border text-sm rounded-xl transition-colors"
              style={{
                borderColor: 'var(--cp-border)',
                color: 'var(--cp-muted)',
                backgroundColor: 'var(--cp-bg3)',
              }}
            >
              Ny import
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
