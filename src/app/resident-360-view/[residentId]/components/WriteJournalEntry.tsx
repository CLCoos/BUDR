'use client';

import React, { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Plus, X, Loader2, Sparkles } from 'lucide-react';
import { compareEditorChrome } from '@/components/journal/compareEditorChrome';
import { JournalVersionToggle } from '@/components/journal/JournalVersionToggle';
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

/** Parser AI-output: Handling/aktivitet eller ældre Aktivitet/Handling + Refleksion */
function parseDoegnPolishedSections(
  polished: string
): { handling: string; refleksion: string } | null {
  const t = polished.trim();
  const fullMatch = t.match(
    /^(?:Handling\/aktivitet|Aktivitet\/Handling)\s*\n([\s\S]*?)\n\s*Refleksion\s*\n([\s\S]*)$/i
  );
  if (fullMatch) {
    return { handling: fullMatch[1]!.trim(), refleksion: fullMatch[2]!.trim() };
  }
  const splitAt = t.search(/\n\s*Refleksion\s*\n/i);
  if (splitAt >= 0) {
    let handling = t.slice(0, splitAt).trim();
    const refleksion = t
      .slice(splitAt)
      .replace(/^\s*Refleksion\s*\n/i, '')
      .trim();
    handling = handling.replace(/^(?:Handling\/aktivitet|Aktivitet\/Handling)\s*\n/i, '').trim();
    return { handling, refleksion };
  }
  return null;
}

function buildComposedDoegn(handling: string, refleksion: string) {
  return `Handling/aktivitet\n${handling.trim()}\n\nRefleksion\n${refleksion.trim()}`.trim();
}

type CompareDoegnPair = { handling: string; refleksion: string };
type CompareOtherPair = { title: string; body: string };

function splitPolishedToTitleBody(polished: string, fallbackTitle: string): CompareOtherPair {
  const t = polished.trim();
  if (!t) return { title: fallbackTitle, body: '' };
  const parts = t.split(/\n\n+/);
  if (parts.length >= 2 && parts[0]!.length <= 240 && !parts[0]!.includes('\n')) {
    return { title: parts[0]!.trim(), body: parts.slice(1).join('\n\n').trim() };
  }
  return { title: fallbackTitle, body: t };
}

function composeOtherCategory(
  cat: JournalCategory,
  noteTitle: string,
  noteBody: string,
  titleDefault: string
): string {
  const ti = noteTitle.trim();
  const b = noteBody.trim();
  if (cat === 'Andet') return [ti, b].filter(Boolean).join('\n\n').trim();
  return [ti || titleDefault, b].filter(Boolean).join('\n\n').trim();
}

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

  /** Efter AI: sammenlign original (frosset ved første polish) vs. AI-forslag */
  const [compareMode, setCompareMode] = useState(false);
  const [compareSource, setCompareSource] = useState<'original' | 'ai'>('ai');
  const [pairOriginalDoegn, setPairOriginalDoegn] = useState<CompareDoegnPair | null>(null);
  const [pairAiDoegn, setPairAiDoegn] = useState<CompareDoegnPair | null>(null);
  const [pairOriginalOther, setPairOriginalOther] = useState<CompareOtherPair | null>(null);
  const [pairAiOther, setPairAiOther] = useState<CompareOtherPair | null>(null);

  const activeCategoryCfg = useMemo(
    () => CATEGORY_CONFIG.find((c) => c.key === category) ?? CATEGORY_CONFIG[0]!,
    [category]
  );
  const isDoegnnotat = category === 'Døgnnotat';

  const composedText = useMemo(() => {
    if (compareMode && isDoegnnotat && pairOriginalDoegn && pairAiDoegn) {
      const p = compareSource === 'original' ? pairOriginalDoegn : pairAiDoegn;
      return buildComposedDoegn(p.handling, p.refleksion);
    }
    if (compareMode && !isDoegnnotat && pairOriginalOther && pairAiOther) {
      const p = compareSource === 'original' ? pairOriginalOther : pairAiOther;
      return composeOtherCategory(category, p.title, p.body, activeCategoryCfg.titleDefault);
    }
    if (isDoegnnotat) {
      return buildComposedDoegn(doegnHandling, doegnRefleksion);
    }
    return composeOtherCategory(category, title, body, activeCategoryCfg.titleDefault);
  }, [
    activeCategoryCfg.titleDefault,
    body,
    category,
    compareMode,
    compareSource,
    doegnHandling,
    doegnRefleksion,
    isDoegnnotat,
    pairAiDoegn,
    pairAiOther,
    pairOriginalDoegn,
    pairOriginalOther,
    title,
  ]);

  const canPolish = composedText.length > 0;
  const canSave = composedText.length > 0;
  const versionChrome = compareEditorChrome(carePortalDark, compareMode, compareSource);

  function resetCompareState() {
    setCompareMode(false);
    setCompareSource('ai');
    setPairOriginalDoegn(null);
    setPairAiDoegn(null);
    setPairOriginalOther(null);
    setPairAiOther(null);
  }

  function handleOpen() {
    setCategory('Døgnnotat');
    setTitle('');
    setBody('');
    setDoegnHandling('');
    setDoegnRefleksion('');
    setSaveMode('kladde');
    setShowInDiary(true);
    setError(null);
    resetCompareState();
    setOpen(true);
  }

  /** Afslut sammenligning og fortsæt med den version der vises nu */
  function dismissCompare() {
    if (!compareMode) return;
    if (isDoegnnotat && pairOriginalDoegn && pairAiDoegn) {
      const p = compareSource === 'original' ? pairOriginalDoegn : pairAiDoegn;
      setDoegnHandling(p.handling);
      setDoegnRefleksion(p.refleksion);
    } else if (pairOriginalOther && pairAiOther) {
      const p = compareSource === 'original' ? pairOriginalOther : pairAiOther;
      setTitle(p.title);
      setBody(p.body);
    }
    resetCompareState();
  }

  async function handlePolish() {
    const trimmed = composedText.trim();
    if (!trimmed) return;
    setPolishing(true);
    setError(null);
    try {
      if (!compareMode) {
        if (isDoegnnotat) {
          setPairOriginalDoegn({ handling: doegnHandling, refleksion: doegnRefleksion });
        } else {
          setPairOriginalOther({
            title: category === 'Andet' ? title : title.trim() || activeCategoryCfg.titleDefault,
            body,
          });
        }
      }

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
        if (!compareMode) {
          if (isDoegnnotat) setPairOriginalDoegn(null);
          else setPairOriginalOther(null);
        }
        setError(data.error ?? 'Kunne ikke få svar fra AI');
        return;
      }
      if (data.text?.trim()) {
        const polished = data.text.trim();
        if (isDoegnnotat) {
          const parsed = parseDoegnPolishedSections(polished);
          if (parsed) {
            setPairAiDoegn(parsed);
          } else {
            setPairAiDoegn({ handling: polished, refleksion: '' });
          }
          setCompareMode(true);
          setCompareSource('ai');
        } else {
          const fb = category === 'Andet' ? '' : title.trim() || activeCategoryCfg.titleDefault;
          setPairAiOther(splitPolishedToTitleBody(polished, fb));
          setCompareMode(true);
          setCompareSource('ai');
        }
      }
    } catch {
      if (!compareMode) {
        if (isDoegnnotat) setPairOriginalDoegn(null);
        else setPairOriginalOther(null);
      }
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
    window.dispatchEvent(new CustomEvent('portal-journal-updated', { detail: { residentId } }));
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
            className={`flex max-h-[min(92vh,880px)] w-full max-w-2xl flex-col overflow-hidden rounded-2xl shadow-2xl ${carePortalDark ? '' : 'bg-white'}`}
            style={
              carePortalDark
                ? { backgroundColor: 'var(--cp-bg2)', border: '1px solid var(--cp-border)' }
                : undefined
            }
          >
            {/* Header */}
            <div
              className={`flex shrink-0 items-center justify-between border-b px-5 py-4 ${carePortalDark ? '' : 'border-gray-100'}`}
              style={carePortalDark ? { borderColor: 'var(--cp-border)' } : undefined}
            >
              <div className="min-w-0 pr-2">
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
                <details
                  className={`mt-2 text-[11px] leading-snug ${carePortalDark ? '' : 'text-gray-500'}`}
                  style={carePortalDark ? { color: 'var(--cp-muted2)' } : undefined}
                >
                  <summary
                    className={`cursor-pointer font-medium underline-offset-2 hover:underline ${carePortalDark ? '' : 'text-gray-600'}`}
                    style={carePortalDark ? { color: 'var(--cp-muted)' } : undefined}
                  >
                    Kladde, dagbog og Aftenopsamling
                  </summary>
                  <p className="mt-2">
                    Standard er <strong className="font-medium">kladde</strong> — jeres egne stikord
                    i løbet af dagen. På{' '}
                    <Link
                      href="/resident-360-view/dagbog"
                      className="font-medium underline underline-offset-2"
                      style={carePortalDark ? { color: 'var(--cp-green)' } : { color: '#0F1B2D' }}
                    >
                      Aftenopsamling
                    </Link>{' '}
                    kan I om aftenen samle dagens kladder til ét professionelt notat med AI.
                  </p>
                </details>
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
            <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
              <div className="space-y-4">
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
                          resetCompareState();
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
                  <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                    <div className="flex min-w-0 flex-wrap items-baseline gap-x-3 gap-y-1">
                      <span
                        className={`text-xs font-medium ${carePortalDark ? '' : 'text-gray-500'}`}
                        style={carePortalDark ? { color: 'var(--cp-muted2)' } : undefined}
                      >
                        Notat
                      </span>
                      <span
                        className={`text-[10px] tabular-nums ${carePortalDark ? '' : 'text-gray-400'}`}
                        style={carePortalDark ? { color: 'var(--cp-muted2)' } : undefined}
                      >
                        {composedText.length} tegn
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                      {compareMode && (
                        <>
                          <JournalVersionToggle
                            value={compareSource}
                            onChange={setCompareSource}
                            variant={carePortalDark ? 'portal-dark' : 'light'}
                          />
                          <button
                            type="button"
                            onClick={dismissCompare}
                            className={`text-[11px] font-medium underline-offset-2 hover:underline ${
                              carePortalDark ? 'text-[var(--cp-muted)]' : 'text-gray-500'
                            }`}
                          >
                            Afslut sammenligning
                          </button>
                        </>
                      )}
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
                  </div>
                  {compareMode && (
                    <p
                      className={`mb-2 flex flex-wrap items-center gap-2 text-[11px] leading-snug ${carePortalDark ? '' : 'text-gray-500'}`}
                      style={carePortalDark ? { color: 'var(--cp-muted)' } : undefined}
                    >
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[10px] font-medium ${
                          carePortalDark ? '' : 'bg-gray-100 text-gray-600'
                        }`}
                        style={
                          carePortalDark
                            ? { backgroundColor: 'var(--cp-bg3)', color: 'var(--cp-text)' }
                            : undefined
                        }
                      >
                        <span
                          className="inline-block h-2 w-2 shrink-0 rounded-full"
                          style={{
                            backgroundColor:
                              compareSource === 'ai'
                                ? carePortalDark
                                  ? 'var(--cp-green)'
                                  : '#0d9488'
                                : carePortalDark
                                  ? 'var(--cp-amber)'
                                  : '#d97706',
                          }}
                          aria-hidden
                        />
                        {compareSource === 'ai' ? 'Redigerer AI-forslag' : 'Redigerer original'}
                      </span>
                      <span>
                        Skift med knapperne ovenfor.{' '}
                        <strong className="font-semibold">Frit redigér</strong> — det du ser,
                        gemmes.
                      </span>
                    </p>
                  )}
                  {isDoegnnotat ? (
                    <div className="space-y-3">
                      <div>
                        <p
                          className={`mb-1.5 text-sm font-bold ${carePortalDark ? '' : 'text-gray-800'}`}
                          style={carePortalDark ? { color: 'var(--cp-text)' } : undefined}
                        >
                          Handling/aktivitet
                        </p>
                        <textarea
                          value={
                            compareMode && pairOriginalDoegn && pairAiDoegn
                              ? compareSource === 'original'
                                ? pairOriginalDoegn.handling
                                : pairAiDoegn.handling
                              : doegnHandling
                          }
                          onChange={(e) => {
                            const v = e.target.value;
                            if (compareMode && pairOriginalDoegn && pairAiDoegn) {
                              if (compareSource === 'original') {
                                setPairOriginalDoegn({ ...pairOriginalDoegn, handling: v });
                              } else {
                                setPairAiDoegn({ ...pairAiDoegn, handling: v });
                              }
                            } else {
                              setDoegnHandling(v);
                            }
                          }}
                          placeholder="Beskriv hvad der konkret skete i vagten…"
                          rows={5}
                          className={`w-full resize-y rounded-xl border px-3 py-2.5 text-sm leading-relaxed focus:outline-none ${
                            carePortalDark ? '' : 'border-gray-200 focus:border-[#1D9E75]'
                          } ${versionChrome.className}`}
                          style={
                            carePortalDark
                              ? {
                                  borderColor: 'var(--cp-border)',
                                  backgroundColor: 'var(--cp-bg)',
                                  color: 'var(--cp-text)',
                                  ...versionChrome.style,
                                }
                              : versionChrome.style
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
                          value={
                            compareMode && pairOriginalDoegn && pairAiDoegn
                              ? compareSource === 'original'
                                ? pairOriginalDoegn.refleksion
                                : pairAiDoegn.refleksion
                              : doegnRefleksion
                          }
                          onChange={(e) => {
                            const v = e.target.value;
                            if (compareMode && pairOriginalDoegn && pairAiDoegn) {
                              if (compareSource === 'original') {
                                setPairOriginalDoegn({ ...pairOriginalDoegn, refleksion: v });
                              } else {
                                setPairAiDoegn({ ...pairAiDoegn, refleksion: v });
                              }
                            } else {
                              setDoegnRefleksion(v);
                            }
                          }}
                          placeholder="Beskriv faglig vurdering og næste skridt…"
                          rows={5}
                          className={`w-full resize-y rounded-xl border px-3 py-2.5 text-sm leading-relaxed focus:outline-none ${
                            carePortalDark ? '' : 'border-gray-200 focus:border-[#1D9E75]'
                          } ${versionChrome.className}`}
                          style={
                            carePortalDark
                              ? {
                                  borderColor: 'var(--cp-border)',
                                  backgroundColor: 'var(--cp-bg)',
                                  color: 'var(--cp-text)',
                                  ...versionChrome.style,
                                }
                              : versionChrome.style
                          }
                        />
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <input
                        value={
                          compareMode && pairOriginalOther && pairAiOther
                            ? compareSource === 'original'
                              ? pairOriginalOther.title
                              : pairAiOther.title
                            : title
                        }
                        onChange={(e) => {
                          const v = e.target.value;
                          if (compareMode && pairOriginalOther && pairAiOther) {
                            if (compareSource === 'original') {
                              setPairOriginalOther({ ...pairOriginalOther, title: v });
                            } else {
                              setPairAiOther({ ...pairAiOther, title: v });
                            }
                          } else {
                            setTitle(v);
                          }
                        }}
                        placeholder={
                          category === 'Andet' ? 'Valgfri overskrift (kan udelades)' : 'Overskrift'
                        }
                        className={`w-full rounded-xl border px-3 py-2 text-sm focus:outline-none ${
                          carePortalDark ? '' : 'border-gray-200 focus:border-[#1D9E75]'
                        } ${versionChrome.className}`}
                        style={
                          carePortalDark
                            ? {
                                borderColor: 'var(--cp-border)',
                                backgroundColor: 'var(--cp-bg)',
                                color: 'var(--cp-text)',
                                ...versionChrome.style,
                              }
                            : versionChrome.style
                        }
                      />
                      <textarea
                        value={
                          compareMode && pairOriginalOther && pairAiOther
                            ? compareSource === 'original'
                              ? pairOriginalOther.body
                              : pairAiOther.body
                            : body
                        }
                        onChange={(e) => {
                          const v = e.target.value;
                          if (compareMode && pairOriginalOther && pairAiOther) {
                            if (compareSource === 'original') {
                              setPairOriginalOther({ ...pairOriginalOther, body: v });
                            } else {
                              setPairAiOther({ ...pairAiOther, body: v });
                            }
                          } else {
                            setBody(v);
                          }
                        }}
                        placeholder={activeCategoryCfg.bodyPlaceholder}
                        rows={9}
                        // eslint-disable-next-line jsx-a11y/no-autofocus
                        autoFocus
                        className={`w-full resize-y rounded-xl border px-3 py-2.5 text-sm leading-relaxed focus:outline-none ${
                          carePortalDark ? '' : 'border-gray-200 focus:border-[#1D9E75]'
                        } ${versionChrome.className}`}
                        style={
                          carePortalDark
                            ? {
                                borderColor: 'var(--cp-border)',
                                backgroundColor: 'var(--cp-bg)',
                                color: 'var(--cp-text)',
                                ...versionChrome.style,
                              }
                            : versionChrome.style
                        }
                      />
                    </div>
                  )}
                  <p
                    className={`mt-1.5 text-[11px] leading-snug ${carePortalDark ? '' : 'text-gray-400'}`}
                    style={carePortalDark ? { color: 'var(--cp-muted2)' } : undefined}
                  >
                    {isDoegnnotat
                      ? 'Døgnnotat har faste sektioner med låste overskrifter. Brug Handling/aktivitet til fakta og Refleksion til refleksion (åben, undrende — ikke nye konklusioner).'
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
                    Kladder vises på overblikket og kan godkendes senere. Godkendt journal tæller
                    som officielt notat (fx overdragelse).
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
            </div>

            {/* Footer */}
            <div
              className={`flex shrink-0 flex-col-reverse gap-2 border-t px-5 py-4 sm:flex-row sm:items-center sm:justify-end ${carePortalDark ? '' : 'border-gray-100 bg-gray-50/90'}`}
              style={
                carePortalDark
                  ? { borderColor: 'var(--cp-border)', backgroundColor: 'var(--cp-bg3)' }
                  : undefined
              }
            >
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
