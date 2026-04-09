'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, X, Loader2, Sparkles } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { formatJournalEntriesInsertError } from '@/lib/journalEntriesInsertError';

/** Fønix-inspireret: én tekstboks med faste overskrifter (jf. guide til journalnotater). */
export const JOURNAL_NOTE_TEMPLATE = `Aktivitet/Handling



Refleksion


`;

const CATEGORIES = ['Pædagogisk', 'Sundhed', 'Socialt', 'Hændelse', 'Samtale', 'Andet'];

interface Props {
  residentId: string;
  residentName: string;
  carePortalDark?: boolean;
}

export default function WriteJournalEntry({ residentId, residentName, carePortalDark }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [category, setCategory] = useState('Pædagogisk');
  const [saving, setSaving] = useState(false);
  const [polishing, setPolishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Standard: kladde = dagens egne notater; godkendt = færdig journal med det samme */
  const [saveMode, setSaveMode] = useState<'kladde' | 'godkendt'>('kladde');
  /** Synlig på Dagens dagbog (aftensamlet overblik) */
  const [showInDiary, setShowInDiary] = useState(true);

  function handleOpen() {
    setText(JOURNAL_NOTE_TEMPLATE);
    setCategory('Pædagogisk');
    setSaveMode('kladde');
    setShowInDiary(true);
    setError(null);
    setOpen(true);
  }

  async function handlePolish() {
    const trimmed = text.trim();
    if (!trimmed) return;
    setPolishing(true);
    setError(null);
    try {
      const res = await fetch('/api/portal/journal-polish', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          draft: trimmed,
          category,
          residentLabel: residentName,
        }),
      });
      const data = (await res.json()) as { text?: string; error?: string };
      if (!res.ok) {
        setError(data.error ?? 'Kunne ikke få svar fra AI');
        return;
      }
      if (data.text?.trim()) setText(data.text.trim());
    } catch {
      setError('Netværksfejl — prøv igen');
    } finally {
      setPolishing(false);
    }
  }

  async function handleSave() {
    if (!text.trim()) return;
    setSaving(true);
    setError(null);

    const supabase = createClient();
    if (!supabase) {
      setError('Forbindelsesfejl — prøv igen');
      setSaving(false);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    const staffName =
      (user?.user_metadata?.full_name as string | undefined) ?? user?.email ?? 'Ukendt personale';

    const nowIso = new Date().toISOString();
    const asDraft = saveMode === 'kladde';
    const insertRow: Record<string, unknown> = {
      resident_id: residentId,
      staff_id: user?.id ?? null,
      staff_name: staffName,
      entry_text: text.trim(),
      category,
      journal_status: asDraft ? 'kladde' : 'godkendt',
      show_in_diary: showInDiary,
    };
    if (asDraft) {
      insertRow.approved_at = null;
      insertRow.approved_by = null;
    } else if (user?.id) {
      insertRow.approved_at = nowIso;
      insertRow.approved_by = user.id;
    }

    let { error: insertError } = await supabase.from('journal_entries').insert(insertRow);

    if (
      insertError &&
      String(insertError.message ?? '').toLowerCase().includes('show_in_diary')
    ) {
      const retryRow = { ...insertRow };
      delete retryRow.show_in_diary;
      ({ error: insertError } = await supabase.from('journal_entries').insert(retryRow));
    }

    if (insertError) {
      console.error('[WriteJournalEntry] insert', insertError);
      setError(formatJournalEntriesInsertError(insertError));
      setSaving(false);
      return;
    }

    setOpen(false);
    setSaving(false);
    router.refresh();
  }

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-semibold text-white transition-opacity hover:opacity-95 ${
          carePortalDark ? '' : 'bg-[#0F1B2D] hover:bg-[#1a2d47]'
        }`}
        style={
          carePortalDark
            ? {
                background: 'linear-gradient(135deg, #2dd4a0 0%, #0d9488 100%)',
                boxShadow: '0 2px 12px rgba(45,212,160,0.25)',
              }
            : undefined
        }
      >
        <Plus size={13} />
        Nyt journalnotat
      </button>

      {/* Modal */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40"
          onClick={(e) => {
            if (e.target === e.currentTarget) setOpen(false);
          }}
        >
          <div
            className={`w-full max-w-lg rounded-2xl shadow-2xl ${carePortalDark ? '' : 'bg-white'}`}
            style={
              carePortalDark
                ? { backgroundColor: 'var(--cp-bg2)', border: '1px solid var(--cp-border)' }
                : undefined
            }
          >
            {/* Header */}
            <div
              className={`flex items-center justify-between border-b px-5 py-4 ${carePortalDark ? '' : 'border-gray-100'}`}
              style={carePortalDark ? { borderColor: 'var(--cp-border)' } : undefined}
            >
              <div>
                <h2
                  className={`text-sm font-bold ${carePortalDark ? '' : 'text-gray-900'}`}
                  style={carePortalDark ? { color: 'var(--cp-text)' } : undefined}
                >
                  Ny journalnotat
                </h2>
                <p
                  className={`mt-0.5 text-xs ${carePortalDark ? '' : 'text-gray-500'}`}
                  style={carePortalDark ? { color: 'var(--cp-muted)' } : undefined}
                >
                  {residentName}
                </p>
                <p
                  className={`mt-2 text-[11px] leading-snug ${carePortalDark ? '' : 'text-gray-500'}`}
                  style={carePortalDark ? { color: 'var(--cp-muted2)' } : undefined}
                >
                  Standard er <strong className="font-medium">kladde</strong> — jeres egne stikord i løbet
                  af dagen. På{' '}
                  <Link
                    href="/resident-360-view/dagbog"
                    className="font-medium underline underline-offset-2"
                    style={carePortalDark ? { color: 'var(--cp-green)' } : { color: '#0F1B2D' }}
                  >
                    Dagens dagbog
                  </Link>{' '}
                  kan I om aftenen samle dagens kladder til ét professionelt notat med AI.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className={`flex h-8 w-8 items-center justify-center rounded-lg transition-colors ${
                  carePortalDark
                    ? 'text-[var(--cp-muted)] hover:bg-white/5'
                    : 'text-gray-400 hover:bg-gray-100'
                }`}
              >
                <X size={16} />
              </button>
            </div>

            {/* Body */}
            <div className="space-y-4 p-5">
              {/* Category pills */}
              <div>
                <span
                  className={`mb-2 block text-xs font-medium ${carePortalDark ? '' : 'text-gray-500'}`}
                  style={carePortalDark ? { color: 'var(--cp-muted2)' } : undefined}
                >
                  Kategori
                </span>
                <div className="flex flex-wrap gap-2">
                  {CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategory(cat)}
                      className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                        !carePortalDark
                          ? category === cat
                            ? 'bg-[#0F1B2D] text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          : ''
                      }`}
                      style={
                        carePortalDark
                          ? category === cat
                            ? {
                                backgroundColor: 'var(--cp-green-dim)',
                                color: 'var(--cp-green)',
                                boxShadow: '0 0 0 1px rgba(45,212,160,0.2)',
                              }
                            : {
                                backgroundColor: 'var(--cp-bg3)',
                                color: 'var(--cp-muted)',
                              }
                          : undefined
                      }
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>

              {/* Single text box: Aktivitet/Handling + Refleksion */}
              <div>
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <span
                    className={`block text-xs font-medium ${carePortalDark ? '' : 'text-gray-500'}`}
                    style={carePortalDark ? { color: 'var(--cp-muted2)' } : undefined}
                  >
                    Notat (én tekst — brug overskrifterne)
                  </span>
                  <button
                    type="button"
                    disabled={polishing || !text.trim()}
                    onClick={() => void handlePolish()}
                    className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                      carePortalDark
                        ? 'border-[var(--cp-border)] text-[var(--cp-green)] hover:bg-white/5'
                        : 'border-gray-200 text-[#0F1B2D] hover:bg-gray-50'
                    }`}
                  >
                    {polishing ? (
                      <Loader2 size={12} className="animate-spin" />
                    ) : (
                      <Sparkles size={12} />
                    )}
                    Fagliggør med AI
                  </button>
                </div>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder={JOURNAL_NOTE_TEMPLATE}
                  rows={12}
                  // eslint-disable-next-line jsx-a11y/no-autofocus
                  autoFocus
                  className={`w-full resize-y rounded-xl border px-3 py-2.5 text-sm leading-relaxed focus:outline-none ${
                    carePortalDark ? '' : 'border-gray-200 focus:border-[#1D9E75]'
                  }`}
                  style={
                    carePortalDark
                      ? {
                          borderColor: 'var(--cp-border)',
                          backgroundColor: 'var(--cp-bg)',
                          color: 'var(--cp-text)',
                        }
                      : undefined
                  }
                />
                <p
                  className={`mt-1.5 text-[11px] leading-snug ${carePortalDark ? '' : 'text-gray-400'}`}
                  style={carePortalDark ? { color: 'var(--cp-muted2)' } : undefined}
                >
                  Under <strong className="font-medium">Aktivitet/Handling</strong>: hvad skete der?{' '}
                  Under <strong className="font-medium">Refleksion</strong>: faglig vurdering og
                  næste skridt. «Fagliggør med AI» strammer ét notat; den samlede aften-sammenfatning
                  findes på Dagens dagbog.
                </p>
              </div>

              <label
                className={`flex cursor-pointer items-start gap-2.5 rounded-xl border px-3 py-2.5 ${
                  carePortalDark ? '' : 'border-gray-100 bg-gray-50/80'
                }`}
                style={
                  carePortalDark
                    ? { borderColor: 'var(--cp-border)', backgroundColor: 'var(--cp-bg3)' }
                    : undefined
                }
              >
                <input
                  type="checkbox"
                  checked={showInDiary}
                  onChange={(e) => setShowInDiary(e.target.checked)}
                  className="mt-0.5 h-4 w-4 shrink-0 rounded border-gray-300 accent-[#1D9E75]"
                />
                <span className="text-xs leading-snug">
                  <span
                    className={`font-semibold ${carePortalDark ? '' : 'text-gray-800'}`}
                    style={carePortalDark ? { color: 'var(--cp-text)' } : undefined}
                  >
                    Vis i dagbog
                  </span>
                  <span
                    className={`block ${carePortalDark ? '' : 'text-gray-500'}`}
                    style={carePortalDark ? { color: 'var(--cp-muted)' } : undefined}
                  >
                    Medtag dette notat på <em className="not-italic">Dagens dagbog</em> (samlet
                    skriv til aftenholdet).
                  </span>
                </span>
              </label>

              <div>
                <span
                  className={`mb-2 block text-xs font-medium ${carePortalDark ? '' : 'text-gray-500'}`}
                  style={carePortalDark ? { color: 'var(--cp-muted2)' } : undefined}
                >
                  Gem som
                </span>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setSaveMode('godkendt')}
                    className={
                      !carePortalDark
                        ? `rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                            saveMode === 'godkendt'
                              ? 'bg-[#0F1B2D] text-white'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`
                        : 'rounded-lg px-3 py-1.5 text-xs font-medium transition-all'
                    }
                    style={
                      carePortalDark
                        ? saveMode === 'godkendt'
                          ? {
                              backgroundColor: 'var(--cp-green-dim)',
                              color: 'var(--cp-green)',
                              boxShadow: '0 0 0 1px rgba(45,212,160,0.2)',
                            }
                          : {
                              backgroundColor: 'var(--cp-bg3)',
                              color: 'var(--cp-muted)',
                            }
                        : undefined
                    }
                  >
                    Godkendt journal
                  </button>
                  <button
                    type="button"
                    onClick={() => setSaveMode('kladde')}
                    className={
                      !carePortalDark
                        ? `rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                            saveMode === 'kladde'
                              ? 'bg-amber-600 text-white'
                              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`
                        : 'rounded-lg px-3 py-1.5 text-xs font-medium transition-all'
                    }
                    style={
                      carePortalDark
                        ? saveMode === 'kladde'
                          ? { backgroundColor: 'var(--cp-amber-dim)', color: 'var(--cp-amber)' }
                          : {
                              backgroundColor: 'var(--cp-bg3)',
                              color: 'var(--cp-muted)',
                            }
                        : undefined
                    }
                  >
                    Kladde
                  </button>
                </div>
                <p
                  className={`mt-1.5 text-[11px] leading-snug ${carePortalDark ? '' : 'text-gray-400'}`}
                  style={carePortalDark ? { color: 'var(--cp-muted2)' } : undefined}
                >
                  Kladder vises på overblikket og kan godkendes senere. Godkendt journal tæller som
                  officielt notat (fx overdragelse).
                </p>
              </div>

              {error && (
                <p
                  className={`rounded-lg px-3 py-2 text-xs ${carePortalDark ? '' : 'bg-red-50 text-red-600'}`}
                  style={
                    carePortalDark
                      ? { backgroundColor: 'rgba(245,101,101,0.12)', color: 'var(--cp-red)' }
                      : undefined
                  }
                >
                  {error}
                </p>
              )}
            </div>

            {/* Footer */}
            <div className="flex flex-col-reverse gap-2 px-5 pb-5 sm:flex-row sm:items-center sm:justify-end">
              <button
                type="button"
                onClick={() => setOpen(false)}
                className={`px-4 py-2 text-sm transition-colors sm:mr-auto ${
                  carePortalDark
                    ? 'text-[var(--cp-muted)] hover:text-[var(--cp-text)]'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                Annuller
              </button>
              <button
                type="button"
                disabled={!text.trim() || saving}
                onClick={() => void handleSave()}
                className={`flex items-center justify-center gap-2 rounded-xl px-5 py-2 text-sm font-semibold text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
                  carePortalDark ? '' : 'bg-[#1D9E75] hover:bg-[#18886a]'
                }`}
                style={
                  carePortalDark
                    ? {
                        background: 'linear-gradient(135deg, #2dd4a0 0%, #0d9488 100%)',
                        boxShadow: '0 2px 12px rgba(45,212,160,0.2)',
                      }
                    : undefined
                }
              >
                {saving && <Loader2 size={14} className="animate-spin" />}
                {saveMode === 'kladde' ? 'Gem kladde' : 'Gem som godkendt'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
