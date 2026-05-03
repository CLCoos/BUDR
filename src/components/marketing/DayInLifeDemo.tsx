'use client';

import { Shield } from 'lucide-react';
import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import styles from './DayInLifeDemo.module.css';

type Scene = {
  time: string;
  title: string;
  before: string;
  withBudr: string;
  quote: string;
};

const SCENES: Scene[] = [
  {
    time: '07:15',
    title: 'Vagtskifte',
    before:
      'Sara læser nattevagtens håndskrevne logbog. Tre sider, varierende læselighed. Hun ringer til Mikkel for at høre om Jakobs urolige nat. Hun bruger 20 minutter på at danne sig overblik.',
    withBudr:
      'Sara åbner Care Portal. En vagtoverdragelses-rapport venter — auto-genereret fra nattens hændelser, beboernes tjek-ind, og PN-medicin. Hun har overblikket på 30 sekunder.',
    quote: '“Jeg ved hvad dagen byder, før jeg har drukket min kaffe.”',
  },
  {
    time: '10:45',
    title: 'En svær formiddag',
    before:
      'Camilla går rundt på sit værelse. Sara mærker det, men hun har 30 minutter mellem to møder. Hun gætter på hvad der vil hjælpe. Hun tager en kop te ind og håber.',
    withBudr:
      "En notifikation. Camilla har lavet sit Lys-tjek-ind: 'sløv og lidt fjern'. Sara ser Camillas plan og PARK-mål, og en konkret idé baseret på det Camilla selv har sagt fungerer for hende. Sara går ned og banker på.",
    quote: '“Jeg når at gøre noget rigtigt — ikke kun at slukke ildebrande.”',
  },
  {
    time: '14:00',
    title: 'Dagens noter bliver til journal',
    before:
      'Sara har skrevet stikord ned hele dagen. Nu sidder hun og forsøger at huske. Hun skriver tre journaler fra bunden. Hun bruger 45 minutter. Det bliver aldrig så godt som det burde være.',
    withBudr:
      'Hendes noter — skrevne og indtalte gennem dagen — er allerede samlet. Lys har formuleret dem som professionelle journalnotater, faktuelt tro mod hendes ord. Sara læser igennem, justerer to ting, godkender. Færdig på 5 minutter.',
    quote: '“Journalen er professionel hver gang. Min tid går til beboerne.”',
  },
];

export function DayInLifeDemo() {
  const [visible, setVisible] = useState<Record<string, boolean>>({});
  const nodeMapRef = useRef<Record<string, HTMLElement | null>>({});

  const sceneIds = useMemo(() => SCENES.map((scene) => scene.time), []);

  useLayoutEffect(() => {
    if (typeof IntersectionObserver === 'undefined') {
      setVisible(Object.fromEntries(sceneIds.map((id) => [id, true])));
      return;
    }

    let observer: IntersectionObserver;
    try {
      observer = new IntersectionObserver(
        (entries) => {
          setVisible((prev) => {
            const next = { ...prev };
            for (const entry of entries) {
              const id = (entry.target as HTMLElement).dataset.sceneId;
              if (!id) continue;
              if (entry.isIntersecting) next[id] = true;
            }
            return next;
          });
        },
        { root: null, threshold: 0.28, rootMargin: '0px 0px -8% 0px' }
      );
    } catch {
      setVisible(Object.fromEntries(sceneIds.map((id) => [id, true])));
      return;
    }

    for (const id of sceneIds) {
      const node = nodeMapRef.current[id];
      if (node) observer.observe(node);
    }
    return () => observer.disconnect();
  }, [sceneIds]);

  return (
    <section className={styles.wrap} aria-label="En dag på arbejde med BUDR">
      <header className={styles.intro}>
        <h3 className={styles.title}>En dag på arbejde</h3>
        <p className={styles.subtitle}>Sådan ser det ud, når BUDR forsvinder ind i hverdagen.</p>
      </header>

      <div className={styles.timeline}>
        {SCENES.map((scene, idx) => (
          <div key={scene.time}>
            <article
              ref={(node) => {
                nodeMapRef.current[scene.time] = node;
              }}
              data-scene-id={scene.time}
              className={`${styles.scene} ${visible[scene.time] ? styles.sceneInView : ''}`}
            >
              <p className={styles.sceneMeta}>{scene.time}</p>
              <h4 className={styles.sceneTitle}>{scene.title}</h4>

              <div className={styles.contrast}>
                <div className={`${styles.card} ${styles.before}`}>
                  <span className={`${styles.label} ${styles.labelBefore}`}>Før</span>
                  <p className={styles.body}>{scene.before}</p>
                </div>
                <div className={`${styles.card} ${styles.withBudr}`}>
                  <span className={`${styles.label} ${styles.labelWith}`}>Med BUDR</span>
                  <p className={styles.body}>{scene.withBudr}</p>
                </div>
              </div>

              <p className={styles.quote}>{scene.quote}</p>
            </article>

            {idx < SCENES.length - 1 ? (
              <div className={styles.separator} aria-hidden>
                <span className={styles.separatorLine} />
              </div>
            ) : null}
          </div>
        ))}
      </div>

      <aside className={styles.outro}>
        <h4 className={styles.outroHead}>
          <Shield size={16} className={styles.outroIcon} aria-hidden />
          Og når noget alvorligt sker
        </h4>
        <p className={styles.outroBody}>
          Uanset hvad klokken er, er BUDR der også. Lys-samtaler overvåges for kriseudtryk, og
          personalet får besked indenfor sekunder.
        </p>
      </aside>
    </section>
  );
}
