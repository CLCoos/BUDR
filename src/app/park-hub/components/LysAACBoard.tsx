'use client';

import React, { useState } from 'react';
import { ArrowLeft, Send } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import type { LysThemeTokens } from '../lib/lysTheme';

// ── Symbol grid ───────────────────────────────────────────────────────────────

type Symbol = {
  id: string;
  emoji: string;
  label: string;
  category: 'behov' | 'følelse' | 'aktivitet' | 'sted';
  message: string; // the actual text sent to staff
};

const SYMBOLS: Symbol[] = [
  // Behov
  { id: 'mad',       emoji: '🍽',  label: 'Mad',       category: 'behov',     message: 'Jeg er sulten og har brug for mad' },
  { id: 'vand',      emoji: '💧',  label: 'Vand',      category: 'behov',     message: 'Jeg er tørstig og vil gerne have vand' },
  { id: 'toilet',    emoji: '🚽',  label: 'Toilet',    category: 'behov',     message: 'Jeg har brug for at komme på toilettet' },
  { id: 'hvile',     emoji: '🛏',  label: 'Hvile',     category: 'behov',     message: 'Jeg har brug for at hvile mig' },
  { id: 'hjælp',     emoji: '🙋',  label: 'Hjælp',     category: 'behov',     message: 'Jeg har brug for hjælp' },
  { id: 'ro',        emoji: '🤫',  label: 'Ro',        category: 'behov',     message: 'Jeg har brug for ro og stille omgivelser' },
  // Følelse
  { id: 'glad',      emoji: '😊',  label: 'Glad',      category: 'følelse',   message: 'Jeg har det godt og er glad' },
  { id: 'ked',       emoji: '😢',  label: 'Trist',     category: 'følelse',   message: 'Jeg har det svært og er trist' },
  { id: 'bange',     emoji: '😨',  label: 'Bange',     category: 'følelse',   message: 'Jeg er bange og utryg' },
  { id: 'vred',      emoji: '😠',  label: 'Vred',      category: 'følelse',   message: 'Jeg er vred og frustreret' },
  { id: 'træt',      emoji: '😴',  label: 'Træt',      category: 'følelse',   message: 'Jeg er meget træt' },
  { id: 'smerte',    emoji: '🤕',  label: 'Smerte',    category: 'følelse',   message: 'Jeg har smerter eller har det fysisk dårligt' },
  // Aktivitet
  { id: 'tur',       emoji: '🚶',  label: 'Gå tur',    category: 'aktivitet', message: 'Jeg vil gerne gå en tur' },
  { id: 'musik',     emoji: '🎵',  label: 'Musik',     category: 'aktivitet', message: 'Jeg vil gerne høre musik' },
  { id: 'tv',        emoji: '📺',  label: 'TV/Film',   category: 'aktivitet', message: 'Jeg vil gerne se TV eller en film' },
  { id: 'samtale',   emoji: '💬',  label: 'Snak',      category: 'aktivitet', message: 'Jeg vil gerne have en samtale med nogen' },
  // Sted
  { id: 'hjem',      emoji: '🏠',  label: 'Mit rum',   category: 'sted',      message: 'Jeg vil gerne gå til mit eget rum' },
  { id: 'fælles',    emoji: '🛋',  label: 'Fælles',    category: 'sted',      message: 'Jeg vil gerne være i fællesrummet' },
  { id: 'ude',       emoji: '🌳',  label: 'Udenfor',   category: 'sted',      message: 'Jeg vil gerne ud' },
  { id: 'køkken',    emoji: '🍳',  label: 'Køkken',    category: 'sted',      message: 'Jeg vil gerne i køkkenet' },
];

const CATEGORIES: { key: Symbol['category']; label: string; color: string }[] = [
  { key: 'behov',     label: 'Behov',      color: '#3b82f6' },
  { key: 'følelse',   label: 'Følelse',    color: '#8b5cf6' },
  { key: 'aktivitet', label: 'Aktivitet',  color: '#10b981' },
  { key: 'sted',      label: 'Sted',       color: '#f59e0b' },
];

type UIState = 'board' | 'confirm' | 'sent';

type Props = {
  tokens: LysThemeTokens;
  accent: string;
  residentId?: string;
  onClose: () => void;
};

export default function LysAACBoard({ tokens, accent, residentId, onClose }: Props) {
  const [activeCategory, setActiveCategory] = useState<Symbol['category']>('behov');
  const [selected, setSelected] = useState<Symbol | null>(null);
  const [uiState, setUiState] = useState<UIState>('board');
  const [sending, setSending] = useState(false);

  const filtered = SYMBOLS.filter(s => s.category === activeCategory);
  const catColor = CATEGORIES.find(c => c.key === activeCategory)?.color ?? accent;

  const handleSelect = (sym: Symbol) => {
    setSelected(sym);
    setUiState('confirm');
  };

  const handleSend = async () => {
    if (!selected || sending) return;
    setSending(true);
    try {
      if (residentId) {
        const supabase = createClient();
        if (supabase) {
          const { data: resident } = await supabase
            .from('care_residents')
            .select('org_id')
            .eq('user_id', residentId)
            .maybeSingle();
          await supabase.from('plan_proposals').insert({
            resident_id: residentId,
            org_id: resident?.org_id ?? null,
            plan_date: new Date().toISOString().slice(0, 10),
            user_message: selected.message,
            proposed_items: [{ title: selected.message, preset_type: `aac_${selected.id}` }],
            ai_reasoning: null,
            status: 'pending',
          });
        }
      }
    } catch { /* ignore */ }
    finally { setSending(false); }
    setUiState('sent');
  };

  const reset = () => { setSelected(null); setUiState('board'); };

  return (
    <div
      className="mx-auto flex w-full max-w-lg flex-col min-h-dvh"
      style={{ backgroundColor: tokens.bg, color: tokens.text }}
    >
      {/* Top bar */}
      <div className="flex items-center gap-3 px-5 pt-5 pb-4 shrink-0">
        <button
          type="button"
          onClick={uiState !== 'board' ? reset : onClose}
          className="flex h-10 w-10 items-center justify-center rounded-full transition-all active:scale-90"
          style={{ backgroundColor: tokens.cardBg }}
          aria-label="Tilbage"
        >
          <ArrowLeft className="h-5 w-5" style={{ color: tokens.textMuted }} />
        </button>
        <div>
          <h1 className="text-lg font-black tracking-tight">Kommunikationstavle</h1>
          <p className="text-xs" style={{ color: tokens.textMuted }}>Tryk på et billede for at sende en besked</p>
        </div>
      </div>

      {/* Confirmation */}
      {uiState === 'confirm' && selected && (
        <div className="flex-1 flex flex-col items-center justify-center px-6 gap-6">
          <span className="text-8xl">{selected.emoji}</span>
          <div className="text-center">
            <p className="text-xl font-black mb-2" style={{ color: tokens.text }}>{selected.label}</p>
            <p className="text-sm leading-relaxed" style={{ color: tokens.textMuted }}>
              Dette sender til personalet: &ldquo;{selected.message}&rdquo;
            </p>
          </div>
          <div className="w-full space-y-2">
            <button
              type="button"
              onClick={() => void handleSend()}
              disabled={sending}
              className="w-full rounded-2xl py-4 text-base font-bold text-white flex items-center justify-center gap-2 active:scale-[0.98] disabled:opacity-50"
              style={{ background: `linear-gradient(135deg, ${accent}, ${accent}cc)` }}
            >
              <Send className="h-5 w-5" />
              {sending ? 'Sender…' : 'Send til personalet'}
            </button>
            <button
              type="button"
              onClick={reset}
              className="w-full rounded-2xl py-3.5 text-sm font-semibold"
              style={{ backgroundColor: tokens.cardBg, color: tokens.textMuted }}
            >
              Vælg noget andet
            </button>
          </div>
        </div>
      )}

      {/* Sent */}
      {uiState === 'sent' && selected && (
        <div className="flex-1 flex flex-col items-center justify-center px-6 gap-6 text-center">
          <span className="text-7xl">✅</span>
          <div>
            <p className="text-xl font-black mb-2" style={{ color: tokens.text }}>Sendt!</p>
            <p className="text-sm leading-relaxed" style={{ color: tokens.textMuted }}>
              Personalet ved nu at du har brug for hjælp med: {selected.label.toLowerCase()}
            </p>
          </div>
          <button
            type="button"
            onClick={reset}
            className="rounded-2xl px-8 py-3.5 text-sm font-bold text-white"
            style={{ background: `linear-gradient(135deg, ${accent}, ${accent}cc)` }}
          >
            Send en besked mere
          </button>
        </div>
      )}

      {/* Symbol board */}
      {uiState === 'board' && (
        <div className="flex-1 flex flex-col">
          {/* Category tabs */}
          <div className="flex gap-2 px-5 pb-4 shrink-0">
            {CATEGORIES.map(cat => (
              <button
                key={cat.key}
                type="button"
                onClick={() => setActiveCategory(cat.key)}
                className="flex-1 rounded-xl py-2 text-xs font-bold transition-all duration-150"
                style={{
                  backgroundColor: activeCategory === cat.key ? cat.color : `${cat.color}18`,
                  color: activeCategory === cat.key ? '#fff' : cat.color,
                }}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Symbol grid */}
          <div className="px-5 grid grid-cols-4 gap-3">
            {filtered.map(sym => (
              <button
                key={sym.id}
                type="button"
                onClick={() => handleSelect(sym)}
                className="flex flex-col items-center gap-2 rounded-2xl py-4 px-2 transition-all duration-150 active:scale-90"
                style={{ backgroundColor: tokens.cardBg, boxShadow: tokens.shadow }}
              >
                <span className="text-4xl leading-none">{sym.emoji}</span>
                <span className="text-[11px] font-bold text-center leading-tight" style={{ color: tokens.text }}>
                  {sym.label}
                </span>
              </button>
            ))}
          </div>

          {/* Divider color bar */}
          <div className="mx-5 mt-4 h-1 rounded-full" style={{ backgroundColor: `${catColor}30` }} />
        </div>
      )}
    </div>
  );
}
