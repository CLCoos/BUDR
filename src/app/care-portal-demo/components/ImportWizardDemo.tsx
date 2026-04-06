'use client';

import React, { useState } from 'react';
import { Upload, CheckCircle2, FileSpreadsheet, ChevronRight } from 'lucide-react';

export default function ImportWizardDemo() {
  const [step, setStep] = useState<1 | 2 | 3>(1);

  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1
        className="text-xl font-semibold"
        style={{ color: 'var(--cp-text)', fontFamily: "'DM Serif Display', serif" }}
      >
        Dataimport
      </h1>
      <p className="mt-1 text-sm" style={{ color: 'var(--cp-muted)' }}>
        Demo: ingen filer uploades. Sådan ser flowet ud i live-portalen.
      </p>

      <div className="mt-8 flex gap-2">
        {([1, 2, 3] as const).map((s) => (
          <div
            key={s}
            className="flex flex-1 items-center gap-2 rounded-lg border px-3 py-2 text-xs font-medium"
            style={{
              borderColor: step >= s ? 'rgba(45,212,160,0.35)' : 'var(--cp-border)',
              backgroundColor: step >= s ? 'var(--cp-green-dim)' : 'var(--cp-bg2)',
              color: step >= s ? 'var(--cp-green)' : 'var(--cp-muted)',
            }}
          >
            {s}
          </div>
        ))}
      </div>

      {step === 1 && (
        <div
          className="mt-8 rounded-xl border border-dashed p-10 text-center"
          style={{ borderColor: 'var(--cp-border2)', backgroundColor: 'var(--cp-bg2)' }}
        >
          <Upload className="mx-auto mb-3 h-10 w-10" style={{ color: 'var(--cp-muted)' }} />
          <p className="text-sm font-medium" style={{ color: 'var(--cp-text)' }}>
            Træk Excel- eller CSV-fil hertil
          </p>
          <p className="mt-1 text-xs" style={{ color: 'var(--cp-muted)' }}>
            Kolonner mappes automatisk til BUDR-felter
          </p>
          <button
            type="button"
            onClick={() => setStep(2)}
            className="mt-6 inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white"
            style={{ background: 'linear-gradient(135deg, #2dd4a0, #0d9488)' }}
          >
            Simulér valgt fil <ChevronRight size={16} />
          </button>
        </div>
      )}

      {step === 2 && (
        <div className="mt-8 space-y-3">
          <div
            className="flex items-center gap-3 rounded-lg border p-4"
            style={{ borderColor: 'var(--cp-border)', backgroundColor: 'var(--cp-bg2)' }}
          >
            <FileSpreadsheet style={{ color: 'var(--cp-blue)' }} />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium" style={{ color: 'var(--cp-text)' }}>
                beboere_marts_2026.xlsx
              </div>
              <div className="text-xs" style={{ color: 'var(--cp-muted)' }}>
                12 rækker · 6 kolonner genkendt
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={() => setStep(3)}
            className="w-full rounded-lg py-3 text-sm font-semibold text-white"
            style={{ background: 'linear-gradient(135deg, #2dd4a0, #0d9488)' }}
          >
            Gennemse og fortsæt
          </button>
        </div>
      )}

      {step === 3 && (
        <div
          className="mt-8 rounded-xl border p-6 text-center"
          style={{ borderColor: 'var(--cp-border)', backgroundColor: 'var(--cp-bg2)' }}
        >
          <CheckCircle2 className="mx-auto mb-3 h-12 w-12" style={{ color: 'var(--cp-green)' }} />
          <p className="text-sm font-semibold" style={{ color: 'var(--cp-text)' }}>
            Import simuleret fuldført
          </p>
          <p className="mt-2 text-xs" style={{ color: 'var(--cp-muted)' }}>
            I produktion oprettes eller opdateres beboere i jeres organisation. Her sker intet i
            databasen.
          </p>
          <button
            type="button"
            onClick={() => setStep(1)}
            className="mt-6 text-sm font-medium"
            style={{ color: 'var(--cp-blue)' }}
          >
            Start forfra
          </button>
        </div>
      )}
    </div>
  );
}
