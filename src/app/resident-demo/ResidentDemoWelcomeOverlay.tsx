'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, X } from 'lucide-react';

type Step = {
  num: number;
  label: string;
  sub: string;
  href?: string;
};

const STEPS: Step[] = [
  {
    num: 1,
    label: 'Du er Anders M. i demo',
    sub: 'Data gemmes kun i denne browser — intet sendes til server som i produktion.',
  },
  {
    num: 2,
    label: 'Check ind & Din dag',
    sub: 'Start på fanen Hjem: humør, dagens opgaver og små sejre.',
  },
  {
    num: 3,
    label: 'Journal, have og mål',
    sub: 'Udforsk fanerne nederst — journal, haven og planer er fyldt med demo-indhold.',
  },
  {
    num: 4,
    label: 'Care Portal (personalet)',
    sub: 'Se teamets overblik, journal og AI-værktøjer i den mørke demo-portal.',
    href: '/care-portal-demo',
  },
];

export default function ResidentDemoWelcomeOverlay() {
  const [open, setOpen] = useState(true);
  const router = useRouter();

  function dismiss() {
    setOpen(false);
  }

  function handleStep(step: Step) {
    dismiss();
    if (step.href) {
      router.push(step.href);
    }
  }

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[10070] flex items-center justify-center p-4"
      style={{ backgroundColor: 'rgba(26, 24, 20, 0.25)', backdropFilter: 'blur(5px)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) dismiss();
      }}
    >
      <div className="relative w-full max-w-lg rounded-2xl border p-7 shadow-2xl" style={{ borderColor: '#E8E3DA', backgroundColor: 'rgba(255,255,255,0.96)' }}>
        <button
          type="button"
          onClick={dismiss}
          className="absolute right-4 top-4 rounded-lg p-1.5 transition-colors hover:bg-[#EBF0FD]"
          style={{ color: '#6B6459' }}
          aria-label="Luk"
        >
          <X size={18} />
        </button>

        <div className="mb-1 flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-[#7F77DD] shadow-[0_0_8px_#7F77DD]" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em]" style={{ color: '#6B6459' }}>
            Demo · Lys (borger-app)
          </span>
        </div>

        <h2 className="mb-1 font-['DM_Serif_Display',serif] text-[1.35rem] font-normal leading-tight" style={{ color: '#1A1814' }}>
          Velkommen til Lys
        </h2>

        <p className="mb-5 text-sm leading-relaxed" style={{ color: '#6B6459' }}>
          Du prøver borgeroplevelsen som <strong style={{ color: '#1A1814' }}>Anders M.</strong> —{' '}
          samme flow som i rigtig drift, men med simulerede data.
        </p>

        <ol className="mb-6 space-y-2">
          {STEPS.map((step) => (
            <li key={step.num}>
              <button
                type="button"
                onClick={() => handleStep(step)}
                className="group flex w-full items-start gap-3 rounded-xl border bg-white/90 px-3.5 py-3 text-left transition-all duration-150 hover:border-[#2D5BE3]/40 hover:shadow-sm"
                style={{ borderColor: '#E8E3DA' }}
              >
                <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full text-[11px] font-bold" style={{ backgroundColor: '#EBF0FD', color: '#2D5BE3' }}>
                  {step.num}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold leading-snug" style={{ color: '#1A1814' }}>
                    {step.label}
                  </span>
                  <span className="block text-xs leading-relaxed" style={{ color: '#6B6459' }}>{step.sub}</span>
                </span>
                <ArrowRight
                  size={15}
                  className="mt-0.5 flex-shrink-0 text-gray-400 opacity-0 transition-opacity group-hover:opacity-70"
                />
              </button>
            </li>
          ))}
        </ol>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={dismiss}
            className="flex-1 rounded-xl py-2.5 text-sm font-semibold text-white shadow-lg transition-all hover:brightness-110 active:scale-[0.98]"
            style={{ background: 'linear-gradient(135deg, #2D5BE3, #4A7FF7)', boxShadow: '0 6px 20px rgba(45,91,227,0.28)' }}
          >
            Gå til Lys
          </button>
          <button
            type="button"
            onClick={dismiss}
            className="rounded-xl px-4 py-2.5 text-sm transition-colors"
            style={{ color: '#6B6459' }}
          >
            Spring over
          </button>
        </div>
      </div>
    </div>
  );
}
