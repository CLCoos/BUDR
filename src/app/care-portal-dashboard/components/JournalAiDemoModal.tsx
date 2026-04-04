'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { BookOpen, RefreshCw, Save, Sparkles, X } from 'lucide-react';
import { toast } from 'sonner';
import { CARE_DEMO_RESIDENT_PROFILES } from '@/lib/careDemoResidents';
import { getJournalDemoDraft } from '@/lib/journalDemoDrafts';

export type JournalAiDemoModalProps = {
  open: boolean;
  onClose: () => void;
};

const GEN_MS = 850;

export default function JournalAiDemoModal({ open, onClose }: JournalAiDemoModalProps) {
  const [mounted, setMounted] = useState(false);
  const [residentId, setResidentId] = useState('');
  const [lysSummary, setLysSummary] = useState('');
  const [handling, setHandling] = useState('');
  const [reflection, setReflection] = useState('');
  const [generating, setGenerating] = useState(false);
  const genTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const clearTimer = useCallback(() => {
    if (genTimerRef.current) {
      clearTimeout(genTimerRef.current);
      genTimerRef.current = null;
    }
  }, []);

  const applyDraft = useCallback((id: string) => {
    const draft = getJournalDemoDraft(id);
    if (!draft) {
      setLysSummary('Demo: ingen foruddefineret skabelon for denne beboer.');
      setHandling(
        'Standard observation: Borgeren deltog i dagligdagen efter aftale. Ingen særlige hændelser noteret i demo-perioden.'
      );
      setReflection(
        'Demo-refleksion: Journaludkast genereres normalt ud fra Lys-check-in, aktivitet og teamets observationer. Vælg en anden beboer for at se varieret indhold.'
      );
      return;
    }
    setLysSummary(draft.lysSummary);
    setHandling(draft.handling);
    setReflection(draft.reflection);
  }, []);

  const runGeneration = useCallback(
    (id: string) => {
      clearTimer();
      if (!id) {
        setLysSummary('');
        setHandling('');
        setReflection('');
        setGenerating(false);
        return;
      }
      setGenerating(true);
      setLysSummary('');
      setHandling('');
      setReflection('');
      genTimerRef.current = setTimeout(() => {
        applyDraft(id);
        setGenerating(false);
        genTimerRef.current = null;
      }, GEN_MS);
    },
    [applyDraft, clearTimer]
  );

  useEffect(() => {
    if (!open) {
      clearTimer();
      setResidentId('');
      setLysSummary('');
      setHandling('');
      setReflection('');
      setGenerating(false);
    }
  }, [open, clearTimer]);

  useEffect(() => {
    if (!open) return;
    if (!residentId) {
      clearTimer();
      setGenerating(false);
      setLysSummary('');
      setHandling('');
      setReflection('');
      return;
    }
    runGeneration(residentId);
    return () => clearTimer();
  }, [open, residentId, runGeneration, clearTimer]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && open) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const residentLabel = CARE_DEMO_RESIDENT_PROFILES.find((r) => r.id === residentId);

  const saveDemo = useCallback(() => {
    if (!residentId || !handling.trim() || !reflection.trim()) {
      toast.error('Vælg beboer og sørg for at begge sektioner har indhold');
      return;
    }
    const name = residentLabel?.displayName ?? 'beboer';
    toast.success(`Demo: journaludkast gemt for ${name}`, {
      description: 'I drift godkendes udkast før endelig journalføring.',
    });
    onClose();
  }, [residentId, handling, reflection, residentLabel, onClose]);

  const regen = useCallback(() => {
    if (!residentId) return;
    runGeneration(residentId);
  }, [residentId, runGeneration]);

  if (!mounted || !open) return null;

  const inputStyle: React.CSSProperties = {
    backgroundColor: 'var(--cp-bg3)',
    border: '1px solid var(--cp-border)',
    color: 'var(--cp-text)',
    borderRadius: 10,
  };

  const modal = (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 backdrop-blur-sm"
      style={{ backgroundColor: 'rgb(8 12 22 / 0.55)' }}
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="journal-ai-demo-title"
        className="relative max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl border p-5 shadow-2xl sm:p-6"
        style={{
          backgroundColor: 'var(--cp-bg2)',
          borderColor: 'var(--cp-border)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 rounded-lg p-1.5 transition-colors"
          style={{ color: 'var(--cp-muted)' }}
          aria-label="Luk"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="mb-4 flex flex-wrap items-start gap-2 pr-10">
          <BookOpen
            className="mt-0.5 h-5 w-5 shrink-0"
            style={{ color: 'var(--cp-purple, #8b84e8)' }}
          />
          <div>
            <h2
              id="journal-ai-demo-title"
              className="text-base font-semibold"
              style={{ color: 'var(--cp-text)' }}
            >
              Journaludkast fra AI
            </h2>
            <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--cp-muted)' }}>
              Demo: udkast genereres ud fra <strong style={{ color: 'var(--cp-text)' }}>Lys</strong>{' '}
              (check-in, humør, tema) og en simuleret dag — tilpasset den valgte beboer. I drift
              godkender personalet altid før journalføring.
            </p>
          </div>
        </div>

        <div
          className="mb-4 inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wider"
          style={{
            backgroundColor: 'var(--cp-amber-dim)',
            color: 'var(--cp-amber)',
            border: '1px solid rgba(246,173,85,0.3)',
          }}
        >
          <Sparkles className="h-3 w-3" aria-hidden />
          Simuleret — ingen data sendes til AI
        </div>

        <div className="mb-4">
          <label
            htmlFor="journal-ai-demo-resident"
            className="mb-1.5 block text-xs font-medium"
            style={{ color: 'var(--cp-muted)' }}
          >
            Beboer
          </label>
          <select
            id="journal-ai-demo-resident"
            value={residentId}
            onChange={(e) => setResidentId(e.target.value)}
            className="w-full px-3 py-2.5 text-sm outline-none transition-colors"
            style={inputStyle}
          >
            <option value="">Vælg beboer for at generere udkast</option>
            {CARE_DEMO_RESIDENT_PROFILES.map((r) => (
              <option key={r.id} value={r.id}>
                {r.initials} — {r.displayName} (Hus {r.house})
              </option>
            ))}
          </select>
        </div>

        {residentId && (
          <>
            <div
              className="mb-4 rounded-xl px-3 py-2.5 text-xs leading-relaxed"
              style={{
                backgroundColor: 'var(--cp-bg3)',
                border: '1px solid var(--cp-border)',
                color: 'var(--cp-muted)',
              }}
            >
              <span className="font-semibold" style={{ color: 'var(--cp-blue)' }}>
                Kontekst (Lys + dag)
              </span>
              {generating ? (
                <p className="mt-2 animate-pulse" style={{ color: 'var(--cp-muted2)' }}>
                  Henter signaler fra Lys og sammensætter udkast…
                </p>
              ) : (
                <p className="mt-2">{lysSummary || '—'}</p>
              )}
            </div>

            <div className="mb-3">
              <label
                htmlFor="journal-ai-handling"
                className="mb-1.5 block text-xs font-semibold uppercase tracking-wide"
                style={{ color: 'var(--cp-text)' }}
              >
                1 · Handling / aktivitet
              </label>
              <textarea
                id="journal-ai-handling"
                value={handling}
                onChange={(e) => setHandling(e.target.value)}
                rows={6}
                disabled={generating}
                className="w-full resize-y px-3 py-2.5 text-sm leading-relaxed outline-none transition-colors disabled:opacity-50"
                style={inputStyle}
                placeholder={generating ? '…' : 'Observationer og handlinger i det ydre…'}
              />
            </div>

            <div className="mb-4">
              <label
                htmlFor="journal-ai-reflection"
                className="mb-1.5 block text-xs font-semibold uppercase tracking-wide"
                style={{ color: 'var(--cp-text)' }}
              >
                2 · Refleksion
              </label>
              <textarea
                id="journal-ai-reflection"
                value={reflection}
                onChange={(e) => setReflection(e.target.value)}
                rows={5}
                disabled={generating}
                className="w-full resize-y px-3 py-2.5 text-sm leading-relaxed outline-none transition-colors disabled:opacity-50"
                style={inputStyle}
                placeholder={generating ? '…' : 'Faglig refleksion og evt. opfølgning…'}
              />
            </div>

            <button
              type="button"
              onClick={regen}
              disabled={generating}
              className="mb-5 flex w-full items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-xs font-medium transition-all disabled:cursor-not-allowed disabled:opacity-50"
              style={{
                border: '1px solid var(--cp-border)',
                color: 'var(--cp-muted)',
                backgroundColor: 'var(--cp-bg3)',
              }}
            >
              <RefreshCw className={`h-3.5 w-3.5 ${generating ? 'animate-spin' : ''}`} />
              Generér udkast på ny
            </button>
          </>
        )}

        <div
          className="flex flex-col gap-2 border-t pt-4"
          style={{ borderColor: 'var(--cp-border)' }}
        >
          <button
            type="button"
            onClick={saveDemo}
            disabled={!residentId || generating}
            className="flex w-full items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-semibold text-white transition-all disabled:cursor-not-allowed disabled:opacity-45"
            style={{
              background: 'linear-gradient(135deg, #2dd4a0 0%, #1D9E75 100%)',
            }}
          >
            <Save className="h-4 w-4" />
            Gem udkast (demo)
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2 text-sm transition-colors"
            style={{ color: 'var(--cp-muted)' }}
          >
            Luk
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
