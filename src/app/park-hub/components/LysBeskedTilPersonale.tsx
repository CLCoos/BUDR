'use client';

import React, { useEffect, useState } from 'react';
import { MessageCircle } from 'lucide-react';
import { toast } from 'sonner';
import { createClient } from '@/lib/supabase/client';
import type { LysThemeTokens } from '../lib/lysTheme';

type Props = {
  tokens: LysThemeTokens;
  accent: string;
  firstName: string;
  residentId?: string;
  contactOnDutyName?: string;
};

const PRESETS = [
  { key: 'hjælp', text: 'Jeg har brug for hjælp til noget 🙋' },
  { key: 'tale', text: 'Jeg vil gerne tale med nogen 💬' },
  { key: 'praktisk', text: 'Jeg mangler noget praktisk 🏠' },
] as const;

export default function LysBeskedTilPersonale({
  tokens,
  accent,
  firstName,
  residentId,
  contactOnDutyName = 'Sara K.',
}: Props) {
  const [custom, setCustom] = useState('');
  const [sent, setSent] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!sent) return;
    const t = window.setTimeout(() => setSent(false), 10_000);
    return () => window.clearTimeout(t);
  }, [sent]);

  const sendMessage = async (message: string, presetType?: string) => {
    const trimmed = message.trim();
    if (!trimmed || saving) return;

    setSaving(true);
    try {
      // Insert into plan_proposals so staff can review the resident's request
      if (residentId) {
        const supabase = createClient();
        if (supabase) {
          // Fetch the resident's org_id for multi-tenant scoping
          const { data: residentRow } = await supabase
            .from('care_residents')
            .select('org_id')
            .eq('user_id', residentId)
            .maybeSingle();

          const today = new Date().toISOString().slice(0, 10);
          const { error } = await supabase.from('plan_proposals').insert({
            resident_id: residentId,
            org_id: residentRow?.org_id ?? null,
            plan_date: today,
            user_message: trimmed,
            // Parse the free-text wish as a minimal proposed item array
            proposed_items: [{ title: trimmed, preset_type: presetType ?? null }],
            ai_reasoning: null, // AI will populate in a follow-up step
            status: 'pending',
          });
          if (error) console.error('plan_proposals insert error', error);
        }
      }
    } catch (err) {
      console.error('LysBeskedTilPersonale save failed', err);
    } finally {
      setSaving(false);
    }

    toast.success(
      `📋 Sendt til portalen. Personalet er besked ✓ — "${trimmed.slice(0, 72)}${trimmed.length > 72 ? '…' : ''}"`,
    );
    setSent(true);
    setCustom('');
    void firstName;
  };

  const isDarkish =
    tokens.bg === '#0F1B2D' || tokens.bg === '#0A1220' || tokens.text.toLowerCase().includes('f5f4ff');

  const cardBg = isDarkish ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.65)';
  const borderCol = isDarkish ? 'rgba(255,255,255,0.1)' : tokens.cardBorder;
  const inputBg = isDarkish ? 'rgba(255,255,255,0.1)' : 'rgba(255,255,255,0.9)';
  const secondary = isDarkish ? 'rgba(255,255,255,0.55)' : tokens.textMuted;

  if (sent) {
    return (
      <section
        className="rounded-2xl border p-4 transition-all duration-200"
        style={{ backgroundColor: cardBg, borderColor: borderCol, color: tokens.text }}
        aria-live="polite"
      >
        <p className="text-center text-lg font-medium leading-relaxed">
          ✓ Din besked er sendt til personalet — {contactOnDutyName} vil se den snart.
        </p>
      </section>
    );
  }

  return (
    <section
      className="rounded-2xl border p-4 transition-all duration-200"
      style={{ backgroundColor: cardBg, borderColor: borderCol, color: tokens.text }}
      aria-labelledby="lys-besked-heading"
    >
      <div className="mb-3 flex items-center gap-2">
        <MessageCircle className="h-5 w-5 shrink-0" style={{ color: accent }} aria-hidden />
        <h2 id="lys-besked-heading" className="text-lg font-semibold">
          Skriv til personalet
        </h2>
      </div>

      <div className="flex flex-col gap-2">
        {PRESETS.map(p => (
          <button
            key={p.key}
            type="button"
            disabled={saving}
            onClick={() => void sendMessage(p.text, p.key)}
            className="min-h-[48px] rounded-2xl border px-4 py-3 text-left text-base font-medium transition-all duration-200 disabled:opacity-50"
            style={{ borderColor: borderCol, backgroundColor: inputBg }}
          >
            {p.text}
          </button>
        ))}
      </div>

      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          type="text"
          value={custom}
          onChange={e => setCustom(e.target.value)}
          maxLength={200}
          placeholder="Eller skriv selv …"
          className="min-h-[48px] flex-1 rounded-xl border px-4 text-base outline-none transition-all duration-200"
          style={{ borderColor: borderCol, backgroundColor: inputBg, color: tokens.text, caretColor: accent }}
        />
        <button
          type="button"
          disabled={!custom.trim() || saving}
          onClick={() => void sendMessage(custom, 'custom')}
          className="min-h-[48px] shrink-0 rounded-full px-6 text-base font-semibold text-white transition-all duration-200 disabled:opacity-40"
          style={{ backgroundColor: accent }}
        >
          {saving ? '…' : 'Send'}
        </button>
      </div>
      <p className="mt-2 text-base" style={{ color: secondary }}>
        Din besked går kun til personalet på dit bosted.
      </p>
    </section>
  );
}
