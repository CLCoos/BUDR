'use client';

import React, {
  createContext,
  Suspense,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Map, X, ChevronRight, RotateCcw } from 'lucide-react';
import {
  DEMO_GUIDED_TOUR_STEPS,
  DEMO_GUIDED_TOUR_STORAGE_COMPLETED,
} from '@/lib/carePortalDemoGuidedTour';

type DemoGuidedTourContextValue = {
  startGuidedTour: () => void;
  isTourOpen: boolean;
};

const DemoGuidedTourContext = createContext<DemoGuidedTourContextValue | null>(null);

export function useDemoGuidedTour(): DemoGuidedTourContextValue {
  const ctx = useContext(DemoGuidedTourContext);
  if (!ctx) {
    return {
      startGuidedTour: () => {},
      isTourOpen: false,
    };
  }
  return ctx;
}

function isDemoExperiencePath(pathname: string | null): boolean {
  if (!pathname) return false;
  return pathname.startsWith('/care-portal-demo') || pathname === '/resident-demo';
}

function DemoGuidedTourInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();

  const [tourOpen, setTourOpen] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const [tourEverCompleted, setTourEverCompleted] = useState(false);

  const demoPath = isDemoExperiencePath(pathname);

  useEffect(() => {
    try {
      setTourEverCompleted(localStorage.getItem(DEMO_GUIDED_TOUR_STORAGE_COMPLETED) === '1');
    } catch {
      setTourEverCompleted(false);
    }
  }, [tourOpen]);

  const currentStep = DEMO_GUIDED_TOUR_STEPS[stepIndex] ?? DEMO_GUIDED_TOUR_STEPS[0]!;
  const totalSteps = DEMO_GUIDED_TOUR_STEPS.length;
  const isLast = stepIndex >= totalSteps - 1;

  useEffect(() => {
    if (!tourOpen || !currentStep.scrollToId) return;
    const t = window.setTimeout(() => {
      document.getElementById(currentStep.scrollToId!)?.scrollIntoView({
        behavior: 'smooth',
        block: 'start',
      });
    }, 320);
    return () => window.clearTimeout(t);
  }, [tourOpen, currentStep.scrollToId, stepIndex, pathname]);

  const startGuidedTour = useCallback(() => {
    setStepIndex(0);
    setTourOpen(true);
    router.push(DEMO_GUIDED_TOUR_STEPS[0]!.path);
  }, [router]);

  const closeTour = useCallback((markDone: boolean) => {
    setTourOpen(false);
    if (markDone) {
      try {
        window.localStorage.setItem(DEMO_GUIDED_TOUR_STORAGE_COMPLETED, '1');
        setTourEverCompleted(true);
      } catch {
        /* ignore */
      }
    }
  }, []);

  const goNext = useCallback(() => {
    if (isLast) {
      closeTour(true);
      return;
    }
    const next = DEMO_GUIDED_TOUR_STEPS[stepIndex + 1];
    if (next) {
      setStepIndex(stepIndex + 1);
      router.push(next.path);
    }
  }, [closeTour, isLast, router, stepIndex]);

  const skipTour = useCallback(() => {
    closeTour(true);
  }, [closeTour]);

  const restartTour = useCallback(() => {
    setStepIndex(0);
    setTourOpen(true);
    router.push(DEMO_GUIDED_TOUR_STEPS[0]!.path);
  }, [router]);

  const ctxValue = useMemo(
    () => ({
      startGuidedTour,
      isTourOpen: tourOpen,
    }),
    [startGuidedTour, tourOpen]
  );

  return (
    <DemoGuidedTourContext.Provider value={ctxValue}>
      {children}
      {demoPath ? (
        <>
          {!tourOpen ? (
            <button
              type="button"
              onClick={() => {
                setStepIndex(0);
                setTourOpen(true);
                router.push(DEMO_GUIDED_TOUR_STEPS[0]!.path);
              }}
              className="fixed bottom-5 left-4 z-[10065] flex max-w-[min(100vw-2rem,14rem)] items-center gap-2 rounded-full border px-3 py-2 text-left text-xs font-semibold shadow-lg transition-opacity hover:opacity-95 sm:bottom-6 sm:left-6"
              style={{
                borderColor: 'rgba(139, 132, 232, 0.45)',
                backgroundColor: 'var(--cp-bg2)',
                color: 'var(--cp-text)',
                boxShadow: '0 8px 28px rgba(0,0,0,0.35)',
              }}
            >
              <Map className="h-4 w-4 shrink-0 text-[#a5a0e8]" aria-hidden />
              <span className="min-w-0">
                {tourEverCompleted ? 'Genstart tour' : 'Guidet tour'}
                <span className="block text-[10px] font-normal opacity-80">ca. 5 min · DEMO</span>
              </span>
            </button>
          ) : null}

          {tourOpen ? (
            <div
              className="fixed bottom-4 right-4 z-[10065] w-[min(100vw-2rem,22rem)] rounded-2xl border p-4 shadow-2xl sm:bottom-6 sm:right-6"
              style={{
                borderColor: 'var(--cp-border2)',
                backgroundColor: 'var(--cp-bg2)',
                boxShadow: '0 20px 60px rgba(0,0,0,0.45)',
              }}
              role="dialog"
              aria-labelledby="demo-guided-tour-title"
            >
              <div className="mb-3 flex items-start justify-between gap-2">
                <div>
                  <p
                    id="demo-guided-tour-title"
                    className="text-sm font-semibold leading-snug"
                    style={{ color: 'var(--cp-text)' }}
                  >
                    {currentStep.title}
                  </p>
                  <p className="mt-1 text-[11px] font-medium uppercase tracking-wide text-[#c4bffc]">
                    DEMO · trin {stepIndex + 1} af {totalSteps}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => closeTour(false)}
                  className="rounded-lg p-1 transition-colors"
                  style={{ color: 'var(--cp-muted)' }}
                  aria-label="Luk tour"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
              <p className="mb-4 text-sm leading-relaxed" style={{ color: 'var(--cp-muted)' }}>
                {currentStep.body}
              </p>

              {currentStep.isFinal ? (
                <div
                  className="mb-4 space-y-2 rounded-xl border p-3"
                  style={{ borderColor: 'var(--cp-border)' }}
                >
                  <p className="text-xs font-medium" style={{ color: 'var(--cp-text)' }}>
                    Book en samtale om pilot eller få vist live-systemet.
                  </p>
                  <div className="flex flex-col gap-2">
                    <Link
                      href="/institutioner#kontakt"
                      className="inline-flex items-center justify-center rounded-xl py-2.5 text-center text-sm font-semibold text-white transition-opacity hover:opacity-95"
                      style={{
                        background: 'linear-gradient(135deg, #2dd4a0 0%, #0d9488 100%)',
                        boxShadow: '0 2px 12px rgba(45,212,160,0.35)',
                      }}
                    >
                      Kontakt BUDR
                    </Link>
                    <Link
                      href="/care-portal-demo/om-demo"
                      className="text-center text-xs font-semibold underline-offset-2 hover:underline"
                      style={{ color: 'var(--cp-blue)' }}
                    >
                      Læs om demoen
                    </Link>
                  </div>
                </div>
              ) : null}

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={goNext}
                  className="inline-flex min-[360px]:flex-none min-[360px]:px-4 flex-1 items-center justify-center gap-1 rounded-xl py-2.5 text-sm font-semibold text-white transition-opacity hover:opacity-95"
                  style={{
                    background: 'linear-gradient(135deg, #8b84e8 0%, #5E56C0 100%)',
                    boxShadow: '0 4px 16px rgba(94, 86, 192, 0.35)',
                  }}
                >
                  {isLast ? 'Afslut' : 'Næste'}
                  {!isLast ? <ChevronRight className="h-4 w-4" aria-hidden /> : null}
                </button>
                <button
                  type="button"
                  onClick={skipTour}
                  className="rounded-xl px-3 py-2 text-xs font-semibold transition-colors"
                  style={{ color: 'var(--cp-muted)' }}
                >
                  Spring over
                </button>
                <button
                  type="button"
                  onClick={restartTour}
                  className="inline-flex items-center gap-1 rounded-xl px-2 py-2 text-xs font-medium transition-colors"
                  style={{ color: 'var(--cp-muted)' }}
                  title="Start forfra"
                >
                  <RotateCcw className="h-3.5 w-3.5" aria-hidden />
                  Forfra
                </button>
              </div>
            </div>
          ) : null}
        </>
      ) : null}
    </DemoGuidedTourContext.Provider>
  );
}

export default function DemoGuidedTourProvider({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={null}>
      <DemoGuidedTourInner>{children}</DemoGuidedTourInner>
    </Suspense>
  );
}
