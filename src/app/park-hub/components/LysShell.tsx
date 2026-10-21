'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { X } from 'lucide-react';
import { trackEvent } from '@/lib/analytics';
import { lysParkHubShell, lysParkHubShellDark } from '../lib/lysTheme';
import type { LysFlowOverlay } from '../lib/lysOverlay';
import LysBottomNav, { type LysNavTab } from './LysBottomNav';
import { ResidentProvider } from '../context/ResidentContext';
import LysNu, { weeklyDoneKey } from './LysNu';
import LysFortael, { type FortaelTarget } from './LysFortael';
import LysHjaelp from './LysHjaelp';
import LysMinVej from './LysMinVej';
import LysDagTab from './LysDagTab';
import LysJournalTab from './LysJournalTab';
import LysRecoveryProfile from './LysRecoveryProfile';
import LysNextSteps from './LysNextSteps';
import LysWeeklyReflection from './LysWeeklyReflection';
import LysSansekasse from './LysSansekasse';
import LysAACBoard from './LysAACBoard';
import LysOnboarding from './LysOnboarding';
import LysStatusChrome from './LysStatusChrome';
import LysKrisekort from './LysKrisekort';
import LysVagtplan from './LysVagtplan';
import LysMyStories from './LysMyStories';
import { LifeBuoy } from 'lucide-react';

type Props = {
  firstName: string;
  initials: string;
  residentId: string;
  facilityId: string | null;
  /** Sandt i demo-tilstand — viser tydelig markering */
  isDemoMode?: boolean;
};

/** Fuldskærm over layout, men indhold max telefonbredde (matcher `.budr-lys-phone-column`). */
function LysPhoneOverlayShell({
  backgroundColor,
  children,
}: {
  backgroundColor: string;
  children: React.ReactNode;
}) {
  return (
    <div className="fixed inset-0 z-[250] flex justify-center bg-black/35">
      <div
        className="h-full w-full max-w-[430px] overflow-y-auto shadow-2xl"
        style={{ backgroundColor }}
      >
        {children}
      </div>
    </div>
  );
}

export default function LysShell({
  firstName,
  initials,
  residentId,
  facilityId,
  isDemoMode = false,
}: Props) {
  const [now, setNow] = useState(() => new Date());
  const [reducedMotion, setReducedMotion] = useState(false);
  const [tab, setTab] = useState<LysNavTab>('nu');
  const [overlay, setOverlay] = useState<LysFlowOverlay | null>(null);
  /** Hvem Fortæl er forvalgt til, når den åbnes fra et bestemt sted. */
  const [fortaelTarget, setFortaelTarget] = useState<FortaelTarget | null>(null);
  /** Overlay, der skal åbnes igen, når kommunikationstavlen lukkes. */
  const [returnTo, setReturnTo] = useState<LysFlowOverlay | null>(null);
  const [simpleMode, setSimpleMode] = useState(false);
  const [appearance, setAppearance] = useState<'light' | 'dark'>('light');

  const router = useRouter();

  /** Én palet for faner + fuldskærms-flows — følger brugerens lys/mørk-valg */
  const shellTokens = useMemo(
    () => (appearance === 'dark' ? lysParkHubShellDark() : lysParkHubShell()),
    [appearance]
  );
  const shellAccent = shellTokens.accent;

  const openFortael = useCallback((target: FortaelTarget | null = null) => {
    setFortaelTarget(target);
    setOverlay('fortael');
  }, []);

  useEffect(() => {
    const t = window.setInterval(() => setNow(new Date()), 60_000);
    return () => window.clearInterval(t);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const fn = () => setReducedMotion(mq.matches);
    fn();
    mq.addEventListener('change', fn);
    return () => mq.removeEventListener('change', fn);
  }, []);

  useEffect(() => {
    const v = localStorage.getItem('budr-lys-theme');
    if (v === 'dark' || v === 'light') setAppearance(v);
  }, []);

  const toggleAppearance = () => {
    setAppearance((prev) => {
      const next = prev === 'light' ? 'dark' : 'light';
      try {
        localStorage.setItem('budr-lys-theme', next);
      } catch {
        /* ignore */
      }
      return next;
    });
  };

  useEffect(() => {
    if (!residentId) return;
    try {
      const k = `budr_ga_lys_session:${residentId}`;
      if (sessionStorage.getItem(k)) return;
      sessionStorage.setItem(k, '1');
      trackEvent('lys_park_session_start', { demo_mode: isDemoMode ? 1 : 0 });
    } catch {
      /* ignore */
    }
  }, [residentId, isDemoMode]);

  useEffect(() => {
    // Demo: «?enkel=1» viser enkel tilstand, så den kan ses uden en rigtig borger.
    if (isDemoMode) {
      setSimpleMode(new URLSearchParams(window.location.search).get('enkel') === '1');
      return;
    }
    if (!residentId) return;
    let cancelled = false;
    // Borgeren har ikke et Supabase-login, så indstillingen hentes gennem serveren.
    // Hentes ved hver åbning, så personalets valg slår igennem med det samme.
    void fetch('/api/lys/resident-me', { credentials: 'include' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d: { simple_mode?: boolean } | null) => {
        if (!cancelled && d) setSimpleMode(Boolean(d.simple_mode));
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
    };
  }, [residentId, isDemoMode]);

  const handleLogout = async () => {
    try {
      await fetch('/api/resident-session', { method: 'DELETE' });
    } catch {
      // Ryd i det mindste den lokale cookie, selvom serveren ikke svarer
    }
    document.cookie = 'budr_resident_id=; path=/; max-age=0';
    router.replace('/');
  };

  return (
    <ResidentProvider firstName={firstName} initials={initials} residentId={residentId}>
      <div
        className="relative min-h-dvh w-full font-sans transition-colors duration-300"
        style={{ backgroundColor: shellTokens.bg, color: shellTokens.text }}
      >
        <LysStatusChrome tokens={shellTokens} isDemoMode={isDemoMode} />
        <div
          className="w-full transition-all duration-200"
          style={{
            /* Plads til bundmenuen, så det nederste indhold ikke skjules */
            paddingBottom: 'calc(5.5rem + max(1rem, env(safe-area-inset-bottom, 0px)))',
          }}
        >
          <div
            className="sticky top-0 z-20 flex items-center justify-between border-b px-5 py-4 backdrop-blur-xl"
            style={{
              backgroundColor: shellTokens.navBarBg,
              borderColor: shellTokens.cardBorder,
            }}
          >
            <div
              style={{
                fontFamily: "'DM Serif Display', serif",
                fontSize: 22,
                color: shellTokens.accent,
                fontStyle: 'italic',
                lineHeight: 1,
                letterSpacing: '-0.02em',
              }}
            >
              lys
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setOverlay('hjaelp')}
                className="flex h-10 items-center gap-1.5 rounded-full border px-4 text-[15px] font-semibold transition-all active:scale-95"
                style={{
                  backgroundColor: 'rgba(233, 162, 59, 0.16)',
                  color: shellTokens.text,
                  borderColor: 'rgba(233, 162, 59, 0.55)',
                }}
                aria-label="Hjælp: kriseplan, ro og personalet"
              >
                <LifeBuoy size={16} strokeWidth={2} aria-hidden />
                Hjælp
              </button>
              {!simpleMode && (
                <button
                  type="button"
                  onClick={() => setTab('vej')}
                  className="flex h-10 w-10 items-center justify-center rounded-full border text-xs font-semibold"
                  style={{
                    backgroundColor: shellTokens.accentSoft,
                    color: shellTokens.accentSoftText,
                    borderColor: 'rgba(29, 158, 117, 0.35)',
                  }}
                  aria-label="Min vej"
                >
                  {initials || 'B'}
                </button>
              )}
            </div>
          </div>
          <div
            key={tab}
            style={{
              animation: reducedMotion ? undefined : 'lysTabIn 0.22s ease-out',
              minHeight: 'calc(100dvh - 76px)',
            }}
          >
            {(tab === 'nu' || simpleMode) && (
              <LysNu
                firstName={firstName}
                residentId={residentId}
                isDemoMode={isDemoMode}
                tokens={shellTokens}
                accent={shellAccent}
                now={now}
                onSwitchTab={setTab}
                onCheckedIn={() => trackEvent('lys_checkin_done', {})}
                onOpenFortael={openFortael}
                onOpen={setOverlay}
              />
            )}

            {tab === 'dag' && !simpleMode && (
              <LysDagTab tokens={shellTokens} accent={shellAccent} />
            )}

            {tab === 'vej' && !simpleMode && (
              <LysMinVej
                tokens={shellTokens}
                accent={shellAccent}
                firstName={firstName}
                initials={initials}
                appearance={appearance}
                onToggleAppearance={toggleAppearance}
                onOpen={setOverlay}
                onLogout={() => void handleLogout()}
              />
            )}
          </div>
        </div>

        <style>{`
        @keyframes lysTabIn {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

        {overlay === 'fortael' && (
          <LysPhoneOverlayShell backgroundColor={shellTokens.bg}>
            <LysFortael
              residentId={residentId}
              isDemoMode={isDemoMode}
              tokens={shellTokens}
              accent={shellAccent}
              initialTarget={fortaelTarget}
              onClose={() => setOverlay(null)}
              onOpenAac={() => {
                setReturnTo('fortael');
                setOverlay('aac');
              }}
            />
          </LysPhoneOverlayShell>
        )}

        {overlay === 'hjaelp' && (
          <LysPhoneOverlayShell backgroundColor={shellTokens.bg}>
            <LysHjaelp
              tokens={shellTokens}
              accent={shellAccent}
              onClose={() => setOverlay(null)}
              onCrisis={() => setOverlay('crisis')}
              onCalm={() => setOverlay('sanser')}
              onWhoIsHere={() => setOverlay('vagtplan')}
              onWriteStaff={() => openFortael('personale')}
            />
          </LysPhoneOverlayShell>
        )}

        {overlay === 'dagbog' && (
          <LysPhoneOverlayShell backgroundColor={shellTokens.bg}>
            <div className="flex items-center justify-between px-5 pt-5">
              <h1
                className="text-[28px] font-bold leading-tight tracking-[-0.02em]"
                style={{ color: shellTokens.text }}
              >
                Min dagbog
              </h1>
              <button
                type="button"
                onClick={() => setOverlay(null)}
                className="flex h-11 w-11 items-center justify-center rounded-full"
                style={{
                  backgroundColor: shellTokens.cardBg,
                  border: `1px solid ${shellTokens.cardBorder}`,
                  color: shellTokens.text,
                }}
                aria-label="Luk"
              >
                <X size={20} aria-hidden />
              </button>
            </div>
            <LysJournalTab tokens={shellTokens} accent={shellAccent} />
          </LysPhoneOverlayShell>
        )}

        {overlay === 'flower' && (
          <LysPhoneOverlayShell backgroundColor={shellTokens.bg}>
            <LysRecoveryProfile
              tokens={shellTokens}
              accent={shellAccent}
              firstName={firstName}
              reducedMotion={reducedMotion}
              onBack={() => setOverlay(null)}
              onDone={() => setOverlay(null)}
            />
          </LysPhoneOverlayShell>
        )}

        {overlay === 'goals' && (
          <LysPhoneOverlayShell backgroundColor={shellTokens.bg}>
            <LysNextSteps
              tokens={shellTokens}
              accent={shellAccent}
              firstName={firstName}
              reducedMotion={reducedMotion}
              onBack={() => setOverlay(null)}
            />
          </LysPhoneOverlayShell>
        )}

        {overlay === 'weekly' && (
          <LysPhoneOverlayShell backgroundColor={shellTokens.bg}>
            <LysWeeklyReflection
              tokens={shellTokens}
              accent={shellAccent}
              firstName={firstName}
              reducedMotion={reducedMotion}
              onBack={() => setOverlay(null)}
              onDone={() => {
                try {
                  localStorage.setItem(weeklyDoneKey(new Date()), '1');
                } catch {
                  /* ignore */
                }
                setOverlay(null);
              }}
            />
          </LysPhoneOverlayShell>
        )}

        {overlay === 'mineHistorier' && (
          <LysPhoneOverlayShell backgroundColor={shellTokens.bg}>
            <LysMyStories
              tokens={shellTokens}
              accent={shellAccent}
              firstName={firstName}
              reducedMotion={reducedMotion}
              onBack={() => setOverlay(null)}
              onDone={() => setOverlay(null)}
            />
          </LysPhoneOverlayShell>
        )}

        {overlay === 'sanser' && (
          <LysPhoneOverlayShell backgroundColor={shellTokens.bg}>
            <LysSansekasse
              tokens={shellTokens}
              accent={shellAccent}
              onClose={() => setOverlay(null)}
            />
          </LysPhoneOverlayShell>
        )}

        {overlay === 'aac' && (
          <LysPhoneOverlayShell backgroundColor={shellTokens.bg}>
            <LysAACBoard
              tokens={shellTokens}
              accent={shellAccent}
              residentId={residentId}
              onClose={() => {
                setOverlay(returnTo);
                setReturnTo(null);
              }}
            />
          </LysPhoneOverlayShell>
        )}

        {overlay === 'vagtplan' && (
          <LysPhoneOverlayShell backgroundColor={shellTokens.bg}>
            <LysVagtplan
              tokens={shellTokens}
              accent={shellAccent}
              reducedMotion={reducedMotion}
              facilityId={facilityId}
              isDemoMode={isDemoMode}
              onBack={() => setOverlay(null)}
              onOpenCalendar={() => {
                setOverlay(null);
                setTab('dag');
              }}
            />
          </LysPhoneOverlayShell>
        )}

        {overlay === 'crisis' && (
          <LysPhoneOverlayShell backgroundColor="#0F1B2D">
            <LysKrisekort firstName={firstName} onClose={() => setOverlay(null)} />
          </LysPhoneOverlayShell>
        )}

        <LysBottomNav
          tokens={shellTokens}
          active={tab}
          onChange={setTab}
          onFortael={() => openFortael(null)}
          onHjaelp={() => setOverlay('hjaelp')}
          hidden={!!overlay}
          simpleMode={simpleMode}
        />

        <LysOnboarding
          residentId={residentId}
          tokens={shellTokens}
          accent={shellAccent}
          reducedMotion={reducedMotion}
          hidden={!!overlay}
          skip={isDemoMode}
        />
      </div>
    </ResidentProvider>
  );
}
