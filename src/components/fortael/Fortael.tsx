'use client';

import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Check, Loader2, Mic, X } from 'lucide-react';
import ActionReview from '@/components/assistant/ActionReview';
import { ApiError, api } from '@/components/documents/shared';
import type { AssistantAction } from '@/lib/assistant/actions';
import type { AppliedResult } from '@/lib/assistant/apply';

/**
 * «Fortæl»: én knap overalt i portalen. Medarbejderen fortæller med egne ord, hvad der skete;
 * assistenten foreslår notat, opgave, aftale og en linje til overleveringen. Intet gemmes,
 * før medarbejderen har godkendt. Bygger på /api/portal/assistant/intake og /apply.
 */

type ResidentOption = { id: string; name: string };
type IntakeResponse =
  | { needsResident: true; candidates: ResidentOption[] }
  | { resident: ResidentOption; summary: string; actions: AssistantAction[] };

type Ctx = { openFortael: () => void; enabled: boolean };
const FortaelContext = createContext<Ctx>({ openFortael: () => {}, enabled: false });
export const useFortael = () => useContext(FortaelContext);

const RESIDENT_PATH = /^\/resident-360-view\/([0-9a-f-]{36})(?:\/|$)/i;

type Phase =
  | { kind: 'skriv' }
  | { kind: 'forslag'; resident: ResidentOption; summary: string; actions: AssistantAction[] }
  | { kind: 'gemt'; resident: ResidentOption; results: AppliedResult[] };

const SAVED_LABELS: Record<AssistantAction['type'], string> = {
  journal_note: 'Journalkladde',
  task: 'Opgave',
  calendar: 'Aftale i kalenderen',
  medication_request: 'Besked til medicinansvarlig',
  handover: 'Linje i vagtoverleveringen',
};

function FortaelSheet({ onClose }: { onClose: () => void }) {
  const pathname = usePathname();
  const fromPage = RESIDENT_PATH.exec(pathname ?? '')?.[1] ?? '';
  const [text, setText] = useState('');
  const [residentId, setResidentId] = useState(fromPage);
  const [residents, setResidents] = useState<ResidentOption[]>([]);
  const [candidates, setCandidates] = useState<ResidentOption[] | null>(null);
  const [phase, setPhase] = useState<Phase>({ kind: 'skriv' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    inputRef.current?.focus();
    let cancelled = false;
    void api<{ residents: ResidentOption[] }>('/api/portal/assistant')
      .then((feed) => {
        if (!cancelled) setResidents(feed.residents);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === 'Escape' && !busy && onClose();
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, [onClose, busy]);

  const propose = async (chosenResident?: string) => {
    const t = text.trim();
    if (t.length < 3) return;
    setBusy(true);
    setError(null);
    try {
      const res = await api<IntakeResponse>('/api/portal/assistant/intake', {
        method: 'POST',
        body: JSON.stringify({ text: t, resident_id: chosenResident || residentId || undefined }),
      });
      if ('needsResident' in res) {
        setCandidates(res.candidates.length > 1 ? res.candidates : residents);
        return;
      }
      setCandidates(null);
      setResidentId(res.resident.id);
      setPhase({ kind: 'forslag', ...res });
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Assistenten svarer ikke lige nu');
    } finally {
      setBusy(false);
    }
  };

  const save = async (resident: ResidentOption, summary: string, actions: AssistantAction[]) => {
    setBusy(true);
    setError(null);
    try {
      const res = await api<{ results: AppliedResult[] }>('/api/portal/assistant/apply', {
        method: 'POST',
        body: JSON.stringify({ resident_id: resident.id, actions, text: text.trim(), summary }),
      });
      window.dispatchEvent(
        new CustomEvent('portal-journal-updated', { detail: { residentId: resident.id } })
      );
      setPhase({ kind: 'gemt', resident, results: res.results });
    } catch (e) {
      setError(e instanceof ApiError ? e.message : 'Kunne ikke gemme. Prøv igen.');
    } finally {
      setBusy(false);
    }
  };

  const residentName = residents.find((r) => r.id === residentId)?.name;
  const muted = { color: 'var(--cp-muted)' };

  const title =
    phase.kind === 'skriv'
      ? 'Fortæl'
      : phase.kind === 'forslag'
        ? `Du fortalte om ${phase.resident.name}`
        : 'Gemt';
  const subtitle =
    phase.kind === 'skriv'
      ? 'Skriv eller sig med dine egne ord, hvad der skete. Du behøver ikke vælge skema.'
      : phase.kind === 'forslag'
        ? 'Assistenten foreslår. Ret det, der skal rettes. Intet gemmes, før du godkender.'
        : `Det er gemt hos ${phase.resident.name.replace(/\.$/, '')}.`;

  return (
    <div
      className="fixed inset-0 z-[10080] flex items-end justify-center bg-black/45 sm:items-center sm:p-6"
      role="presentation"
      onClick={() => !busy && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="fortael-title"
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[92vh] w-full max-w-[600px] flex-col overflow-hidden rounded-t-3xl border sm:rounded-3xl"
        style={{ backgroundColor: 'var(--cp-bg2)', borderColor: 'var(--cp-border)' }}
      >
        <div
          className="flex items-center gap-3 border-b px-5 py-4"
          style={{ borderColor: 'var(--cp-border)' }}
        >
          <div className="min-w-0 flex-1">
            <h2
              id="fortael-title"
              className="text-lg font-semibold"
              style={{ color: 'var(--cp-text)' }}
            >
              {title}
            </h2>
            <p className="text-xs" style={muted}>
              {subtitle}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            aria-label="Luk"
            className="flex h-11 w-11 items-center justify-center rounded-xl"
            style={muted}
          >
            <X size={20} aria-hidden />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          {phase.kind === 'skriv' && (
            <form
              id="fortael-form"
              onSubmit={(e) => {
                e.preventDefault();
                void propose();
              }}
              className="flex flex-col gap-3"
            >
              <label htmlFor="fortael-text" className="sr-only">
                Hvad skete der?
              </label>
              <textarea
                id="fortael-text"
                ref={inputRef}
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={6}
                maxLength={3000}
                placeholder="Fx: Lars og jeg var hos lægen. Han fik ny creme til såret og skal have ny tid om 14 dage. Han var urolig bagefter, så aftenvagten skal lige spørge ind."
                className="w-full resize-none rounded-2xl border px-4 py-3 text-base leading-relaxed outline-none focus:ring-2"
                style={{
                  borderColor: 'var(--cp-border2)',
                  backgroundColor: 'var(--cp-bg)',
                  color: 'var(--cp-text)',
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) void propose();
                }}
              />
              <p className="flex items-start gap-2 text-xs" style={muted}>
                <Mic size={14} className="mt-0.5 shrink-0" aria-hidden />
                På telefonen kan du trykke på mikrofonen på tastaturet og tale i stedet for at
                skrive.
              </p>

              <label className="text-sm" style={{ color: 'var(--cp-text)' }}>
                <span className="mb-1 block font-medium">Borger</span>
                <select
                  value={residentId}
                  onChange={(e) => {
                    setResidentId(e.target.value);
                    setCandidates(null);
                  }}
                  className="min-h-[44px] w-full rounded-xl border px-3 text-sm"
                  style={{
                    borderColor: 'var(--cp-border2)',
                    backgroundColor: 'var(--cp-bg)',
                    color: 'var(--cp-text)',
                  }}
                >
                  <option value="">Find selv ud fra teksten</option>
                  {residentId && !residentName && <option value={residentId}>Denne borger</option>}
                  {residents.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name}
                    </option>
                  ))}
                </select>
              </label>

              {candidates && (
                <div>
                  <p className="mb-2 text-sm font-medium" style={{ color: 'var(--cp-text)' }}>
                    Hvilken borger handler det om?
                  </p>
                  <div className="flex flex-wrap gap-2">
                    {candidates.slice(0, 12).map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        disabled={busy}
                        onClick={() => {
                          setResidentId(r.id);
                          void propose(r.id);
                        }}
                        className="min-h-[40px] rounded-full border px-4 text-sm font-medium"
                        style={{ borderColor: 'var(--cp-border2)', color: 'var(--cp-text)' }}
                      >
                        {r.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}
              <p className="text-xs" style={muted}>
                Navne sendes ikke til AI. Du ser altid forslaget, før noget bliver gemt.
              </p>
            </form>
          )}

          {phase.kind === 'forslag' && (
            <div className="flex flex-col gap-4">
              <blockquote
                className="rounded-2xl border px-4 py-3 text-[15px] italic leading-relaxed"
                style={{
                  borderColor: 'var(--cp-border)',
                  color: 'var(--cp-text)',
                  backgroundColor: 'var(--cp-bg)',
                }}
              >
                «{text.trim()}»
              </blockquote>
              {phase.summary && (
                <p className="text-sm" style={muted}>
                  {phase.summary}
                </p>
              )}
              {phase.actions.length === 0 ? (
                <div className="flex flex-col items-start gap-3">
                  <p className="text-sm" style={{ color: 'var(--cp-text)' }}>
                    Jeg fandt ikke noget, der skal gemmes. Skriv gerne lidt mere.
                  </p>
                  <button
                    type="button"
                    onClick={() => setPhase({ kind: 'skriv' })}
                    className="min-h-[44px] rounded-xl border px-4 text-sm font-medium"
                    style={{ borderColor: 'var(--cp-border2)', color: 'var(--cp-text)' }}
                  >
                    Tilbage
                  </button>
                </div>
              ) : (
                <ActionReview
                  actions={phase.actions}
                  busy={busy}
                  confirmLabel="Godkend"
                  onConfirm={(chosen) => void save(phase.resident, phase.summary, chosen)}
                  onCancel={() => setPhase({ kind: 'skriv' })}
                />
              )}
            </div>
          )}

          {phase.kind === 'gemt' && (
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <span
                className="flex h-16 w-16 items-center justify-center rounded-full"
                style={{ backgroundColor: 'var(--cp-green-dim)', color: 'var(--cp-green)' }}
              >
                <Check size={32} aria-hidden />
              </span>
              <ul className="w-full max-w-[360px] space-y-1 text-left text-sm">
                {phase.results.map((r) => (
                  <li
                    key={r.action_id}
                    className="flex items-start gap-2"
                    style={{ color: r.ok ? 'var(--cp-text)' : 'var(--cp-red)' }}
                  >
                    {r.ok ? (
                      <Check size={16} className="mt-0.5 shrink-0" aria-hidden />
                    ) : (
                      <X size={16} className="mt-0.5 shrink-0" aria-hidden />
                    )}
                    <span>
                      {SAVED_LABELS[r.type]}
                      {!r.ok && ' kunne ikke gemmes. Opret den manuelt.'}
                    </span>
                  </li>
                ))}
              </ul>
              <p className="max-w-[42ch] text-sm" style={muted}>
                Journalnotater ligger som kladde, så du eller en leder kan godkende dem.
              </p>
              <div className="flex flex-wrap justify-center gap-3 text-sm">
                <Link
                  href={`/resident-360-view/${phase.resident.id}`}
                  onClick={onClose}
                  className="underline"
                  style={{ color: 'var(--cp-green)' }}
                >
                  Se {phase.resident.name}
                </Link>
                {phase.results.some((r) => r.type === 'handover' && r.ok) && (
                  <Link
                    href="/handover-workspace"
                    onClick={onClose}
                    className="underline"
                    style={{ color: 'var(--cp-green)' }}
                  >
                    Se overleveringen
                  </Link>
                )}
              </div>
            </div>
          )}

          {error && (
            <p className="mt-3 text-sm" role="alert" style={{ color: 'var(--cp-red)' }}>
              {error}
            </p>
          )}
        </div>

        {phase.kind !== 'forslag' && (
          <div
            className="flex gap-2 border-t px-5 py-4"
            style={{
              borderColor: 'var(--cp-border)',
              paddingBottom: 'max(16px, env(safe-area-inset-bottom))',
            }}
          >
            {phase.kind === 'skriv' ? (
              <button
                type="submit"
                form="fortael-form"
                disabled={busy || text.trim().length < 3}
                className="flex min-h-[52px] flex-1 items-center justify-center gap-2 rounded-2xl text-[15px] font-semibold disabled:opacity-40"
                style={{ backgroundColor: 'var(--cp-green)', color: 'var(--cp-on-green)' }}
              >
                {busy && <Loader2 size={18} className="animate-spin" aria-hidden />}
                {busy ? 'Assistenten tænker …' : 'Lav forslag'}
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => {
                    setText('');
                    setPhase({ kind: 'skriv' });
                  }}
                  className="min-h-[52px] rounded-2xl border px-5 text-[15px] font-medium"
                  style={{ borderColor: 'var(--cp-border2)', color: 'var(--cp-text)' }}
                >
                  Fortæl mere
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="min-h-[52px] flex-1 rounded-2xl text-[15px] font-semibold"
                  style={{ backgroundColor: 'var(--cp-text)', color: 'var(--cp-bg)' }}
                >
                  Færdig
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function FortaelProvider({
  enabled,
  children,
}: {
  enabled: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const openFortael = useCallback(() => setOpen(true), []);
  return (
    <FortaelContext.Provider value={{ openFortael, enabled }}>
      {children}
      {enabled && open && <FortaelSheet onClose={() => setOpen(false)} />}
    </FortaelContext.Provider>
  );
}

/** Rund knap nederst til højre på mobil, så Fortæl altid er ét tryk væk. */
export function FortaelFab() {
  const { openFortael, enabled } = useFortael();
  if (!enabled) return null;
  return (
    <button
      type="button"
      onClick={openFortael}
      className="fixed bottom-5 right-4 z-[10045] flex h-14 items-center gap-2 rounded-full px-5 text-[15px] font-semibold md:hidden"
      style={{
        backgroundColor: 'var(--cp-green)',
        color: 'var(--cp-on-green)',
        boxShadow: '0 8px 20px color-mix(in srgb, var(--cp-green) 40%, transparent)',
        marginBottom: 'env(safe-area-inset-bottom)',
      }}
    >
      <Mic size={20} aria-hidden />
      Fortæl
    </button>
  );
}
