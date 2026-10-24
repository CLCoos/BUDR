'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Check, Save, Printer } from 'lucide-react';
import ReportSheet, { ReportActions } from '@/components/reports/ReportSheet';
import StatusTag from '@/components/ui/StatusTag';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { parseStaffOrgId } from '@/lib/staffOrgScope';
import { safeRandomUUID } from '@/lib/uuid';
import {
  INDSATS_TYPE_OPTIONS,
  type IndsatsFormFields,
  type IndsatsRecord,
  buildIndsatsInsertRow,
  escapeIndsatsHtml,
  canSaveIndsatsForm,
  fetchIndsatsRecords,
  loadDemoIndsatsRecords,
  paragraphForIndsatsType,
  parseIndsatsRecord,
  saveDemoIndsatsRecords,
} from '@/lib/indsatsRecords';

type Props = {
  open: boolean;
  onClose: () => void;
  /** Demo-ruter beholder localStorage. Live portal skriver til `care_indsats_records`. */
  useDemoData?: boolean;
};

/** Nu, i lokal tid, som `datetime-local`-værdi (toISOString ville give UTC). */
function localNowStamp(): string {
  const d = new Date();
  d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
  return d.toISOString().slice(0, 16);
}

/** Starter som observationsnotat: det almindelige på et §107-bosted. Magtanvendelse vælges aktivt. */
const EMPTY_FORM: IndsatsFormFields = {
  type: 'observation',
  tidspunkt: localNowStamp(),
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

export default function IndsatsModal({ open, onClose, useDemoData = false }: Props) {
  const [view, setView] = useState<'new' | 'list'>('new');
  const [form, setForm] = useState<IndsatsFormFields>(EMPTY_FORM);
  const [records, setRecords] = useState<IndsatsRecord[]>([]);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loadingList, setLoadingList] = useState(false);

  const loadRecords = useCallback(async () => {
    if (useDemoData) {
      setRecords(loadDemoIndsatsRecords());
      return;
    }
    setLoadingList(true);
    const supabase = createClient();
    if (!supabase) {
      toast.error('Forbindelsesfejl — kunne ikke hente indsatsdokumentation');
      setRecords([]);
      setLoadingList(false);
      return;
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id) {
      toast.error('Du skal være logget ind');
      setRecords([]);
      setLoadingList(false);
      return;
    }
    const { data: staffRow } = await supabase
      .from('care_staff')
      .select('org_id')
      .eq('id', user.id)
      .maybeSingle();
    const orgId = parseStaffOrgId(staffRow?.org_id ?? null);
    if (!orgId) {
      toast.error('Organisation mangler på din bruger — kontakt administrator');
      setRecords([]);
      setLoadingList(false);
      return;
    }
    const { records: rows, error } = await fetchIndsatsRecords(supabase, orgId);
    if (error) {
      toast.error('Kunne ikke hente gemte registreringer. Er migrationen kørt?');
      setRecords([]);
      setLoadingList(false);
      return;
    }
    setRecords(rows);
    setLoadingList(false);
  }, [useDemoData]);

  useEffect(() => {
    if (!open) return;
    // Demoen åbner på arkivet, så man først ser, hvordan dokumentationen ser ud.
    setView(useDemoData ? 'list' : 'new');
    setForm({ ...EMPTY_FORM, tidspunkt: localNowStamp() });
    void loadRecords();
  }, [open, loadRecords, useDemoData]);

  if (!open) return null;

  const isParagraph = form.type.startsWith('§');

  const update = (key: keyof IndsatsFormFields, value: string) =>
    setForm((f) => ({ ...f, [key]: value }) as IndsatsFormFields);

  const handleSave = async () => {
    if (!canSaveIndsatsForm(form) || saving || saved) return;

    if (useDemoData) {
      const record: IndsatsRecord = {
        id: safeRandomUUID(),
        created_at: new Date().toISOString(),
        paragraph: paragraphForIndsatsType(form.type),
        ...form,
      };
      const updated = [record, ...records];
      saveDemoIndsatsRecords(updated);
      setRecords(updated);
      setSaved(true);
      toast.success('Demo: registrering gemt lokalt i denne browser');
      window.setTimeout(() => {
        setSaved(false);
        setForm({ ...EMPTY_FORM, tidspunkt: localNowStamp() });
      }, 2000);
      return;
    }

    setSaving(true);
    const supabase = createClient();
    if (!supabase) {
      toast.error('Forbindelsesfejl');
      setSaving(false);
      return;
    }
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user?.id) {
      toast.error('Du skal være logget ind');
      setSaving(false);
      return;
    }
    const { data: staffRow } = await supabase
      .from('care_staff')
      .select('org_id')
      .eq('id', user.id)
      .maybeSingle();
    const orgId = parseStaffOrgId(staffRow?.org_id ?? null);
    if (!orgId) {
      toast.error('Organisation mangler på din bruger — kontakt administrator');
      setSaving(false);
      return;
    }

    const { data, error } = await supabase
      .from('care_indsats_records')
      .insert(buildIndsatsInsertRow(form, { orgId, createdBy: user.id }))
      .select(
        'id, created_at, type, paragraph, tidspunkt, varighed, involverede_borgere, involverede_personale, beskrivelse, forudgaaende, handling, borgerens_reaktion, opfoelgning, underskrift'
      )
      .maybeSingle();

    setSaving(false);
    if (error || !data) {
      toast.error(
        error?.message?.includes('care_indsats_records')
          ? 'Databasen mangler tabellen — kør migration care_indsats_records'
          : 'Kunne ikke gemme registreringen'
      );
      return;
    }
    const parsed = parseIndsatsRecord(data as Record<string, unknown>);
    if (parsed) setRecords((prev) => [parsed, ...prev]);
    setSaved(true);
    toast.success('Indsatsdokumentation gemt');
    window.setTimeout(() => {
      setSaved(false);
      setForm({ ...EMPTY_FORM, tidspunkt: localNowStamp() });
    }, 2000);
  };

  const handlePrint = (rec: IndsatsRecord) => {
    const typeLabel = INDSATS_TYPE_OPTIONS.find((t) => t.value === rec.type)?.label ?? rec.type;
    const esc = escapeIndsatsHtml;
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
${rec.paragraph ? `<span class="badge">${esc(rec.paragraph)}</span>` : ''}
<div class="meta">
  <div><span>Type</span><strong>${esc(typeLabel)}</strong></div>
  <div><span>Tidspunkt</span><strong>${new Date(rec.tidspunkt).toLocaleString('da-DK')}</strong></div>
  <div><span>Varighed</span><strong>${esc(rec.varighed) || '—'}</strong></div>
  <div><span>Dokumenteret</span><strong>${new Date(rec.created_at).toLocaleString('da-DK')}</strong></div>
  <div><span>Involverede borgere</span><strong>${esc(rec.involverede_borgere) || '—'}</strong></div>
  <div><span>Involverede personale</span><strong>${esc(rec.involverede_personale) || '—'}</strong></div>
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
      ? `<div class="field"><label>${label}</label><p>${esc(val as string).replace(/\n/g, '<br>')}</p></div>`
      : ''
  )
  .join('')}
${rec.underskrift ? `<div class="field" style="margin-top:32px;border-top:1px solid #ddd;padding-top:16px"><label>Underskrift / initialer</label><p>${esc(rec.underskrift)}</p></div>` : ''}
</body></html>`;
    const w = window.open('', '_blank');
    if (w) {
      w.document.write(html);
      w.document.close();
      w.print();
    }
  };

  const inputStyle = {
    borderColor: 'var(--cp-border2)',
    backgroundColor: 'var(--cp-input-bg)',
    color: 'var(--cp-text)',
  } as const;
  const inputCls =
    'w-full rounded-xl border px-3.5 text-[15px] outline-none transition-colors focus:border-[var(--cp-green)]';

  // En almindelig funktion, ikke en komponent: en komponent defineret her ville blive
  // monteret forfra ved hvert tastetryk, og feltet ville miste fokus.
  const field = (
    label: string,
    key: keyof IndsatsFormFields,
    { rows = 2, required = false }: { rows?: number; required?: boolean } = {}
  ) => (
    <div key={key}>
      <label
        htmlFor={`indsats-${key}`}
        className="mb-1.5 block text-sm font-medium"
        style={{ color: 'var(--cp-text)' }}
      >
        {label}
        {required && (
          <span className="ml-1 font-normal" style={{ color: 'var(--cp-muted)' }}>
            (skal udfyldes)
          </span>
        )}
      </label>
      {rows === 1 ? (
        <input
          id={`indsats-${key}`}
          type="text"
          value={form[key] as string}
          onChange={(e) => update(key, e.target.value)}
          className={`${inputCls} h-12`}
          style={inputStyle}
        />
      ) : (
        <textarea
          id={`indsats-${key}`}
          value={form[key] as string}
          onChange={(e) => update(key, e.target.value)}
          rows={rows}
          className={`${inputCls} resize-y py-3 leading-relaxed`}
          style={inputStyle}
        />
      )}
    </div>
  );

  const magtCount = records.filter((r) => r.paragraph).length;
  const tabs = (
    <div
      role="tablist"
      aria-label="Indsatsdokumentation"
      className="mt-5 grid grid-cols-2 gap-1 rounded-xl p-1 sm:inline-grid sm:w-auto"
      style={{ backgroundColor: 'var(--cp-bg3)' }}
    >
      {(
        [
          ['new', 'Ny registrering'],
          ['list', `Arkiv (${records.length})`],
        ] as const
      ).map(([v, label]) => (
        <button
          key={v}
          type="button"
          role="tab"
          aria-selected={view === v}
          onClick={() => setView(v)}
          className="h-10 rounded-[9px] px-5 text-[15px] transition-colors"
          style={
            view === v
              ? {
                  backgroundColor: 'var(--cp-card-bg)',
                  color: 'var(--cp-text)',
                  fontWeight: 600,
                  boxShadow: '0 1px 3px rgba(11,27,43,0.12)',
                }
              : { color: 'var(--cp-muted)' }
          }
        >
          {label}
        </button>
      ))}
    </div>
  );

  return (
    <ReportSheet
      open={open}
      onClose={onClose}
      title="Indsatsdokumentation"
      meta={
        useDemoData ? 'Demo · gemmes kun i denne browser' : 'Serviceloven · gemmes i jeres portal'
      }
      summary={
        records.length === 0
          ? 'Ingen notater endnu'
          : `${records.length} notat${records.length === 1 ? '' : 'er'} · ${
              magtCount === 0
                ? 'ingen magtanvendelser'
                : `${magtCount} magtanvendelse${magtCount === 1 ? '' : 'r'}`
            }`
      }
      footer={
        view === 'new' ? (
          <ReportActions
            primary={{
              label: saved ? 'Gemt' : saving ? 'Gemmer …' : 'Gem registrering',
              icon: saved ? <Check size={18} aria-hidden /> : <Save size={18} aria-hidden />,
              onClick: () => void handleSave(),
              disabled: !canSaveIndsatsForm(form) || saved || saving,
            }}
            secondary={{ label: 'Annuller', onClick: onClose }}
          />
        ) : null
      }
    >
      {tabs}

      {view === 'list' && (
        <div className="pt-2">
          {loadingList ? (
            <p className="py-12 text-center text-[15px]" style={{ color: 'var(--cp-muted)' }}>
              Henter registreringer …
            </p>
          ) : records.length === 0 ? (
            <p className="py-12 text-center text-[15px]" style={{ color: 'var(--cp-muted)' }}>
              Ingen registreringer endnu.
            </p>
          ) : (
            records.map((rec) => {
              const opt = INDSATS_TYPE_OPTIONS.find((t) => t.value === rec.type);
              return (
                <div
                  key={rec.id}
                  className="flex items-start justify-between gap-3 border-b py-4 last:border-b-0"
                  style={{ borderColor: 'var(--cp-bg3)' }}
                >
                  <div className="flex min-w-0 flex-1 flex-col gap-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-base font-semibold" style={{ color: 'var(--cp-text)' }}>
                        {opt?.label ?? rec.type}
                      </span>
                      {opt?.paragraph ? (
                        <StatusTag tone="today">Magtanvendelse · {opt.paragraph}</StatusTag>
                      ) : null}
                    </div>
                    <p className="m-0 text-sm" style={{ color: 'var(--cp-muted)' }}>
                      {new Date(rec.tidspunkt)
                        .toLocaleString('da-DK', {
                          day: 'numeric',
                          month: 'short',
                          hour: '2-digit',
                          minute: '2-digit',
                        })
                        .replace(':', '.')}
                      {rec.involverede_borgere ? ` · ${rec.involverede_borgere}` : ''}
                      {rec.underskrift ? ` · ${rec.underskrift}` : ''}
                    </p>
                    {rec.beskrivelse && (
                      <p
                        className="m-0 line-clamp-2 text-[15px] leading-[1.5]"
                        style={{ color: 'var(--cp-text)' }}
                      >
                        {rec.beskrivelse}
                      </p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handlePrint(rec)}
                    className="inline-flex min-h-[44px] shrink-0 items-center gap-1.5 px-2 text-sm"
                    style={{ color: 'var(--cp-muted)' }}
                  >
                    <Printer size={16} aria-hidden />
                    Udskriv
                  </button>
                </div>
              );
            })
          )}
        </div>
      )}

      {view === 'new' && (
        <div className="flex flex-col gap-5 pt-5">
          <fieldset className="m-0 border-0 p-0">
            <legend className="mb-2 text-sm font-medium" style={{ color: 'var(--cp-text)' }}>
              Hvad skete der?
            </legend>
            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              {INDSATS_TYPE_OPTIONS.map((opt) => {
                const active = form.type === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    aria-pressed={active}
                    onClick={() => update('type', opt.value)}
                    className="flex min-h-[48px] items-center justify-between gap-2 rounded-xl border px-3.5 text-left text-[15px] transition-colors"
                    style={{
                      borderColor: active ? 'var(--cp-green)' : 'var(--cp-border2)',
                      backgroundColor: active ? 'var(--cp-green-dim)' : 'var(--cp-card-bg)',
                      color: 'var(--cp-text)',
                      fontWeight: active ? 600 : 400,
                    }}
                  >
                    <span>{opt.label}</span>
                    {opt.paragraph ? (
                      <span className="text-[13px]" style={{ color: 'var(--cp-muted)' }}>
                        {opt.paragraph}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </fieldset>

          {isParagraph && (
            <p
              className="m-0 flex flex-wrap items-center gap-2 text-[15px] leading-[1.5]"
              style={{ color: 'var(--cp-text)' }}
            >
              <StatusTag tone="today">I dag · Indberet</StatusTag>
              Magtanvendelse skal indberettes til Socialtilsynet og ledelsen senest næste hverdag.
              Fortæl borgeren om det.
            </p>
          )}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="indsats-tidspunkt"
                className="mb-1.5 block text-sm font-medium"
                style={{ color: 'var(--cp-text)' }}
              >
                Tidspunkt
              </label>
              <input
                id="indsats-tidspunkt"
                type="datetime-local"
                value={form.tidspunkt}
                onChange={(e) => update('tidspunkt', e.target.value)}
                className={`${inputCls} h-12`}
                style={inputStyle}
              />
            </div>
            {field('Varighed (fx 5 min)', 'varighed', { rows: 1 })}
          </div>

          {field('Involverede borgere (initialer)', 'involverede_borgere', {
            rows: 1,
            required: true,
          })}
          {field('Involverede personale', 'involverede_personale', { rows: 1, required: true })}
          {field('Hvad skete der forud?', 'forudgaaende', { rows: 3 })}
          {field('Beskrivelse af hændelsen', 'beskrivelse', { rows: 4, required: true })}
          {field('Hvad gjorde personalet?', 'handling', { rows: 3, required: true })}
          {field('Hvordan reagerede borgeren?', 'borgerens_reaktion', { rows: 2 })}
          {field('Opfølgning og plan', 'opfoelgning', { rows: 3 })}
          {field('Underskrift (initialer)', 'underskrift', { rows: 1, required: true })}
        </div>
      )}
    </ReportSheet>
  );
}
