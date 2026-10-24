'use client';

import React, { useEffect, useState } from 'react';
import { readDemoGuidedTourCompleted } from '@/lib/carePortalDemoGuidedTour';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowRight, X } from 'lucide-react';
import {
  CARE_PORTAL_DEMO_DISCLAIMER_SHORT,
  CARE_PORTAL_DEMO_FACILITY_NAME,
} from '@/lib/carePortalDemoBranding';
import { useDemoGuidedTour } from '@/components/demo/DemoGuidedTourProvider';
import { useDemoFortael } from '@/components/demo/DemoFortael';

type Step = {
  num: number;
  label: string;
  sub: string;
  href?: string;
  action?: 'fortael';
};

const STEPS: Step[] = [
  {
    num: 1,
    label: 'Vagten',
    sub: 'Du er her nu. Mød ind, Nu og Gå hjem viser, hvad der skal ske på vagten.',
  },
  {
    num: 2,
    label: 'Fortæl',
    sub: 'Tryk på mikrofonen og sig, hvad der er sket. BUDR laver notat og overlevering.',
    action: 'fortael',
  },
  {
    num: 3,
    label: 'Borgerens forløb',
    sub: 'Se SK’s side med hendes egne ord, mål og frister.',
    href: '/care-portal-demo/residents/res-sara',
  },
  {
    num: 4,
    label: 'Dokumenter',
    sub: 'Se et udkast til en statusudtalelse, som kontaktpersonen retter og godkender.',
    href: '/care-portal-demo/dokumenter',
  },
  {
    num: 5,
    label: 'Borger-appen Lys',
    sub: 'Se det, borgeren ser på sin egen telefon.',
    href: '/resident-demo',
  },
];

export default function DemoWelcomeOverlay() {
  const router = useRouter();
  const { openFortael } = useDemoFortael();
  const { startGuidedTour, suppressWelcomeOverlays, isTourOpen } = useDemoGuidedTour();
  // Starter lukket, så server og browser tegner det samme; åbnes efter mount.
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!readDemoGuidedTourCompleted()) setOpen(true);
  }, []);

  useEffect(() => {
    if (suppressWelcomeOverlays || isTourOpen) setOpen(false);
  }, [suppressWelcomeOverlays, isTourOpen]);

  function dismiss() {
    setOpen(false);
  }

  function handleStep(step: Step) {
    dismiss();
    if (step.action === 'fortael') openFortael();
    else if (step.href) router.push(step.href);
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[10070] flex items-end justify-center sm:items-center sm:p-4"
      style={{ backgroundColor: 'rgba(10, 13, 20, 0.82)', backdropFilter: 'blur(6px)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) dismiss();
      }}
    >
      <div
        className="relative flex max-h-[100dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl shadow-2xl sm:max-h-[90dvh] sm:rounded-2xl"
        style={{
          backgroundColor: 'var(--cp-bg2)',
          border: '1px solid var(--cp-border2)',
          boxShadow: '0 24px 80px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.04)',
        }}
      >
        {/* Close */}
        <button
          type="button"
          onClick={dismiss}
          className="absolute right-4 top-4 z-10 rounded-lg p-1.5 transition-colors"
          style={{ color: 'var(--cp-muted)' }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = 'var(--cp-text)')}
          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = 'var(--cp-muted)')}
          aria-label="Luk"
        >
          <X size={18} />
        </button>

        <div className="min-h-0 flex-1 overflow-y-auto px-6 pb-4 pt-6 sm:px-7 sm:pt-7">
          {/* Header */}
          <div className="mb-1 flex items-center gap-2">
            <span
              className="h-2 w-2 rounded-full"
              style={{
                backgroundColor: 'var(--cp-green)',
                boxShadow: '0 0 8px var(--cp-green)',
                animation: 'pulse 2s infinite',
              }}
            />
            <span
              className="text-[11px] font-semibold uppercase tracking-[0.14em]"
              style={{ color: 'var(--cp-muted)' }}
            >
              DEMO · {CARE_PORTAL_DEMO_FACILITY_NAME}
            </span>
          </div>

          <h2
            className="mb-1 text-[1.4rem] font-normal leading-tight"
            style={{ fontFamily: 'var(--cp-font)', color: 'var(--cp-text)' }}
          >
            Velkommen til BUDR Care Portal (DEMO)
          </h2>

          <p
            className="mb-2 text-xs font-medium leading-relaxed"
            style={{ color: 'var(--cp-amber)' }}
          >
            {CARE_PORTAL_DEMO_DISCLAIMER_SHORT}
          </p>

          <p className="mb-5 text-sm leading-relaxed" style={{ color: 'var(--cp-muted)' }}>
            Du er <strong style={{ color: 'var(--cp-text)' }}>Lars, medarbejder på dagvagt</strong>{' '}
            på {CARE_PORTAL_DEMO_FACILITY_NAME}. Prøv trinene herunder, eller udforsk selv. Læs mere
            under{' '}
            <Link
              href="/care-portal-demo/om-demo"
              className="font-semibold underline underline-offset-2"
            >
              Om demoen
            </Link>
            .
          </p>

          {/* Steps */}
          <ol className="space-y-2">
            {STEPS.map((step) => (
              <li key={step.num}>
                <button
                  type="button"
                  onClick={() => handleStep(step)}
                  className="group flex w-full items-start gap-3 rounded-xl px-3.5 py-3 text-left transition-all duration-150"
                  style={{
                    backgroundColor: 'var(--cp-bg3)',
                    border: '1px solid var(--cp-border)',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = 'var(--cp-border2)';
                    (e.currentTarget as HTMLElement).style.transform = 'translateX(2px)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.borderColor = 'var(--cp-border)';
                    (e.currentTarget as HTMLElement).style.transform = 'translateX(0)';
                  }}
                >
                  <span
                    className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-bold"
                    style={{ backgroundColor: 'var(--cp-green-dim)', color: 'var(--cp-green)' }}
                  >
                    {step.num}
                  </span>
                  <span className="flex-1 min-w-0">
                    <span
                      className="block text-sm font-semibold leading-snug"
                      style={{ color: 'var(--cp-text)' }}
                    >
                      {step.label}
                    </span>
                    <span
                      className="block text-xs leading-relaxed"
                      style={{ color: 'var(--cp-muted)' }}
                    >
                      {step.sub}
                    </span>
                  </span>
                  <ArrowRight
                    size={15}
                    className="mt-0.5 flex-shrink-0 opacity-0 transition-opacity group-hover:opacity-60"
                    style={{ color: 'var(--cp-muted)' }}
                  />
                </button>
              </li>
            ))}
          </ol>
        </div>

        {/* CTA: står altid synligt i bunden, også på mobil */}
        <div
          className="flex flex-col gap-2 border-t px-6 pt-4 sm:px-7"
          style={{
            borderColor: 'var(--cp-border)',
            paddingBottom: 'max(1rem, env(safe-area-inset-bottom, 0px))',
          }}
        >
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={dismiss}
              className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-white transition-all duration-150 hover:brightness-110 active:scale-[0.98]"
              style={{
                background: 'var(--cp-green)',
                boxShadow: '0 6px 20px color-mix(in srgb, var(--cp-green) 30%, transparent)',
              }}
            >
              Start demo
            </button>
            <button
              type="button"
              onClick={dismiss}
              className="rounded-xl px-4 py-2.5 text-sm transition-colors"
              style={{ color: 'var(--cp-muted)' }}
              onMouseEnter={(e) =>
                ((e.currentTarget as HTMLElement).style.color = 'var(--cp-text)')
              }
              onMouseLeave={(e) =>
                ((e.currentTarget as HTMLElement).style.color = 'var(--cp-muted)')
              }
            >
              Spring over
            </button>
          </div>
          <button
            type="button"
            onClick={() => {
              dismiss();
              startGuidedTour();
            }}
            className="w-full rounded-xl border py-2.5 text-sm font-semibold transition-colors"
            style={{
              borderColor: 'color-mix(in srgb, var(--cp-green) 35%, transparent)',
              color: 'var(--cp-green)',
              backgroundColor: 'var(--cp-green-dim)',
            }}
          >
            Start guidet tour (ca. 5 min.)
          </button>
        </div>
      </div>
    </div>
  );
}
