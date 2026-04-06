'use client';

import React, { useCallback, useState } from 'react';
import * as XLSX from 'xlsx';
import { Upload, ChevronRight, ChevronLeft, CheckCircle2, AlertCircle, Loader2, FileSpreadsheet, X } from 'lucide-react';
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
  { key: 'display_name',           label: 'Navn',             required: true,  hint: 'Beboerens fulde navn' },
  { key: 'room',                   label: 'Værelse',          required: false, hint: 'Værelsesnummer eller betegnelse' },
  { key: 'move_in_date',           label: 'Indflyttet',       required: false, hint: 'Dato for indflytning, fx 14/03/2023' },
  { key: 'primary_contact',        label: 'Primær kontakt',   required: false, hint: 'Kontaktpersonens navn' },
  { key: 'primary_contact_phone',  label: 'Kontakt telefon',  required: false, hint: 'Telefonnummer' },
  { key: 'primary_contact_relation',label:'Relation',         required: false, hint: 'Fx Mor, Bror, Ægtefælle' },
];

// Known column aliases per BUDR field for auto-detection
const ALIASES: Record<keyof ImportRow, string[]> = {
  display_name:             ['navn', 'name', 'beboer', 'borger', 'resident', 'fulde navn', 'full name', 'cpr navn', 'person'],
  room:                     ['værelse', 'rum', 'room', 'bolig', 'lejlighed', 'nr.', 'nummer', 'værelses'],
  move_in_date:             ['indflyttet', 'indflytningsdato', 'startdato', 'move in', 'move-in', 'dato', 'indflytning'],
  primary_contact:          ['primær kontakt', 'kontakt', 'pårørende', 'kontakt navn', 'kontaktperson', 'contact', 'nærmeste pårørende'],
  primary_contact_phone:    ['kontakt telefon', 'telefon', 'tlf', 'tlf.', 'mobil', 'phone', 'kontakt tlf'],
  primary_contact_relation: ['relation', 'kontaktrelation', 'pårørenderelation', 'slægtskab', 'tilknytning'],
};

// ── Helpers ───────────────────────────────────────────────────

function autoMap(headers: string[]): Record<keyof ImportRow, string> {
  const result = {} as Record<keyof ImportRow, string>;
  for (const field of BUDR_FIELDS) {
    for (const header of headers) {
      const h = header.toLowerCase().trim();
      if (ALIASES[field.key].some(alias => h.includes(alias) || alias.includes(h))) {
        result[field.key] = header;
        break;
      }
    }
    if (!result[field.key]) result[field.key] = '';
  }
  return result;
}

async function parseFile(file: File): Promise<{ headers: string[]; rows: Record<string, string>[] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const data     = e.target?.result;
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet    = workbook.Sheets[workbook.SheetNames[0]];
        const json     = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: '' });
        if (!json.length) { reject(new Error('Filen er tom eller kan ikke læses')); return; }
        resolve({ headers: Object.keys(json[0]), rows: json });
      } catch {
        reject(new Error('Filen kunne ikke læses — prøv at gemme som .xlsx eller .csv'));
      }
    };
    reader.onerror = () => reject(new Error('Kunne ikke åbne filen'));
    reader.readAsArrayBuffer(file);
  });
}

function applyMapping(rows: Record<string, string>[], mapping: Record<keyof ImportRow, string>): ImportRow[] {
  return rows.map(row => {
    const get = (key: keyof ImportRow) => {
      const col = mapping[key];
      return col ? String(row[col] ?? '').trim() : '';
    };
    return {
      display_name:             get('display_name'),
      room:                     get('room'),
      move_in_date:             get('move_in_date'),
      primary_contact:          get('primary_contact'),
      primary_contact_phone:    get('primary_contact_phone'),
      primary_contact_relation: get('primary_contact_relation'),
    };
  }).filter(r => r.display_name); // drop blank-name rows
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
  const [step, setStep]         = useState<Step>(1);
  const [dragging, setDragging] = useState(false);
  const [file, setFile]         = useState<File | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [headers, setHeaders]   = useState<string[]>([]);
  const [rawRows, setRawRows]   = useState<Record<string, string>[]>([]);
  const [mapping, setMapping]   = useState<Record<keyof ImportRow, string>>({} as Record<keyof ImportRow, string>);
  const [mappedRows, setMappedRows] = useState<ImportRow[]>([]);
  const [previewPage, setPreviewPage] = useState(0);
  const [importing, setImporting] = useState(false);
  const [result, setResult]     = useState<ImportResult | null>(null);

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
  const pageRows   = mappedRows.slice(previewPage * PAGE_SIZE, (previewPage + 1) * PAGE_SIZE);

  const namesMapped = !!mapping.display_name;

  // ── Render ───────────────────────────────────────────────────

  return (
    <div className="p-6 max-w-3xl">
      {/* Page title */}
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Dataimport</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Importér beboere fra Planner4You, Excel eller CSV-eksport
        </p>
      </div>

      {/* Step indicator */}
      <div className="flex items-center gap-0 mb-8">
        {STEPS.map((s, i) => (
          <React.Fragment key={s.n}>
            <div className="flex items-center gap-2">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 transition-all ${
                step > s.n  ? 'bg-[#1D9E75] text-white' :
                step === s.n? 'bg-[#0F1B2D] text-white' :
                              'bg-gray-100 text-gray-400'
              }`}>
                {step > s.n ? <CheckCircle2 size={14} /> : s.n}
              </div>
              <span className={`text-xs font-medium whitespace-nowrap ${
                step === s.n ? 'text-gray-800' : 'text-gray-400'
              }`}>{s.label}</span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={`flex-1 h-px mx-3 ${step > s.n ? 'bg-[#1D9E75]' : 'bg-gray-200'}`} />
            )}
          </React.Fragment>
        ))}
      </div>

      {/* ── STEP 1: Upload ──────────────────────────────────────── */}
      {step === 1 && (
        <div className="space-y-5">
          {/* Drop zone */}
          <div
            onDragOver={e => { e.preventDefault(); setDragging(true); }}
            onDragLeave={() => setDragging(false)}
            onDrop={onDrop}
            className={`rounded-2xl border-2 border-dashed transition-all p-12 flex flex-col items-center gap-4 ${
              dragging ? 'border-[#1D9E75] bg-[#E1F5EE]' : 'border-gray-200 bg-gray-50 hover:border-gray-300'
            }`}
          >
            <div className="w-14 h-14 rounded-2xl bg-white border border-gray-200 flex items-center justify-center shadow-sm">
              <FileSpreadsheet size={26} className="text-[#1D9E75]" />
            </div>
            <div className="text-center">
              <p className="text-sm font-semibold text-gray-700">Træk fil hertil</p>
              <p className="text-xs text-gray-400 mt-1">Understøtter .xlsx, .xls og .csv</p>
            </div>
            <label className="cursor-pointer px-5 py-2 bg-[#0F1B2D] text-white text-sm font-semibold rounded-xl hover:bg-[#1a2d47] transition-colors">
              Vælg fil
              <input type="file" className="hidden" accept=".xlsx,.xls,.csv" onChange={onFileInput} />
            </label>
          </div>

          {parseError && (
            <div className="flex items-center gap-2 text-sm text-red-600 bg-red-50 rounded-xl px-4 py-3">
              <AlertCircle size={15} className="flex-shrink-0" />
              {parseError}
            </div>
          )}

          {/* Format hint */}
          <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
            <p className="text-xs font-semibold text-blue-700 mb-2">Sådan eksporterer du fra Planner4You</p>
            <ol className="text-xs text-blue-600 space-y-1 list-decimal list-inside">
              <li>Åbn Planner4You → Administration → Beboere</li>
              <li>Klik &ldquo;Eksporter&rdquo; og vælg Excel (.xlsx) eller CSV</li>
              <li>Gem filen og upload den her</li>
            </ol>
            <p className="text-xs text-blue-500 mt-2">
              Kolonnenavnene behøver ikke matche præcist — du kan mappe dem i næste trin.
            </p>
          </div>
        </div>
      )}

      {/* ── STEP 2: Column mapping ──────────────────────────────── */}
      {step === 2 && (
        <div className="space-y-5">
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
              <div>
                <span className="text-sm font-semibold text-gray-800">Kolonne-mapping</span>
                <span className="ml-2 text-xs text-gray-400">{rawRows.length} rækker fundet i {file?.name}</span>
              </div>
              <button
                type="button"
                onClick={() => { setFile(null); setStep(1); }}
                className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1"
              >
                <X size={12} /> Skift fil
              </button>
            </div>

            <div className="divide-y divide-gray-50">
              {BUDR_FIELDS.map(field => (
                <div key={field.key} className="px-4 py-3 flex items-center gap-4">
                  <div className="w-40 flex-shrink-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-sm font-medium text-gray-800">{field.label}</span>
                      {field.required && <span className="text-red-500 text-xs">*</span>}
                    </div>
                    <span className="text-xs text-gray-400">{field.hint}</span>
                  </div>
                  <ChevronRight size={14} className="text-gray-300 flex-shrink-0" />
                  <select
                    value={mapping[field.key] ?? ''}
                    onChange={e => setMapping(prev => ({ ...prev, [field.key]: e.target.value }))}
                    className="flex-1 text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:border-[#1D9E75] transition-colors bg-white"
                  >
                    <option value="">— Ignorér dette felt —</option>
                    {headers.map(h => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                  {mapping[field.key] ? (
                    <CheckCircle2 size={16} className="text-[#1D9E75] flex-shrink-0" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border-2 border-gray-200 flex-shrink-0" />
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
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
            <p className="text-xs text-red-500 text-right">Feltet &ldquo;Navn&rdquo; skal mappes for at fortsætte</p>
          )}
        </div>
      )}

      {/* ── STEP 3: Preview ─────────────────────────────────────── */}
      {step === 3 && (
        <div className="space-y-5">
          <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-800">
                Forhåndsvisning — {mappedRows.length} beboere klar til import
              </span>
              <span className="text-xs text-gray-400">Side {previewPage + 1} / {totalPages}</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    <th className="text-left text-xs font-medium text-gray-500 px-4 py-2.5">Navn</th>
                    <th className="text-left text-xs font-medium text-gray-500 px-3 py-2.5">Værelse</th>
                    <th className="text-left text-xs font-medium text-gray-500 px-3 py-2.5">Indflyttet</th>
                    <th className="text-left text-xs font-medium text-gray-500 px-3 py-2.5">Kontakt</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((row, i) => {
                    const initials = row.display_name.split(/\s+/).filter(Boolean).slice(0, 2).map(p => p[0].toUpperCase()).join('');
                    return (
                      <tr key={i} className="border-b border-gray-50">
                        <td className="px-4 py-2.5">
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-600 flex-shrink-0">
                              {initials}
                            </div>
                            <span className="font-medium text-gray-800">{row.display_name}</span>
                          </div>
                        </td>
                        <td className="px-3 py-2.5 text-gray-600">{row.room || '—'}</td>
                        <td className="px-3 py-2.5 text-gray-600">{row.move_in_date || '—'}</td>
                        <td className="px-3 py-2.5 text-gray-600">
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
              <div className="flex items-center justify-center gap-2 px-4 py-3 border-t border-gray-100">
                <button
                  type="button"
                  disabled={previewPage === 0}
                  onClick={() => setPreviewPage(p => p - 1)}
                  className="px-3 py-1 text-xs rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
                >
                  ← Forrige
                </button>
                <button
                  type="button"
                  disabled={previewPage === totalPages - 1}
                  onClick={() => setPreviewPage(p => p + 1)}
                  className="px-3 py-1 text-xs rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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
              className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
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
                <><Loader2 size={15} className="animate-spin" /> Importerer…</>
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
          <div className={`rounded-2xl border p-6 text-center ${
            result.errors.length === 0
              ? 'bg-[#E1F5EE] border-[#A8DFC9]'
              : 'bg-amber-50 border-amber-200'
          }`}>
            {result.errors.length === 0 ? (
              <CheckCircle2 size={36} className="text-[#1D9E75] mx-auto mb-3" />
            ) : (
              <AlertCircle size={36} className="text-amber-500 mx-auto mb-3" />
            )}
            <h2 className="text-lg font-bold text-gray-900 mb-1">
              {result.errors.length === 0 ? 'Import gennemført' : 'Import delvist gennemført'}
            </h2>
            <div className="flex items-center justify-center gap-6 mt-3 text-sm">
              <div>
                <div className="text-2xl font-extrabold text-[#1D9E75]">{result.inserted}</div>
                <div className="text-xs text-gray-500">importeret</div>
              </div>
              {result.skipped > 0 && (
                <div>
                  <div className="text-2xl font-extrabold text-gray-400">{result.skipped}</div>
                  <div className="text-xs text-gray-500">sprunget over</div>
                </div>
              )}
              {result.errors.length > 0 && (
                <div>
                  <div className="text-2xl font-extrabold text-red-500">{result.errors.length}</div>
                  <div className="text-xs text-gray-500">fejl</div>
                </div>
              )}
            </div>
          </div>

          {/* Errors */}
          {result.errors.length > 0 && (
            <div className="bg-white rounded-xl border border-red-100 overflow-hidden">
              <div className="px-4 py-3 border-b border-red-100 bg-red-50">
                <span className="text-xs font-semibold text-red-700">Fejl ved import</span>
              </div>
              <div className="divide-y divide-red-50 max-h-48 overflow-y-auto">
                {result.errors.map((e, i) => (
                  <div key={i} className="px-4 py-2 text-xs text-red-600">{e}</div>
                ))}
              </div>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3">
            <a
              href="/resident-360-view"
              className="flex-1 text-center py-2.5 bg-[#0F1B2D] text-white text-sm font-semibold rounded-xl hover:bg-[#1a2d47] transition-colors"
            >
              Se importerede beboere →
            </a>
            <button
              type="button"
              onClick={() => { setStep(1); setFile(null); setResult(null); }}
              className="px-4 py-2.5 border border-gray-200 text-sm text-gray-600 rounded-xl hover:bg-gray-50 transition-colors"
            >
              Ny import
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
