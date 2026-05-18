'use client';

import { useCallback, useEffect, useState } from 'react';
import { VUM_FUNCTION_LEVEL_LABELS, VUM_THEMES } from '@/lib/vum/vumThemes';
import {
  parseThemePayload,
  themeColumnForNumber,
  type VumAssessmentRow,
  type VumFunctionLevel,
  type VumThemePayload,
} from '@/lib/vum/vumTypes';

type Props = {
  residentId: string;
  residentName: string;
};

export default function ResidentVumTab({ residentId, residentName }: Props) {
  const [assessments, setAssessments] = useState<VumAssessmentRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const selected = assessments.find((a) => a.id === selectedId) ?? assessments[0] ?? null;

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/portal/vum-assessments?resident_id=${encodeURIComponent(residentId)}`
      );
      const json = (await res.json()) as { assessments?: VumAssessmentRow[]; error?: string };
      if (!res.ok) {
        throw new Error(json.error ?? 'Kunne ikke hente VUM-vurderinger');
      }
      const list = json.assessments ?? [];
      setAssessments(list);
      setSelectedId((prev) => {
        if (prev && list.some((a) => a.id === prev)) return prev;
        return list[0]?.id ?? null;
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ukendt fejl');
    } finally {
      setLoading(false);
    }
  }, [residentId]);

  useEffect(() => {
    void load();
  }, [load]);

  const createAssessment = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/portal/vum-assessments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resident_id: residentId }),
      });
      const json = (await res.json()) as { assessment?: VumAssessmentRow; error?: string };
      if (!res.ok) throw new Error(json.error ?? 'Kunne ikke oprette vurdering');
      if (json.assessment) {
        setAssessments((prev) => [json.assessment!, ...prev]);
        setSelectedId(json.assessment.id);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ukendt fejl');
    } finally {
      setSaving(false);
    }
  };

  const patchAssessment = async (patch: Record<string, unknown>) => {
    if (!selected) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/portal/vum-assessments/${selected.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      });
      const json = (await res.json()) as { assessment?: VumAssessmentRow; error?: string };
      if (!res.ok) throw new Error(json.error ?? 'Kunne ikke gemme');
      if (json.assessment) {
        setAssessments((prev) =>
          prev.map((a) => (a.id === json.assessment!.id ? json.assessment! : a))
        );
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Ukendt fejl');
    } finally {
      setSaving(false);
    }
  };

  const saveTheme = async (themeNumber: number, payload: Partial<VumThemePayload>) => {
    await patchAssessment({ theme: { number: themeNumber, payload } });
  };

  const downloadJson = async () => {
    if (!selected) return;
    const res = await fetch(`/api/portal/vum-assessments/${selected.id}?format=json`);
    if (!res.ok) return;
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vum-2-${residentId.slice(0, 8)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (loading) {
    return (
      <p className="text-sm" style={{ color: 'var(--cp-muted)' }}>
        Indlæser VUM 2.0…
      </p>
    );
  }

  return (
    <div className="space-y-6">
      <div
        className="rounded-xl border p-4"
        style={{ borderColor: 'var(--cp-border)', backgroundColor: 'var(--cp-bg2)' }}
      >
        <h2 className="text-lg font-semibold" style={{ color: 'var(--cp-text)' }}>
          VUM 2.0-vurdering
        </h2>
        <p className="mt-1 text-sm" style={{ color: 'var(--cp-muted)' }}>
          {residentName} — 11 udredningstemaer i Social- og Boligstyrelsens VUM 2.0. Recovery-data
          fra Lys kan senere foreslå udfyldning automatisk (Sprint 2).
        </p>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            disabled={saving}
            onClick={() => void createAssessment()}
            className="rounded-lg px-4 py-2 text-sm font-medium text-white"
            style={{ backgroundColor: 'var(--cp-green)' }}
          >
            Ny vurdering (kladde)
          </button>
          {selected && (
            <>
              <button
                type="button"
                disabled={saving}
                onClick={() => void patchAssessment({ status: 'active' })}
                className="rounded-lg border px-4 py-2 text-sm"
                style={{ borderColor: 'var(--cp-border)', color: 'var(--cp-text)' }}
              >
                Markér som aktiv
              </button>
              <button
                type="button"
                disabled={saving}
                onClick={() => void downloadJson()}
                className="rounded-lg border px-4 py-2 text-sm"
                style={{ borderColor: 'var(--cp-border)', color: 'var(--cp-text)' }}
              >
                Eksportér JSON
              </button>
            </>
          )}
        </div>
      </div>

      {error && (
        <p className="text-sm text-red-400" role="alert">
          {error}
        </p>
      )}

      {assessments.length === 0 ? (
        <p className="text-sm" style={{ color: 'var(--cp-muted)' }}>
          Ingen VUM-vurderinger endnu. Opret en kladde for at starte sagsåbning og tema-vurdering.
        </p>
      ) : (
        <>
          {assessments.length > 1 && (
            <label className="flex flex-col gap-1 text-sm" style={{ color: 'var(--cp-muted)' }}>
              Vælg vurdering
              <select
                value={selected?.id ?? ''}
                onChange={(e) => setSelectedId(e.target.value)}
                className="max-w-md rounded-lg border px-3 py-2"
                style={{
                  borderColor: 'var(--cp-border)',
                  backgroundColor: 'var(--cp-bg3)',
                  color: 'var(--cp-text)',
                }}
              >
                {assessments.map((a) => (
                  <option key={a.id} value={a.id}>
                    {new Date(a.case_opened_at).toLocaleDateString('da-DK')} — {a.status}
                  </option>
                ))}
              </select>
            </label>
          )}

          {selected && (
            <>
              <CaseMetaForm
                assessment={selected}
                disabled={saving}
                onSave={(fields) => void patchAssessment(fields)}
              />

              <div className="space-y-3">
                {VUM_THEMES.map((theme) => {
                  const col = themeColumnForNumber(theme.number);
                  if (!col) return null;
                  const payload = parseThemePayload(selected[col]);
                  return (
                    <ThemeEditor
                      key={theme.number}
                      themeNumber={theme.number}
                      title={`${theme.number}. ${theme.title}`}
                      categoryLabel={theme.categoryLabel}
                      description={theme.shortDescription}
                      prompts={theme.inspirationPrompts}
                      payload={payload}
                      disabled={saving}
                      onSave={(p) => void saveTheme(theme.number, p)}
                    />
                  );
                })}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

function CaseMetaForm({
  assessment,
  disabled,
  onSave,
}: {
  assessment: VumAssessmentRow;
  disabled: boolean;
  onSave: (fields: Record<string, unknown>) => void;
}) {
  const [referral, setReferral] = useState(assessment.referral_source ?? '');
  const [purpose, setPurpose] = useState(assessment.case_purpose ?? '');

  useEffect(() => {
    setReferral(assessment.referral_source ?? '');
    setPurpose(assessment.case_purpose ?? '');
  }, [assessment.id, assessment.referral_source, assessment.case_purpose]);

  return (
    <div
      className="rounded-xl border p-4 space-y-3"
      style={{ borderColor: 'var(--cp-border)', backgroundColor: 'var(--cp-bg2)' }}
    >
      <h3 className="font-medium" style={{ color: 'var(--cp-text)' }}>
        Sagsåbning
      </h3>
      <p className="text-xs" style={{ color: 'var(--cp-muted)' }}>
        Åbnet {new Date(assessment.case_opened_at).toLocaleString('da-DK')} · Status:{' '}
        {assessment.status}
      </p>
      <label className="block text-sm">
        <span style={{ color: 'var(--cp-muted)' }}>Henvisningskilde</span>
        <input
          value={referral}
          onChange={(e) => setReferral(e.target.value)}
          disabled={disabled}
          className="mt-1 w-full rounded-lg border px-3 py-2"
          style={{
            borderColor: 'var(--cp-border)',
            backgroundColor: 'var(--cp-bg3)',
            color: 'var(--cp-text)',
          }}
        />
      </label>
      <label className="block text-sm">
        <span style={{ color: 'var(--cp-muted)' }}>Formål med udredning</span>
        <textarea
          value={purpose}
          onChange={(e) => setPurpose(e.target.value)}
          disabled={disabled}
          rows={2}
          className="mt-1 w-full rounded-lg border px-3 py-2"
          style={{
            borderColor: 'var(--cp-border)',
            backgroundColor: 'var(--cp-bg3)',
            color: 'var(--cp-text)',
          }}
        />
      </label>
      <button
        type="button"
        disabled={disabled}
        onClick={() =>
          onSave({
            referral_source: referral.trim() || null,
            case_purpose: purpose.trim() || null,
          })
        }
        className="rounded-lg px-3 py-1.5 text-sm font-medium"
        style={{ backgroundColor: 'var(--cp-green-dim)', color: 'var(--cp-green)' }}
      >
        Gem sagsdata
      </button>
    </div>
  );
}

function ThemeEditor({
  themeNumber,
  title,
  categoryLabel,
  description,
  prompts,
  payload,
  disabled,
  onSave,
}: {
  themeNumber: number;
  title: string;
  categoryLabel: string;
  description: string;
  prompts: { id: string; label: string }[];
  payload: VumThemePayload;
  disabled: boolean;
  onSave: (payload: Partial<VumThemePayload>) => void;
}) {
  const [notes, setNotes] = useState(payload.notes ?? '');
  const [level, setLevel] = useState<VumFunctionLevel | ''>(payload.level ?? '');
  const [inspiration, setInspiration] = useState<Record<string, string>>(payload.inspiration ?? {});

  useEffect(() => {
    setNotes(payload.notes ?? '');
    setLevel(payload.level ?? '');
    setInspiration(payload.inspiration ?? {});
  }, [payload.notes, payload.level, payload.inspiration, themeNumber]);

  return (
    <details
      className="rounded-xl border overflow-hidden"
      style={{ borderColor: 'var(--cp-border)', backgroundColor: 'var(--cp-bg2)' }}
    >
      <summary
        className="cursor-pointer px-4 py-3 font-medium list-none flex flex-wrap items-center justify-between gap-2"
        style={{ color: 'var(--cp-text)' }}
      >
        <span>{title}</span>
        <span className="text-xs font-normal" style={{ color: 'var(--cp-muted)' }}>
          {categoryLabel}
          {level !== '' ? ` · Niveau ${level}` : ''}
        </span>
      </summary>
      <div className="border-t px-4 py-4 space-y-4" style={{ borderColor: 'var(--cp-border)' }}>
        <p className="text-sm" style={{ color: 'var(--cp-muted)' }}>
          {description}
        </p>

        <label className="block text-sm">
          <span style={{ color: 'var(--cp-muted)' }}>Funktionsevneniveau (VUM 0–4)</span>
          <select
            value={level === '' ? '' : String(level)}
            onChange={(e) =>
              setLevel(e.target.value === '' ? '' : (Number(e.target.value) as VumFunctionLevel))
            }
            disabled={disabled}
            className="mt-1 w-full max-w-xs rounded-lg border px-3 py-2"
            style={{
              borderColor: 'var(--cp-border)',
              backgroundColor: 'var(--cp-bg3)',
              color: 'var(--cp-text)',
            }}
          >
            <option value="">— Vælg niveau —</option>
            {([0, 1, 2, 3, 4] as const).map((n) => (
              <option key={n} value={n}>
                {n} — {VUM_FUNCTION_LEVEL_LABELS[n]}
              </option>
            ))}
          </select>
        </label>

        {prompts.map((p) => (
          <label key={p.id} className="block text-sm">
            <span style={{ color: 'var(--cp-muted)' }}>{p.label}</span>
            <textarea
              value={inspiration[p.id] ?? ''}
              onChange={(e) => setInspiration((prev) => ({ ...prev, [p.id]: e.target.value }))}
              disabled={disabled}
              rows={2}
              className="mt-1 w-full rounded-lg border px-3 py-2"
              style={{
                borderColor: 'var(--cp-border)',
                backgroundColor: 'var(--cp-bg3)',
                color: 'var(--cp-text)',
              }}
            />
          </label>
        ))}

        <label className="block text-sm">
          <span style={{ color: 'var(--cp-muted)' }}>Faglige noter</span>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            disabled={disabled}
            rows={3}
            className="mt-1 w-full rounded-lg border px-3 py-2"
            style={{
              borderColor: 'var(--cp-border)',
              backgroundColor: 'var(--cp-bg3)',
              color: 'var(--cp-text)',
            }}
          />
        </label>

        <button
          type="button"
          disabled={disabled}
          onClick={() =>
            onSave({
              notes: notes.trim() || undefined,
              level: level === '' ? undefined : level,
              inspiration,
            })
          }
          className="rounded-lg px-3 py-1.5 text-sm font-medium"
          style={{ backgroundColor: 'var(--cp-green-dim)', color: 'var(--cp-green)' }}
        >
          Gem tema {themeNumber}
        </button>
      </div>
    </details>
  );
}
