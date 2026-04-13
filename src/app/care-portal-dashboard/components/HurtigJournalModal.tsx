'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { createPortal } from 'react-dom';
import { BookOpen, Mic, MicOff, Save, Sparkles, X } from 'lucide-react';
import { compareEditorChrome } from '@/components/journal/compareEditorChrome';
import { JournalVersionToggle } from '@/components/journal/JournalVersionToggle';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import { formatJournalEntriesInsertError } from '@/lib/journalEntriesInsertError';
import { resolveStaffOrgResidents } from '@/lib/staffOrgScope';
import { carePortalPilotSimulatedData } from '@/lib/carePortalPilotSimulated';

/** Kun til pilot/demo når der ikke findes rigtige beboere i databasen. */
const DEMO_RESIDENT_OPTIONS = [
  { id: 'res-001', name: 'Anders M.' },
  { id: 'res-002', name: 'Finn L.' },
  { id: 'res-003', name: 'Kirsten R.' },
  { id: 'res-004', name: 'Maja T.' },
  { id: 'res-005', name: 'Thomas B.' },
  { id: 'res-006', name: 'Lena P.' },
] as const;

type ResidentOption = { id: string; name: string };

type SpeechRec = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((ev: Event) => void) | null;
  onerror: ((ev: Event) => void) | null;
  onend: (() => void) | null;
};

function isResidentUuid(value: unknown): value is string {
  return (
    typeof value === 'string' &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
  );
}

function getSpeechRecognitionCtor(): (new () => SpeechRec) | null {
  if (typeof window === 'undefined') return null;
  const w = window as unknown as {
    SpeechRecognition?: new () => SpeechRec;
    webkitSpeechRecognition?: new () => SpeechRec;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export type HurtigJournalModalProps = {
  open: boolean;
  onClose: () => void;
};

export default function HurtigJournalModal({ open, onClose }: HurtigJournalModalProps) {
  const [mounted, setMounted] = useState(false);
  const [residentId, setResidentId] = useState('');
  const [note, setNote] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [polishing, setPolishing] = useState(false);
  const [polishFlash, setPolishFlash] = useState(false);
  const [compareMode, setCompareMode] = useState(false);
  const [compareSource, setCompareSource] = useState<'original' | 'ai'>('ai');
  const [noteOriginal, setNoteOriginal] = useState('');
  const [noteAi, setNoteAi] = useState('');
  const [residents, setResidents] = useState<ResidentOption[]>([]);
  const [residentsLoading, setResidentsLoading] = useState(false);
  const [residentsSource, setResidentsSource] = useState<'live' | 'demo' | null>(null);
  const [saving, setSaving] = useState(false);
  const recognitionRef = useRef<SpeechRec | null>(null);
  const accumulatedRef = useRef('');
  const modalRef = useRef<HTMLDivElement>(null);

  const displayNote = compareMode ? (compareSource === 'original' ? noteOriginal : noteAi) : note;
  const charCount = displayNote.length;
  const showDictationPanel = !compareMode && (isRecording || displayNote.trim() === '');
  const versionChrome = compareEditorChrome(false, compareMode, compareSource);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) {
      setResidents([]);
      setResidentsSource(null);
      setResidentsLoading(false);
      try {
        recognitionRef.current?.abort?.();
      } catch {
        /* ignore */
      }
      recognitionRef.current = null;
      setIsRecording(false);
      setNote('');
      setResidentId('');
      setPolishing(false);
      setPolishFlash(false);
      setSaving(false);
      setCompareMode(false);
      setCompareSource('ai');
      setNoteOriginal('');
      setNoteAi('');
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setResidentsLoading(true);
    setResidentsSource(null);

    void (async () => {
      const supabase = createClient();
      if (!supabase) {
        if (!cancelled) {
          setResidents([]);
          setResidentsLoading(false);
        }
        return;
      }

      const { orgId, error } = await resolveStaffOrgResidents(supabase);
      if (cancelled) return;

      if (error !== null || !orgId) {
        const pilot = carePortalPilotSimulatedData();
        if (pilot) {
          setResidents([...DEMO_RESIDENT_OPTIONS]);
          setResidentsSource('demo');
        } else {
          setResidents([]);
          setResidentsSource(null);
        }
        setResidentsLoading(false);
        return;
      }

      const { data: rows, error: rowsErr } = await supabase
        .from('care_residents')
        .select('user_id, display_name')
        .eq('org_id', orgId)
        .order('display_name');

      if (cancelled) return;

      if (rowsErr || !rows?.length) {
        const pilot = carePortalPilotSimulatedData();
        if (pilot) {
          setResidents([...DEMO_RESIDENT_OPTIONS]);
          setResidentsSource('demo');
        } else {
          setResidents([]);
          setResidentsSource('live');
        }
        setResidentsLoading(false);
        return;
      }

      setResidents(
        rows
          .filter((r) => isResidentUuid(r.user_id))
          .map((r) => ({
            id: r.user_id as string,
            name: String(r.display_name ?? '').trim() || '—',
          }))
      );
      setResidentsSource('live');
      setResidentsLoading(false);
    })();

    return () => {
      cancelled = true;
    };
  }, [open]);

  const stopRecognition = useCallback(() => {
    try {
      recognitionRef.current?.stop();
    } catch {
      /* ignore */
    }
    recognitionRef.current = null;
    setIsRecording(false);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const noteRef = useRef(displayNote);
  noteRef.current = displayNote;

  const toggleRecording = useCallback(() => {
    const Ctor = getSpeechRecognitionCtor();
    if (!Ctor) {
      toast.error('Diktat understøttes ikke i denne browser');
      return;
    }

    if (compareMode) {
      toast.message('Afslut sammenligning for at diktere ind i ét felt.');
      return;
    }

    if (isRecording) {
      stopRecognition();
      return;
    }

    accumulatedRef.current = noteRef.current;
    const rec = new Ctor();
    rec.lang = 'da-DK';
    rec.continuous = true;
    rec.interimResults = true;

    rec.onresult = (event: Event) => {
      const ev = event as unknown as {
        resultIndex: number;
        results: { length: number; [i: number]: { isFinal: boolean; 0: { transcript: string } } };
      };
      let interim = '';
      let addFinal = '';
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const r = ev.results[i];
        const t = r[0]?.transcript ?? '';
        if (r.isFinal) addFinal += t;
        else interim += t;
      }
      accumulatedRef.current += addFinal;
      const combined = (accumulatedRef.current + interim).replace(/\s+/g, (m) =>
        m.length > 1 ? ' ' : m
      );
      setNote(combined.trimStart());
    };

    rec.onerror = () => {
      setIsRecording(false);
      recognitionRef.current = null;
      toast.error('Diktat blev afbrudt');
    };

    rec.onend = () => {
      setIsRecording(false);
      recognitionRef.current = null;
    };

    recognitionRef.current = rec;
    try {
      rec.start();
      setIsRecording(true);
    } catch {
      toast.error('Kunne ikke starte diktat');
      recognitionRef.current = null;
    }
  }, [compareMode, isRecording, stopRecognition]);

  const polishWithAi = useCallback(async () => {
    const raw = (
      compareMode ? (compareSource === 'original' ? noteOriginal : noteAi) : note
    ).trim();
    if (!raw) return;
    const selected = residents.find((r) => r.id === residentId);
    setPolishing(true);
    try {
      if (!compareMode) {
        setNoteOriginal(note.trim());
      }
      const response = await fetch('/api/portal/journal-polish', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          draft: raw,
          category: 'Andet',
          residentLabel: selected?.name ?? '',
        }),
      });
      const data = (await response.json()) as {
        text?: string;
        polished?: string;
        error?: string;
      };
      if (!response.ok) {
        if (!compareMode) setNoteOriginal('');
        toast.error(data.error ?? 'AI kunne ikke forbedre noten');
        return;
      }
      const polishedText = (data.text ?? data.polished ?? '').trim();
      if (polishedText) {
        setNoteAi(polishedText);
        setCompareMode(true);
        setCompareSource('ai');
        setPolishFlash(true);
        window.setTimeout(() => setPolishFlash(false), 1600);
      } else {
        if (!compareMode) setNoteOriginal('');
        toast.error('Tomt svar fra AI');
      }
    } catch {
      if (!compareMode) setNoteOriginal('');
      toast.error('Netværksfejl');
    } finally {
      setPolishing(false);
    }
  }, [compareMode, compareSource, note, noteAi, noteOriginal, residentId, residents]);

  const dismissJournalCompare = useCallback(() => {
    if (!compareMode) return;
    const picked = compareSource === 'original' ? noteOriginal : noteAi;
    setNote(picked);
    setCompareMode(false);
    setCompareSource('ai');
    setNoteOriginal('');
    setNoteAi('');
  }, [compareMode, compareSource, noteAi, noteOriginal]);

  const save = useCallback(async () => {
    const res = residents.find((r) => r.id === residentId);
    const textToSave = (
      compareMode ? (compareSource === 'original' ? noteOriginal : noteAi) : note
    ).trim();
    if (!res || !textToSave) {
      toast.error('Vælg beboer og skriv et notat');
      return;
    }

    const isDemoId = residentId.startsWith('res-');
    if (isDemoId || residentsSource === 'demo') {
      toast.success(`Demo: notat ville være gemt for ${res.name}`, {
        className: 'border-budr-teal/40',
      });
      onClose();
      return;
    }

    setSaving(true);
    const supabase = createClient();
    if (!supabase) {
      toast.error('Forbindelsesfejl');
      setSaving(false);
      return;
    }

    const {
      data: { user },
    } = await supabase.auth.getUser();
    const staffName =
      (user?.user_metadata?.full_name as string | undefined) ?? user?.email ?? 'Ukendt personale';

    const insertRow: Record<string, unknown> = {
      resident_id: residentId,
      staff_id: user?.id ?? null,
      staff_name: staffName,
      entry_text: textToSave,
      category: 'Andet',
      journal_status: 'kladde',
      show_in_diary: true,
      approved_at: null,
      approved_by: null,
    };

    const missingColumnError = (err: { message?: string } | null, column: string) =>
      !!err &&
      String(err.message ?? '')
        .toLowerCase()
        .includes(column.toLowerCase());

    const payload = { ...insertRow };
    let { error: insErr } = await supabase.from('journal_entries').insert(payload);

    if (missingColumnError(insErr, 'show_in_diary')) {
      delete payload.show_in_diary;
      ({ error: insErr } = await supabase.from('journal_entries').insert(payload));
    }
    if (missingColumnError(insErr, 'approved_at')) {
      delete payload.approved_at;
      ({ error: insErr } = await supabase.from('journal_entries').insert(payload));
    }
    if (missingColumnError(insErr, 'approved_by')) {
      delete payload.approved_by;
      ({ error: insErr } = await supabase.from('journal_entries').insert(payload));
    }
    if (missingColumnError(insErr, 'journal_status')) {
      delete payload.journal_status;
      ({ error: insErr } = await supabase.from('journal_entries').insert(payload));
    }

    setSaving(false);

    if (insErr) {
      console.error('[HurtigJournalModal] insert', insErr);
      toast.error(formatJournalEntriesInsertError(insErr));
      return;
    }

    window.dispatchEvent(new CustomEvent('portal-journal-updated', { detail: { residentId } }));

    toast.success(`Kladde gemt for ${res.name} — findes på Aftenopsamling`, {
      className: 'border-budr-teal/40',
    });
    onClose();
  }, [
    compareMode,
    compareSource,
    note,
    noteAi,
    noteOriginal,
    residentId,
    residents,
    residentsSource,
    onClose,
  ]);

  if (!mounted || !open) return null;

  const modal = (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-sm"
      style={{ backgroundColor: 'rgb(15 23 42 / 0.45)' }}
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={modalRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="hurtig-journal-title"
        className="relative flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-xl border border-gray-100 bg-white shadow-xl transition-all duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 z-10 rounded-lg p-1.5 text-gray-400 transition-all duration-200 hover:bg-gray-100 hover:text-gray-600"
          aria-label="Luk"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 pb-3 pt-5">
          <div className="mb-3 flex items-center gap-2 pr-10">
            <BookOpen className="h-5 w-5 shrink-0 text-budr-purple" aria-hidden />
            <div>
              <h2 id="hurtig-journal-title" className="text-sm font-semibold text-gray-900">
                Hurtigt stikord
              </h2>
              <details className="mt-1 text-[11px] leading-snug text-gray-500">
                <summary className="cursor-pointer font-medium text-gray-600 underline-offset-2 hover:underline">
                  Kladde, dagbog og Aftenopsamling
                </summary>
                <p className="mt-2">
                  Gemmes som <strong className="font-medium text-gray-700">kladde</strong> med «Vis
                  i dagbog». Om aftenen samler I på{' '}
                  <Link
                    href="/resident-360-view/dagbog"
                    className="font-medium text-budr-purple underline"
                  >
                    Aftenopsamling
                  </Link>{' '}
                  til ét professionelt notat med AI.
                </p>
              </details>
            </div>
          </div>

          <div className="mb-4">
            <label
              htmlFor="hurtig-journal-resident"
              className="mb-1 block text-xs font-medium text-gray-500"
            >
              Beboer
            </label>
            <select
              id="hurtig-journal-resident"
              value={residentId}
              onChange={(e) => setResidentId(e.target.value)}
              disabled={residentsLoading}
              className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm transition-all duration-200 focus:border-budr-purple/50 focus:outline-none focus:ring-2 focus:ring-budr-purple/20 disabled:opacity-60"
            >
              <option value="">{residentsLoading ? 'Henter beboere…' : 'Vælg beboer'}</option>
              {residents.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
            {!residentsLoading && residents.length === 0 && residentsSource !== 'demo' && (
              <p className="mt-1.5 text-xs text-gray-500">
                Ingen beboere i listen — tjek organisationstilknytning eller tilføj beboere.
              </p>
            )}
          </div>

          <div className="mb-2">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <label htmlFor="hurtig-journal-note" className="text-xs font-medium text-gray-600">
                  Notat
                </label>
                <span className="text-[10px] tabular-nums text-gray-400">{charCount} tegn</span>
              </div>
              {(compareMode || !showDictationPanel) && (
                <div className="flex flex-wrap items-center justify-end gap-2">
                  {compareMode && (
                    <>
                      <JournalVersionToggle
                        value={compareSource}
                        onChange={setCompareSource}
                        variant="light"
                      />
                      <button
                        type="button"
                        onClick={dismissJournalCompare}
                        className="text-[11px] font-medium text-gray-500 underline-offset-2 hover:text-gray-700 hover:underline"
                      >
                        Afslut sammenligning
                      </button>
                    </>
                  )}
                  {!showDictationPanel && (
                    <button
                      type="button"
                      onClick={polishWithAi}
                      disabled={polishing || !displayNote.trim()}
                      className="inline-flex items-center gap-1.5 rounded-lg border-2 border-budr-purple bg-white px-3 py-1.5 text-[11px] font-semibold text-budr-purple transition-all duration-200 hover:bg-budr-lavender disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      <Sparkles
                        className={`h-3.5 w-3.5 shrink-0 ${polishing ? 'animate-pulse' : ''}`}
                      />
                      {polishing ? 'Arbejder…' : 'Stram med AI'}
                    </button>
                  )}
                </div>
              )}
            </div>
            {compareMode && (
              <p className="mb-2 flex flex-wrap items-center gap-2 text-[11px] leading-snug text-gray-500">
                <span className="inline-flex items-center gap-1.5 rounded-md bg-gray-100 px-2 py-0.5 text-[10px] font-medium text-gray-600">
                  <span
                    className={`inline-block h-2 w-2 shrink-0 rounded-full ${
                      compareSource === 'ai' ? 'bg-teal-600' : 'bg-amber-500'
                    }`}
                    aria-hidden
                  />
                  {compareSource === 'ai' ? 'Redigerer AI-forslag' : 'Redigerer original'}
                </span>
                <span>
                  Skift med knapperne ovenfor.{' '}
                  <span className="font-semibold text-gray-700">Frit redigér</span> — det du ser
                  gemmes ved «Gem kladde».
                </span>
              </p>
            )}
            <label htmlFor="hurtig-journal-note" className="sr-only">
              Notattekst
            </label>
            <textarea
              id="hurtig-journal-note"
              value={displayNote}
              onChange={(e) => {
                const v = e.target.value;
                if (!compareMode) setNote(v);
                else if (compareSource === 'original') setNoteOriginal(v);
                else setNoteAi(v);
              }}
              rows={5}
              placeholder="Skriv eller diktér en observation..."
              className={`min-h-32 w-full resize-y rounded-xl border border-gray-200 px-3 py-3 text-sm text-gray-900 placeholder:text-gray-400 transition-all duration-200 focus:border-budr-purple/40 focus:outline-none focus:ring-2 focus:ring-budr-purple/15 ${
                polishFlash ? 'border-green-400 ring-2 ring-green-300/60' : ''
              } ${versionChrome.className}`}
              style={versionChrome.style}
            />
          </div>

          {showDictationPanel && (
            <div className="mb-5 flex flex-col items-center py-2">
              <button
                type="button"
                onClick={toggleRecording}
                className={`flex h-12 w-12 items-center justify-center rounded-full text-white shadow-md transition-all duration-200 ${
                  isRecording
                    ? 'bg-red-500 ring-4 ring-red-400/50 ring-offset-2 animate-pulse'
                    : 'bg-budr-purple hover:scale-105'
                }`}
                aria-pressed={isRecording}
                aria-label={isRecording ? 'Stop diktat' : 'Start diktat'}
              >
                {isRecording ? <MicOff className="h-6 w-6" /> : <Mic className="h-6 w-6" />}
              </button>
              <p className="mt-2 text-center text-sm text-gray-500">
                {isRecording ? 'Optager... tryk for at stoppe' : 'Tryk for at diktere'}
              </p>
            </div>
          )}
        </div>

        <div className="flex shrink-0 flex-col gap-2 border-t border-gray-100 bg-gray-50/90 px-5 py-4">
          <button
            type="button"
            onClick={() => void save()}
            disabled={saving || residentsLoading}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-budr-teal py-2.5 text-sm font-semibold text-white transition-all duration-200 hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Save className="h-4 w-4" />
            {saving ? 'Gemmer…' : 'Gem kladde'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 text-sm text-gray-500 transition-all duration-200 hover:text-gray-700"
          >
            Annuller
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
