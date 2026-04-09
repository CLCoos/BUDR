'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Sparkles, Copy, Check, Save } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { formatJournalEntriesInsertError } from '@/lib/journalEntriesInsertError';

export type SynthesisTarget = {
  residentId: string;
  name: string;
  draftCount: number;
};

type Props = {
  targets: SynthesisTarget[];
};

export default function DagbogEveningTools({ targets }: Props) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState(targets[0]?.residentId ?? '');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  if (targets.length === 0) return null;

  async function runSynthesis() {
    if (!selectedId) return;
    setLoading(true);
    setResult(null);
    setCopied(false);
    try {
      const res = await fetch('/api/portal/journal-day-synthesis', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ resident_id: selectedId }),
      });
      const data = (await res.json()) as { text?: string; error?: string; sourceCount?: number };
      if (!res.ok) {
        toast.error(data.error ?? 'Kunne ikke sammenfatte');
        return;
      }
      if (data.text?.trim()) {
        setResult(data.text.trim());
        toast.success(
          data.sourceCount
            ? `Sammenfatning baseret på ${data.sourceCount} notat(er)`
            : 'Sammenfatning klar'
        );
      }
    } catch {
      toast.error('Netværksfejl');
    } finally {
      setLoading(false);
    }
  }

  async function copyResult() {
    if (!result) return;
    try {
      await navigator.clipboard.writeText(result);
      setCopied(true);
      toast.success('Kopieret');
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error('Kunne ikke kopiere');
    }
  }

  async function saveAsApproved() {
    if (!result?.trim() || !selectedId) return;
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
    const staffName =
      (user?.user_metadata?.full_name as string | undefined) ?? user?.email ?? 'Ukendt personale';
    const nowIso = new Date().toISOString();

    const insertRow: Record<string, unknown> = {
      resident_id: selectedId,
      staff_id: user?.id ?? null,
      staff_name: staffName,
      entry_text: result.trim(),
      category: 'Sammenfatning',
      journal_status: 'godkendt',
      show_in_diary: true,
    };
    if (user?.id) {
      insertRow.approved_at = nowIso;
      insertRow.approved_by = user.id;
    }

    let { error: insErr } = await supabase.from('journal_entries').insert(insertRow);
    if (insErr && String(insErr.message ?? '').toLowerCase().includes('show_in_diary')) {
      const retry = { ...insertRow };
      delete retry.show_in_diary;
      ({ error: insErr } = await supabase.from('journal_entries').insert(retry));
    }

    setSaving(false);
    if (insErr) {
      toast.error(formatJournalEntriesInsertError(insErr));
      return;
    }
    toast.success('Gemt som godkendt journalnotat');
    setResult(null);
    router.refresh();
  }

  return (
    <div
      className="mb-8 rounded-xl border p-4 sm:p-5"
      style={{
        borderColor: 'var(--cp-border, #e5e7eb)',
        backgroundColor: 'var(--cp-bg3, #f9fafb)',
      }}
    >
      <div className="mb-3 flex flex-wrap items-start gap-2">
        <Sparkles className="mt-0.5 h-5 w-5 shrink-0" style={{ color: 'var(--cp-green, #2dd4a0)' }} />
        <div>
          <h2 className="text-sm font-bold" style={{ color: 'var(--cp-text, #111)' }}>
            Afslut dagen — professionelt aftennotat (AI)
          </h2>
          <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--cp-muted, #6b7280)' }}>
            Dagens hurtige notater og kladder (med «Vis i dagbog») er jeres egne stikord. Her kan I lade
            AI samle dem til ét sammenhængende notat med «Aktivitet/Handling» og «Refleksion». Tjek altid
            teksten før I gemmer som godkendt journal.
          </p>
        </div>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="min-w-0 flex-1">
          <label
            htmlFor="dagbog-synth-resident"
            className="mb-1 block text-xs font-semibold"
            style={{ color: 'var(--cp-muted, #6b7280)' }}
          >
            Beboer
          </label>
          <select
            id="dagbog-synth-resident"
            value={selectedId}
            onChange={(e) => {
              setSelectedId(e.target.value);
              setResult(null);
            }}
            className="w-full rounded-lg border px-3 py-2.5 text-sm"
            style={{
              borderColor: 'var(--cp-border, #e5e7eb)',
              backgroundColor: 'var(--cp-bg2, #fff)',
              color: 'var(--cp-text, #111)',
            }}
          >
            {targets.map((t) => (
              <option key={t.residentId} value={t.residentId}>
                {t.name} ({t.draftCount} kladde{t.draftCount === 1 ? '' : 'r'} i dag)
              </option>
            ))}
          </select>
        </div>
        <button
          type="button"
          disabled={loading}
          onClick={() => void runSynthesis()}
          className="inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white disabled:opacity-50"
          style={{ backgroundColor: 'var(--cp-green, #2dd4a0)' }}
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
          Sammenfat med AI
        </button>
      </div>

      {result && (
        <div className="mt-4 space-y-3">
          <pre
            className="max-h-[min(50vh,420px)] overflow-y-auto whitespace-pre-wrap rounded-lg border p-3 text-sm leading-relaxed"
            style={{
              borderColor: 'var(--cp-border, #e5e7eb)',
              backgroundColor: 'var(--cp-bg2, #fff)',
              color: 'var(--cp-text, #374151)',
            }}
          >
            {result}
          </pre>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void copyResult()}
              className="inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-semibold"
              style={{
                borderColor: 'var(--cp-border, #e5e7eb)',
                color: 'var(--cp-text, #111)',
              }}
            >
              {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? 'Kopieret' : 'Kopier'}
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => void saveAsApproved()}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
              style={{ backgroundColor: 'var(--cp-green, #2dd4a0)' }}
            >
              {saving ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Save className="h-3.5 w-3.5" />}
              Gem som godkendt journal
            </button>
          </div>
          <p className="text-[11px]" style={{ color: 'var(--cp-muted2, #9ca3af)' }}>
            Gemmer under kategorien «Sammenfatning». Kladderne forbliver i systemet — slet eller godkend dem
            separat hvis I vil rydde op.
          </p>
        </div>
      )}
    </div>
  );
}
