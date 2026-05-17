'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  Plus,
  Check,
  Pause,
  Play,
  Trash2,
  ArrowLeft,
  CheckCircle2,
  Loader2,
  X,
} from 'lucide-react';
import type { LysNextStep, NextStepStatus } from '@/types/lys';
import type { StorageMode } from '@/types/local';
import type { LysThemeTokens } from '../lib/lysTheme';

type LysNextStepsProps = {
  tokens: LysThemeTokens;
  accent?: string;
  firstName?: string;
  reducedMotion?: boolean;
  onBack?: () => void;
  onDone?: () => void;
  storageMode?: StorageMode;
};

type ListTab = Extract<NextStepStatus, 'aktiv' | 'fuldført' | 'sat på pause'>;

const PRIMARY_COLOR = '#7F77DD';

const TABS: { key: ListTab; label: string }[] = [
  { key: 'aktiv', label: 'Aktive' },
  { key: 'fuldført', label: 'Fuldførte' },
  { key: 'sat på pause', label: 'På pause' },
];

function formatRelative(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const sec = Math.floor(diffMs / 1000);
  if (sec < 60) return 'lige nu';
  const min = Math.floor(sec / 60);
  if (min < 60) return `for ${min} min siden`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `for ${hr} t siden`;
  const day = Math.floor(hr / 24);
  if (day === 1) return 'i går';
  if (day < 7) return `for ${day} dage siden`;
  const week = Math.floor(day / 7);
  if (week < 4) return `for ${week} uger siden`;
  const month = Math.floor(day / 30);
  if (month < 12) return `for ${month} mdr siden`;
  return new Date(iso).toLocaleDateString('da-DK');
}

export default function LysNextSteps({
  tokens,
  firstName,
  reducedMotion,
  onBack,
}: LysNextStepsProps) {
  const [activeTab, setActiveTab] = useState<ListTab>('aktiv');
  const [steps, setSteps] = useState<LysNextStep[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; title: string } | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [newDescription, setNewDescription] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchSteps = useCallback(async (tab: ListTab) => {
    setLoading(true);
    try {
      const res = await fetch(`/api/lys/next-step?status=${encodeURIComponent(tab)}`, {
        credentials: 'same-origin',
      });
      if (res.status === 404) {
        setSteps([]);
        return;
      }
      if (!res.ok) {
        toast.error('Kunne ikke hente');
        setSteps([]);
        return;
      }
      const data = (await res.json()) as { steps?: LysNextStep[] };
      setSteps(data.steps ?? []);
    } catch {
      toast.error('Kunne ikke hente');
      setSteps([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchSteps(activeTab);
  }, [activeTab, fetchSteps]);

  async function handleCreate() {
    const title = newTitle.trim();
    if (!title) return;
    setSaving(true);
    try {
      const res = await fetch('/api/lys/next-step', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({
          title,
          description: newDescription.trim() || undefined,
        }),
      });
      if (res.status === 404) {
        toast.error('Kunne ikke gemme — prøv igen');
        return;
      }
      if (!res.ok) {
        toast.error('Kunne ikke gemme — prøv igen');
        return;
      }
      const data = (await res.json()) as { step: LysNextStep };
      if (activeTab === 'aktiv') {
        setSteps((prev) => [data.step, ...prev]);
      }
      setShowAddDialog(false);
      setNewTitle('');
      setNewDescription('');
      toast.success('Tilføjet');
    } catch {
      toast.error('Kunne ikke gemme — prøv igen');
    } finally {
      setSaving(false);
    }
  }

  async function patchStatus(step: LysNextStep, status: NextStepStatus) {
    const prev = steps;
    setSteps((list) => list.filter((s) => s.id !== step.id));
    try {
      const res = await fetch(`/api/lys/next-step/${step.id}`, {
        method: 'PATCH',
        headers: { 'content-type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ status }),
      });
      if (!res.ok) {
        setSteps(prev);
        toast.error('Kunne ikke opdatere');
        return;
      }
      const data = (await res.json()) as { step: LysNextStep };
      if (data.step.status === activeTab) {
        setSteps((list) => [data.step, ...list.filter((s) => s.id !== data.step.id)]);
      }
    } catch {
      setSteps(prev);
      toast.error('Kunne ikke opdatere');
    }
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    const { id } = deleteTarget;
    const prev = steps;
    setSteps((list) => list.filter((s) => s.id !== id));
    setDeleteTarget(null);
    try {
      const res = await fetch(`/api/lys/next-step/${id}`, {
        method: 'DELETE',
        credentials: 'same-origin',
      });
      if (!res.ok) {
        setSteps(prev);
        toast.error('Kunne ikke slette');
      }
    } catch {
      setSteps(prev);
      toast.error('Kunne ikke slette');
    }
  }

  const transitionClass = reducedMotion ? '' : 'transition-all duration-200';

  return (
    <div
      className="flex flex-col min-h-[480px] relative pb-24"
      style={{ backgroundColor: tokens.bg, color: tokens.text }}
    >
      <div className="flex items-center justify-between px-6 pt-6 pb-2">
        {onBack ? (
          <button
            type="button"
            onClick={onBack}
            className="p-2 -ml-2 rounded-lg active:scale-95 flex items-center gap-1"
            aria-label="Tilbage"
          >
            <ArrowLeft size={20} />
          </button>
        ) : (
          <div className="w-9" />
        )}
        <div className="text-xs opacity-60 tracking-wider uppercase">Næste skridt</div>
        <div className="w-9" />
      </div>

      {firstName ? (
        <div className="px-6 pb-3 text-sm opacity-70">Dine skridt, {firstName}</div>
      ) : null}

      <div className="px-6 pb-4 flex gap-2">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-2 rounded-full text-xs font-semibold active:scale-95 ${transitionClass}`}
              style={{
                backgroundColor: isActive ? PRIMARY_COLOR : tokens.cardBg,
                color: isActive ? 'white' : tokens.text,
                borderWidth: 1,
                borderColor: isActive ? PRIMARY_COLOR : tokens.cardBorder,
              }}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      <div className="flex-1 px-6 overflow-y-auto">
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 size={24} className={reducedMotion ? '' : 'animate-spin opacity-50'} />
          </div>
        ) : steps.length === 0 ? (
          <div className="text-center py-12 px-4">
            {activeTab === 'aktiv' ? (
              <>
                <CheckCircle2
                  size={40}
                  className="mx-auto mb-4 opacity-30"
                  style={{ color: PRIMARY_COLOR }}
                />
                <p className="text-sm leading-relaxed opacity-70">
                  Du har ingen næste skridt endnu. Lav et lille, konkret skridt du vil tage.
                </p>
              </>
            ) : (
              <p className="text-sm opacity-70">Ingen skridt her lige nu.</p>
            )}
          </div>
        ) : (
          <ul className="space-y-3">
            {steps.map((step) => (
              <li
                key={step.id}
                className={`rounded-2xl p-4 flex gap-3 ${transitionClass}`}
                style={{
                  backgroundColor: tokens.cardBg,
                  borderWidth: 1,
                  borderColor: tokens.cardBorder,
                }}
              >
                <div className="flex-1 min-w-0">
                  <div className="font-semibold text-sm leading-snug mb-1">{step.title}</div>
                  {step.description ? (
                    <p className="text-xs opacity-70 leading-relaxed mb-1">{step.description}</p>
                  ) : null}
                  <p className="text-xs opacity-50">{formatRelative(step.created_at)}</p>
                </div>
                <div className="flex flex-col gap-2 shrink-0">
                  {step.status === 'aktiv' && (
                    <>
                      <button
                        type="button"
                        onClick={() => void patchStatus(step, 'fuldført')}
                        className="p-2 rounded-xl active:scale-95"
                        style={{ backgroundColor: `${PRIMARY_COLOR}18`, color: PRIMARY_COLOR }}
                        aria-label="Markér som fuldført"
                      >
                        <Check size={18} />
                      </button>
                      <button
                        type="button"
                        onClick={() => void patchStatus(step, 'sat på pause')}
                        className="p-2 rounded-xl active:scale-95"
                        style={{ backgroundColor: 'rgba(0,0,0,0.05)', color: tokens.text }}
                        aria-label="Sæt på pause"
                      >
                        <Pause size={18} />
                      </button>
                    </>
                  )}
                  {(step.status === 'fuldført' || step.status === 'sat på pause') && (
                    <button
                      type="button"
                      onClick={() => void patchStatus(step, 'aktiv')}
                      className="p-2 rounded-xl active:scale-95"
                      style={{ backgroundColor: `${PRIMARY_COLOR}18`, color: PRIMARY_COLOR }}
                      aria-label="Genaktiver"
                    >
                      <Play size={18} />
                    </button>
                  )}
                  {step.created_by_type === 'resident' && (
                    <button
                      type="button"
                      onClick={() => setDeleteTarget({ id: step.id, title: step.title })}
                      className="p-2 rounded-xl active:scale-95"
                      style={{ backgroundColor: 'rgba(0,0,0,0.05)', color: tokens.textMuted }}
                      aria-label="Slet"
                    >
                      <Trash2 size={18} />
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div
        className="fixed bottom-0 left-0 right-0 px-6 py-4 border-t max-w-lg mx-auto"
        style={{
          backgroundColor: tokens.bg,
          borderColor: tokens.cardBorder,
        }}
      >
        <button
          type="button"
          onClick={() => setShowAddDialog(true)}
          className={`w-full py-3.5 rounded-2xl text-sm font-semibold text-white flex items-center justify-center gap-2 active:scale-[0.98] ${transitionClass}`}
          style={{ backgroundColor: PRIMARY_COLOR }}
        >
          <Plus size={18} />
          Tilføj næste skridt
        </button>
      </div>

      {showAddDialog && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
          role="dialog"
          aria-modal="true"
          aria-labelledby="add-step-title"
        >
          <div
            className="w-full max-w-md rounded-2xl p-6 shadow-xl"
            style={{ backgroundColor: tokens.cardBg, color: tokens.text }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 id="add-step-title" className="text-lg font-semibold">
                Nyt næste skridt
              </h2>
              <button
                type="button"
                onClick={() => setShowAddDialog(false)}
                className="p-2 rounded-lg"
                aria-label="Luk"
              >
                <X size={20} />
              </button>
            </div>
            <label className="block text-sm font-medium mb-1.5">Hvad er dit næste skridt?</label>
            <input
              type="text"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value.slice(0, 120))}
              maxLength={120}
              className="w-full text-sm rounded-xl p-3 border mb-4 focus:outline-none"
              style={{
                borderColor: newTitle ? PRIMARY_COLOR : tokens.cardBorder,
                backgroundColor: tokens.bg,
                color: tokens.text,
              }}
              placeholder="Fx gå en kort tur"
            />
            <label className="block text-sm font-medium mb-1.5">
              Beskriv det evt. lidt mere (frivilligt)
            </label>
            <textarea
              value={newDescription}
              onChange={(e) => setNewDescription(e.target.value.slice(0, 500))}
              maxLength={500}
              rows={3}
              className="w-full text-sm rounded-xl p-3 border mb-6 resize-none focus:outline-none"
              style={{
                borderColor: tokens.cardBorder,
                backgroundColor: tokens.bg,
                color: tokens.text,
              }}
              placeholder="Skriv her hvis du vil..."
            />
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowAddDialog(false)}
                className="flex-1 py-3 rounded-xl text-sm font-medium border"
                style={{ borderColor: tokens.cardBorder, color: tokens.text }}
              >
                Annullér
              </button>
              <button
                type="button"
                onClick={() => void handleCreate()}
                disabled={!newTitle.trim() || saving}
                className="flex-1 py-3 rounded-xl text-sm font-semibold text-white disabled:opacity-50 flex items-center justify-center gap-2"
                style={{ backgroundColor: PRIMARY_COLOR }}
              >
                {saving ? (
                  <Loader2 size={16} className={reducedMotion ? '' : 'animate-spin'} />
                ) : null}
                Gem
              </button>
            </div>
          </div>
        </div>
      )}

      {deleteTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: 'rgba(0,0,0,0.4)' }}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-sm rounded-2xl p-6 shadow-xl"
            style={{ backgroundColor: tokens.cardBg, color: tokens.text }}
          >
            <h2 className="text-lg font-semibold mb-2">Slet skridt?</h2>
            <p className="text-sm opacity-70 mb-6 leading-relaxed">
              «{deleteTarget.title}» fjernes permanent.
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-3 rounded-xl text-sm font-medium border"
                style={{ borderColor: tokens.cardBorder, color: tokens.text }}
              >
                Annullér
              </button>
              <button
                type="button"
                onClick={() => void confirmDelete()}
                className="flex-1 py-3 rounded-xl text-sm font-semibold text-white"
                style={{ backgroundColor: PRIMARY_COLOR }}
              >
                Slet
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
