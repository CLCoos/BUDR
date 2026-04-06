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
      style={{ backgroundColor: 'rgba(30, 27, 50, 0.45)', backdropFilter: 'blur(5px)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) dismiss();
      }}
    >
      <div className="relative w-full max-w-lg rounded-2xl border border-amber-200/80 bg-amber-50/95 p-7 shadow-2xl">
        <button
          type="button"
          onClick={dismiss}
          className="absolute right-4 top-4 rounded-lg p-1.5 text-amber-700 transition-colors hover:bg-amber-100"
          aria-label="Luk"
        >
          <X size={18} />
        </button>

        <div className="mb-1 flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-[#7F77DD] shadow-[0_0_8px_#7F77DD]" />
          <span className="text-[11px] font-semibold uppercase tracking-[0.14em] text-amber-900/70">
            Demo · Lys (borger-app)
          </span>
        </div>

        <h2 className="mb-1 font-['DM_Serif_Display',serif] text-[1.35rem] font-normal leading-tight text-gray-900">
          Velkommen til Lys
        </h2>

        <p className="mb-5 text-sm leading-relaxed text-amber-950/80">
          Du prøver borgeroplevelsen som <strong className="text-gray-900">Anders M.</strong> —{' '}
          samme flow som i rigtig drift, men med simulerede data.
        </p>

        <ol className="mb-6 space-y-2">
          {STEPS.map((step) => (
            <li key={step.num}>
              <button
                type="button"
                onClick={() => handleStep(step)}
                className="group flex w-full items-start gap-3 rounded-xl border border-amber-200/90 bg-white/90 px-3.5 py-3 text-left transition-all duration-150 hover:border-[#7F77DD]/40 hover:shadow-sm"
              >
                <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center rounded-full bg-[#7F77DD]/15 text-[11px] font-bold text-[#5a52b8]">
                  {step.num}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold leading-snug text-gray-900">
                    {step.label}
                  </span>
                  <span className="block text-xs leading-relaxed text-gray-600">{step.sub}</span>
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
            className="flex-1 rounded-xl bg-gradient-to-br from-[#8b84e8] via-[#5E56C0] to-[#4c3d91] py-2.5 text-sm font-semibold text-white shadow-lg shadow-[#5E56C0]/25 transition-all hover:brightness-110 active:scale-[0.98]"
          >
            Gå til Lys
          </button>
          <button
            type="button"
            onClick={dismiss}
            className="rounded-xl px-4 py-2.5 text-sm text-amber-900/70 transition-colors hover:text-amber-950"
          >
            Spring over
          </button>
        </div>
      </div>
    </div>
  );
}
