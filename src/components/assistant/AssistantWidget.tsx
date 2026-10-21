'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { toast } from 'sonner';
import {
  AlertTriangle,
  CheckCircle2,
  ChevronRight,
  ClipboardCopy,
  FileClock,
  Loader2,
  MessageSquareText,
  Send,
  Sparkles,
  Stethoscope,
} from 'lucide-react';
import ActionReview from './ActionReview';
import {
  ApiError,
  api,
  cardStyle,
  ghostButton,
  inputStyle,
  primaryButton,
} from '@/components/documents/shared';
import { describeAction, type AssistantAction } from '@/lib/assistant/actions';
import type { AppliedResult } from '@/lib/assistant/apply';
import type { SuggestionRow } from '@/lib/assistant/server';

type ResidentOption = { id: string; name: string };
type Feed = {
  me: string;
  canWrite: boolean;
  suggestions: SuggestionRow[];
  residents: ResidentOption[];
};
type IntakeResponse =
  | { needsResident: true; candidates: ResidentOption[] }
  | { resident: ResidentOption; summary: string; actions: AssistantAction[] };

/** Et forslag eller et svar, der er ved at blive gennemgået. */
type Review = {
  resident: ResidentOption;
  summary: string;
  actions: AssistantAction[];
  suggestionId?: string;
  text?: string;
};

const KIND_ICON: Record<SuggestionRow['kind'], typeof Sparkles> = {
  aftale_opfoelgning: Stethoscope,
  dokument_frist: FileClock,
  trafiklys: AlertTriangle,
  svar: MessageSquareText,
  fagsystem: ClipboardCopy,
};

/** Lille mærkat pr. forslagstype, så det vigtigste ses med det samme. */
const KIND_TAG: Record<SuggestionRow['kind'], { label: string; bg: string; fg: string }> = {
  aftale_opfoelgning: { label: 'Opfølgning', bg: 'var(--cp-blue-dim)', fg: 'var(--cp-blue)' },
  dokument_frist: { label: 'Frist', bg: 'var(--cp-amber-dim)', fg: 'var(--cp-amber)' },
  trafiklys: { label: 'Trafiklys', bg: 'var(--cp-red-dim)', fg: 'var(--cp-red)' },
  svar: { label: 'Dit svar', bg: 'var(--cp-green-dim)', fg: 'var(--cp-green)' },
  fagsystem: { label: 'Fagsystem', bg: 'var(--cp-bg3)', fg: 'var(--cp-muted)' },
};

const textareaClass = 'w-full rounded-xl border px-3 py-3 text-base leading-relaxed';

function savedMessage(results: AppliedResult[]): string {
  const ok = results.filter((r) => r.ok);
  const parts = [
    ok.filter((r) => r.type === 'journal_note').length > 0 ? 'journalkladde' : null,
    ok.filter((r) => r.type === 'task' || r.type === 'medication_request').length > 0
      ? 'opgave'
      : null,
    ok.filter((r) => r.type === 'calendar').length > 0 ? 'kalenderaftale' : null,
    ok.filter((r) => r.type === 'handover').length > 0 ? 'overlevering' : null,
  ].filter(Boolean);
  return `Gemt: ${parts.join(', ')}`;
}

/**
 * Forsidens assistent. Viser assistentens egne forslag ("Lars havde lægetid i dag …") og lader
 * medarbejderen fortælle med almindelige ord, hvad der er sket. Assistenten foreslår så, hvad
 * der skal skrives hvor. Intet gemmes uden et tryk på "Gem".
 */
export default function AssistantWidget({
  hideIntake = false,
}: {
  /** Skjul fritekstfeltet, når «Fortæl» findes i menuen. Svar på et forslag virker stadig. */
  hideIntake?: boolean;
} = {}) {
  const [feed, setFeed] = useState<Feed | null>(null);
  const [text, setText] = useState('');
  const [residentId, setResidentId] = useState('');
  const [thinking, setThinking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [review, setReview] = useState<Review | null>(null);
  const [needsResident, setNeedsResident] = useState<ResidentOption[] | null>(null);
  const [replyTo, setReplyTo] = useState<SuggestionRow | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ message: string; residentId: string } | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const load = useCallback(async () => {
    try {
      setFeed(await api<Feed>('/api/portal/assistant'));
    } catch {
      setFeed(null);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const removeSuggestion = (id: string) =>
    setFeed((f) => (f ? { ...f, suggestions: f.suggestions.filter((s) => s.id !== id) } : f));

  const ask = async (chosenResident?: string) => {
    const t = text.trim();
    if (t.length < 3) return;
    setThinking(true);
    setError(null);
    setDone(null);
    try {
      const rid = chosenResident || residentId || replyTo?.resident_id || undefined;
      const res = await api<IntakeResponse>('/api/portal/assistant/intake', {
        method: 'POST',
        body: JSON.stringify({ text: t, resident_id: rid, context: replyTo?.title }),
      });
      if ('needsResident' in res) {
        setNeedsResident(res.candidates.length > 1 ? res.candidates : (feed?.residents ?? []));
        return;
      }
      setNeedsResident(null);
      setReview({
        resident: res.resident,
        summary: res.summary,
        actions: res.actions,
        suggestionId: replyTo?.id,
        text: t,
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Assistenten svarer ikke lige nu');
    } finally {
      setThinking(false);
    }
  };

  const save = async (r: Review, actions: AssistantAction[]) => {
    setSaving(true);
    setError(null);
    try {
      const res = await api<{ results: AppliedResult[] }>('/api/portal/assistant/apply', {
        method: 'POST',
        body: JSON.stringify({
          resident_id: r.resident.id,
          actions,
          suggestion_id: r.suggestionId,
          text: r.text,
          summary: r.summary,
        }),
      });
      const failed = res.results.filter((x) => !x.ok).length;
      const message = savedMessage(res.results);
      toast.success(`${message} for ${r.resident.name}`);
      if (failed > 0) toast.error(`${failed} ting kunne ikke gemmes. Opret dem manuelt.`);
      if (r.suggestionId) removeSuggestion(r.suggestionId);
      window.dispatchEvent(
        new CustomEvent('portal-journal-updated', { detail: { residentId: r.resident.id } })
      );
      setDone({ message: `${message} for ${r.resident.name}.`, residentId: r.resident.id });
      setReview(null);
      setReplyTo(null);
      setText('');
      setResidentId('');
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Kunne ikke gemme. Prøv igen.');
    } finally {
      setSaving(false);
    }
  };

  const dismiss = async (s: SuggestionRow) => {
    removeSuggestion(s.id);
    try {
      await api(`/api/portal/assistant/${s.id}/dismiss`, { method: 'POST' });
    } catch {
      toast.error('Kunne ikke skjule forslaget');
      void load();
    }
  };

  const residentName = (id: string | null) =>
    feed?.residents.find((r) => r.id === id)?.name ?? 'Borger';

  if (!feed || (!feed.canWrite && feed.suggestions.length === 0)) return null;
  if (hideIntake && feed.suggestions.length === 0 && !review && !done) return null;
  const showIntake = feed.canWrite && (!hideIntake || replyTo !== null);

  const muted = { color: 'var(--cp-muted)' };

  return (
    <section
      className="mb-6 overflow-hidden rounded-2xl border"
      style={cardStyle}
      aria-labelledby="assistant-title"
    >
      <div
        className="flex items-center gap-3 border-b px-4 py-4 sm:px-5"
        style={{ borderColor: 'var(--cp-border)' }}
      >
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[10px]"
          style={{ backgroundColor: 'var(--cp-green-dim)' }}
        >
          <Sparkles size={18} style={{ color: 'var(--cp-green)' }} aria-hidden />
        </span>
        <div className="min-w-0">
          <h2
            id="assistant-title"
            className="text-base font-semibold"
            style={{ color: 'var(--cp-text)' }}
          >
            Assistenten har forberedt
          </h2>
          <p className="text-xs" style={muted}>
            Intet gemmes, før du siger ja
          </p>
        </div>
        {feed.suggestions.length > 0 && (
          <span className="cp-num ml-auto text-xs" style={muted}>
            {feed.suggestions.length} {feed.suggestions.length === 1 ? 'forslag' : 'forslag'}
          </span>
        )}
      </div>

      <div className="p-4 sm:p-5">
        {feed.suggestions.length > 0 && !review && (
          <ul className="-mx-4 -mt-4 mb-4 sm:-mx-5 sm:-mt-5">
            {feed.suggestions.map((s) => {
              const Icon = KIND_ICON[s.kind];
              const tag = KIND_TAG[s.kind];
              return (
                <li
                  key={s.id}
                  className="border-b px-4 py-4 sm:px-5"
                  style={{ borderColor: 'var(--cp-border)' }}
                >
                  <div className="flex items-start gap-3">
                    <Icon
                      size={18}
                      className="mt-0.5 shrink-0 sm:hidden"
                      style={{ color: 'var(--cp-green)' }}
                      aria-hidden
                    />
                    <div className="min-w-0 flex-1">
                      <span
                        className="mb-2 inline-block rounded-md px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.06em]"
                        style={{ backgroundColor: tag.bg, color: tag.fg }}
                      >
                        {tag.label}
                      </span>
                      <p
                        className="text-[15px] font-medium leading-snug"
                        style={{ color: 'var(--cp-text)' }}
                      >
                        {s.title}
                      </p>
                      {s.body && (
                        <p className="mt-1 text-sm" style={muted}>
                          {s.body}
                        </p>
                      )}
                      {s.actions.length > 0 && (
                        <ul className="mt-2 space-y-0.5 text-sm" style={muted}>
                          {s.actions.map((a) => (
                            <li key={a.id}>• {describeAction(a)}</li>
                          ))}
                        </ul>
                      )}
                      <div className="mt-3 flex flex-wrap gap-2">
                        {s.actions.length > 0 && feed.canWrite && s.resident_id && (
                          <button
                            type="button"
                            className={primaryButton}
                            style={{ backgroundColor: 'var(--cp-green)' }}
                            onClick={() =>
                              setReview({
                                resident: { id: s.resident_id!, name: residentName(s.resident_id) },
                                summary: s.title,
                                actions: s.actions,
                                suggestionId: s.id,
                              })
                            }
                          >
                            Ja, gør det
                          </button>
                        )}
                        {s.link && (
                          <Link
                            href={s.link}
                            className={primaryButton}
                            style={{ backgroundColor: 'var(--cp-green)' }}
                          >
                            {s.kind === 'dokument_frist'
                              ? 'Åbn dokumentet'
                              : s.kind === 'fagsystem'
                                ? 'Åbn listen'
                                : 'Se borgeren'}
                            <ChevronRight size={15} aria-hidden />
                          </Link>
                        )}
                        {s.prompt && feed.canWrite && (
                          <button
                            type="button"
                            className={ghostButton}
                            style={{ borderColor: 'var(--cp-border)', color: 'var(--cp-text)' }}
                            onClick={() => {
                              setReplyTo(s);
                              setResidentId(s.resident_id ?? '');
                              setDone(null);
                              setTimeout(() => inputRef.current?.focus(), 0);
                            }}
                          >
                            <MessageSquareText size={15} aria-hidden /> Svar
                          </button>
                        )}
                        <button
                          type="button"
                          className={ghostButton}
                          style={{ borderColor: 'transparent', color: 'var(--cp-muted)' }}
                          onClick={() => void dismiss(s)}
                        >
                          {s.kind === 'dokument_frist' || s.kind === 'fagsystem'
                            ? 'Skjul'
                            : 'Nej tak'}
                        </button>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {review ? (
          <div>
            <p className="mb-1 text-sm font-semibold" style={{ color: 'var(--cp-text)' }}>
              {review.resident.name}
            </p>
            {review.summary && (
              <p className="mb-3 text-sm" style={muted}>
                {review.summary}
              </p>
            )}
            {review.actions.length === 0 ? (
              <div className="space-y-3">
                <p className="text-sm" style={{ color: 'var(--cp-text)' }}>
                  Jeg fandt ikke noget, der skal gemmes. Skriv gerne lidt mere.
                </p>
                <button
                  type="button"
                  className={ghostButton}
                  style={{ borderColor: 'var(--cp-border)', color: 'var(--cp-text)' }}
                  onClick={() => setReview(null)}
                >
                  Tilbage
                </button>
              </div>
            ) : (
              <ActionReview
                key={`${review.suggestionId ?? ''}${review.actions.map((a) => a.id).join()}`}
                actions={review.actions}
                busy={saving}
                onConfirm={(chosen) => void save(review, chosen)}
                onCancel={() => setReview(null)}
              />
            )}
          </div>
        ) : showIntake ? (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              void ask();
            }}
          >
            {replyTo ? (
              <div className="mb-2 flex flex-wrap items-center gap-2 text-sm" style={muted}>
                <span>
                  Svar til: <strong style={{ color: 'var(--cp-text)' }}>{replyTo.title}</strong>
                </span>
                <button
                  type="button"
                  className="underline"
                  onClick={() => {
                    setReplyTo(null);
                    setResidentId('');
                  }}
                >
                  Fortryd
                </button>
              </div>
            ) : (
              <label
                htmlFor="assistant-input"
                className="mb-2 block text-sm font-medium"
                style={{ color: 'var(--cp-text)' }}
              >
                Fortæl assistenten, hvad der er sket
              </label>
            )}
            <textarea
              id="assistant-input"
              ref={inputRef}
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={3}
              maxLength={3000}
              placeholder={
                replyTo?.prompt ??
                'Fx: Lars fik ny creme udskrevet hos lægen, da såret stadig ikke er helet. EKG så fint ud. Ny tid om 14 dage.'
              }
              className={textareaClass}
              style={inputStyle}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) void ask();
              }}
            />

            {needsResident && (
              <div className="mt-3">
                <p className="mb-2 text-sm font-medium" style={{ color: 'var(--cp-text)' }}>
                  Hvilken borger handler det om?
                </p>
                <div className="flex flex-wrap gap-2">
                  {needsResident.slice(0, 12).map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      className={ghostButton}
                      style={{ borderColor: 'var(--cp-border)', color: 'var(--cp-text)' }}
                      onClick={() => {
                        setResidentId(r.id);
                        setNeedsResident(null);
                        void ask(r.id);
                      }}
                    >
                      {r.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <button
                type="submit"
                disabled={thinking || text.trim().length < 3}
                className={primaryButton}
                style={{ backgroundColor: 'var(--cp-green)' }}
              >
                {thinking ? (
                  <Loader2 size={15} className="animate-spin" aria-hidden />
                ) : (
                  <Send size={15} aria-hidden />
                )}
                {thinking ? 'Assistenten tænker…' : 'Send til assistenten'}
              </button>
              {!replyTo && (
                <select
                  value={residentId}
                  onChange={(e) => setResidentId(e.target.value)}
                  className="min-h-[40px] rounded-lg border px-3 text-sm"
                  style={inputStyle}
                  aria-label="Borger"
                >
                  <option value="">Borger: find selv ud fra teksten</option>
                  {feed.residents.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              )}
            </div>
            <p className="mt-2 text-xs" style={muted}>
              Du ser altid forslaget, før noget bliver gemt. Navne sendes ikke til AI.
            </p>
          </form>
        ) : null}

        {error && (
          <p className="mt-3 text-sm" role="alert" style={{ color: 'var(--cp-red)' }}>
            {error}
          </p>
        )}
        {done && !review && (
          <p
            className="mt-3 flex flex-wrap items-center gap-2 text-sm"
            role="status"
            style={{ color: 'var(--cp-green)' }}
          >
            <CheckCircle2 size={16} aria-hidden /> {done.message}
            <Link href={`/resident-360-view/${done.residentId}`} className="underline">
              Se borgeren
            </Link>
          </p>
        )}
      </div>
    </section>
  );
}
