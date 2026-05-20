'use client';

import React, { useState } from 'react';
import { Brain } from 'lucide-react';

const panelStyle: React.CSSProperties = {
  backgroundColor: 'var(--cp-bg2)',
  borderColor: 'var(--cp-border)',
};

const TRAFFIC_HISTORY: Array<'yellow' | 'green'> = [
  'yellow',
  'yellow',
  'green',
  'yellow',
  'yellow',
  'green',
  'yellow',
];

const DUMMY_SOURCES = [
  {
    date: '19. maj 2026',
    label: 'Journalnotat',
    excerpt: 'Sara virkede urolig efter fællesspisning; paranoid tematik om naboer nævnt kort.',
  },
  {
    date: '20. maj 2026',
    label: 'Daglig check-in',
    excerpt: 'Lav energi, humør 4/10, ønsker ro resten af dagen.',
  },
  {
    date: '17. maj 2026',
    label: 'Lys-samtale',
    excerpt: 'Paranoid tematik om naboer; støttende samtale afsluttet med aftale om tegne-tid.',
  },
  {
    date: '18. maj 2026',
    label: 'Journalnotat',
    excerpt: 'God deltagelse i gåtur med primær kontakt; positiv stemning efterfølgende.',
  },
  {
    date: '16. maj 2026',
    label: 'Ugentlig check-in',
    excerpt: 'Søvn under 5 timer to nætter; ønsker struktur om aftenen.',
  },
] as const;

type Props = {
  residentId: string;
  residentName: string;
};

function secondaryButtonStyle(): React.CSSProperties {
  return {
    border: '1px solid var(--cp-border2)',
    backgroundColor: 'transparent',
    color: 'var(--cp-text)',
  };
}

export default function ResidentTodayTab({ residentId: _residentId, residentName }: Props) {
  const [escalationVisible, setEscalationVisible] = useState(true);
  const [sourcesOpen, setSourcesOpen] = useState(false);
  const [aiChatOpen, setAiChatOpen] = useState(false);

  const displayName = residentName.trim() || 'Sara DEMO Kristensen';

  return (
    <div className="space-y-4">
      {escalationVisible ? (
        <section
          className="rounded-xl border p-4"
          style={{
            borderColor: 'var(--cp-border)',
            backgroundColor: 'var(--cp-red-dim)',
            borderLeftWidth: 4,
            borderLeftColor: 'var(--cp-red)',
          }}
        >
          <h3 className="text-sm font-semibold" style={{ color: 'var(--cp-red)' }}>
            Kræver din vurdering
          </h3>
          <p className="mt-2 text-sm" style={{ color: 'var(--cp-text)' }}>
            AI vurderer at Sara viser tidlige eskalationstegn. Se fagligt overblik nedenfor for
            kontekst.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <button
              type="button"
              className="rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
              style={secondaryButtonStyle()}
            >
              Se kilder
            </button>
            <button
              type="button"
              className="rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
              style={secondaryButtonStyle()}
              onClick={() => setEscalationVisible(false)}
            >
              Marker som set
            </button>
            <button
              type="button"
              className="rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
              style={{
                backgroundColor: 'var(--cp-red)',
                color: 'var(--cp-bg)',
              }}
            >
              Eskalér til kontaktpædagog
            </button>
          </div>
        </section>
      ) : null}

      <section className="rounded-xl border p-5 sm:p-6" style={panelStyle}>
        <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
          <div className="flex min-w-0 flex-wrap items-center gap-2 text-xs uppercase tracking-wider">
            <Brain size={14} style={{ color: 'var(--cp-muted)' }} aria-hidden />
            <span style={{ color: 'var(--cp-muted)' }}>Fagligt overblik</span>
            <span style={{ color: 'var(--cp-muted)' }}>· Genereret i morges kl. 07:30</span>
          </div>
          <span
            className="shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide"
            style={{
              backgroundColor: 'var(--cp-green-dim)',
              color: 'var(--cp-green)',
            }}
          >
            AI-genereret
          </span>
        </div>

        <h2
          className="text-xl sm:text-2xl"
          style={{
            fontFamily: "'DM Serif Display', serif",
            color: 'var(--cp-text)',
            lineHeight: 1.2,
          }}
        >
          {displayName} — fagligt overblik
        </h2>

        <div className="mt-6 space-y-5">
          <div>
            <div
              className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: 'var(--cp-muted)' }}
            >
              Status
            </div>
            <p className="mt-1 text-sm" style={{ color: 'var(--cp-text)' }}>
              Tre gule dage på 7 — let nedadgående tendens
            </p>
            <div
              className="mt-2 flex items-center gap-1.5"
              aria-label="Trafiklys de seneste 7 dage"
            >
              {TRAFFIC_HISTORY.map((tone, i) => (
                <span
                  key={i}
                  className="inline-block shrink-0 rounded-full"
                  style={{
                    width: 8,
                    height: 8,
                    backgroundColor: tone === 'green' ? 'var(--cp-green)' : 'var(--cp-amber)',
                  }}
                  aria-hidden
                />
              ))}
            </div>
          </div>

          <div>
            <div
              className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: 'var(--cp-muted)' }}
            >
              Sidste 1–3 dage
            </div>
            <p className="mt-1 text-sm leading-relaxed" style={{ color: 'var(--cp-text)' }}>
              Søndag aften: paranoid tematik i Lys-samtale om naboer. Mandag og tirsdag: lavt
              energiniveau, færre samtaler initieret. Søvn under 5 timer to nætter i træk.
            </p>
          </div>

          <div>
            <div
              className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: 'var(--cp-muted)' }}
            >
              Nærmeste fremtid
            </div>
            <p className="mt-1 text-sm leading-relaxed" style={{ color: 'var(--cp-text)' }}>
              I dag 10:00 CTI-samtale med Hanne DEMO Holm (kommunens sagsbehandler). Torsdag:
              pårørende-besøg fra moren — historisk en udfordrende dag for Sara.
            </p>
          </div>

          <div>
            <div
              className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: 'var(--cp-muted)' }}
            >
              Faglig anbefaling
            </div>
            <p className="mt-1 text-sm leading-relaxed" style={{ color: 'var(--cp-text)' }}>
              Tilbyd struktureret én-til-én samtale i dag, gerne i kendt miljø. Undgå pres om social
              aktivitet. Overvej forberedende samtale før torsdagens pårørende-besøg.
            </p>
          </div>

          <div>
            <div
              className="text-xs font-semibold uppercase tracking-wider"
              style={{ color: 'var(--cp-muted)' }}
            >
              Mestring der virker
            </div>
            <p className="mt-1 text-sm leading-relaxed" style={{ color: 'var(--cp-text)' }}>
              Tegne-tid (5× sidste uge, alle positive), gåtur med Lars DEMO Nielsen (3×),
              telefonopkald med søster Anna DEMO Kristensen
            </p>
          </div>
        </div>

        <div className="mt-6 border-t pt-5" style={{ borderColor: 'var(--cp-border)' }}>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors"
              style={{
                backgroundColor: 'var(--cp-green)',
                color: 'var(--cp-bg)',
              }}
              onClick={() => setAiChatOpen((v) => !v)}
            >
              <Brain size={16} aria-hidden />
              Spørg AI om Sara
            </button>
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase"
              style={{
                backgroundColor: 'var(--cp-green-dim)',
                color: 'var(--cp-green)',
              }}
            >
              Organisation
            </span>
            <button
              type="button"
              className="rounded-lg px-3 py-2 text-sm font-medium transition-colors"
              style={secondaryButtonStyle()}
              onClick={() => setSourcesOpen((v) => !v)}
            >
              Vis kilder
            </button>
          </div>

          {aiChatOpen ? (
            <div
              className="mt-3 rounded-lg border px-4 py-3 text-sm"
              style={{
                borderColor: 'var(--cp-border)',
                backgroundColor: 'var(--cp-bg3)',
                color: 'var(--cp-muted)',
              }}
            >
              AI-chat kommer her
            </div>
          ) : null}

          {sourcesOpen ? (
            <ul className="mt-3 space-y-2">
              {DUMMY_SOURCES.map((src) => (
                <li
                  key={`${src.date}-${src.label}`}
                  className="rounded-lg border px-3 py-2.5 text-sm"
                  style={{
                    borderColor: 'var(--cp-border)',
                    backgroundColor: 'var(--cp-bg3)',
                  }}
                >
                  <div className="flex flex-wrap items-baseline justify-between gap-2">
                    <span className="font-medium" style={{ color: 'var(--cp-text)' }}>
                      {src.label}
                    </span>
                    <span className="text-xs" style={{ color: 'var(--cp-muted)' }}>
                      {src.date}
                    </span>
                  </div>
                  <p className="mt-1 text-xs leading-relaxed" style={{ color: 'var(--cp-muted)' }}>
                    {src.excerpt}
                  </p>
                </li>
              ))}
            </ul>
          ) : null}

          <p className="mt-3 text-xs" style={{ color: 'var(--cp-muted2)' }}>
            Næste opdatering i morgen kl. 07:30 · Vagtskifte-brief kl. 14:30 og 22:00
          </p>
        </div>
      </section>
    </div>
  );
}
