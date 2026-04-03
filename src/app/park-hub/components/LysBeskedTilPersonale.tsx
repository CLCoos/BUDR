'use client';

import React, { useEffect, useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { LysThemeTokens } from '../lib/lysTheme';

type Props = {
  tokens: LysThemeTokens;
  accent: string;
  firstName: string;
  residentId?: string;
};

const PRESETS = [
  { key: 'hjælp', text: 'Jeg har brug for hjælp til noget 🙋' },
  { key: 'tale', text: 'Jeg vil gerne tale med nogen 💬' },
  { key: 'praktisk', text: 'Jeg mangler noget praktisk 🏠' },
] as const;

type UIState = 'idle' | 'confirm' | 'sent';

export default function LysBeskedTilPersonale({
  tokens: _tokens,
  accent,
  firstName,
  residentId,
}: Props) {
  const [custom, setCustom] = useState('');
  const [pending, setPending] = useState<string | null>(null); // message awaiting confirm
  const [pendingKey, setPendingKey] = useState<string | null>(null);
  const [uiState, setUiState] = useState<UIState>('idle');
  const [saving, setSaving] = useState(false);

  // Auto-hide sent confirmation after 4 seconds
  useEffect(() => {
    if (uiState !== 'sent') return;
    const t = window.setTimeout(() => setUiState('idle'), 4000);
    return () => window.clearTimeout(t);
  }, [uiState]);

  const requestSend = (message: string, key?: string) => {
    if (!message.trim()) return;
    setPending(message.trim());
    setPendingKey(key ?? null);
    setUiState('confirm');
  };

  const confirmSend = async () => {
    if (!pending || saving) return;
    setSaving(true);
    try {
      if (residentId) {
        const supabase = createClient();
        if (supabase) {
          const { data: residentRow } = await supabase
            .from('care_residents')
            .select('org_id')
            .eq('user_id', residentId)
            .maybeSingle();
          const today = new Date().toISOString().slice(0, 10);
          await supabase.from('plan_proposals').insert({
            resident_id: residentId,
            org_id: residentRow?.org_id ?? null,
            plan_date: today,
            user_message: pending,
            proposed_items: [{ title: pending, preset_type: pendingKey ?? null }],
            ai_reasoning: null,
            status: 'pending',
          });
        }
      }
    } catch (err) {
      console.error('LysBeskedTilPersonale save failed', err);
    } finally {
      setSaving(false);
    }
    setCustom('');
    setPending(null);
    setPendingKey(null);
    setUiState('sent');
    void firstName; // satisfy lint
  };

  const cancelSend = () => {
    setPending(null);
    setPendingKey(null);
    setUiState('idle');
  };

  const cardBg = 'var(--lys-bg3)';
  const borderCol = 'var(--lys-border2)';
  const inputBg = 'var(--lys-bg4)';

  // ── Confirmation dialog ───────────────────────────────────────────────────
  if (uiState === 'confirm' && pending) {
    return (
      <section
        className="rounded-2xl p-5 transition-all duration-200"
        style={{
          backgroundColor: cardBg,
          border: `1.5px solid ${accent}44`,
          color: 'var(--lys-text)',
        }}
        aria-live="assertive"
      >
        <p className="text-sm font-bold mb-1">Send denne besked til personalet?</p>
        <p
          className="text-sm rounded-xl px-3 py-2.5 mb-4 leading-relaxed"
          style={{ backgroundColor: inputBg, border: `1px solid ${borderCol}` }}
        >
          {pending}
        </p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={cancelSend}
            className="flex-1 rounded-2xl py-3 text-sm font-semibold transition-all duration-150 active:scale-[0.97]"
            style={{
              backgroundColor: 'var(--lys-bg4)',
              border: `1px solid ${borderCol}`,
              color: 'var(--lys-muted)',
            }}
          >
            Annuller
          </button>
          <button
            type="button"
            onClick={() => void confirmSend()}
            disabled={saving}
            className="flex-1 rounded-2xl py-3 text-sm font-bold text-white transition-all duration-150 active:scale-[0.97] disabled:opacity-50"
            style={{ background: `linear-gradient(135deg, ${accent}, ${accent}cc)` }}
          >
            {saving ? '…' : 'Ja, send'}
          </button>
        </div>
      </section>
    );
  }

  // ── Sent confirmation ─────────────────────────────────────────────────────
  if (uiState === 'sent') {
    return (
      <section
        className="rounded-2xl px-5 py-4 text-center transition-all duration-300"
        style={{
          backgroundColor: `${accent}14`,
          border: `1.5px solid ${accent}33`,
          color: 'var(--lys-text)',
        }}
        aria-live="polite"
      >
        <p className="text-base font-semibold">✓ Personalet har nu modtaget din besked</p>
      </section>
    );
  }

  // ── Guest mode — not linked to a facility ────────────────────────────────
  if (!residentId) {
    return (
      <section
        className="rounded-2xl p-5"
        style={{
          backgroundColor: cardBg,
          border: `1px solid ${borderCol}`,
          color: 'var(--lys-text)',
        }}
      >
        <div className="mb-3 flex items-center gap-2">
          <MessageCircle className="h-5 w-5 shrink-0" style={{ color: accent }} aria-hidden />
          <h2 className="text-sm font-bold">Skriv til personalet</h2>
        </div>
        <p className="text-sm leading-relaxed" style={{ color: 'var(--lys-muted)' }}>
          Denne funktion kræver tilknytning til et bosted. Er du beboer? Spørg personalet om at
          oprette dig.
        </p>
      </section>
    );
  }

  // ── Idle form ─────────────────────────────────────────────────────────────
  return (
    <div
      className="rounded-2xl p-5 transition-all duration-200"
      style={{
        backgroundColor: cardBg,
        border: `1px solid ${borderCol}`,
        color: 'var(--lys-text)',
      }}
      aria-labelledby="lys-besked-heading"
    >
      <div className="mb-3 flex items-center gap-2">
        <MessageCircle className="h-5 w-5 shrink-0" style={{ color: accent }} aria-hidden />
        <h2 id="lys-besked-heading" className="text-sm font-bold">
          Skriv til personalet
        </h2>
      </div>

      <div className="flex flex-col gap-2 mb-4">
        {PRESETS.map((p) => (
          <button
            key={p.key}
            type="button"
            onClick={() => requestSend(p.text, p.key)}
            className="min-h-[44px] rounded-xl px-4 py-2.5 text-left text-sm font-medium transition-all duration-150 active:scale-[0.98]"
            style={{
              border: `1px solid ${borderCol}`,
              backgroundColor: inputBg,
              color: 'var(--lys-text)',
            }}
          >
            {p.text}
          </button>
        ))}
      </div>

      <div className="flex gap-2">
        <input
          type="text"
          value={custom}
          onChange={(e) => setCustom(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && custom.trim()) requestSend(custom);
          }}
          maxLength={200}
          placeholder="Eller skriv selv …"
          className="min-h-[44px] flex-1 rounded-xl px-4 text-sm outline-none transition-all duration-200"
          style={{
            border: `1px solid ${borderCol}`,
            backgroundColor: inputBg,
            color: 'var(--lys-text)',
            caretColor: accent,
          }}
        />
        <button
          type="button"
          disabled={!custom.trim()}
          onClick={() => requestSend(custom, 'custom')}
          className="min-h-[44px] shrink-0 rounded-full px-5 text-sm font-bold text-white transition-all duration-150 disabled:opacity-40 active:scale-95"
          style={{ backgroundColor: accent }}
        >
          Send
        </button>
      </div>
      <p className="mt-2 text-xs" style={{ color: 'var(--lys-muted)' }}>
        Din besked går kun til personalet på dit bosted.
      </p>
    </div>
  );
}
