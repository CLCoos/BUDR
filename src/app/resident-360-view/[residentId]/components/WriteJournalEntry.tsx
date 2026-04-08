'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Plus, X, Loader2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';

const CATEGORIES = [
  'Observation',
  'Hændelse',
  'Samtale',
  'Medicin',
  'Helbred',
  'Stemning',
  'Andet',
];

interface Props {
  residentId: string;
  residentName: string;
  carePortalDark?: boolean;
}

export default function WriteJournalEntry({ residentId, residentName, carePortalDark }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [category, setCategory] = useState('Observation');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** `kladde` = udkast; `godkendt` = officiel journal med det samme */
  const [saveMode, setSaveMode] = useState<'kladde' | 'godkendt'>('godkendt');

  function handleOpen() {
    setText('');
    setCategory('Observation');
    setSaveMode('godkendt');
    setError(null);
    setOpen(true);
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
    };
    if (!asDraft && user?.id) {
      insertRow.approved_at = nowIso;
      insertRow.approved_by = user.id;
    }

    const { error: insertError } = await supabase.from('journal_entries').insert(insertRow);

    if (insertError) {
      setError('Kunne ikke gemme notat — prøv igen');
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
        Skriv notat
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
                  Skriv journalnotat
                </h2>
                <p
                  className={`mt-0.5 text-xs ${carePortalDark ? '' : 'text-gray-500'}`}
                  style={carePortalDark ? { color: 'var(--cp-muted)' } : undefined}
                >
                  {residentName}
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

              {/* Text */}
              <div>
                <span
                  className={`mb-2 block text-xs font-medium ${carePortalDark ? '' : 'text-gray-500'}`}
                  style={carePortalDark ? { color: 'var(--cp-muted2)' } : undefined}
                >
                  Notat
                </span>
                <textarea
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  placeholder="Beskriv observationen, hændelsen eller samtalen…"
                  rows={5}
                  // eslint-disable-next-line jsx-a11y/no-autofocus
                  autoFocus
                  className={`w-full resize-none rounded-xl border px-3 py-2.5 text-sm focus:outline-none ${
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
              </div>

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
