'use client';

import React, { useState } from 'react';
import { Loader2, Plus } from 'lucide-react';
import type { DocumentTypeDefinition } from '@/lib/documents/registry';
import type { DocumentMeta, ResidentDocumentRow } from '@/lib/documents/types';
import { MetaInput } from './MetaInput';
import { api, ghostButton, primaryButton } from './shared';

export function NewDocumentForm({
  type,
  residentId,
  defaults,
  onCancel,
  onCreated,
}: {
  type: DocumentTypeDefinition;
  residentId: string;
  defaults: DocumentMeta;
  onCancel: () => void;
  onCreated: (doc: ResidentDocumentRow) => void;
}) {
  const [meta, setMeta] = useState<DocumentMeta>(defaults);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const json = await api<{ document: ResidentDocumentRow }>('/api/portal/documents', {
        method: 'POST',
        body: JSON.stringify({ resident_id: residentId, doc_type: type.key, meta }),
      });
      onCreated(json.document);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Kunne ikke oprette');
      setBusy(false);
    }
  };

  return (
    <form
      onSubmit={(e) => void submit(e)}
      className="mt-4 border-t pt-4"
      style={{ borderColor: 'var(--cp-border)' }}
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        {type.metaFields.map((f) => (
          <MetaInput
            key={f.key}
            field={f}
            value={meta[f.key] ?? ''}
            onValue={(v) => setMeta((m) => ({ ...m, [f.key]: v || null }))}
          />
        ))}
      </div>
      {error && (
        <p className="mt-3 text-sm" role="alert" style={{ color: 'var(--cp-red)' }}>
          {error}
        </p>
      )}
      <div className="mt-4 flex flex-wrap gap-2">
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
          Opret og skriv udkast
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
