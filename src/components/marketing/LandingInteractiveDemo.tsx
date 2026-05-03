'use client';

import Link from 'next/link';
import { useCallback, useMemo, useState } from 'react';
import { IconCheck, IconMoodSignal, IconWarning } from '@/components/marketing/LandingIcons';
import { ResidentInitialsAbbr } from '@/components/marketing/ResidentInitialsAbbr';

const COMMENT_MAX = 220;

/** 0 = roligt, 1 = følg op, 2 = prioriter (matcher portal-logik i demoen) */
type Concern = 0 | 1 | 2;

const MOODS = [
  {
    id: 'glad',
    label: 'Glad og let',
    concern: 0 as Concern,
    rowShort: 'Glad stemning',
    badge: 'Rolig',
    narrative: 'Humøret opleves som lyst og positivt.',
  },
  {
    id: 'overskud',
    label: 'Godt overskud',
    concern: 0 as Concern,
    rowShort: 'Godt humør',
    badge: 'Fin',
    narrative: 'Der er overskud og generel tilfredshed lige nu.',
  },
  {
    id: 'rolig',
    label: 'Rolig / neutral',
    concern: 0 as Concern,
    rowShort: 'Rolig',
    badge: 'OK',
    narrative: 'Stemningen er rolig og neutral uden særlige udsving.',
  },
  {
    id: 'blandet',
    label: 'Blandet',
    concern: 1 as Concern,
    rowShort: 'Blandet humør',
    badge: 'Lys',
    narrative: 'Humøret er blandet — både fine og tunge øjeblikke.',
  },
  {
    id: 'irritabel',
    label: 'Irritabel',
    concern: 1 as Concern,
    rowShort: 'Irritabel',
    badge: 'Lys',
    narrative: 'Der opleves irritabilitet eller kort lunte.',
  },
  {
    id: 'tung',
    label: 'Tung dag',
    concern: 2 as Concern,
    rowShort: 'Tung dag',
    badge: 'Lys',
    narrative: 'Dagen opleves som tung og krævende.',
  },
  {
    id: 'trist',
    label: 'Trist / ked af det',
    concern: 2 as Concern,
    rowShort: 'Trist stemning',
    badge: 'Lys',
    narrative: 'Stemningen er trist eller ked af det.',
  },
  {
    id: 'angst',
    label: 'Ængstelig / urolig',
    concern: 2 as Concern,
    rowShort: 'Ængstelig',
    badge: 'Lys',
    narrative: 'Der er tegn på angst eller tydelig uro.',
  },
  {
    id: 'tom',
    label: 'Tom eller flad',
    concern: 2 as Concern,
    rowShort: 'Flad stemning',
    badge: 'Lys',
    narrative: 'Humøret opleves fladt eller “tomt”.',
  },
] as const;

const ENERGIES = [
  {
    id: 'udmattet',
    label: 'Helt udmattet',
    concern: 2 as Concern,
    rowShort: 'Meget lav energi',
    narrative: 'Energien beskrives som meget lav eller udmattende.',
  },
  {
    id: 'meget_lav',
    label: 'Meget lav',
    concern: 2 as Concern,
    rowShort: 'Lav energi',
    narrative: 'Der er meget lidt energi at trække på.',
  },
  {
    id: 'lav',
    label: 'Lav',
    concern: 1 as Concern,
    rowShort: 'Lav energi',
    narrative: 'Energien er under det sædvanlige niveau.',
  },
  {
    id: 'svingende',
    label: 'Svingende',
    concern: 1 as Concern,
    rowShort: 'Svingende energi',
    narrative: 'Energien svinger — op og ned i løbet af dagen.',
  },
  {
    id: 'stabil',
    label: 'Stabil',
    concern: 0 as Concern,
    rowShort: 'Stabil energi',
    narrative: 'Energien opleves stabil og forudsigelig.',
  },
  {
    id: 'god',
    label: 'God energi',
    concern: 0 as Concern,
    rowShort: 'God energi',
    narrative: 'Der er god energi i forhold til dagsformen.',
  },
  {
    id: 'hyper',
    label: 'Rastløs / opskruet',
    concern: 1 as Concern,
    rowShort: 'Rastløs',
    narrative: 'Der opleves rastløshed eller en opskruet indre motor.',
  },
] as const;

const FILLERS = [
  {
    id: 'ingen',
    label: 'Intet særligt lige nu',
    concern: 0 as Concern,
    narrative: 'Intet enkelt tema fylder særligt ud over det sædvanlige.',
  },
  {
    id: 'sovn',
    label: 'Søvn eller nat',
    concern: 1 as Concern,
    narrative: 'Søvn, nat eller døgnrytme fylder mest.',
  },
  {
    id: 'familie',
    label: 'Familie / pårørende',
    concern: 1 as Concern,
    narrative: 'Tanker om familie eller pårørende fylder mest.',
  },
  {
    id: 'kollektiv',
    label: 'Kollektivet / fællesskab',
    concern: 1 as Concern,
    narrative: 'Samvær, naboskab eller fællesskabet fylder mest.',
  },
  {
    id: 'stoj',
    label: 'Støj eller uro omkring mig',
    concern: 1 as Concern,
    narrative: 'Omgivelsernes støj eller uro opleves belastende.',
  },
  {
    id: 'medicin',
    label: 'Medicin eller bivirkninger',
    concern: 2 as Concern,
    narrative: 'Medicin, dosering eller bivirkninger er i fokus.',
  },
  {
    id: 'krop',
    label: 'Krop / smerter',
    concern: 2 as Concern,
    narrative: 'Kropslige symptomer eller smerter fylder mest.',
  },
  {
    id: 'fremtid',
    label: 'Usikkerhed om fremtiden',
    concern: 2 as Concern,
    narrative: 'Usikkerhed om fremtiden eller store beslutninger fylder.',
  },
  {
    id: 'ensom',
    label: 'Ensomhed',
    concern: 2 as Concern,
    narrative: 'Ensomhed eller manglende nærvær opleves som det tungeste.',
  },
  {
    id: 'stress',
    label: 'Stress eller pres',
    concern: 2 as Concern,
    narrative: 'Stress, pres eller for mange krav opleves som belastende.',
  },
  {
    id: 'aktivitet',
    label: 'Mangler meningsfuld aktivitet',
    concern: 1 as Concern,
    narrative: 'Mangel på meningsfulde aktiviteter eller struktur fylder.',
  },
  {
    id: 'tale',
    label: 'Har brug for at tale med nogen',
    concern: 2 as Concern,
    narrative: 'Der er et tydeligt ønske om samtale eller kontakt med personalet.',
  },
] as const;

type MoodId = (typeof MOODS)[number]['id'] | null;
type EnergyId = (typeof ENERGIES)[number]['id'] | null;
type FillerId = (typeof FILLERS)[number]['id'] | null;

type NotifyTone = 'info' | 'caution' | 'priority';

function maxConcern(a: Concern, b: Concern, c: Concern): Concern {
  return Math.max(a, b, c) as Concern;
}

function concernToTone(c: Concern): NotifyTone {
  if (c >= 2) return 'priority';
  if (c === 1) return 'caution';
  return 'info';
}

function truncateComment(s: string, max: number): string {
  const t = s.trim();
  if (t.length <= max) return t;
  return `${t.slice(0, max - 1)}…`;
}

const RECOMMENDATIONS: Record<Concern, string> = {
  0: 'Ingen særlig handling ud over det I allerede planlægger. Notér ved lejlighed i journalen.',
  1: 'Overvej kort kontakt i løbet af dagen, et notat i journalen og om behov aftale med kollega ved næste trin.',
  2: 'Prioritér kontakt snarest, faglig vurdering og dokumentation. Inddrag leder eller tværfagligt, hvis jeres retningslinjer tilsiger det.',
};

const NOTIFY_HEADLINES: Record<Concern, string> = {
  0: 'Check-in modtaget fra Lys',
  1: 'Nyt fra Lys — til opfølgning',
  2: 'Nyt fra Lys — prioriter kontakt',
};

export function LandingInteractiveDemo() {
  const [mood, setMood] = useState<MoodId>(null);
  const [energy, setEnergy] = useState<EnergyId>(null);
  const [filler, setFiller] = useState<FillerId>(null);
  const [comment, setComment] = useState('');
  const [sent, setSent] = useState(false);
  const [sentAt, setSentAt] = useState<Date | null>(null);

  const pickMood = useCallback((id: (typeof MOODS)[number]['id']) => {
    setSent(false);
    setSentAt(null);
    setMood(id);
  }, []);
  const pickEnergy = useCallback((id: (typeof ENERGIES)[number]['id']) => {
    setSent(false);
    setSentAt(null);
    setEnergy(id);
  }, []);
  const pickFiller = useCallback((id: (typeof FILLERS)[number]['id']) => {
    setSent(false);
    setSentAt(null);
    setFiller(id);
  }, []);

  const canSend = Boolean(mood && energy && filler);

  const send = useCallback(() => {
    if (mood && energy && filler) {
      setSentAt(new Date());
      setSent(true);
    }
  }, [mood, energy, filler]);

  const reset = useCallback(() => {
    setMood(null);
    setEnergy(null);
    setFiller(null);
    setComment('');
    setSent(false);
    setSentAt(null);
  }, []);

  const onCommentChange = useCallback((v: string) => {
    setComment(v.slice(0, COMMENT_MAX));
    setSent(false);
    setSentAt(null);
  }, []);

  const briefing = useMemo(() => {
    if (!sent || !sentAt || !mood || !energy || !filler) return null;
    const m = MOODS.find((x) => x.id === mood)!;
    const e = ENERGIES.find((x) => x.id === energy)!;
    const f = FILLERS.find((x) => x.id === filler)!;
    const concern = maxConcern(m.concern, e.concern, f.concern);
    const tone = concernToTone(concern);
    const timeStr = sentAt.toLocaleTimeString('da-DK', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    });
    const rowMeta = `Check-in ${timeStr} · ${m.rowShort} · ${e.rowShort}`;
    const cTrim = comment.trim();
    const commentShown = cTrim ? truncateComment(cTrim, 160) : '';
    const badgeLabel = concern >= 2 ? 'Lys · prioritet' : concern === 1 ? 'Lys' : m.badge;
    const rowHighlightClass =
      concern >= 2 ? 'is-highlight-urgent' : concern === 1 ? 'is-highlight' : 'is-highlight-calm';

    return {
      concern,
      tone,
      rowMeta,
      rowHighlightClass,
      notifyHeadline: NOTIFY_HEADLINES[concern],
      recommendation: RECOMMENDATIONS[concern],
      moodNarrative: m.narrative,
      energyNarrative: e.narrative,
      fillerNarrative: f.narrative,
      commentShown,
      badgeLabel,
      dotClass: concern >= 2 ? 'red' : concern === 1 ? 'amber' : 'green',
      ldBadgeClass: concern >= 1 ? 'warn' : 'ok',
    };
  }, [sent, sentAt, mood, energy, filler, comment]);

  return (
    <div className="interactive-demo-wrap">
      <div className="interactive-demo-grid">
        <div className="interactive-demo-lys">
          <div className="idemo-lys-top">
            <span className="idemo-lys-av" aria-hidden>
              L
            </span>
            <div>
              <div className="idemo-lys-title">Lys · tjek ind</div>
              <div className="idemo-lys-sub">
                Vælg humør (glad → tung), energi og hvad der fylder. Tilføj gerne egne ord —
                portalen opsummerer som i rigtig drift.
              </div>
            </div>
          </div>

          <div className="idemo-block">
            <div className="idemo-block-label">1 · Humør</div>
            <p className="idemo-block-hint">
              Fra lyst til tungt — vælg det, der passer bedst lige nu.
            </p>
            <div className="idemo-chips idemo-chips--mood" role="group" aria-label="Humør">
              {MOODS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  className={`idemo-chip ${mood === opt.id ? 'is-selected' : ''}`}
                  onClick={() => pickMood(opt.id)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="idemo-block">
            <div className="idemo-block-label">2 · Energi</div>
            <div className="idemo-chips" role="group" aria-label="Energi">
              {ENERGIES.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  className={`idemo-chip ${energy === opt.id ? 'is-selected' : ''}`}
                  onClick={() => pickEnergy(opt.id)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="idemo-block">
            <div className="idemo-block-label">3 · Det fylder mest</div>
            <div className="idemo-chips" role="group" aria-label="Det fylder mest">
              {FILLERS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  className={`idemo-chip ${filler === opt.id ? 'is-selected' : ''}`}
                  onClick={() => pickFiller(opt.id)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="idemo-block idemo-block--comment">
            <div className="idemo-block-label">4 · Egen bemærkning (valgfri)</div>
            <label htmlFor="idemo-comment" className="sr-only">
              Egen bemærkning til personalet
            </label>
            <textarea
              id="idemo-comment"
              className="idemo-comment"
              rows={3}
              maxLength={COMMENT_MAX}
              placeholder="Fx: “Går ikke ud i dag” eller “Glæder mig til samtalen i morgen” …"
              value={comment}
              onChange={(e) => onCommentChange(e.target.value)}
              autoComplete="off"
            />
            <div className="idemo-comment-meta" aria-live="polite">
              {comment.length}/{COMMENT_MAX} tegn
            </div>
          </div>

          <div className="idemo-actions">
            <button
              type="button"
              className="btn-primary idemo-send"
              disabled={!canSend}
              onClick={send}
            >
              Send til Care Portal
            </button>
            <button type="button" className="idemo-reset" onClick={reset}>
              Nulstil
            </button>
          </div>
        </div>

        <div className="idemo-flow-connector" aria-hidden>
          <span className="idemo-flow-arrow">→</span>
          <span className="idemo-flow-text">Resultat i Care Portal</span>
          <span className="idemo-flow-arrow idemo-flow-arrow--mobile">↓</span>
        </div>

        <div className={`interactive-demo-portal ${sent ? 'is-live' : ''}`}>
          <div className="idemo-portal-chrome">
            <span className="ld-mini-dots" aria-hidden>
              <span />
              <span />
              <span />
            </span>
            <span className="idemo-portal-url">care.budr.dk · live forhåndsvisning</span>
          </div>

          <div className="idemo-portal-inner">
            <div className="idemo-portal-h">Dagsoverblik · demo</div>
            <p className="idemo-portal-lead">
              {sent
                ? 'Signalet fra Lys er modtaget og fortolket til dagens overblik.'
                : 'Afventer check-in fra Lys — udfyld humør, energi og tema til venstre.'}
            </p>

            <div
              className={`idemo-portal-row ${briefing ? briefing.rowHighlightClass : ''}`}
              aria-live="polite"
            >
              <span className={briefing ? `dss-dot ${briefing.dotClass}` : 'dss-dot green'} />
              <span className="idemo-portal-name">
                <ResidentInitialsAbbr initials="CF" fullName="Camilla Frost" />
              </span>
              <span className={`ld-badge ${briefing ? briefing.ldBadgeClass : 'ok'}`}>
                {briefing ? briefing.badgeLabel : 'OK'}
              </span>
              <span className="idemo-portal-meta">{briefing?.rowMeta ?? 'Ingen nyt signal'}</span>
            </div>

            <div className="idemo-portal-row dim">
              <span className="dss-dot green" />
              <span className="idemo-portal-name">
                <ResidentInitialsAbbr initials="TV" fullName="Thomas Vang" />
              </span>
              <span className="ld-badge ok">Rolig</span>
              <span className="idemo-portal-meta">Morgentjek · 07:48</span>
            </div>

            {sent && briefing && (
              <div
                className={`idemo-portal-notify idemo-portal-notify--${briefing.tone}`}
                role="status"
              >
                {briefing.tone === 'info' && (
                  <IconCheck size={15} className="landing-icon idemo-notify-ic icon-flex-none" />
                )}
                {briefing.tone === 'caution' && (
                  <IconMoodSignal
                    size={15}
                    className="landing-icon idemo-notify-ic icon-flex-none"
                  />
                )}
                {briefing.tone === 'priority' && (
                  <IconWarning
                    size={15}
                    className="landing-icon landing-icon--warn icon-flex-none"
                  />
                )}
                <div>
                  <strong>{briefing.notifyHeadline}</strong>
                  <div className="idemo-portal-notify-body">
                    <p>
                      <ResidentInitialsAbbr initials="CF" fullName="Camilla Frost" /> har tjekket
                      ind i Lys. {briefing.moodNarrative} {briefing.energyNarrative}{' '}
                      {briefing.fillerNarrative}
                    </p>
                    {briefing.commentShown ? (
                      <p className="idemo-portal-notify-quote">
                        <span className="idemo-quote-label">Egen bemærkning:</span> «
                        {briefing.commentShown}»
                      </p>
                    ) : null}
                    <p className="idemo-portal-notify-rec">
                      <strong>Anbefaling:</strong> {briefing.recommendation}
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>

          <p className="idemo-portal-foot">Care Portal (illustration)</p>
        </div>
      </div>

      <p className="idemo-full-demo-links">
        <Link href="/care-portal-demo">Åbn fuld portal-demo</Link>
        <span aria-hidden> · </span>
        <Link href="/app">Åbn Lys</Link>
      </p>
    </div>
  );
}
