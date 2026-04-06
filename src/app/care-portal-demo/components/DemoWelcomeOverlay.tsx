'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, X } from 'lucide-react';

type Step = {
  num: number;
  label: string;
  sub: string;
  href?: string;
  action?: 'resident';
};

const STEPS: Step[] = [
  {
    num: 1,
    label: 'Dagsoverblik',
    sub: 'Du er her nu — se alarmer, medicin og beboerliste.',
  },
  {
    num: 2,
    label: 'En beboer i rød',
    sub: 'Klik på Finn Larsen → 360°-visning med journal, medicin og AI-brief.',
    href: '/care-portal-demo/residents/res-002',
  },
  {
    num: 3,
    label: 'Overrapport med AI',
    sub: 'Klik "Overrapport" øverst — se AI-udkast til vagtskifte.',
  },
  {
    num: 4,
    label: 'Faglig støtte',
    sub: 'Sidebar → Faglig støtte — stil et fagligt spørgsmål.',
    href: '/care-portal-demo/assistant',
  },
  {
    num: 5,
    label: 'Borger-app (Lys)',
    sub: 'Se hvad borgeren ser — journal, have og daglige mål.',
    action: 'resident',
  },
];

type Props = {
  /** Kun når overlayet ligger på dashboard-siden; ellers åbnes overrapport via URL. */
  onOpenOverrapport?: () => void;
};

export default function DemoWelcomeOverlay({ onOpenOverrapport }: Props) {
  const [open, setOpen] = useState(true);
  const router = useRouter();

  function dismiss() {
    setOpen(false);
  }

  function handleStep(step: Step) {
    dismiss();
    if (step.action === 'resident') {
      router.push('/resident-demo');
    } else if (step.href) {
      router.push(step.href);
    } else if (step.num === 3) {
      if (onOpenOverrapport) {
        onOpenOverrapport();
      } else {
        router.push('/care-portal-demo?openOverrapport=1');
      }
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[10070] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(10, 13, 20, 0.82)', backdropFilter: 'blur(6px)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) dismiss();
      }}
    >
      <div
        className="relative w-full max-w-lg rounded-2xl p-7 shadow-2xl"
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
          className="absolute right-4 top-4 rounded-lg p-1.5 transition-colors"
          style={{ color: 'var(--cp-muted)' }}
          onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = 'var(--cp-text)')}
          onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = 'var(--cp-muted)')}
          aria-label="Luk"
        >
          <X size={18} />
        </button>

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
            Demo · Bosted Solhaven
          </span>
        </div>

        <h2
          className="mb-1 text-[1.4rem] font-normal leading-tight"
          style={{ fontFamily: "'DM Serif Display', serif", color: 'var(--cp-text)' }}
        >
          Velkommen til BUDR Care Portal
        </h2>

        <p className="mb-5 text-sm leading-relaxed" style={{ color: 'var(--cp-muted)' }}>
          Du er <strong style={{ color: 'var(--cp-text)' }}>Sara K., dagvagt</strong> på Bosted
          Solhaven — mandag morgen. En beboer er i rød, en er ikke mødt til morgenmad. Prøv trinene
          herunder, eller udforsk selv.
        </p>

        {/* Steps */}
        <ol className="mb-6 space-y-2">
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
                  style={{ backgroundColor: 'rgba(139, 132, 232, 0.2)', color: '#c4bffc' }}
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

        {/* CTA */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={dismiss}
            className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-white transition-all duration-150 hover:brightness-110 active:scale-[0.98]"
            style={{
              background: 'linear-gradient(135deg, #8b84e8 0%, #5E56C0 55%, #4c3d91 100%)',
              boxShadow: '0 6px 20px rgba(94, 86, 192, 0.35)',
            }}
          >
            Start demo
          </button>
          <button
            type="button"
            onClick={dismiss}
            className="rounded-xl px-4 py-2.5 text-sm transition-colors"
            style={{ color: 'var(--cp-muted)' }}
            onMouseEnter={(e) => ((e.currentTarget as HTMLElement).style.color = 'var(--cp-text)')}
            onMouseLeave={(e) => ((e.currentTarget as HTMLElement).style.color = 'var(--cp-muted)')}
          >
            Spring over
          </button>
        </div>
      </div>
    </div>
  );
}
