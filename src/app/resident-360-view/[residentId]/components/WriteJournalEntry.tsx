'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, X, Loader2, Sparkles } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { formatJournalEntriesInsertError } from '@/lib/journalEntriesInsertError';

type JournalCategory = 'Døgnnotat' | 'Sundhed' | 'Socialt' | 'Hændelse' | 'Samtale' | 'Andet';

type CategoryConfig = {
  key: JournalCategory;
  titleDefault: string;
  bodyPlaceholder: string;
};

const CATEGORY_CONFIG: CategoryConfig[] = [
  {
    key: 'Døgnnotat',
    titleDefault: '',
    bodyPlaceholder: '',
  },
  {
    key: 'Sundhed',
    titleDefault: 'Sundhedsobservation og opfølgning',
    bodyPlaceholder: 'Beskriv helbred, medicin, somatik og aftalte sundhedsfaglige tiltag…',
  },
  {
    key: 'Socialt',
    titleDefault: 'Social trivsel og deltagelse',
    bodyPlaceholder: 'Beskriv samspil, relationer, deltagelse i fællesskab og social støtte…',
  },
  {
    key: 'Hændelse',
    titleDefault: 'Hændelse og opfølgning',
    bodyPlaceholder: 'Beskriv hændelsesforløb, handlinger her-og-nu samt aftalt opfølgning…',
  },
  {
    key: 'Samtale',
    titleDefault: 'Samtalenotat',
    bodyPlaceholder: 'Beskriv temaer fra samtalen, borgerperspektiv og faglig vurdering…',
  },
  {
    key: 'Andet',
    titleDefault: '',
    bodyPlaceholder: 'Skriv frit notat uden prædefinerede overskrifter…',
  },
];

interface Props {
  residentId: string;
  residentName: string;
  carePortalDark?: boolean;
}

export default function WriteJournalEntry({ residentId, residentName, carePortalDark }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [category, setCategory] = useState<JournalCategory>('Døgnnotat');
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [doegnHandling, setDoegnHandling] = useState('');
  const [doegnRefleksion, setDoegnRefleksion] = useState('');
  const [saving, setSaving] = useState(false);
  const [polishing, setPolishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  /** Standard: kladde = dagens egne notater; godkendt = færdig journal med det samme */
  const [saveMode, setSaveMode] = useState<'kladde' | 'godkendt'>('kladde');
  /** Synlig på Aftenopsamling (aftensamlet overblik) */
  const [showInDiary, setShowInDiary] = useState(true);

  const activeCategoryCfg = useMemo(
    () => CATEGORY_CONFIG.find((c) => c.key === category) ?? CATEGORY_CONFIG[0]!,
    [category]
  );
  const isDoegnnotat = category === 'Døgnnotat';

  const composedText = useMemo(() => {
    if (isDoegnnotat) {
      return `Aktivitet/Handling\n${doegnHandling.trim()}\n\nRefleksion\n${doegnRefleksion.trim()}`.trim();
    }
    const t = title.trim();
    const b = body.trim();
    if (category === 'Andet') return [t, b].filter(Boolean).join('\n\n').trim();
    return [t || activeCategoryCfg.titleDefault, b].filter(Boolean).join('\n\n').trim();
  }, [
    activeCategoryCfg.titleDefault,
    body,
    category,
    doegnHandling,
    doegnRefleksion,
    isDoegnnotat,
    title,
  ]);

  const canPolish = composedText.length > 0;
  const canSave = composedText.length > 0;

  function handleOpen() {
    setCategory('Døgnnotat');
    setTitle('');
    setBody('');
    setDoegnHandling('');
    setDoegnRefleksion('');
    setSaveMode('kladde');
    setShowInDiary(true);
    setError(null);
    setOpen(true);
  }

  async function handlePolish() {
    const trimmed = composedText.trim();
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
      if (data.text?.trim()) {
        const polished = data.text.trim();
        if (isDoegnnotat) {
          const parts = polished.split(/Refleksion/i);
          if (parts.length >= 2) {
            const handling = parts[0]!.replace(/Aktivitet\/Handling/i, '').trim();
            const refleksion = parts.slice(1).join('Refleksion').trim();
            setDoegnHandling(handling);
            setDoegnRefleksion(refleksion);
          } else {
            setDoegnHandling(polished);
          }
        } else if (category === 'Andet') {
          setBody(polished);
        } else {
          setBody(polished);
        }
      }
    } catch {
      setError('Netværksfejl — prøv igen');
    } finally {
      setPolishing(false);
    }
  }

  async function handleSave() {
    const finalText = composedText.trim();
    if (!finalText) return;
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
      entry_text: finalText,
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

    const missingColumnError = (err: { message?: string } | null, column: string) =>
      !!err &&
      String(err.message ?? '')
        .toLowerCase()
        .includes(column.toLowerCase());

    const payload = { ...insertRow };
    let { error: insertError } = await supabase.from('journal_entries').insert(payload);

    // Miljøer kan mangle nyere kolonner i schema cache; prøv igen uden dem.
    if (missingColumnError(insertError, 'show_in_diary')) {
      delete payload.show_in_diary;
      ({ error: insertError } = await supabase.from('journal_entries').insert(payload));
    }
    if (missingColumnError(insertError, 'approved_at')) {
      delete payload.approved_at;
      ({ error: insertError } = await supabase.from('journal_entries').insert(payload));
    }
    if (missingColumnError(insertError, 'approved_by')) {
      delete payload.approved_by;
      ({ error: insertError } = await supabase.from('journal_entries').insert(payload));
    }
    if (missingColumnError(insertError, 'journal_status')) {
      delete payload.journal_status;
      ({ error: insertError } = await supabase.from('journal_entries').insert(payload));
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
                  Nyt journalnotat
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
                  Standard er <strong className="font-medium">kladde</strong> — jeres egne stikord i
                  løbet af dagen. På{' '}
                  <Link
                    href="/resident-360-view/dagbog"
                    className="font-medium underline underline-offset-2"
                    style={carePortalDark ? { color: 'var(--cp-green)' } : { color: '#0F1B2D' }}
                  >
                    Aftenopsamling
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
                  {CATEGORY_CONFIG.map((cat) => (
                    <button
                      key={cat.key}
                      type="button"
                      onClick={() => {
                        setCategory(cat.key);
                        setError(null);
                        setTitle(cat.titleDefault);
                        setBody('');
                        if (cat.key === 'Døgnnotat') {
                          setDoegnHandling('');
                          setDoegnRefleksion('');
                        }
                      }}
                      className={`rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                        !carePortalDark
                          ? category === cat.key
                            ? 'bg-[#0F1B2D] text-white'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          : ''
                      }`}
                      style={
                        carePortalDark
                          ? category === cat.key
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
                      {cat.key}
                    </button>
                  ))}
                </div>
              </div>

              {/* Structured note input */}
              <div>
                <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                  <span
                    className={`block text-xs font-medium ${carePortalDark ? '' : 'text-gray-500'}`}
                    style={carePortalDark ? { color: 'var(--cp-muted2)' } : undefined}
                  >
                    Notat
                  </span>
                  <button
                    type="button"
                    disabled={polishing || !canPolish}
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
                {isDoegnnotat ? (
                  <div className="space-y-3">
                    <div>
                      <p
                        className={`mb-1.5 text-sm font-bold ${carePortalDark ? '' : 'text-gray-800'}`}
                        style={carePortalDark ? { color: 'var(--cp-text)' } : undefined}
                      >
                        Aktivitet/Handling
                      </p>
                      <textarea
                        value={doegnHandling}
                        onChange={(e) => setDoegnHandling(e.target.value)}
                        placeholder="Beskriv hvad der konkret skete i vagten…"
                        rows={5}
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
                    </div>
                    <div>
                      <p
                        className={`mb-1.5 text-sm font-bold ${carePortalDark ? '' : 'text-gray-800'}`}
                        style={carePortalDark ? { color: 'var(--cp-text)' } : undefined}
                      >
                        Refleksion
                      </p>
                      <textarea
                        value={doegnRefleksion}
                        onChange={(e) => setDoegnRefleksion(e.target.value)}
                        placeholder="Beskriv faglig vurdering og næste skridt…"
                        rows={5}
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
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <input
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder={
                        category === 'Andet' ? 'Valgfri overskrift (kan udelades)' : 'Overskrift'
                      }
                      className={`w-full rounded-xl border px-3 py-2 text-sm focus:outline-none ${
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
                    <textarea
                      value={body}
                      onChange={(e) => setBody(e.target.value)}
                      placeholder={activeCategoryCfg.bodyPlaceholder}
                      rows={9}
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
                  </div>
                )}
                <p
                  className={`mt-1.5 text-[11px] leading-snug ${carePortalDark ? '' : 'text-gray-400'}`}
                  style={carePortalDark ? { color: 'var(--cp-muted2)' } : undefined}
                >
                  {isDoegnnotat
                    ? 'Døgnnotat har faste sektioner med låste overskrifter. Brug Aktivitet/Handling til fakta og Refleksion til faglig vurdering.'
                    : category === 'Andet'
                      ? 'Andet har ingen prædefinerede overskrifter. Skriv frit med valgfri overskrift.'
                      : 'Overskriften er foreslået ud fra kategori og kan redigeres. Brug brødteksten til faglige observationer og opfølgning.'}
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
                    Medtag dette notat på <em className="not-italic">Aftenopsamling</em> (samlet
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
                disabled={!canSave || saving}
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
