'use client';

import ResidentInitials from '@/components/residents/ResidentInitials';
import React, { useMemo, useState } from 'react';
import { Check, ClipboardCopy, FileText, Lock, Sparkles } from 'lucide-react';
import { copyText } from '@/lib/fagsystem/client';

/**
 * Demo af dokumentmotoren: en statusudtalelse med AI-udkast, kilder pr. afsnit,
 * «læst»-flueben før godkendelse, godkendelse og låsning. Alt sker lokalt.
 */

type Section = {
  id: string;
  title: string;
  ai: boolean;
  text: string;
  sources: string[];
};

const INITIAL: Section[] = [
  {
    id: 'formaal',
    title: 'Indsatsens formål',
    ai: false,
    text: 'SK skal opnå større selvstændighed i hverdagen, så hun på sigt kan flytte i egen bolig med støtte (§107, midlertidigt botilbud).',
    sources: ['VUM-bestilling'],
  },
  {
    id: 'borger',
    title: 'Borgerens egen vurdering',
    ai: true,
    text: 'SK fortæller, at hun har fået mere ro i hverdagen og glæder sig til at gå i svømmehallen om torsdagen. Hun vil gerne øve sig i at lave aftensmad selv to gange om ugen.',
    sources: ['3 notater', 'Lys-dagbog 12.10'],
  },
  {
    id: 'funktion',
    title: 'Fysisk og psykisk funktion',
    ai: true,
    text: 'SK har haft en stabil døgnrytme og har taget sin medicin hver dag de sidste 8 uger. Hun har haft to dage med gult trafiklys efter besøg hos familien, hvor en samtale med kontaktpersonen hjalp.',
    sources: ['Medicinliste', 'Trafiklys 8 uger', '5 notater'],
  },
  {
    id: 'maal',
    title: 'Status på mål',
    ai: true,
    text: 'Delmål 1 (handle ind efter liste): nået 7 af 10 gange de sidste 5 uger. Delmål 2 (fast sengetid før 23): delvist nået, faldet den seneste uge.',
    sources: ['Handleplan', '12 notater'],
  },
  {
    id: 'faglig',
    title: 'Faglig vurdering og anbefaling',
    ai: false,
    text: 'Vi vurderer, at SK er klar til at øve mere selvstændig madlavning med støtte to gange om ugen. Vi anbefaler, at indsatsen fortsætter uændret i 6 måneder.',
    sources: [],
  },
];

type Stage = 'udkast' | 'til_godkendelse' | 'godkendt';

const STEPS: { id: Stage | 'laes'; label: string }[] = [
  { id: 'udkast', label: 'Udkast' },
  { id: 'laes', label: 'Læs AI-tekst' },
  { id: 'til_godkendelse', label: 'Til godkendelse' },
  { id: 'godkendt', label: 'Godkendt og låst' },
];

function nowLabel(): string {
  return new Intl.DateTimeFormat('da-DK', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Copenhagen',
  })
    .format(new Date())
    .replace(',', ' kl.');
}

const panel = { backgroundColor: 'var(--cp-card-bg)', borderColor: 'var(--cp-border)' } as const;

export default function DemoDocumentClient() {
  const [sections, setSections] = useState(INITIAL);
  const [read, setRead] = useState<Record<string, string>>({});
  const [stage, setStage] = useState<Stage>('udkast');
  const [history, setHistory] = useState<{ when: string; what: string }[]>([
    { when: 'For 2 dage siden', what: 'Assistenten lavede udkast ud fra 41 notater' },
    { when: 'I går', what: 'Lars N. skrev den faglige vurdering' },
  ]);
  const [copied, setCopied] = useState(false);

  const unread = useMemo(() => sections.filter((s) => s.ai && !read[s.id]), [sections, read]);
  const locked = stage !== 'udkast';
  const activeStep = stage === 'udkast' ? (unread.length > 0 ? 'laes' : 'udkast') : stage;

  const log = (what: string) => setHistory((h) => [...h, { when: nowLabel(), what }]);

  const toggleRead = (id: string, title: string) => {
    setRead((r) => {
      const next = { ...r };
      if (next[id]) delete next[id];
      else {
        next[id] = nowLabel();
        log(`Lars N. markerede «${title}» som læst`);
      }
      return next;
    });
  };

  const fullText = sections.map((s) => `${s.title}\n${s.text}`).join('\n\n');

  return (
    <div className="mx-auto flex w-full max-w-[1320px] flex-col gap-6 p-4 pb-24 sm:p-6 lg:p-8">
      <header className="flex flex-col gap-1.5">
        <p className="text-[13px]" style={{ color: 'var(--cp-muted)' }}>
          <ResidentInitials
            initials="SK"
            fullName="Sara Kristensen"
            href="/care-portal-demo/residents/res-sara"
          />{' '}
          · til kommunen · frist om 6 dage
        </p>
        <h1
          className="m-0"
          style={{
            fontSize: 'clamp(24px, 3.2vw, 32px)',
            fontWeight: 600,
            letterSpacing: '-0.02em',
            color: 'var(--cp-text)',
          }}
        >
          Statusudtalelse
        </h1>
      </header>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
        <section className="min-w-0 overflow-hidden rounded-2xl border" style={panel}>
          <ol
            className="flex flex-wrap gap-2 border-b px-5 py-4"
            style={{ borderColor: 'var(--cp-border)' }}
            aria-label="Trin"
          >
            {STEPS.map((step) => {
              const order = STEPS.findIndex((x) => x.id === step.id);
              const activeOrder = STEPS.findIndex((x) => x.id === activeStep);
              const done = order < activeOrder;
              const on = step.id === activeStep;
              return (
                <li
                  key={step.id}
                  aria-current={on ? 'step' : undefined}
                  className="inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs"
                  style={{
                    borderColor: on ? 'var(--cp-green)' : done ? 'transparent' : 'var(--cp-border)',
                    backgroundColor: done ? 'var(--cp-green-dim)' : 'transparent',
                    color: on || done ? 'var(--cp-green)' : 'var(--cp-muted)',
                    fontWeight: on ? 600 : 500,
                  }}
                >
                  {done && <Check size={12} aria-hidden />}
                  {step.label}
                </li>
              );
            })}
          </ol>

          {sections.map((s) => (
            <div
              key={s.id}
              className="flex flex-col gap-3 border-b px-5 py-5 last:border-b-0"
              style={{ borderColor: 'var(--cp-border)' }}
            >
              <div className="flex flex-wrap items-center gap-2">
                {s.ai ? (
                  <span
                    className="inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.06em]"
                    style={{
                      backgroundColor: 'color-mix(in srgb, #7c3aed 14%, transparent)',
                      color: 'color-mix(in srgb, #7c3aed 80%, var(--cp-text))',
                    }}
                  >
                    <Sparkles size={11} aria-hidden />
                    AI-udkast
                  </span>
                ) : (
                  <span
                    className="rounded-md px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.06em]"
                    style={{ backgroundColor: 'var(--cp-green-dim)', color: 'var(--cp-green)' }}
                  >
                    Skrevet af personale
                  </span>
                )}
                <h2 className="m-0 text-[15px] font-semibold" style={{ color: 'var(--cp-text)' }}>
                  {s.title}
                </h2>
              </div>
              <label className="sr-only" htmlFor={`sec-${s.id}`}>
                {s.title}
              </label>
              <textarea
                id={`sec-${s.id}`}
                value={s.text}
                readOnly={locked}
                rows={3}
                onChange={(e) =>
                  setSections((all) =>
                    all.map((x) => (x.id === s.id ? { ...x, text: e.target.value } : x))
                  )
                }
                className="w-full resize-y rounded-[10px] border px-3 py-2.5 text-[15px] leading-relaxed"
                style={{
                  borderColor: locked ? 'transparent' : 'var(--cp-input-border)',
                  backgroundColor: locked ? 'transparent' : 'var(--cp-input-bg)',
                  color: 'var(--cp-text)',
                  padding: locked ? 0 : undefined,
                }}
              />
              {s.sources.length > 0 && (
                <p className="text-xs" style={{ color: 'var(--cp-muted)' }}>
                  Kilder:{' '}
                  {s.sources.map((src, i) => (
                    <span key={src}>
                      {i > 0 ? ' · ' : ''}
                      <span style={{ color: 'var(--cp-green)' }}>{src}</span>
                    </span>
                  ))}
                </p>
              )}
              {s.ai &&
                (locked ? (
                  <p className="text-xs" style={{ color: 'var(--cp-green)' }}>
                    Læst og rettet af Lars N. {read[s.id]}
                  </p>
                ) : (
                  <label
                    className="flex min-h-[44px] cursor-pointer items-start gap-3 rounded-[10px] px-3 py-2.5 text-sm"
                    style={{ backgroundColor: 'var(--cp-bg)', color: 'var(--cp-text)' }}
                  >
                    <input
                      type="checkbox"
                      checked={Boolean(read[s.id])}
                      onChange={() => toggleRead(s.id, s.title)}
                      className="mt-0.5 h-5 w-5 shrink-0"
                      style={{ accentColor: 'var(--cp-green)' }}
                    />
                    Jeg har læst afsnittet igennem og rettet det til
                  </label>
                ))}
            </div>
          ))}
        </section>

        <div className="flex min-w-0 flex-col gap-6">
          <section className="rounded-2xl border" style={panel} aria-labelledby="doc-next">
            <h2
              id="doc-next"
              className="border-b px-5 py-4 text-base font-semibold"
              style={{ borderColor: 'var(--cp-border)', color: 'var(--cp-text)' }}
            >
              Næste skridt
            </h2>
            <div className="flex flex-col gap-3 p-5">
              {stage === 'udkast' && (
                <>
                  <p
                    className="text-sm"
                    role="status"
                    style={{ color: unread.length ? 'var(--cp-amber)' : 'var(--cp-green)' }}
                  >
                    {unread.length
                      ? `Læs ${unread.length === 1 ? 'det sidste AI-afsnit' : `de ${unread.length} AI-afsnit`} igennem, før du kan sende til godkendelse.`
                      : 'Alt er læst. Du kan sende til godkendelse.'}
                  </p>
                  <button
                    type="button"
                    disabled={unread.length > 0}
                    onClick={() => {
                      setStage('til_godkendelse');
                      log('Lars N. sendte til godkendelse hos leder');
                    }}
                    className="min-h-[44px] rounded-[10px] px-4 text-sm font-semibold transition-opacity disabled:cursor-not-allowed disabled:opacity-45"
                    style={{ backgroundColor: 'var(--cp-green)', color: 'var(--cp-on-green)' }}
                  >
                    Send til godkendelse
                  </button>
                </>
              )}
              {stage === 'til_godkendelse' && (
                <>
                  <p className="text-sm" style={{ color: 'var(--cp-text)' }}>
                    Venter på lederen. I demoen kan du godkende selv.
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      setStage('godkendt');
                      log('Leder godkendte. Dokumentet er låst som version 1');
                    }}
                    className="min-h-[44px] rounded-[10px] px-4 text-sm font-semibold"
                    style={{ backgroundColor: 'var(--cp-green)', color: 'var(--cp-on-green)' }}
                  >
                    Godkend som leder
                  </button>
                </>
              )}
              {stage === 'godkendt' && (
                <p
                  className="inline-flex items-center gap-2 text-sm font-medium"
                  style={{ color: 'var(--cp-green)' }}
                >
                  <Lock size={15} aria-hidden />
                  Godkendt og låst. Ændringer laves som ny version.
                </p>
              )}
              <button
                type="button"
                onClick={async () => {
                  const ok = await copyText(fullText);
                  if (ok) {
                    setCopied(true);
                    setTimeout(() => setCopied(false), 2000);
                  }
                }}
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-[10px] border px-4 text-sm font-medium"
                style={{
                  borderColor: 'var(--cp-border2)',
                  color: 'var(--cp-text)',
                  backgroundColor: 'var(--cp-bg2)',
                }}
              >
                {copied ? <Check size={15} aria-hidden /> : <ClipboardCopy size={15} aria-hidden />}
                {copied ? 'Kopieret' : 'Kopiér til fagsystem'}
              </button>
            </div>
          </section>

          <section className="rounded-2xl border" style={panel} aria-labelledby="doc-hist">
            <h2
              id="doc-hist"
              className="border-b px-5 py-4 text-base font-semibold"
              style={{ borderColor: 'var(--cp-border)', color: 'var(--cp-text)' }}
            >
              Historik
            </h2>
            <ul className="flex flex-col">
              {history.map((h, i) => (
                <li
                  key={i}
                  className="flex flex-col gap-0.5 border-b px-5 py-3 last:border-b-0"
                  style={{ borderColor: 'var(--cp-border)' }}
                >
                  <span className="text-xs" style={{ color: 'var(--cp-muted)' }}>
                    {h.when}
                  </span>
                  <span className="text-sm" style={{ color: 'var(--cp-text)' }}>
                    {h.what}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          <section className="rounded-2xl border p-5" style={panel} aria-labelledby="doc-types">
            <h2
              id="doc-types"
              className="mb-3 text-base font-semibold"
              style={{ color: 'var(--cp-text)' }}
            >
              Samme motor til alle dokumenter
            </h2>
            <ul className="flex flex-col gap-2 text-sm" style={{ color: 'var(--cp-muted)' }}>
              {[
                { name: 'Statusudtalelse', ready: true },
                { name: 'Indsatsplan og delmål', ready: false },
                { name: 'Magtanvendelse', ready: false },
                { name: 'Tilsynsrapport', ready: false },
                { name: 'KRAP-skemaer og trafiklysplan', ready: false },
              ].map((d) => (
                <li key={d.name} className="flex items-center gap-2">
                  <FileText size={15} aria-hidden style={{ color: 'var(--cp-green)' }} />
                  <span className="flex-1">{d.name}</span>
                  <span
                    className="text-xs font-medium"
                    style={{ color: d.ready ? 'var(--cp-green)' : 'var(--cp-muted)' }}
                  >
                    {d.ready ? 'Klar' : 'På vej'}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
