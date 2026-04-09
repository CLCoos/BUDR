'use client';

import React, { useEffect, useState } from 'react';
import { Loader2, Save, UploadCloud } from 'lucide-react';
import type { InstitutionerSectionsCopyPayload } from '@/lib/marketing/institutionerSectionsCms';
import { DEFAULT_INSTITUTIONER_SECTIONS_COPY } from '@/lib/marketing/institutionerSectionsCms';

type SaveState = 'idle' | 'saving' | 'saved' | 'error';
type PublishState = 'idle' | 'publishing' | 'published' | 'error';

function toDa(iso: string | null | undefined): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString('da-DK', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function MarketingSectionsCmsCard() {
  const [draft, setDraft] = useState<InstitutionerSectionsCopyPayload>(
    DEFAULT_INSTITUTIONER_SECTIONS_COPY
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [publishState, setPublishState] = useState<PublishState>('idle');
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [publishedAt, setPublishedAt] = useState<string | null>(null);
  const [revisions, setRevisions] = useState<
    Array<{ id: string; created_at: string; action: 'draft_save' | 'publish' | 'rollback' }>
  >([]);

  const reloadCms = async () => {
    const res = await fetch('/api/portal/marketing-copy/institutioner-sections', {
      credentials: 'include',
    });
    const json = (await res.json()) as {
      ok?: boolean;
      draft?: InstitutionerSectionsCopyPayload;
      updated_at?: string | null;
      published_at?: string | null;
      revisions?: Array<{
        id: string;
        created_at: string;
        action: 'draft_save' | 'publish' | 'rollback';
      }>;
      error?: string;
    };
    if (!res.ok || !json.ok || !json.draft) {
      throw new Error(json.error ?? 'Kunne ikke hente');
    }
    setDraft(json.draft);
    setUpdatedAt(json.updated_at ?? null);
    setPublishedAt(json.published_at ?? null);
    setRevisions(json.revisions ?? []);
  };

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch('/api/portal/marketing-copy/institutioner-sections', {
          credentials: 'include',
        });
        const json = (await res.json()) as {
          ok?: boolean;
          draft?: InstitutionerSectionsCopyPayload;
          updated_at?: string | null;
          published_at?: string | null;
          revisions?: Array<{
            id: string;
            created_at: string;
            action: 'draft_save' | 'publish' | 'rollback';
          }>;
          error?: string;
        };
        if (!res.ok || !json.ok || !json.draft) throw new Error(json.error ?? 'Kunne ikke hente');
        if (cancelled) return;
        setDraft(json.draft);
        setUpdatedAt(json.updated_at ?? null);
        setPublishedAt(json.published_at ?? null);
        setRevisions(json.revisions ?? []);
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : 'Kunne ikke hente sektionstekster');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const setImplItem = (idx: number, value: string) =>
    setDraft((prev) => {
      const next = [
        ...prev.implementering_items,
      ] as InstitutionerSectionsCopyPayload['implementering_items'];
      next[idx] = value;
      return { ...prev, implementering_items: next };
    });

  const setPilotItem = (idx: number, value: string) =>
    setDraft((prev) => {
      const next = [...prev.pilot_items] as InstitutionerSectionsCopyPayload['pilot_items'];
      next[idx] = value;
      return { ...prev, pilot_items: next };
    });

  const save = async (publish: boolean) => {
    setError(null);
    if (publish) setPublishState('publishing');
    else setSaveState('saving');
    try {
      const res = await fetch('/api/portal/marketing-copy/institutioner-sections', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ draft, publish }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) throw new Error(json.error ?? 'Kunne ikke gemme');
      await reloadCms();
      if (publish) {
        setPublishState('published');
        setTimeout(() => setPublishState('idle'), 2200);
      } else {
        setSaveState('saved');
        setTimeout(() => setSaveState('idle'), 1800);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kunne ikke gemme');
      if (publish) setPublishState('error');
      else setSaveState('error');
    }
  };

  const restoreRevision = async (revisionId: string) => {
    setError(null);
    setPublishState('publishing');
    try {
      const res = await fetch('/api/portal/marketing-copy/institutioner-sections', {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rollback_revision_id: revisionId }),
      });
      const json = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !json.ok) throw new Error(json.error ?? 'Kunne ikke gendanne version');
      await reloadCms();
      setPublishState('published');
      setTimeout(() => setPublishState('idle'), 2200);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Kunne ikke gendanne version');
      setPublishState('error');
    }
  };

  return (
    <section
      className="space-y-4 rounded-xl p-5"
      style={{ backgroundColor: 'var(--cp-bg2)', border: '1px solid var(--cp-border)' }}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--cp-text)' }}>
            CMS: Institutionsside (implementering + pilot)
          </h2>
          <p className="mt-1 text-xs" style={{ color: 'var(--cp-muted)' }}>
            Redigér de vigtigste brødtekster i institutionsflowet.
          </p>
        </div>
        <div className="text-[11px]" style={{ color: 'var(--cp-muted2)' }}>
          Publiceret: {toDa(publishedAt)}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--cp-muted)' }}>
          <Loader2 size={13} className="animate-spin" />
          Henter sektioner…
        </div>
      ) : (
        <>
          <label className="block text-[11px]" style={{ color: 'var(--cp-muted2)' }}>
            Implementering intro
            <textarea
              rows={3}
              value={draft.implementering_intro}
              onChange={(e) => setDraft((p) => ({ ...p, implementering_intro: e.target.value }))}
              className="mt-1 w-full rounded-md px-2 py-2 text-xs"
              style={{
                backgroundColor: 'var(--cp-bg)',
                border: '1px solid var(--cp-border)',
                color: 'var(--cp-text)',
              }}
            />
          </label>

          <div className="grid gap-2 md:grid-cols-2">
            {draft.implementering_items.map((item, i) => (
              <label
                key={`impl-${i}`}
                className="block text-[11px]"
                style={{ color: 'var(--cp-muted2)' }}
              >
                Implementering punkt {i + 1}
                <textarea
                  rows={3}
                  value={item}
                  onChange={(e) => setImplItem(i, e.target.value)}
                  className="mt-1 w-full rounded-md px-2 py-2 text-xs"
                  style={{
                    backgroundColor: 'var(--cp-bg)',
                    border: '1px solid var(--cp-border)',
                    color: 'var(--cp-text)',
                  }}
                />
              </label>
            ))}
          </div>

          <label className="block text-[11px]" style={{ color: 'var(--cp-muted2)' }}>
            Pilot intro
            <textarea
              rows={3}
              value={draft.pilot_intro}
              onChange={(e) => setDraft((p) => ({ ...p, pilot_intro: e.target.value }))}
              className="mt-1 w-full rounded-md px-2 py-2 text-xs"
              style={{
                backgroundColor: 'var(--cp-bg)',
                border: '1px solid var(--cp-border)',
                color: 'var(--cp-text)',
              }}
            />
          </label>

          <div className="grid gap-2 md:grid-cols-2">
            {draft.pilot_items.map((item, i) => (
              <label
                key={`pilot-${i}`}
                className="block text-[11px]"
                style={{ color: 'var(--cp-muted2)' }}
              >
                Pilot punkt {i + 1}
                <textarea
                  rows={3}
                  value={item}
                  onChange={(e) => setPilotItem(i, e.target.value)}
                  className="mt-1 w-full rounded-md px-2 py-2 text-xs"
                  style={{
                    backgroundColor: 'var(--cp-bg)',
                    border: '1px solid var(--cp-border)',
                    color: 'var(--cp-text)',
                  }}
                />
              </label>
            ))}
          </div>

          <label className="block text-[11px]" style={{ color: 'var(--cp-muted2)' }}>
            Pilot hjælpetekst (under listen)
            <textarea
              rows={2}
              value={draft.pilot_helper}
              onChange={(e) => setDraft((p) => ({ ...p, pilot_helper: e.target.value }))}
              className="mt-1 w-full rounded-md px-2 py-2 text-xs"
              style={{
                backgroundColor: 'var(--cp-bg)',
                border: '1px solid var(--cp-border)',
                color: 'var(--cp-text)',
              }}
            />
          </label>

          <div
            className="space-y-2 rounded-lg p-3"
            style={{ backgroundColor: 'var(--cp-bg3)', border: '1px solid var(--cp-border)' }}
          >
            <p className="text-xs font-semibold" style={{ color: 'var(--cp-text)' }}>
              Seneste versioner
            </p>
            {revisions.length === 0 ? (
              <p className="text-xs" style={{ color: 'var(--cp-muted)' }}>
                Ingen historik endnu.
              </p>
            ) : (
              revisions.slice(0, 6).map((r) => (
                <div key={r.id} className="flex items-center justify-between gap-2">
                  <span className="text-xs" style={{ color: 'var(--cp-muted)' }}>
                    {toDa(r.created_at)} · {r.action}
                  </span>
                  <button
                    type="button"
                    onClick={() => void restoreRevision(r.id)}
                    disabled={publishState === 'publishing' || saveState === 'saving'}
                    className="rounded-md px-2 py-1 text-[11px] font-semibold disabled:opacity-50"
                    style={{
                      color: 'var(--cp-green)',
                      border: '1px solid rgba(45,212,160,0.35)',
                      backgroundColor: 'rgba(45,212,160,0.08)',
                    }}
                  >
                    Gendan
                  </button>
                </div>
              ))
            )}
          </div>

          {error && (
            <p
              className="rounded-lg px-3 py-2 text-xs"
              style={{ backgroundColor: 'var(--cp-red-dim)', color: 'var(--cp-red)' }}
            >
              {error}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setDraft(DEFAULT_INSTITUTIONER_SECTIONS_COPY);
                setError(null);
                setSaveState('idle');
                setPublishState('idle');
              }}
              disabled={saveState === 'saving' || publishState === 'publishing'}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold disabled:opacity-50"
              style={{
                color: 'var(--cp-muted)',
                border: '1px solid var(--cp-border)',
                backgroundColor: 'var(--cp-bg3)',
              }}
            >
              Reset til standard
            </button>
            <button
              type="button"
              onClick={() => void save(false)}
              disabled={saveState === 'saving' || publishState === 'publishing'}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
              style={{ backgroundColor: 'var(--cp-blue)' }}
            >
              {saveState === 'saving' ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <Save size={13} />
              )}
              {saveState === 'saved' ? 'Gemt' : 'Gem udkast'}
            </button>
            <button
              type="button"
              onClick={() => void save(true)}
              disabled={publishState === 'publishing' || saveState === 'saving'}
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-white disabled:opacity-50"
              style={{ backgroundColor: 'var(--cp-green)' }}
            >
              {publishState === 'publishing' ? (
                <Loader2 size={13} className="animate-spin" />
              ) : (
                <UploadCloud size={13} />
              )}
              {publishState === 'published' ? 'Publiceret' : 'Publicér nu'}
            </button>
            <a
              href="/institutioner"
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold"
              style={{
                color: 'var(--cp-blue)',
                border: '1px solid var(--cp-border)',
                backgroundColor: 'var(--cp-bg3)',
              }}
            >
              Preview side ↗
            </a>
            <span className="text-[11px]" style={{ color: 'var(--cp-muted2)' }}>
              Sidst gemt: {toDa(updatedAt)}
            </span>
          </div>
        </>
      )}
    </section>
  );
}
