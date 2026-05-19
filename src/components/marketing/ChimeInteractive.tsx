'use client';

import { useEffect, useRef, useState, type KeyboardEvent } from 'react';

type Dimension = {
  letter: 'C' | 'H' | 'I' | 'M' | 'E';
  en: string;
  da: string;
  def: string;
  forskning: string;
  budr: string;
  eksempel: string;
};

const DIMENSIONS: Dimension[] = [
  {
    letter: 'C',
    en: 'Connectedness',
    da: 'Forbundethed',
    def: 'Meningsfulde relationer, oplevelsen af at høre til, ikke at være alene med sin lidelse.',
    forskning: 'Identificeret i 82% af de gennemgåede recovery-studier som central faktor.',
    budr: 'BUDR fanger små sociale skridt — som «Sara smilede til Sofie i fællesrummet» — og gør dem synlige som mønster over uger. Personalet ser om en borger trækker sig eller åbner op.',
    eksempel:
      '«Jeg ville gerne have hilst. Men jeg blev så bange.» — Sara, uge 1. Tre uger senere: «Jeg sagde hej. Sofie smilede tilbage.»',
  },
  {
    letter: 'H',
    en: 'Hope',
    da: 'Håb',
    def: 'Tro på at forandring er mulig. Motivation til at fortsætte, særligt på svære dage.',
    forskning: 'Den mest gennemgående tema i recovery-fortællinger fra brugere selv.',
    budr: 'Borgerens egne recovery-fortællinger gemmes og kan genbesøges. Små sejre, der ellers ville forsvinde i hverdagens støj, bliver til ressourcer for fremtiden.',
    eksempel:
      'Sara læser sin egen besked fra forrige uge på en dårlig dag: «Jeg gjorde det én gang. Måske kan jeg igen.»',
  },
  {
    letter: 'I',
    en: 'Identity',
    da: 'Identitet',
    def: 'Genopbygning af positiv selvopfattelse. At være menneske før diagnose.',
    forskning: 'Stigma og selvstigma identificeres som de største barrierer for recovery.',
    budr: 'Borgerprofiler bygger på styrker, værdier og drømme — ikke kun diagnoser og indsatsmål. Personalet møder mennesket før sagsmappen.',
    eksempel:
      'I Saras profil: «Vil gerne male igen. Drømmer om at få en kat.» Hendes diagnose er ét datapunkt blandt mange.',
  },
  {
    letter: 'M',
    en: 'Meaning',
    da: 'Mening',
    def: 'Mening i hverdagen. Sociale roller. Livskvalitet på trods af psykisk lidelse.',
    forskning:
      'Recovery er ikke fravær af symptomer — det er at bygge et liv der føles værd at leve.',
    budr: 'Refleksioner over hverdagen via Lys. «Hvad gav mening i dag? Hvor sad det fast?» Borgeren skriver eller taler ind — personalet ser mønstret.',
    eksempel:
      'Sara har skrevet i tre uger. Mønstret viser: hun har mening i kunstterapi om tirsdagen. Det bliver et anker.',
  },
  {
    letter: 'E',
    en: 'Empowerment',
    da: 'Handlekraft',
    def: 'Kontrol over eget liv. Ansvar. Ressourcefokus frem for mangelfokus.',
    forskning:
      'Borgere der formulerer egne mål har markant højere recovery-rater end borgere med mål sat af andre.',
    budr: 'Næste skridt formuleres af borgeren, støttet af personalet — ikke pålagt borgeren. KRAP-kompatibelt: konkret, ressourcefokuseret, anerkendende.',
    eksempel:
      'Sara og kontaktpersonen aftaler sammen: «Smile og sige hej til Sofie én gang denne uge.» Mål sat med Sara, ikke for hende.',
  },
];

export function ChimeInteractive() {
  const [activeIdx, setActiveIdx] = useState(0);
  const [fading, setFading] = useState(false);
  const gridRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const [hasPulsed, setHasPulsed] = useState(false);

  useEffect(() => {
    if (hasPulsed || !gridRef.current || typeof IntersectionObserver === 'undefined') return;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasPulsed) {
            setHasPulsed(true);
            buttonRefs.current.forEach((btn, i) => {
              if (!btn) return;
              setTimeout(() => {
                btn.classList.add('chime-pulse');
                setTimeout(() => btn.classList.remove('chime-pulse'), 800);
              }, i * 140);
            });
            observer.disconnect();
          }
        });
      },
      { threshold: 0.5 }
    );
    observer.observe(gridRef.current);
    return () => observer.disconnect();
  }, [hasPulsed]);

  const activate = (idx: number) => {
    if (idx === activeIdx) return;
    setFading(true);
    setTimeout(() => {
      setActiveIdx(idx);
      setFading(false);
    }, 100);
  };

  const onKeyDown = (e: KeyboardEvent, idx: number) => {
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault();
      const dir = e.key === 'ArrowRight' ? 1 : -1;
      const next = (idx + dir + DIMENSIONS.length) % DIMENSIONS.length;
      buttonRefs.current[next]?.focus();
      activate(next);
    }
  };

  const active = DIMENSIONS[activeIdx];

  return (
    <section className="chime-interactive" aria-labelledby="chime-heading">
      <div className="chime-eyebrow">Det faglige grundlag</div>
      <h2 id="chime-heading" className="chime-h1">
        Recovery består af fem dimensioner
      </h2>
      <p className="chime-intro">
        CHIME er ikke en behandlingsmetode. Det er rammen der beskriver{' '}
        <em>hvad personlig recovery faktisk består af</em> — baseret på systematisk analyse af 97
        internationale studier og brugerstemmer. Klik på en dimension for at se hvordan BUDR
        understøtter den i hverdagen.
      </p>

      <div className="chime-grid" ref={gridRef} role="tablist" aria-label="CHIME-dimensioner">
        {DIMENSIONS.map((d, idx) => (
          <button
            key={d.letter}
            ref={(el) => {
              buttonRefs.current[idx] = el;
            }}
            type="button"
            className={`chime-btn${idx === activeIdx ? ' active' : ''}`}
            role="tab"
            aria-selected={idx === activeIdx}
            tabIndex={idx === activeIdx ? 0 : -1}
            onClick={() => activate(idx)}
            onKeyDown={(e) => onKeyDown(e, idx)}
          >
            <span className="chime-letter">{d.letter}</span>
            <span className="chime-en">{d.en}</span>
            <span className="chime-da">{d.da}</span>
          </button>
        ))}
      </div>

      <div
        className="chime-detail"
        role="tabpanel"
        aria-live="polite"
        style={{ opacity: fading ? 0 : 1 }}
      >
        <div className="chime-detail-inner">
          <div className="chime-detail-eyebrow">{active.letter} — Dimension</div>
          <h3 className="chime-detail-title">{active.en}</h3>
          <p className="chime-detail-translation">{active.da}</p>
          <p className="chime-detail-def">{active.def}</p>
          <div className="chime-blocks">
            <div>
              <div className="chime-block-label">Forskning</div>
              <p className="chime-block-text">{active.forskning}</p>
            </div>
            <div>
              <div className="chime-block-label">I BUDR</div>
              <p className="chime-block-text">{active.budr}</p>
            </div>
            <div className="chime-example">
              <div className="chime-block-label chime-example-label">Saras forløb</div>
              <p className="chime-example-quote">{active.eksempel}</p>
            </div>
          </div>
        </div>
      </div>

      <p className="chime-source">
        <a
          href="https://pubmed.ncbi.nlm.nih.gov/22130746/"
          target="_blank"
          rel="noopener noreferrer"
        >
          Leamy et al., British Journal of Psychiatry, 2011 ↗
        </a>
      </p>
    </section>
  );
}
