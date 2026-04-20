'use client';

import React, { useEffect, useState } from 'react';
import { Plus, Trash2, X } from 'lucide-react';

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
  helpers: string[];
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
    key: 'crisis_action',
    icon: '🆘',
    title: 'Hvis det går rigtig galt',
    prompt: 'Hvad skal der ske, hvis du er i decideret krise?',
    placeholder: 'Fx ring til X, ring 112, tag mig til skadestuen…',
    color: '#ef4444',
  },
];

const STORAGE_KEY = 'budr_kriseplan_v1';

export function loadKrisePlan(): KrisePlanData {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw) as KrisePlanData;
  } catch {
    /* ignore */
  }
  return { version: 1, updated_at: '', sections: {}, helpers: [] };
}

function savePlan(plan: KrisePlanData) {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...plan, updated_at: new Date().toISOString() })
    );
  } catch {
    /* ignore */
  }
}

type Props = {
  open: boolean;
  onClose: () => void;
  firstName: string;
};

export default function LysKrisePlan({ open, onClose, firstName }: Props) {
  const [plan, setPlan] = useState<KrisePlanData>(() =>
    typeof window !== 'undefined'
      ? loadKrisePlan()
      : { version: 1, updated_at: '', sections: {}, helpers: [] }
  );
  const [activeSection, setActiveSection] = useState<string | null>(null);
  const [newHelper, setNewHelper] = useState('');
  const [saved, setSaved] = useState(false);

  // Re-load from storage whenever sheet opens
  useEffect(() => {
    if (open) setPlan(loadKrisePlan());
  }, [open]);

  // Prevent body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  const updateSection = (key: string, value: string) => {
    setPlan((p) => ({
      ...p,
      sections: { ...p.sections, [key]: value },
      updated_at: new Date().toISOString(),
    }));
  };

  const addHelper = () => {
    if (!newHelper.trim()) return;
    setPlan((p) => ({
      ...p,
      helpers: [...p.helpers, newHelper.trim()],
      updated_at: new Date().toISOString(),
    }));
    setNewHelper('');
  };

  const removeHelper = (i: number) => {
    setPlan((p) => ({
      ...p,
      helpers: p.helpers.filter((_, idx) => idx !== i),
      updated_at: new Date().toISOString(),
    }));
  };

  const handleSave = () => {
    savePlan({ ...plan, updated_at: new Date().toISOString() });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const filledCount = SECTIONS.filter((s) => plan.sections[s.key]?.trim()).length;
  const updatedAt = plan.updated_at
    ? new Date(plan.updated_at).toLocaleDateString('da-DK', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
      })
    : null;

  void firstName;

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ backgroundColor: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="flex w-full max-w-[430px] flex-col"
        style={{
          backgroundColor: 'var(--lys-bg2)',
          borderRadius: '20px 20px 0 0',
          maxHeight: '92dvh',
          animation: 'lysSheetUp 0.28s cubic-bezier(0.32,0.72,0,1)',
        }}
      >
        {/* Drag handle */}
        <div className="flex justify-center pt-3 pb-1 shrink-0">
          <div
            className="h-1 w-10 rounded-full"
            style={{ backgroundColor: 'var(--lys-border2)' }}
          />
        </div>

        {/* Header */}
        <div
          className="flex items-center gap-3 px-5 pt-2 pb-4 shrink-0"
          style={{ borderBottom: '1px solid var(--lys-border)' }}
        >
          <div className="flex-1 min-w-0">
            <h2
              className="font-semibold"
              style={{ fontFamily: "'Fraunces', serif", fontSize: 20, color: 'var(--lys-text)' }}
            >
              Min kriseplan
            </h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--lys-muted)' }}>
              {updatedAt ? `Opdateret ${updatedAt}` : 'Ikke udfyldt endnu'}
            </p>
          </div>
          <div
            className="rounded-full px-2.5 py-1 text-xs font-bold shrink-0"
            style={{ backgroundColor: 'var(--lys-green-dim)', color: 'var(--lys-green)' }}
          >
            {filledCount}/{SECTIONS.length}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 flex items-center justify-center rounded-full shrink-0 transition-all active:scale-90"
            style={{ backgroundColor: 'var(--lys-bg4)' }}
            aria-label="Luk"
          >
            <X className="h-4 w-4" style={{ color: 'var(--lys-muted)' }} />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto px-5 pt-4 pb-8 space-y-3">
          {/* Intro */}
          <p className="text-sm leading-relaxed px-1" style={{ color: 'var(--lys-muted)' }}>
            Dette er din plan — ikke personalets. Du bestemmer hvad der står her, og du kan ændre
            det når som helst.
          </p>

          {/* Accordion sections */}
          {SECTIONS.map((s) => {
            const value = plan.sections[s.key] ?? '';
            const isOpen = activeSection === s.key;
            const filled = value.trim().length > 0;
            return (
              <div
                key={s.key}
                className="rounded-2xl overflow-hidden transition-all duration-200"
                style={{
                  backgroundColor: 'var(--lys-bg3)',
                  border: isOpen ? `1px solid ${s.color}30` : '1px solid var(--lys-border)',
                }}
              >
                <button
                  type="button"
                  className="w-full px-4 py-3.5 text-left flex items-center gap-3"
                  onClick={() => setActiveSection(isOpen ? null : s.key)}
                >
                  <span className="text-lg shrink-0">{s.icon}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm" style={{ color: 'var(--lys-text)' }}>
                      {s.title}
                    </p>
                    {filled && !isOpen && (
                      <p className="text-xs mt-0.5 truncate" style={{ color: 'var(--lys-muted)' }}>
                        {value}
                      </p>
                    )}
                  </div>
                  {filled && (
                    <span className="text-xs font-bold shrink-0" style={{ color: s.color }}>
                      ✓
                    </span>
                  )}
                  <span className="text-xs shrink-0" style={{ color: 'var(--lys-muted)' }}>
                    {isOpen ? '▲' : '▼'}
                  </span>
                </button>

                {isOpen && (
                  <div className="px-4 pb-4">
                    <p className="text-xs mb-2" style={{ color: 'var(--lys-muted)' }}>
                      {s.prompt}
                    </p>
                    <textarea
                      value={value}
                      onChange={(e) => updateSection(s.key, e.target.value)}
                      rows={4}
                      placeholder={s.placeholder}
                      autoFocus
                      className="w-full rounded-xl px-3 py-2.5 text-sm leading-relaxed resize-none outline-none"
                      style={{
                        backgroundColor: `${s.color}0d`,
                        border: `1.5px solid ${s.color}25`,
                        color: 'var(--lys-text)',
                        caretColor: s.color,
                      }}
                    />
                  </div>
                )}
              </div>
            );
          })}

          {/* Hjælpere / kontakter */}
          <div
            className="rounded-2xl px-4 py-4 space-y-3"
            style={{ backgroundColor: 'var(--lys-bg3)', border: '1px solid var(--lys-border)' }}
          >
            <p className="font-semibold text-sm" style={{ color: 'var(--lys-text)' }}>
              👥 Hvem kan hjælpe mig?
            </p>
            <p className="text-xs" style={{ color: 'var(--lys-muted)' }}>
              Navne, telefonnumre eller relationer du stoler på
            </p>

            {plan.helpers.map((h, i) => (
              <div key={i} className="flex items-center gap-2">
                <span className="flex-1 text-sm" style={{ color: 'var(--lys-text)' }}>
                  {h}
                </span>
                <button
                  type="button"
                  onClick={() => removeHelper(i)}
                  className="h-7 w-7 flex items-center justify-center rounded-full"
                  style={{ backgroundColor: 'rgba(239,68,68,0.10)' }}
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
                onChange={(e) => setNewHelper(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    addHelper();
                  }
                }}
                placeholder="Tilføj navn eller nummer…"
                className="flex-1 rounded-xl px-3 py-2.5 text-sm outline-none"
                style={{
                  backgroundColor: 'var(--lys-bg4)',
                  border: '1px solid var(--lys-border2)',
                  color: 'var(--lys-text)',
                }}
              />
              <button
                type="button"
                onClick={addHelper}
                disabled={!newHelper.trim()}
                className="h-10 w-10 flex items-center justify-center rounded-xl text-white disabled:opacity-40"
                style={{ backgroundColor: 'var(--lys-green)' }}
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
            style={{ backgroundColor: 'var(--lys-green)' }}
          >
            {saved ? '✓ Gemt' : 'Gem kriseplan'}
          </button>

          <p className="text-xs text-center" style={{ color: 'var(--lys-muted2)' }}>
            Planen gemmes lokalt på din enhed — kun du kan se den.
          </p>
        </div>
      </div>
    </div>
  );
}
