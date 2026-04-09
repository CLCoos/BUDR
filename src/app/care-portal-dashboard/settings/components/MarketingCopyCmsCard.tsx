'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, Save, UploadCloud } from 'lucide-react';
import type { InstitutionerHeroCopyPayload } from '@/lib/marketing/institutionerCopyCms';
import { DEFAULT_INSTITUTIONER_HERO_COPY } from '@/lib/marketing/institutionerCopyCms';

type LoadState = 'idle' | 'loading' | 'ready' | 'error';
type SaveState = 'idle' | 'saving' | 'saved' | 'error';
type PublishState = 'idle' | 'publishing' | 'published' | 'error';

type ApiGetResponse = {
  ok?: boolean;
  draft?: InstitutionerHeroCopyPayload;
  published?: InstitutionerHeroCopyPayload | null;
  updated_at?: string | null;
  published_at?: string | null;
  revisions?: Array<{
    id: string;
    created_at: string;
    action: 'draft_save' | 'publish' | 'rollback';
  }>;
  error?: string;
};

type VariantId = 'A' | 'B';
type VariantField = 'title_html' | 'cta' | 'pilot_link';

function formatDaDateTime(iso: string | null | undefined): string {
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

function parseTitleForEditor(titleHtml: string): { lead: string; tail: string } {
  const m = titleHtml.match(/<em>(.*?)<\/em>\s*—\s*(.*)/i);
  if (m) {
    return { lead: m[1] ?? '', tail: m[2] ?? '' };
  }
  return { lead: titleHtml, tail: '' };
}

function composeTitleHtml(lead: string, tail: string): string {
  const leadClean = lead.trim() || 'Kom hurtigt i gang';
  const tailClean = tail.trim();
  if (!tailClean) return `<em>${leadClean}</em>`;
  return `<em>${leadClean}</em> — ${tailClean}`;
}

export default function MarketingCopyCmsCard() {
  const [loadState, setLoadState] = useState<LoadState>('idle');
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [publishState, setPublishState] = useState<PublishState>('idle');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [draft, setDraft] = useState<InstitutionerHeroCopyPayload>(DEFAULT_INSTITUTIONER_HERO_COPY);
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [publishedAt, setPublishedAt] = useState<string | null>(null);
  const [revisions, setRevisions] = useState<NonNullable<ApiGetResponse['revisions']>>([]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoadState('loading');
      try {
        const res = await fetch('/api/portal/marketing-copy/institutioner', {
          credentials: 'include',
        });
        const data = (await res.json()) as ApiGetResponse;
        if (!res.ok || !data.ok || !data.draft) {
          throw new Error(data.error ?? 'Kunne ikke hente marketing-copy');
        }
        if (cancelled) return;
        setDraft(data.draft);
        setUpdatedAt(data.updated_at ?? null);
        setPublishedAt(data.published_at ?? null);
        setRevisions(data.revisions ?? []);
        setLoadState('ready');
      } catch (e) {
        if (cancelled) return;
        setErrorMsg(e instanceof Error ? e.message : 'Kunne ikke hente CMS-data');
        setLoadState('error');
      }
    };
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const setVariantField = (variant: VariantId, field: VariantField, value: string) => {
    setDraft((prev) => ({
      ...prev,
      [variant]: { ...prev[variant], [field]: value },
    }));
  };

  const saveDraft = async () => {
    setSaveState('saving');
    setErrorMsg(null);
    try {
      const res = await fetch('/api/portal/marketing-copy/institutioner', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ draft, publish: false }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error ?? 'Kunne ikke gemme udkast');
      await reloadCms();
      setSaveState('saved');
      setTimeout(() => setSaveState('idle'), 2000);
    } catch (e) {
      setSaveState('error');
      setErrorMsg(e instanceof Error ? e.message : 'Kunne ikke gemme udkast');
    }
  };

  const publishDraft = async () => {
    setPublishState('publishing');
    setErrorMsg(null);
    try {
      const res = await fetch('/api/portal/marketing-copy/institutioner', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ draft, publish: true }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error ?? 'Kunne ikke publicere');
      await reloadCms();
      setPublishState('published');
      setTimeout(() => setPublishState('idle'), 2500);
    } catch (e) {
      setPublishState('error');
      setErrorMsg(e instanceof Error ? e.message : 'Kunne ikke publicere');
    }
  };

  const previewTitle = useMemo(() => {
    const t = draft[draft.variant].title_html;
    return t.replace(/<[^>]*>/g, '');
  }, [draft]);

  const loading = loadState === 'loading' || loadState === 'idle';

  const reloadCms = async () => {
    const res = await fetch('/api/portal/marketing-copy/institutioner', {
      credentials: 'include',
    });
    const data = (await res.json()) as ApiGetResponse;
    if (!res.ok || !data.ok || !data.draft) {
      throw new Error(data.error ?? 'Kunne ikke genindlæse CMS-data');
    }
    setDraft(data.draft);
    setUpdatedAt(data.updated_at ?? null);
    setPublishedAt(data.published_at ?? null);
    setRevisions(data.revisions ?? []);
  };

  const restoreRevision = async (revisionId: string) => {
    setPublishState('publishing');
    setErrorMsg(null);
    try {
      const res = await fetch('/api/portal/marketing-copy/institutioner', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ rollback_revision_id: revisionId }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) throw new Error(data.error ?? 'Kunne ikke gendanne version');
      await reloadCms();
      setPublishState('published');
      setTimeout(() => setPublishState('idle'), 2500);
    } catch (e) {
      setPublishState('error');
      setErrorMsg(e instanceof Error ? e.message : 'Kunne ikke gendanne version');
    }
  };

  return (
    <section
      className="space-y-4 rounded-xl p-5"
      style={{
        backgroundColor: 'var(--cp-bg2)',
        border: '1px solid var(--cp-border)',
      }}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-semibold" style={{ color: 'var(--cp-text)' }}>
            CMS: Institutionsside (hero copy)
          </h2>
          <p className="mt-1 text-xs" style={{ color: 'var(--cp-muted)' }}>
            Redigér A/B-copy og publicér uden kodeændringer.
          </p>
        </div>
        <div className="text-[11px]" style={{ color: 'var(--cp-muted2)' }}>
          Publiceret: {formatDaDateTime(publishedAt)}
        </div>
      </div>

      {loading && (
        <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--cp-muted)' }}>
          <Loader2 size={13} className="animate-spin" />
          Henter CMS-data…
        </div>
      )}

      {!loading && (
        <>
          <div className="grid gap-4 md:grid-cols-2">
            {(['A', 'B'] as const).map((v) => {
              const variant = draft[v];
              const parsed = parseTitleForEditor(variant.title_html);
              return (
                <div
                  key={v}
                  className="space-y-2 rounded-lg p-3"
                  style={{
                    backgroundColor: draft.variant === v ? 'var(--cp-green-dim)' : 'var(--cp-bg3)',
                    border: `1px solid ${draft.variant === v ? 'rgba(45,212,160,0.35)' : 'var(--cp-border)'}`,
                  }}
                >
                  <div className="flex items-center justify-between">
                    <button
                      type="button"
                      className="rounded-md px-2 py-1 text-xs font-semibold"
                      style={{
                        backgroundColor:
                          draft.variant === v ? 'rgba(45,212,160,0.16)' : 'transparent',
                        color: draft.variant === v ? 'var(--cp-green)' : 'var(--cp-muted)',
                      }}
                      onClick={() => setDraft((prev) => ({ ...prev, variant: v }))}
                    >
                      Variant {v} {draft.variant === v ? '(aktiv)' : ''}
                    </button>
                  </div>

                  <label className="block text-[11px]" style={{ color: 'var(--cp-muted2)' }}>
                    Titel (fremhævet del)
                    <input
                      value={parsed.lead}
                      onChange={(e) =>
                        setVariantField(
                          v,
                          'title_html',
                          composeTitleHtml(e.target.value, parsed.tail)
                        )
                      }
                      className="mt-1 w-full rounded-md px-2 py-2 text-xs"
                      style={{
                        backgroundColor: 'var(--cp-bg)',
                        border: '1px solid var(--cp-border)',
                        color: 'var(--cp-text)',
                      }}
                    />
                  </label>

                  <label className="block text-[11px]" style={{ color: 'var(--cp-muted2)' }}>
                    Titel (fortsættelse)
                    <input
                      value={parsed.tail}
                      onChange={(e) =>
                        setVariantField(
                          v,
                          'title_html',
                          composeTitleHtml(parsed.lead, e.target.value)
                        )
                      }
                      className="mt-1 w-full rounded-md px-2 py-2 text-xs"
                      style={{
                        backgroundColor: 'var(--cp-bg)',
                        border: '1px solid var(--cp-border)',
                        color: 'var(--cp-text)',
                      }}
                    />
                  </label>

                  <label className="block text-[11px]" style={{ color: 'var(--cp-muted2)' }}>
                    Primær CTA
                    <input
                      value={variant.cta}
                      onChange={(e) => setVariantField(v, 'cta', e.target.value)}
                      className="mt-1 w-full rounded-md px-2 py-2 text-xs"
                      style={{
                        backgroundColor: 'var(--cp-bg)',
                        border: '1px solid var(--cp-border)',
                        color: 'var(--cp-text)',
                      }}
                    />
                  </label>

                  <label className="block text-[11px]" style={{ color: 'var(--cp-muted2)' }}>
                    Pilot-link
                    <input
                      value={variant.pilot_link}
                      onChange={(e) => setVariantField(v, 'pilot_link', e.target.value)}
                      className="mt-1 w-full rounded-md px-2 py-2 text-xs"
                      style={{
                        backgroundColor: 'var(--cp-bg)',
                        border: '1px solid var(--cp-border)',
                        color: 'var(--cp-text)',
                      }}
                    />
                  </label>
                </div>
              );
            })}
          </div>

          <div
            className="rounded-lg px-3 py-2 text-xs"
            style={{ backgroundColor: 'var(--cp-bg3)', color: 'var(--cp-muted)' }}
          >
            Preview aktiv variant:{' '}
            <strong style={{ color: 'var(--cp-text)' }}>{previewTitle}</strong>
          </div>

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
                    {formatDaDateTime(r.created_at)} · {r.action}
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

          {errorMsg && (
            <p
              className="rounded-lg px-3 py-2 text-xs"
              style={{ backgroundColor: 'var(--cp-red-dim)', color: 'var(--cp-red)' }}
            >
              {errorMsg}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setDraft(DEFAULT_INSTITUTIONER_HERO_COPY);
                setErrorMsg(null);
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
              onClick={() => void saveDraft()}
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
              onClick={() => void publishDraft()}
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
              Sidst gemt: {formatDaDateTime(updatedAt)}
            </span>
          </div>
        </>
      )}
    </section>
  );
}
