'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ChevronDown, FileText, Loader2, Plus } from 'lucide-react';
import DocumentEditor from '@/components/documents/DocumentEditor';
import { NewDocumentForm } from '@/components/documents/NewDocumentForm';
import {
  DueChip,
  StatusChip,
  api,
  cardStyle,
  primaryButton,
  todayYmd,
} from '@/components/documents/shared';
import {
  availableDocumentTypes,
  getDocumentType,
  type DocumentTypeDefinition,
} from '@/lib/documents/registry';
import { formatDanishDate } from '@/lib/documents/render';
import type { DocumentMeta, ResidentDocumentRow } from '@/lib/documents/types';

type Props = { residentId: string; residentName: string };

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

/** Fornuftige standardværdier, så en ny kladde kræver så få valg som muligt. */
function defaultMeta(type: DocumentTypeDefinition, docs: ResidentDocumentRow[]): DocumentMeta {
  if (type.key !== 'statusrapport') return {};
  const last = docs.find((d) => d.doc_type === type.key && d.status === 'godkendt');
  const lastEnd = last?.meta?.period_end ?? null;
  return {
    period_start: lastEnd ? addDays(lastEnd, 1) : monthsAgo(6),
    period_end: todayYmd(),
    meeting_date: null,
    paragraph: last?.meta?.paragraph ?? '§108',
    contact_person: last?.meta?.contact_person ?? null,
  };
}

function documentLabel(doc: ResidentDocumentRow): string {
  const type = getDocumentType(doc.doc_type);
  const title = doc.title || type?.title || 'Dokument';
  const p = type?.period;
  if (p && doc.meta?.[p.start]) {
    return `${title} ${formatDanishDate(doc.meta[p.start])} – ${formatDanishDate(doc.meta[p.end])}`;
  }
  return title;
}

export default function ResidentDocumentsTab({ residentId, residentName }: Props) {
  const [docs, setDocs] = useState<ResidentDocumentRow[] | null>(null);
  const searchParams = useSearchParams();
  // ?doc=<id> åbner et dokument direkte (fx fra forsidens liste over det, der venter).
  const [openId, setOpenIdState] = useState<string | null>(() => {
    const id = searchParams.get('doc');
    return id && /^[0-9a-f-]{36}$/i.test(id) ? id : null;
  });
  const setOpenId = useCallback((id: string | null) => {
    setOpenIdState(id);
    const params = new URLSearchParams(window.location.search);
    if (id) params.set('doc', id);
    else params.delete('doc');
    window.history.replaceState(null, '', `?${params.toString()}`);
  }, []);
  const [creating, setCreating] = useState<DocumentTypeDefinition | null>(null);
  const [showOld, setShowOld] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const json = await api<{ documents: ResidentDocumentRow[] }>(
        `/api/portal/documents?resident_id=${encodeURIComponent(residentId)}`
      );
      setDocs(json.documents);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kunne ikke hente dokumenter');
      setDocs([]);
    }
  }, [residentId]);

  useEffect(() => {
    void load();
  }, [load]);

  const upsert = useCallback((doc: ResidentDocumentRow) => {
    setDocs((prev) => {
      const list = prev ?? [];
      return list.some((d) => d.id === doc.id)
        ? list.map((d) => (d.id === doc.id ? { ...d, ...doc } : d))
        : [doc, ...list];
    });
  }, []);

  const groups = useMemo(() => {
    const list = docs ?? [];
    return {
      active: list.filter((d) => d.status === 'kladde' || d.status === 'til_godkendelse'),
      approved: list.filter((d) => d.status === 'godkendt'),
      old: list.filter((d) => d.status === 'erstattet'),
    };
  }, [docs]);

  if (openId) {
    return (
      <DocumentEditor
        key={openId}
        documentId={openId}
        residentName={residentName}
        onBack={() => {
          setOpenId(null);
          void load();
        }}
        onChange={upsert}
        onOpen={(id) => {
          setOpenId(id);
          void load();
        }}
      />
    );
  }

  if (docs === null) {
    return (
      <p className="flex items-center gap-2 text-sm" style={{ color: 'var(--cp-muted)' }}>
        <Loader2 size={14} className="animate-spin" aria-hidden /> Henter dokumenter…
      </p>
    );
  }

  const types = availableDocumentTypes();
  const firstName = residentName.split(' ')[0];

  return (
    <div className="space-y-5">
      {error && (
        <p className="text-sm" role="alert" style={{ color: 'var(--cp-red)' }}>
          {error}
        </p>
      )}

      {groups.active.length > 0 && (
        <DocList
          title="I gang"
          hint="Tryk for at fortsætte, hvor du slap."
          docs={groups.active}
          onOpen={setOpenId}
        />
      )}

      {types.map((type) => (
        <div key={type.key} className="rounded-xl border p-5" style={cardStyle}>
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div className="max-w-xl">
              <h2 className="text-lg font-semibold" style={{ color: 'var(--cp-text)' }}>
                {type.title}
              </h2>
              <p className="mt-1 text-sm leading-relaxed" style={{ color: 'var(--cp-muted)' }}>
                {type.description} BUDR skriver udkastet ud fra journal, VUM, mål og {firstName}s
                egne check-ins. Du retter til og sender til godkendelse.
              </p>
            </div>
            {creating?.key !== type.key && (
              <button
                type="button"
                onClick={() => setCreating(type)}
                className={primaryButton}
                style={{ backgroundColor: 'var(--cp-green)' }}
              >
                <Plus size={16} aria-hidden /> Ny {type.title.toLowerCase()}
              </button>
            )}
          </div>
          {creating?.key === type.key && (
            <NewDocumentForm
              type={type}
              residentId={residentId}
              defaults={defaultMeta(type, docs)}
              onCancel={() => setCreating(null)}
              onCreated={(doc) => {
                upsert(doc);
                setCreating(null);
                setOpenId(doc.id);
              }}
            />
          )}
        </div>
      ))}

      {groups.approved.length > 0 && (
        <DocList title="Godkendte dokumenter" docs={groups.approved} onOpen={setOpenId} />
      )}

      {groups.old.length > 0 && (
        <div>
          <button
            type="button"
            onClick={() => setShowOld((v) => !v)}
            className="inline-flex min-h-[40px] items-center gap-1 text-sm"
            style={{ color: 'var(--cp-muted)' }}
            aria-expanded={showOld}
          >
            <ChevronDown
              size={15}
              className={`transition-transform ${showOld ? 'rotate-180' : ''}`}
              aria-hidden
            />
            Tidligere versioner ({groups.old.length})
          </button>
          {showOld && <DocList docs={groups.old} onOpen={setOpenId} />}
        </div>
      )}
    </div>
  );
}

function DocList({
  title,
  hint,
  docs,
  onOpen,
}: {
  title?: string;
  hint?: string;
  docs: ResidentDocumentRow[];
  onOpen: (id: string) => void;
}) {
  return (
    <section>
      {title && (
        <div className="mb-2">
          <h3 className="text-sm font-semibold" style={{ color: 'var(--cp-text)' }}>
            {title}
          </h3>
          {hint && (
            <p className="text-xs" style={{ color: 'var(--cp-muted)' }}>
              {hint}
            </p>
          )}
        </div>
      )}
      <ul className="space-y-2">
        {docs.map((d) => (
          <li key={d.id}>
            <button
              type="button"
              onClick={() => onOpen(d.id)}
              className="flex w-full flex-wrap items-center gap-3 rounded-xl border p-4 text-left transition-colors hover:brightness-110"
              style={cardStyle}
            >
              <FileText size={18} style={{ color: 'var(--cp-green)' }} aria-hidden />
              <span className="min-w-0 flex-1 basis-[calc(100%-2rem)] sm:basis-0">
                <span className="block text-sm font-medium" style={{ color: 'var(--cp-text)' }}>
                  {documentLabel(d)}
                  {d.version > 1 ? ` · version ${d.version}` : ''}
                </span>
                <span className="block text-xs" style={{ color: 'var(--cp-muted)' }}>
                  {d.meta?.meeting_date ? `Møde ${formatDanishDate(d.meta.meeting_date)} · ` : ''}
                  {d.status === 'godkendt' && d.approved_at
                    ? `Godkendt ${new Date(d.approved_at).toLocaleDateString('da-DK')}`
                    : `Senest ændret ${new Date(d.updated_at).toLocaleDateString('da-DK')}`}
                </span>
              </span>
              <DueChip dueDate={d.due_date} status={d.status} />
              <StatusChip status={d.status} />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
