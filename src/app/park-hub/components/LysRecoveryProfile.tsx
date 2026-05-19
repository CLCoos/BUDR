'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  RECOVERY_PROFILE_FIELDS,
  CHIME_LABELS_DA,
  type ChimeDomain,
  type LysRecoveryProfile as LysRecoveryProfileType,
  type RecoveryProfileField,
} from '@/types/lys';
import type { StorageMode } from '@/types/local';
import type { LysThemeTokens } from '../lib/lysTheme';

type LysRecoveryProfileProps = {
  tokens: LysThemeTokens;
  accent: string;
  firstName: string;
  reducedMotion: boolean;
  speak?: (text: string) => void;
  storageMode?: StorageMode;
  activeId?: string | null;
  onBack: () => void;
  onDone?: () => void;
};

const PRIMARY_COLOR = '#7F77DD';

const DOMAIN_ORDER: ChimeDomain[] = ['connectedness', 'hope', 'identity', 'meaning', 'empowerment'];

type ProfileState = Partial<
  Omit<
    LysRecoveryProfileType,
    'id' | 'resident_id' | 'org_id' | 'version' | 'created_at' | 'updated_at'
  >
>;

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error';

export default function LysRecoveryProfile({
  tokens,
  firstName,
  storageMode = 'local',
  onBack,
}: LysRecoveryProfileProps) {
  const [activeDomain, setActiveDomain] = useState<ChimeDomain>('connectedness');
  const [profile, setProfile] = useState<ProfileState>({});
  const [loading, setLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle');
  const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ─── Initial load ─────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    async function loadProfile() {
      try {
        const res = await fetch('/api/lys/recovery-profile', { method: 'GET' });
        if (!res.ok) {
          // Hvis route mangler endnu (404), starter vi med tom profil
          if (res.status === 404) {
            if (!cancelled) setLoading(false);
            return;
          }
          throw new Error('load failed');
        }
        const data = (await res.json()) as { profile: ProfileState | null };
        if (!cancelled && data.profile) {
          setProfile(data.profile);
        }
      } catch {
        // Stille fejl — borger starter bare med tom profil
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    loadProfile();
    return () => {
      cancelled = true;
    };
  }, []);

  // ─── Auto-save med debounce ───────────────────────────
  function scheduleSave(nextProfile: ProfileState) {
    if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
    setSaveStatus('idle');
    saveTimeoutRef.current = setTimeout(() => {
      void saveProfile(nextProfile);
    }, 1500);
  }

  async function saveProfile(nextProfile: ProfileState) {
    setSaveStatus('saving');
    try {
      const res = await fetch('/api/lys/recovery-profile', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(nextProfile),
      });
      if (!res.ok) {
        if (res.status === 404) {
          // Route findes ikke endnu — vis "gemt lokalt" og fortsæt
          setSaveStatus('saved');
          return;
        }
        throw new Error('save failed');
      }
      setSaveStatus('saved');
    } catch {
      setSaveStatus('error');
      toast.error('Kunne ikke gemme lige nu. Prøv igen om lidt.');
    }
  }

  function updateField(key: keyof ProfileState, value: string) {
    const next = { ...profile, [key]: value };
    setProfile(next);
    scheduleSave(next);
  }

  // ─── Felter for aktivt domæne ─────────────────────────
  const fieldsForDomain: RecoveryProfileField[] = useMemo(
    () => RECOVERY_PROFILE_FIELDS.filter((f) => f.domain === activeDomain),
    [activeDomain]
  );

  // ─── Completion-procent ───────────────────────────────
  const completionPct = useMemo(() => {
    const total = RECOVERY_PROFILE_FIELDS.length;
    const filled = RECOVERY_PROFILE_FIELDS.filter((f) => {
      const v = profile[f.key];
      return typeof v === 'string' && v.trim().length > 0;
    }).length;
    return Math.round((filled / total) * 100);
  }, [profile]);

  // ─── Loading state ────────────────────────────────────
  if (loading) {
    return (
      <div
        className="flex items-center justify-center min-h-[480px]"
        style={{ backgroundColor: tokens.bg, color: tokens.text }}
      >
        <Loader2 size={24} className="animate-spin opacity-50" />
      </div>
    );
  }

  return (
    <div
      className="flex flex-col min-h-[480px]"
      style={{ backgroundColor: tokens.bg, color: tokens.text }}
    >
      {/* ─── Header ────────────────────────────────────── */}
      <div className="flex items-center justify-between px-6 pt-6 pb-2">
        <button
          onClick={onBack}
          className="p-2 -ml-2 rounded-lg active:scale-95"
          aria-label="Tilbage"
        >
          <ChevronLeft size={20} />
        </button>
        <div className="text-xs opacity-60 tracking-wider uppercase">Min profil</div>
        <div className="w-9" />
      </div>

      {/* ─── Velkomst + progress ─────────────────────────── */}
      <div className="px-6 pb-5">
        <div className="text-xl font-semibold leading-snug mb-1">
          Det her er om dig, {firstName}
        </div>
        <div className="text-sm opacity-70 leading-relaxed mb-4">
          Udfyld i din egen takt. Du må også gerne springe over.
        </div>

        {/* Progress */}
        <div className="flex items-center gap-3">
          <div
            className="relative h-2 flex-1 rounded-full overflow-hidden"
            style={{ backgroundColor: 'rgba(0,0,0,0.06)' }}
          >
            <div
              className="absolute inset-y-0 left-0 rounded-full transition-all duration-500"
              style={{
                width: `${completionPct}%`,
                backgroundColor: PRIMARY_COLOR,
              }}
            />
          </div>
          <div className="text-xs font-medium tabular-nums opacity-70 min-w-[36px] text-right">
            {completionPct}%
          </div>
        </div>
      </div>

      {/* ─── Domæne-chips ──────────────────────────────── */}
      <div className="px-6 pb-4 overflow-x-auto">
        <div className="flex gap-2 min-w-max">
          {DOMAIN_ORDER.map((domain) => {
            const isActive = activeDomain === domain;
            return (
              <button
                key={domain}
                onClick={() => setActiveDomain(domain)}
                className="px-4 py-2 rounded-full text-xs font-semibold transition-all active:scale-95"
                style={{
                  backgroundColor: isActive ? PRIMARY_COLOR : 'rgba(0,0,0,0.04)',
                  color: isActive ? 'white' : tokens.text,
                }}
              >
                {CHIME_LABELS_DA[domain]}
              </button>
            );
          })}
        </div>
      </div>

      {/* ─── Felter for aktivt domæne ──────────────────── */}
      <div className="flex-1 px-6 pb-6 overflow-y-auto">
        <div className="space-y-4">
          {fieldsForDomain.map((field) => {
            const value = (profile[field.key] as string | undefined) ?? '';
            return (
              <div
                key={field.key}
                className="rounded-2xl p-4"
                style={{ backgroundColor: tokens.cardBg }}
              >
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xl" aria-hidden>
                    {field.emoji}
                  </span>
                  <div className="text-sm font-medium leading-snug">{field.residentPrompt}</div>
                </div>
                <textarea
                  value={value}
                  onChange={(e) => updateField(field.key, e.target.value)}
                  placeholder="Skriv her hvis du vil..."
                  className="w-full text-sm rounded-xl p-3 resize-none border focus:outline-none transition-colors"
                  style={{
                    borderColor: value ? PRIMARY_COLOR : 'rgba(0,0,0,0.08)',
                    backgroundColor: tokens.bg,
                    color: tokens.text,
                    minHeight: '70px',
                  }}
                  rows={3}
                />
              </div>
            );
          })}
        </div>
      </div>

      {/* ─── Footer: save-status ─────────────────────────── */}
      <div className="px-6 py-3 border-t" style={{ borderColor: 'rgba(0,0,0,0.05)' }}>
        <div className="flex items-center justify-center gap-1.5 text-xs opacity-50">
          {saveStatus === 'saving' && (
            <>
              <Loader2 size={12} className="animate-spin" />
              <span>Gemmer...</span>
            </>
          )}
          {saveStatus === 'saved' && (
            <>
              <Check size={12} />
              <span>{storageMode === 'supabase' ? 'Gemt' : 'Gemt lokalt'}</span>
            </>
          )}
          {saveStatus === 'idle' && <span>Skriv frit — det gemmes automatisk</span>}
          {saveStatus === 'error' && <span>Kunne ikke gemme</span>}
        </div>
      </div>
    </div>
  );
}
