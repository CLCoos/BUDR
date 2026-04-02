'use client';

import React, { useEffect, useState } from 'react';
import { ArrowLeft, Plus, Trash2 } from 'lucide-react';
import type { LysThemeTokens } from '../lib/lysTheme';

// ── Types ─────────────────────────────────────────────────────────────────────

type PlanSection = {
  key: string;
  icon: string;
  title: string;
  prompt: string;
  placeholder: string;
  color: string;
};

type KrisePlanData = {
  version: number;
  updated_at: string;
  sections: Record<string, string>;
  helpers: string[];      // navne/kontakter der hjælper
  warnings: string[];     // advarselstegn / tidlige signaler
  not_helpful: string[];  // hvad personalet IKKE skal gøre
};

const SECTIONS: PlanSection[] = [
  {
    key: 'feeling_ok',
    icon: '🟢',
    title: 'Når jeg har det godt',
    prompt: 'Hvad er normalt for dig — hvad ligner du, når du har det godt?',
    placeholder: 'Fx jeg sover godt, spiser, har lyst til aktiviteter…',
    color: '#22c55e',
  },
  {
    key: 'early_signs',
    icon: '🟡',
    title: 'Tidlige advarselstegn',
    prompt: 'Hvad mærker du selv — eller hvad bemærker andre — før du får det rigtig skidt?',
    placeholder: 'Fx jeg trækker mig, sover dårligt, bliver mere irritabel…',
    color: '#eab308',
  },
  {
    key: 'what_helps',
    icon: '💙',
    title: 'Hvad hjælper mig',
    prompt: 'Hvad hjælper dig, når du begynder at have det svært?',
    placeholder: 'Fx gå en tur, tale med X, musik, undgå mange mennesker…',
    color: '#3b82f6',
  },
  {
    key: 'what_not',
    icon: '🚫',
    title: 'Hvad hjælper IKKE',
    prompt: 'Hvad gør det værre — også hvad personalet ikke skal gøre?',
    placeholder: 'Fx pres mig ikke, lad mig ikke sidde alene, undgå…',
    color: '#ef4444',
  },
  {
    key: 'crisis_action',
    icon: '🆘',
    title: 'Hvis det går rigtig galt',
    prompt: 'Hvad skal der ske, hvis du er i decideret krise?',
    placeholder: 'Fx ring til X, ring 112, tag mig til skadestuen…',
    color: '#dc2626',
  },
];

const STORAGE_KEY = 'budr_kriseplan_v1';

function loadPlan(): KrisePlanData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as KrisePlanData;
  } catch { /* ignore */ }
  return {
    version: 1,
    updated_at: '',
    sections: {},
    helpers: [],
    warnings: [],
    not_helpful: [],
  };
}

function savePlan(plan: KrisePlanData) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...plan, updated_at: new Date().toISOString() }));
  } catch { /* ignore */ }
}

type Props = {
  tokens: LysThemeTokens;
  accent: string;
  firstName: string;
  onClose: () => void;
};

export default function LysKrisePlan({ tokens, accent, firstName, onClose }: Props) {
  const [plan, setPlan] = useState<KrisePlanData>(loadPlan);
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [newHelper, setNewHelper] = useState('');
  const [saved, setSaved] = useState(false);

  // Auto-save on change
  useEffect(() => {
    if (plan.updated_at) savePlan(plan);
  }, [plan]);

  const updateSection = (key: string, value: string) => {
    setPlan(p => ({ ...p, sections: { ...p.sections, [key]: value }, updated_at: new Date().toISOString() }));
  };

  const addHelper = () => {
    if (!newHelper.trim()) return;
    setPlan(p => ({ ...p, helpers: [...p.helpers, newHelper.trim()], updated_at: new Date().toISOString() }));
    setNewHelper('');
  };

  const removeHelper = (i: number) => {
    setPlan(p => ({ ...p, helpers: p.helpers.filter((_, idx) => idx !== i), updated_at: new Date().toISOString() }));
  };

  const handleSave = () => {
    savePlan({ ...plan, updated_at: new Date().toISOString() });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const filledCount = SECTIONS.filter(s => plan.sections[s.key]?.trim()).length;
  const updatedAt = plan.updated_at
    ? new Date(plan.updated_at).toLocaleDateString('da-DK', { day: 'numeric', month: 'short', year: 'numeric' })
    : null;

  return (
    <div className="mx-auto flex w-full max-w-lg flex-col min-h-dvh" style={{ backgroundColor: tokens.bg, color: tokens.text }}>

      {/* Top bar */}
      <div className="flex items-center gap-3 px-5 pt-5 pb-4 shrink-0">
        <button
          type="button"
          onClick={onClose}
          className="flex h-10 w-10 items-center justify-center rounded-full transition-all active:scale-90"
          style={{ backgroundColor: tokens.cardBg }}
          aria-label="Luk"
        >
          <ArrowLeft className="h-5 w-5" style={{ color: tokens.textMuted }} />
        </button>
        <div className="flex-1 min-w-0">
          <h1 className="text-lg font-black tracking-tight">Min kriseplan</h1>
          <p className="text-xs truncate" style={{ color: tokens.textMuted }}>
            {updatedAt ? `Opdateret ${updatedAt}` : 'Ikke gemt endnu'}
          </p>
        </div>
        <div
          className="rounded-full px-3 py-1 text-xs font-bold"
          style={{ backgroundColor: `${accent}18`, color: accent }}
        >
          {filledCount}/{SECTIONS.length}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 pb-24 space-y-3">

        {/* Intro */}
        <div className="rounded-2xl px-4 py-3.5" style={{ backgroundColor: tokens.cardBg, boxShadow: tokens.shadow }}>
          <p className="text-sm leading-relaxed" style={{ color: tokens.textMuted }}>
            Dette er din plan — ikke personalets. Du bestemmer hvad der står her, og du kan ændre det når som helst. Den bruges kun hvis du selv ønsker det.
          </p>
        </div>

        {/* Sections */}
        {SECTIONS.map(s => {
          const value = plan.sections[s.key] ?? '';
          const isOpen = activeSection === s.key;
          const filled = value.trim().length > 0;
          return (
            <div
              key={s.key}
              className="rounded-3xl overflow-hidden transition-all duration-200"
              style={{ backgroundColor: tokens.cardBg, boxShadow: tokens.shadow }}
            >
              <button
                type="button"
                className="w-full px-5 py-4 text-left flex items-center gap-3"
                onClick={() => setActiveSection(isOpen ? null : s.key)}
              >
                <span className="text-xl shrink-0">{s.icon}</span>
                <div className="flex-1 min-w-0">
                  <p className="font-bold text-sm" style={{ color: tokens.text }}>{s.title}</p>
                  {filled && !isOpen && (
                    <p className="text-xs mt-0.5 truncate" style={{ color: tokens.textMuted }}>{value}</p>
                  )}
                </div>
                {filled && (
                  <span className="text-xs font-bold shrink-0" style={{ color: s.color }}>✓</span>
                )}
                <span className="text-sm shrink-0" style={{ color: tokens.textMuted }}>
                  {isOpen ? '▲' : '▼'}
                </span>
              </button>

              {isOpen && (
                <div className="px-5 pb-5">
                  <p className="text-sm mb-2 font-medium" style={{ color: tokens.text }}>{s.prompt}</p>
                  <textarea
                    value={value}
                    onChange={e => updateSection(s.key, e.target.value)}
                    rows={4}
                    placeholder={s.placeholder}
                    autoFocus
                    className="w-full rounded-2xl px-4 py-3 text-sm leading-relaxed resize-none outline-none"
                    style={{
                      backgroundColor: `${s.color}10`,
                      border: `1.5px solid ${s.color}30`,
                      color: tokens.text,
                      caretColor: s.color,
                    }}
                  />
                </div>
              )}
            </div>
          );
        })}

        {/* Hjælpere / kontakter */}
        <div className="rounded-3xl px-5 py-4 space-y-3" style={{ backgroundColor: tokens.cardBg, boxShadow: tokens.shadow }}>
          <p className="font-bold text-sm" style={{ color: tokens.text }}>👥 Hvem kan hjælpe mig?</p>
          <p className="text-xs" style={{ color: tokens.textMuted }}>Navne, telefonnumre eller relationer du stoler på</p>

          {plan.helpers.map((h, i) => (
            <div key={i} className="flex items-center gap-2">
              <span className="flex-1 text-sm" style={{ color: tokens.text }}>{h}</span>
              <button
                type="button"
                onClick={() => removeHelper(i)}
                className="h-7 w-7 flex items-center justify-center rounded-full"
                style={{ backgroundColor: `${accent}15` }}
                aria-label="Fjern"
              >
                <Trash2 className="h-3.5 w-3.5" style={{ color: '#ef4444' }} />
              </button>
            </div>
          ))}

          <div className="flex gap-2">
            <input
              type="text"
              value={newHelper}
              onChange={e => setNewHelper(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addHelper(); } }}
              placeholder="Tilføj navn eller nummer…"
              className="flex-1 rounded-xl px-3 py-2.5 text-sm outline-none"
              style={{
                backgroundColor: `${accent}08`,
                border: `1.5px solid ${accent}20`,
                color: tokens.text,
              }}
            />
            <button
              type="button"
              onClick={addHelper}
              disabled={!newHelper.trim()}
              className="h-10 w-10 flex items-center justify-center rounded-xl text-white disabled:opacity-40"
              style={{ backgroundColor: accent }}
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Save */}
        <button
          type="button"
          onClick={handleSave}
          className="w-full rounded-2xl py-4 text-sm font-bold text-white transition-all active:scale-[0.98]"
          style={{ background: `linear-gradient(135deg, ${accent}, ${accent}cc)` }}
        >
          {saved ? '✓ Gemt' : 'Gem kriseplan'}
        </button>

        <p className="text-xs text-center pb-2" style={{ color: tokens.textMuted }}>
          Planen gemmes lokalt på din enhed — kun du kan se den, medmindre du vælger at dele den.
        </p>

      </div>
    </div>
  );
}
