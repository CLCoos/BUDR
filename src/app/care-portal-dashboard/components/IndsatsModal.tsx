'use client';

import React, { useEffect, useState } from 'react';
import { X, Save, Printer, AlertTriangle } from 'lucide-react';

// ── Types ─────────────────────────────────────────────────────────────────────

type IndsatsType =
  | '§136_fastholdelse'
  | '§136_tilbageholdelse'
  | '§141_personlig_hygiejne'
  | '§141_ernæring'
  | '§141_beskyttelse'
  | 'observation'
  | 'hændelse';

type IndsatsRecord = {
  id: string;
  created_at: string;
  type: IndsatsType;
  paragraph: string;
  tidspunkt: string;
  varighed: string;
  involverede_borgere: string;
  involverede_personale: string;
  beskrivelse: string;
  forudgaaende: string;
  handling: string;
  borgerens_reaktion: string;
  opfoelgning: string;
  underskrift: string;
};

const TYPE_OPTIONS: { value: IndsatsType; label: string; paragraph: string; color: string }[] = [
  { value: '§136_fastholdelse', label: 'Fastholdelse', paragraph: '§136', color: '#dc2626' },
  { value: '§136_tilbageholdelse', label: 'Tilbageholdelse', paragraph: '§136', color: '#dc2626' },
  {
    value: '§141_personlig_hygiejne',
    label: 'Personlig hygiejne',
    paragraph: '§141',
    color: '#d97706',
  },
  { value: '§141_ernæring', label: 'Ernæring', paragraph: '§141', color: '#d97706' },
  {
    value: '§141_beskyttelse',
    label: 'Beskyttelse mod skade',
    paragraph: '§141',
    color: '#d97706',
  },
  { value: 'observation', label: 'Observationsnotat', paragraph: '', color: '#6366f1' },
  { value: 'hændelse', label: 'Hændelsesrapport', paragraph: '', color: '#64748b' },
];

const STORAGE_KEY = 'budr_indsats_records_v1';

function loadRecords(): IndsatsRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as IndsatsRecord[]) : [];
  } catch {
    return [];
  }
}

function saveRecords(records: IndsatsRecord[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch {
    /* ignore */
  }
}

type Props = { open: boolean; onClose: () => void };

const EMPTY_FORM = {
  type: '§136_fastholdelse' as IndsatsType,
  tidspunkt: new Date().toISOString().slice(0, 16),
  varighed: '',
  involverede_borgere: '',
  involverede_personale: '',
  beskrivelse: '',
  forudgaaende: '',
  handling: '',
  borgerens_reaktion: '',
  opfoelgning: '',
  underskrift: '',
};

export default function IndsatsModal({ open, onClose }: Props) {
  const [view, setView] = useState<'new' | 'list'>('new');
  const [form, setForm] = useState(EMPTY_FORM);
  const [records, setRecords] = useState<IndsatsRecord[]>([]);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (open) setRecords(loadRecords());
  }, [open]);

  if (!open) return null;

  const typeOpt = TYPE_OPTIONS.find((t) => t.value === form.type)!;
  const isParagraph = form.type.startsWith('§');

  const update = (key: keyof typeof EMPTY_FORM, value: string) =>
    setForm((f) => ({ ...f, [key]: value }));

  const handleSave = () => {
    const record: IndsatsRecord = {
      id: crypto.randomUUID(),
      created_at: new Date().toISOString(),
      paragraph: typeOpt.paragraph,
      ...form,
    };
    const updated = [record, ...records];
    saveRecords(updated);
    setRecords(updated);
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      setForm({ ...EMPTY_FORM, tidspunkt: new Date().toISOString().slice(0, 16) });
    }, 2000);
  };

  const handlePrint = (rec: IndsatsRecord) => {
    const typeLabel = TYPE_OPTIONS.find((t) => t.value === rec.type)?.label ?? rec.type;
    const html = `<!DOCTYPE html><html lang="da"><head><meta charset="UTF-8">
<title>Indsatsdokumentation ${rec.created_at.slice(0, 10)}</title>
<style>
  body { font-family: system-ui, sans-serif; max-width: 700px; margin: 40px auto; color: #111; font-size: 14px; line-height: 1.6; }
  h1 { font-size: 18px; } h2 { font-size: 14px; color: #444; border-bottom: 1px solid #ddd; padding-bottom: 4px; margin-top: 20px; }
  .meta { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 24px; margin: 12px 0; }
  .meta span { color: #666; font-size: 12px; } .meta strong { display: block; }
  .field { margin: 12px 0; } .field label { font-weight: 600; font-size: 12px; color: #666; display: block; margin-bottom: 2px; }
  .badge { display: inline-block; background: #fee2e2; color: #b91c1c; padding: 2px 10px; border-radius: 999px; font-size: 12px; font-weight: 600; }
  @media print { body { margin: 20px; } }
</style>
</head><body>
<h1>Indsatsdokumentation</h1>
${rec.paragraph ? `<span class="badge">${rec.paragraph}</span>` : ''}
<div class="meta">
  <div><span>Type</span><strong>${typeLabel}</strong></div>
  <div><span>Tidspunkt</span><strong>${new Date(rec.tidspunkt).toLocaleString('da-DK')}</strong></div>
  <div><span>Varighed</span><strong>${rec.varighed || '—'}</strong></div>
  <div><span>Dokumenteret</span><strong>${new Date(rec.created_at).toLocaleString('da-DK')}</strong></div>
  <div><span>Involverede borgere</span><strong>${rec.involverede_borgere || '—'}</strong></div>
  <div><span>Involverede personale</span><strong>${rec.involverede_personale || '—'}</strong></div>
</div>
${[
  ['Forudgående begivenheder / årsag', rec.forudgaaende],
  ['Beskrivelse af hændelsen', rec.beskrivelse],
  ['Personalets handling', rec.handling],
  ['Borgerens reaktion', rec.borgerens_reaktion],
  ['Opfølgning og plan', rec.opfoelgning],
]
  .map(([label, val]) =>
    val
      ? `<div class="field"><label>${label}</label><p>${(val as string).replace(/</g, '&lt;').replace(/\n/g, '<br>')}</p></div>`
      : ''
  )
  .join('')}
${rec.underskrift ? `<div class="field" style="margin-top:32px;border-top:1px solid #ddd;padding-top:16px"><label>Underskrift / initialer</label><p>${rec.underskrift}</p></div>` : ''}
</body></html>`;
    const w = window.open('', '_blank');
    if (w) {
      w.document.write(html);
      w.document.close();
      w.print();
    }
  };

  const Field = ({
    label,
    field,
    rows = 2,
    required = false,
  }: {
    label: string;
    field: keyof typeof EMPTY_FORM;
    rows?: number;
    required?: boolean;
  }) => (
    <div>
      <label className="block text-xs font-semibold text-gray-600 mb-1">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </label>
      {rows === 1 ? (
        <input
          type="text"
          value={form[field] as string}
          onChange={(e) => update(field, e.target.value)}
          className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-blue-300 focus:bg-white transition-colors"
        />
      ) : (
        <textarea
          value={form[field] as string}
          onChange={(e) => update(field, e.target.value)}
          rows={rows}
          className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 text-sm leading-relaxed resize-none outline-none focus:border-blue-300 focus:bg-white transition-colors"
        />
      )}
    </div>
  );

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full sm:max-w-2xl max-h-[94dvh] flex flex-col bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-xl bg-red-50 flex items-center justify-center">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <h2 className="font-bold text-gray-900">Indsatsdokumentation</h2>
              <p className="text-xs text-gray-500">
                Serviceloven — faglig og juridisk kvalitetssikring hos jer
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setView(view === 'new' ? 'list' : 'new')}
              className="text-xs font-medium text-blue-600 hover:text-blue-800 px-2 py-1"
            >
              {view === 'new' ? `Arkiv (${records.length})` : 'Ny registrering'}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="h-8 w-8 flex items-center justify-center rounded-full hover:bg-gray-100"
            >
              <X className="h-4 w-4 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Archive view */}
        {view === 'list' && (
          <div className="flex-1 overflow-y-auto px-6 py-5">
            {records.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-12">Ingen registreringer endnu</p>
            ) : (
              <div className="space-y-3">
                {records.map((rec) => {
                  const opt = TYPE_OPTIONS.find((t) => t.value === rec.type);
                  return (
                    <div key={rec.id} className="rounded-2xl border border-gray-200 px-4 py-3.5">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            {opt?.paragraph && (
                              <span
                                className="text-xs font-bold rounded-full px-2 py-0.5"
                                style={{ backgroundColor: `${opt.color}18`, color: opt.color }}
                              >
                                {opt.paragraph}
                              </span>
                            )}
                            <span className="text-sm font-semibold text-gray-800">
                              {opt?.label}
                            </span>
                          </div>
                          <p className="text-xs text-gray-500">
                            {new Date(rec.tidspunkt).toLocaleString('da-DK')}
                          </p>
                          {rec.involverede_borgere && (
                            <p className="text-xs text-gray-600 mt-1">
                              Borgere: {rec.involverede_borgere}
                            </p>
                          )}
                          {rec.beskrivelse && (
                            <p className="text-xs text-gray-500 mt-1 line-clamp-2">
                              {rec.beskrivelse}
                            </p>
                          )}
                        </div>
                        <button
                          type="button"
                          onClick={() => handlePrint(rec)}
                          className="shrink-0 flex items-center gap-1 text-xs font-medium text-gray-600 border border-gray-200 rounded-lg px-3 py-1.5 hover:bg-gray-50"
                        >
                          <Printer className="h-3.5 w-3.5" />
                          Udskriv
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* New form */}
        {view === 'new' && (
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
            {/* Type selector */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-2">Type *</label>
              <div className="grid grid-cols-2 gap-2">
                {TYPE_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => update('type', opt.value)}
                    className="rounded-xl px-3 py-2.5 text-left transition-all duration-150"
                    style={{
                      backgroundColor: form.type === opt.value ? `${opt.color}15` : '#f9fafb',
                      border: `1.5px solid ${form.type === opt.value ? opt.color : '#e5e7eb'}`,
                    }}
                  >
                    <div className="flex items-center gap-2">
                      {opt.paragraph && (
                        <span
                          className="text-[10px] font-black rounded px-1.5 py-0.5"
                          style={{ backgroundColor: `${opt.color}25`, color: opt.color }}
                        >
                          {opt.paragraph}
                        </span>
                      )}
                      <span className="text-xs font-semibold text-gray-800">{opt.label}</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {isParagraph && (
              <div className="rounded-xl bg-amber-50 border border-amber-200 px-4 py-3 flex gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                <p className="text-xs text-amber-800 leading-relaxed">
                  Magtanvendelse skal indberettes til Socialtilsynet og ledelsen senest næste
                  hverdag. Sørg for at borgeren orienteres.
                </p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">
                  Tidspunkt *
                </label>
                <input
                  type="datetime-local"
                  value={form.tidspunkt}
                  onChange={(e) => update('tidspunkt', e.target.value)}
                  className="w-full rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-sm outline-none focus:border-blue-300"
                />
              </div>
              <Field label="Varighed (fx 5 min)" field="varighed" rows={1} />
            </div>

            <Field label="Involverede borgere" field="involverede_borgere" rows={1} required />
            <Field label="Involverede personale" field="involverede_personale" rows={1} required />
            <Field label="Forudgående begivenheder / årsag" field="forudgaaende" rows={3} />
            <Field label="Beskrivelse af hændelsen" field="beskrivelse" rows={4} required />
            <Field label="Personalets handling" field="handling" rows={3} required />
            <Field label="Borgerens reaktion" field="borgerens_reaktion" rows={2} />
            <Field label="Opfølgning og plan" field="opfoelgning" rows={3} />
            <Field label="Underskrift / initialer" field="underskrift" rows={1} required />
          </div>
        )}

        {/* Footer */}
        {view === 'new' && (
          <div className="flex gap-2 px-6 py-4 border-t border-gray-100 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl px-4 py-2.5 text-sm font-medium border border-gray-200 text-gray-600 hover:bg-gray-50"
            >
              Annuller
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={
                !form.beskrivelse.trim() ||
                !form.involverede_borgere.trim() ||
                !form.underskrift.trim() ||
                saved
              }
              className="ml-auto flex items-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white transition-colors disabled:opacity-40"
              style={{ backgroundColor: saved ? '#16a34a' : '#dc2626' }}
            >
              <Save className="h-4 w-4" />
              {saved ? 'Gemt ✓' : 'Gem registrering'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
