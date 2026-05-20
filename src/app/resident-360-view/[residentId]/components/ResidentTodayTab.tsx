'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { ChevronDown, ChevronUp, X } from 'lucide-react';

const panelStyle: React.CSSProperties = {
  backgroundColor: 'var(--cp-bg2)',
  borderColor: 'var(--cp-border)',
};

/** Demo: fast klokkeslæt for tidsbaseret overstregning i dagens plan */
const NOW_MINUTES = 13 * 60 + 20;
const NOW_LABEL = 'kl. 13:20 nu';

type PlanTask = { time: string; label: string };

const PLAN_TASKS: PlanTask[] = [
  { time: '09:30', label: 'Morgenmøde' },
  { time: '10:00', label: 'CTI-samtale med Hanne' },
  { time: '12:00', label: 'Frokost fælles' },
  { time: '14:00', label: 'Hvile / egentid' },
  { time: '18:00', label: 'Aftens check-in' },
];

const MOOD_SPARKLINE: Array<'green' | 'amber' | 'red'> = [
  'green',
  'amber',
  'green',
  'amber',
  'amber',
  'green',
  'amber',
  'red',
  'amber',
  'green',
  'amber',
  'amber',
  'green',
  'amber',
];

type JournalEntry = {
  id: string;
  staff: string;
  date: string;
  category: string;
  text: string;
};

const JOURNAL_ENTRIES: JournalEntry[] = [
  {
    id: 'lys-17',
    staff: 'Lars DEMO Nielsen',
    date: '17. maj 2026, 21:14',
    category: 'samtale',
    text: "Sara virkede urolig under aftensamtalen. Hun talte gentagne gange om naboerne i opgang 3 og var overbevist om at de 'holder øje'. Jeg lyttede og validerede uden at bekræfte. Foreslog tegne-tid, hvilket hjalp. Sov dårligt ifølge nattevagt.",
  },
  {
    id: 'checkin-20',
    staff: 'Nattevagt DEMO',
    date: '20. maj 2026, 07:02',
    category: 'check-in',
    text: 'Lav energi ved morgen-check-in. Humør 4/10. Ønsker ro resten af dagen.',
  },
  {
    id: 'journal-19',
    staff: 'Hanne DEMO Holm',
    date: '19. maj 2026, 14:30',
    category: 'observation',
    text: 'Kort observation efter frokost: Sara trak sig tilbage, ingen konflikt.',
  },
];

type DrawerMode = 'journal' | 'sources' | 'ai-chat' | null;

type Props = {
  residentName: string;
};

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return h * 60 + m;
}

function isTaskPast(time: string): boolean {
  return timeToMinutes(time) < NOW_MINUTES;
}

function secondaryButtonStyle(): React.CSSProperties {
  return {
    border: '1px solid var(--cp-border2)',
    backgroundColor: 'transparent',
    color: 'var(--cp-text)',
  };
}

export default function ResidentTodayTab({ residentName: _residentName }: Props) {
  const [overviewExpanded, setOverviewExpanded] = useState(false);
  const [planExpanded, setPlanExpanded] = useState(false);
  const [metricsExpanded, setMetricsExpanded] = useState(false);
  const [drawerMode, setDrawerMode] = useState<DrawerMode>(null);
  const [drawerVisible, setDrawerVisible] = useState(false);

  const openDrawer = useCallback((mode: DrawerMode) => {
    if (!mode) return;
    setDrawerVisible(false);
    setDrawerMode(mode);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => setDrawerVisible(true));
    });
  }, []);

  const closeDrawer = useCallback(() => {
    setDrawerVisible(false);
    window.setTimeout(() => setDrawerMode(null), 250);
  }, []);

  useEffect(() => {
    if (!drawerVisible) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeDrawer();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [drawerVisible, closeDrawer]);

  return (
    <div className="space-y-6">
      {/* [1] AI fagligt overblik — fri på baggrund */}
      <section>
        <p
          className="text-xs font-semibold uppercase tracking-wider"
          style={{ color: 'var(--cp-muted)' }}
        >
          Fagligt overblik · sammenfattet fra journal · i morges 07:30
        </p>

        <p className="mt-4 text-base leading-[1.7]" style={{ color: 'var(--cp-text)' }}>
          Sara har haft <span style={{ color: 'var(--cp-amber)' }}>tre gule dage på syv</span> med
          en let nedadgående tendens. Søndag aften kom der{' '}
          <button
            type="button"
            className="inline border-0 bg-transparent p-0 text-base leading-[1.7] underline decoration-1 underline-offset-2"
            style={{
              color: 'var(--cp-text)',
              cursor: 'pointer',
              textDecorationColor: 'var(--cp-border2)',
            }}
            onClick={() => openDrawer('journal')}
          >
            paranoid tematik op i en Lys-samtale
          </button>{' '}
          om naboerne, og hun har sovet under fem timer to nætter i træk.
        </p>

        <p className="mt-4 text-base leading-[1.7]" style={{ color: 'var(--cp-text)' }}>
          I dag anbefales en{' '}
          <span className="font-medium" style={{ color: 'var(--cp-text)' }}>
            struktureret én-til-én samtale
          </span>{' '}
          i kendt miljø — undgå pres om social aktivitet. Kl. 10 er der CTI-samtale med
          sagsbehandleren, og torsdag kommer moren på besøg, hvilket historisk er en udfordrende
          dag.
        </p>

        {overviewExpanded ? (
          <div
            className="mt-5 space-y-4 border-l-2 pl-4"
            style={{ borderColor: 'var(--cp-border2)' }}
          >
            <div>
              <div
                className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: 'var(--cp-muted)' }}
              >
                Mestring der virker
              </div>
              <p className="mt-1 text-sm leading-relaxed" style={{ color: 'var(--cp-text)' }}>
                Tegne-tid (5× sidste uge, alle positive), gåtur med Lars DEMO Nielsen (3×),
                telefonopkald med søster Anna.
              </p>
            </div>
            <div>
              <div
                className="text-xs font-semibold uppercase tracking-wider"
                style={{ color: 'var(--cp-muted)' }}
              >
                Faglig anbefaling, uddybet
              </div>
              <p className="mt-1 text-sm leading-relaxed" style={{ color: 'var(--cp-text)' }}>
                Overvej en kort forberedende samtale onsdag eller torsdag formiddag før morens
                besøg. Brug Saras tegne-tid som åbning hvis samtalen bliver svær.
              </p>
            </div>
          </div>
        ) : null}

        <div className="mt-5 flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-lg px-3 py-2 text-sm font-medium transition-colors"
            style={secondaryButtonStyle()}
            onClick={() => setOverviewExpanded((v) => !v)}
          >
            {overviewExpanded ? 'Fold sammen' : 'Fold ud'}
          </button>
          <button
            type="button"
            className="rounded-lg px-3 py-2 text-sm font-medium transition-colors"
            style={secondaryButtonStyle()}
            onClick={() => openDrawer('sources')}
          >
            Vis kilder
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors"
            style={{
              backgroundColor: 'var(--cp-green)',
              color: 'var(--cp-bg)',
            }}
            onClick={() => openDrawer('ai-chat')}
          >
            Spørg AI om Sara
            <span
              className="rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase"
              style={{
                backgroundColor: 'var(--cp-green-dim)',
                color: 'var(--cp-green)',
              }}
            >
              Organisation
            </span>
          </button>
        </div>
      </section>

      {/* [2] Dagens plan */}
      <section className="rounded-xl border p-5" style={panelStyle}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h3 className="text-base font-medium" style={{ color: 'var(--cp-text)' }}>
            Dagens plan
          </h3>
          <div className="flex items-center gap-2">
            <span className="text-xs" style={{ color: 'var(--cp-muted)' }}>
              {NOW_LABEL}
            </span>
            <button
              type="button"
              className="rounded-md px-2 py-1 text-xs font-medium transition-colors"
              style={secondaryButtonStyle()}
              onClick={() => setPlanExpanded((v) => !v)}
              aria-expanded={planExpanded}
            >
              {planExpanded ? (
                <ChevronUp size={14} aria-hidden />
              ) : (
                <ChevronDown size={14} aria-hidden />
              )}
            </button>
          </div>
        </div>

        <ul className="space-y-3">
          {PLAN_TASKS.map((task) => {
            const past = isTaskPast(task.time);
            return (
              <li key={task.time} className="flex items-center gap-3 text-sm">
                <span
                  className="inline-block shrink-0 rounded-full"
                  style={{
                    width: 8,
                    height: 8,
                    backgroundColor: past ? 'var(--cp-muted2)' : 'var(--cp-green)',
                  }}
                  aria-hidden
                />
                <span
                  className="w-12 shrink-0 tabular-nums"
                  style={{
                    color: past ? 'var(--cp-muted)' : 'var(--cp-text)',
                    textDecoration: past ? 'line-through' : 'none',
                  }}
                >
                  {task.time}
                </span>
                <span
                  style={{
                    color: past ? 'var(--cp-muted)' : 'var(--cp-text)',
                    textDecoration: past ? 'line-through' : 'none',
                  }}
                >
                  {task.label}
                </span>
              </li>
            );
          })}
        </ul>

        {planExpanded ? (
          <div className="mt-4 border-t pt-4" style={{ borderColor: 'var(--cp-border)' }}>
            <button
              type="button"
              className="rounded-lg px-3 py-2 text-sm font-medium"
              style={{
                ...secondaryButtonStyle(),
                color: 'var(--cp-muted)',
              }}
            >
              Tilføj opgave
            </button>
            <p className="mt-2 text-xs" style={{ color: 'var(--cp-muted2)' }}>
              Planen synkroniseres fra Saras dagsplan i Lys-appen.
            </p>
          </div>
        ) : null}
      </section>

      {/* [3] Nøgletal */}
      <section>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <div className="rounded-xl border p-4" style={panelStyle}>
            <div
              className="text-2xl font-semibold tabular-nums"
              style={{ color: 'var(--cp-amber)' }}
            >
              3/7
            </div>
            <div className="mt-1 text-xs" style={{ color: 'var(--cp-muted)' }}>
              gule dage
            </div>
          </div>
          <div className="rounded-xl border p-4" style={panelStyle}>
            <div className="text-2xl font-semibold tabular-nums" style={{ color: 'var(--cp-red)' }}>
              4,5t
            </div>
            <div className="mt-1 text-xs" style={{ color: 'var(--cp-muted)' }}>
              søvn i nat
            </div>
          </div>
          <div className="rounded-xl border p-4" style={panelStyle}>
            <div
              className="text-2xl font-semibold tabular-nums"
              style={{ color: 'var(--cp-text)' }}
            >
              2
            </div>
            <div className="mt-1 text-xs" style={{ color: 'var(--cp-muted)' }}>
              opgaver tilbage
            </div>
          </div>
        </div>

        <div className="mt-3 flex justify-end">
          <button
            type="button"
            className="rounded-lg px-3 py-1.5 text-xs font-medium transition-colors"
            style={secondaryButtonStyle()}
            onClick={() => setMetricsExpanded((v) => !v)}
          >
            {metricsExpanded ? 'Fold sammen' : 'Fold ud'}
          </button>
        </div>

        {metricsExpanded ? (
          <div className="mt-4 rounded-xl border p-4" style={panelStyle}>
            <div
              className="mb-2 text-xs font-semibold uppercase tracking-wider"
              style={{ color: 'var(--cp-muted)' }}
            >
              Stemning · 14 dage
            </div>
            <div className="flex flex-wrap items-center gap-1.5" aria-hidden>
              {MOOD_SPARKLINE.map((tone, i) => (
                <span
                  key={i}
                  className="inline-block rounded-full"
                  style={{
                    width: 8,
                    height: 8,
                    backgroundColor:
                      tone === 'green'
                        ? 'var(--cp-green)'
                        : tone === 'amber'
                          ? 'var(--cp-amber)'
                          : 'var(--cp-red)',
                  }}
                />
              ))}
            </div>
            <p className="mt-3 text-sm" style={{ color: 'var(--cp-muted)' }}>
              Søvn-gennemsnit 5,8t denne uge
            </p>
          </div>
        ) : null}
      </section>

      {/* [4] Side-panel / drawer */}
      {drawerMode ? (
        <div className="fixed inset-0 z-[10100] flex justify-end">
          <button
            type="button"
            className="absolute inset-0 border-0 transition-opacity"
            style={{
              backgroundColor: 'rgba(0, 0, 0, 0.5)',
              opacity: drawerVisible ? 1 : 0,
            }}
            aria-label="Luk panel"
            onClick={closeDrawer}
          />
          <aside
            className="relative flex h-full w-full max-w-[480px] flex-col border-l shadow-lg"
            style={{
              backgroundColor: 'var(--cp-bg2)',
              borderColor: 'var(--cp-border2)',
              transform: drawerVisible ? 'translateX(0)' : 'translateX(100%)',
              transition: 'transform 0.25s ease-out',
            }}
            role="dialog"
            aria-modal="true"
            aria-labelledby="journal-drawer-title"
          >
            <header
              className="flex shrink-0 items-center justify-between border-b px-5 py-4"
              style={{ borderColor: 'var(--cp-border)' }}
            >
              <h2
                id="journal-drawer-title"
                className="text-base font-semibold"
                style={{ color: 'var(--cp-text)' }}
              >
                {drawerMode === 'ai-chat' ? 'Spørg AI' : 'Journal'}
              </h2>
              <button
                type="button"
                className="rounded-lg p-1.5 transition-colors"
                style={{ color: 'var(--cp-muted)' }}
                aria-label="Luk"
                onClick={closeDrawer}
              >
                <X size={20} />
              </button>
            </header>

            <div className="cp-scroll flex-1 overflow-y-auto px-5 py-4">
              {drawerMode === 'ai-chat' ? (
                <p className="text-sm" style={{ color: 'var(--cp-muted)' }}>
                  AI-chat kommer her
                </p>
              ) : (
                <div className="space-y-4">
                  {drawerMode === 'sources' ? (
                    <p className="text-xs" style={{ color: 'var(--cp-muted)' }}>
                      Kilder til fagligt overblik
                    </p>
                  ) : null}
                  {JOURNAL_ENTRIES.map((entry) => (
                    <article
                      key={entry.id}
                      className="rounded-lg border p-4"
                      style={{
                        borderColor: 'var(--cp-border)',
                        backgroundColor: 'var(--cp-bg3)',
                      }}
                    >
                      <div className="flex flex-wrap items-baseline justify-between gap-2">
                        <span className="text-sm font-medium" style={{ color: 'var(--cp-text)' }}>
                          {entry.staff}
                        </span>
                        <span className="text-xs" style={{ color: 'var(--cp-muted)' }}>
                          {entry.date}
                        </span>
                      </div>
                      <span
                        className="mt-2 inline-block rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase"
                        style={{
                          backgroundColor: 'var(--cp-bg2)',
                          color: 'var(--cp-muted)',
                          border: '1px solid var(--cp-border)',
                        }}
                      >
                        {entry.category}
                      </span>
                      <p
                        className="mt-3 text-sm leading-relaxed"
                        style={{ color: 'var(--cp-text)' }}
                      >
                        {entry.text}
                      </p>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </aside>
        </div>
      ) : null}
    </div>
  );
}
