'use client';

import React from 'react';

export default function SettingsDemoPage() {
  return (
    <div className="mx-auto max-w-lg p-6">
      <h1
        className="text-xl font-semibold"
        style={{ fontFamily: "'DM Serif Display', serif", color: 'var(--cp-text)' }}
      >
        Indstillinger
      </h1>
      <p className="mt-1 text-sm" style={{ color: 'var(--cp-muted)' }}>
        Demo — krisekontakter og organisation administreres efter login.
      </p>
      <div
        className="mt-8 space-y-4 rounded-xl border p-5"
        style={{ borderColor: 'var(--cp-border)', backgroundColor: 'var(--cp-bg2)' }}
      >
        <div>
          <label
            className="text-xs font-medium uppercase tracking-wide"
            style={{ color: 'var(--cp-muted)' }}
          >
            Bosted
          </label>
          <p className="mt-1 text-sm" style={{ color: 'var(--cp-text)' }}>
            Nordlys Botilbud (fiktivt)
          </p>
        </div>
        <div>
          <label
            className="text-xs font-medium uppercase tracking-wide"
            style={{ color: 'var(--cp-muted)' }}
          >
            Vagttelefon (demo)
          </label>
          <p className="mt-1 text-sm tabular-nums" style={{ color: 'var(--cp-text)' }}>
            +45 12 34 56 78
          </p>
        </div>
        <div>
          <label
            className="text-xs font-medium uppercase tracking-wide"
            style={{ color: 'var(--cp-muted)' }}
          >
            Psykiatrisk skadestue
          </label>
          <p className="mt-1 text-sm" style={{ color: 'var(--cp-text)' }}>
            Regionens vagtcentral — som i jeres lokale instruks
          </p>
        </div>
      </div>
    </div>
  );
}
