'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronRight, FileCheck2 } from 'lucide-react';
import { DueChip, StatusChip, api, cardStyle } from '@/components/documents/shared';
import { getDocumentType } from '@/lib/documents/registry';
import type { ResidentDocumentRow } from '@/lib/documents/types';

type Inbox = {
  documents: ResidentDocumentRow[];
  residentNames: Record<string, string>;
  canApprove: boolean;
  me: string;
};

/**
 * Forsidens liste over dokumenter, der venter på den indloggede: egne kladder med frist,
 * og (for ledere) alt der venter på godkendelse. Vises kun, når der er noget at gøre.
 */
export default function DocumentInboxWidget() {
  const [inbox, setInbox] = useState<Inbox | null>(null);

  useEffect(() => {
    let alive = true;
    api<Inbox>('/api/portal/documents?scope=inbox')
      .then((json) => alive && setInbox(json))
      .catch(() => alive && setInbox(null));
    return () => {
      alive = false;
    };
  }, []);

  if (!inbox || inbox.documents.length === 0) return null;

  const toApprove = inbox.documents.filter(
    (d) => d.status === 'til_godkendelse' && inbox.canApprove
  );
  const mine = inbox.documents.filter((d) => !toApprove.includes(d));

  const action = (d: ResidentDocumentRow) => {
    if (d.status === 'til_godkendelse')
      return inbox.canApprove ? 'Læs og godkend' : 'Venter på leder';
    if (d.review_note) return 'Sendt retur: ret og send igen';
    return 'Fortsæt';
  };

  const row = (d: ResidentDocumentRow) => (
    <li key={d.id}>
      <Link
        href={`/resident-360-view/${d.resident_id}?tab=dokumenter&doc=${d.id}`}
        className="flex flex-wrap items-center gap-3 rounded-lg px-3 py-3 transition-colors hover:bg-[rgba(255,255,255,0.04)]"
      >
        <span className="min-w-0 flex-1 basis-full sm:basis-0">
          <span className="block text-sm font-medium" style={{ color: 'var(--cp-text)' }}>
            {getDocumentType(d.doc_type)?.title ?? 'Dokument'} ·{' '}
            {inbox.residentNames[d.resident_id] ?? 'Borger'}
          </span>
          <span className="block text-xs" style={{ color: 'var(--cp-muted)' }}>
            {action(d)}
          </span>
        </span>
        <DueChip dueDate={d.due_date} status={d.status} />
        <StatusChip status={d.status} />
        <ChevronRight size={16} style={{ color: 'var(--cp-muted2)' }} aria-hidden />
      </Link>
    </li>
  );

  return (
    <section
      className="mb-5 rounded-xl border p-4"
      style={cardStyle}
      aria-labelledby="doc-inbox-title"
    >
      <div className="mb-2 flex items-center gap-2">
        <FileCheck2 size={18} style={{ color: 'var(--cp-green)' }} aria-hidden />
        <h2
          id="doc-inbox-title"
          className="text-sm font-semibold"
          style={{ color: 'var(--cp-text)' }}
        >
          Dokumenter der venter på dig
        </h2>
      </div>
      {toApprove.length > 0 && (
        <>
          <p className="px-3 pt-1 text-xs font-medium" style={{ color: 'var(--cp-muted)' }}>
            Til godkendelse ({toApprove.length})
          </p>
          <ul>{toApprove.map(row)}</ul>
        </>
      )}
      {mine.length > 0 && (
        <>
          <p className="px-3 pt-2 text-xs font-medium" style={{ color: 'var(--cp-muted)' }}>
            Dine dokumenter ({mine.length})
          </p>
          <ul>{mine.map(row)}</ul>
        </>
      )}
    </section>
  );
}
