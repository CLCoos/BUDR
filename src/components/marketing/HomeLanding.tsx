'use client';

import Link from 'next/link';
import { useEffect, useId, useState } from 'react';

type HomeLandingProps = {
  className?: string;
};

type RoleId =
  | 'paedagoger'
  | 'ledere'
  | 'koordinatorer'
  | 'vikarer'
  | 'vagtplan'
  | 'sagsbehandler'
  | 'borger';

type RoleBlock = {
  id: RoleId;
  label: string;
  title: string;
  lead: string;
  bullets: string[];
  demo: string;
  showLysSectionLink?: boolean;
};

const ROLE_BLOCKS: RoleBlock[] = [
  {
    id: 'paedagoger',
    label: 'For pædagoger',
    title: 'For pædagoger',
    lead: 'Når vagten starter, skal I vide, hvem der har brug for jer — ikke lede i fire systemer først. Når pædagogerne elsker overblikket, følger resten af huset trop.',
    bullets: [
      'Dagsoverblik sorteret efter behov, så I prioriterer som fagpersoner — ikke som arkivarer.',
      'Signaler fra borgeren (via Lys) og morgentjek samme sted — færre “vidste du ikke …?” på gangen.',
      'Udkast til journal og notater tæt på det, der skete — mindre tom skærm, når dagen er slut.',
      'Struktur til overdragelse, så kvaliteten holder vagt efter vagt — uden at noget forbliver i hovedet på én person.',
    ],
    demo: 'Vi viser de første minutter af en vagt: prioritering, én borger i dybden, og hvordan notatet tager form.',
  },
  {
    id: 'ledere',
    label: 'For ledere',
    title: 'For ledere',
    lead: 'I skal kunne stole på drift og dokumentation — uden at mikrostyre eller jagte svar i mailtråde. BUDR gør hverdagen mere gennemskuelig for både team og omverden.',
    bullets: [
      'Samlet billede af huset: hvem kræver opmærksomhed, og hvor dokumentationen halter — uden KPI-støj.',
      'Bedre grundlag til samtaler med medarbejdere, pårørende og kommune, fordi hændelser er sporbare og forståelige.',
      'Mindre brandslukning: varsler og overblik, før små ting bliver store.',
      'Tryg introduktion af nye medarbejdere og vikarer — samme sandhed i systemet, uanset hvem der går vagt.',
    ],
    demo: 'Lederens overblik: fra risiko og belastning til opfølgning og klar kommunikation ud af huset.',
  },
  {
    id: 'koordinatorer',
    label: 'For koordinatorer',
    title: 'For koordinatorer',
    lead: 'Koordinering kræver, at alle trækker på den samme opdaterede virkelighed — ikke på hver sin notesbog eller sidste uges mail.',
    bullets: [
      'Én kilde for planer, aftaler og opfølgning på tværs af vagter og faggrupper.',
      'Lettere at holde tråden i sager, når journal, borgerprofil og daglig praksis hænger sammen.',
      'Mindre dobbeltindtastning og færre “jeg troede, X havde sagt til kommunen …”.',
      'Tydelighed om ansvar: hvem følger op — og hvornår.',
    ],
    demo: 'Én borger på tværs af uge og kontakter — koordinering uden kaos, med plads til kommunikation med kommune og sagsbehandler.',
  },
  {
    id: 'vikarer',
    label: 'For vikarer',
    title: 'For vikarer',
    lead: 'Ved sygdom eller akut hjælp skal huset ikke blive usikkert — hverken for borgere eller for jer. Her menes både nye og garvede vikarer, som ikke har deres daglige gang i huset.',
    bullets: [
      'Overblik skåret til vagten: hvem er tryg, hvem kræver særligt fokus, og hvad er aftalt om medicin og rutiner.',
      'Kort kontekst pr. borger uden at læse hele sagen igennem den første time.',
      'Tydelige varsler, så “stille” ikke fejlfortolkes som “trygt”.',
      'Samme platform som det faste team — I falder til ro hurtigere, også når I er helt uprøvede i netop dette hus.',
    ],
    demo: 'Første kvarter på en vikar-vagt: fra login til tryg prioritering og handling.',
  },
  {
    id: 'vagtplan',
    label: 'For vagtplanlæggere',
    title: 'For vagtplanlæggere',
    lead: 'Gode vagter handler ikke kun om tal på en tavle — men om at matche bemanding til den omsorgsmæssige virkelighed, I kan mærke i huset.',
    bullets: [
      'Indsigt i perioder med mange signaler eller skift i trivsel, så I kan tale om belastning før den bliver kritisk.',
      'Supplering af jeres eksisterende vagtplan med et menneskeligt overblik — ikke et overvågningssystem.',
      'Færre overraskelser: når fronten og planlægningen ser det samme, bliver dialogen enklere.',
    ],
    demo: 'Sådan omsættes hverdagens signaler til bedre planlægningsdialog — uden ekstra papirarbejde.',
  },
  {
    id: 'sagsbehandler',
    label: 'For sagsbehandlere',
    title: 'For sagsbehandlere',
    lead: 'Når kommunikationen mellem botilbud og kommune er klar, præcis og rettidig, vinder alle — især borgeren. Det er essentielt for ledere og koordinatorer i det daglige, og det er her BUDR kan skille sig ud fra konkurrenter.',
    bullets: [
      'Dokumentation der følger praksis tættere — mindre jagt på bilag og mails, når der skal træffes beslutninger.',
      'Tydeligt skel: borgerens egen oplevelse (Lys), observation og personalets faglige vurdering — læsbart for sagsbehandling.',
      'Kontrolleret deling af det, der er relevant for sagen — med respekt for GDPR og retssikkerhed.',
      'Færre opkald for at rekonstruere “hvad der egentlig skete” — mere tid til faktisk indsats.',
    ],
    demo: 'Fra hændelse i hverdagen til struktureret underlag til sagsbehandling — inkl. hvordan kommunikationen med kommunen kan glide bedre.',
  },
  {
    id: 'borger',
    label: 'For borgere',
    title: 'For borgere',
    lead: 'I fortjener at blive mødt i øjenhøjje — også når det er svært at sætte ord på. Borger og Lys hænger sammen: Lys er jeres produkt, portalen er personalets, og begge dele tjener den samme værdige hverdag.',
    bullets: [
      'Lys er jeres rolige ledsager i lommen: samtale, humør og små planer, når I har brug for det — døgnet rundt.',
      'Det, I deler i Lys, kan (når I ønsker det) hjælpe personalet med at forstå jer bedre — uden at I skal gentage alt foran alle.',
      'Enkel adgang: typisk personligt link, uden app-butik og uden tungt login — lavet til mennesker, ikke superbrugere.',
      'Værdighed først: teknologien skal understøtte jeres autonomi og tryghed — ikke føles som overvågning.',
    ],
    demo: 'Prøv Lys-demoen og se, hvordan personalet ser det, der hjælper jer — ikke alt.',
    showLysSectionLink: true,
  },
];

export default function HomeLanding({ className = '' }: HomeLandingProps) {
  const rolesHeadingId = useId();
  const [activeRole, setActiveRole] = useState<RoleId>('paedagoger');
  const active = ROLE_BLOCKS.find((r) => r.id === activeRole) ?? ROLE_BLOCKS[0];
  useEffect(() => {
    const els = Array.from(document.querySelectorAll<HTMLElement>('.budr-landing .fi'));
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) e.target.classList.add('vis');
        });
      },
      { threshold: 0.08 }
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  return (
    <div className={`budr-landing ${className}`.trim()}>
      <nav>
        <Link href="/" className="nav-logo">
          <div className="logo-mark">B</div>
          BUDR Care
        </Link>
        <ul className="nav-links">
          <li>
            <a href="#portalen">Care Portal</a>
          </li>
          <li>
            <a href="#skift">Hverdag &amp; systemer</a>
          </li>
          <li>
            <a href="#hvad-kan-budr">Hvad kan BUDR?</a>
          </li>
          <li>
            <a href="#lys">Lys til borgeren</a>
          </li>
          <li>
            <a href="#om-budr">Om BUDR</a>
          </li>
          <li>
            <Link href="/care-portal-demo" className="nav-cta">
              Prøv portal →
            </Link>
          </li>
        </ul>
        <Link href="/care-portal-demo" className="nav-mobile-demo">
          Prøv portal
        </Link>
      </nav>

      <section className="hero">
        <div className="hero-bg" aria-hidden />
        <div className="hero-inner">
          <div>
            <div className="hero-tag">
              <span aria-hidden />
              Til pædagoger og ledere · Botilbud &amp; socialpsykiatri
            </div>
            <h1>
              Journalen, medicinen og borgerens egne ord — <em>før I åbner første dør.</em>
            </h1>
            <p className="hero-sub">
              I kender det: notater der skal skrives efter vagt, medicin der skal stemples rigtigt,
              og borgeroplysninger der ligger spredt mellem mapper og gamle systemer. Care Portal
              samler overblikket, så I kan møde borgerne som mennesker — med ro i maven og tid til
              det, der faktisk kræver jer.
            </p>
            <div className="hero-actions">
              <Link href="/care-portal-demo" className="btn-primary">
                Prøv portalen gratis →
              </Link>
              <a
                href="mailto:hej@budrcare.dk?subject=Demo%20af%20BUDR%20Care"
                className="btn-ghost"
              >
                Book en gennemgang
              </a>
            </div>
          </div>

          <div className="portal-hero-mock" aria-label="Illustration: dagsoverblik i Care Portal">
            <div className="pmh-top">
              <span className="pmh-title">Care Portal · Dagsoverblik</span>
              <span className="pmh-date">I dag · 08:12</span>
            </div>
            <div className="pmh-tabs">
              <div className="pmh-tab active">Alle beboere</div>
              <div className="pmh-tab">Kræver opmærksomhed</div>
              <div className="pmh-tab">Medicin &amp; plan</div>
            </div>
            <div className="res-item">
              <div className="res-dot d-green" />
              <span className="res-name">Thomas Vang</span>
              <span className="res-mood">Morgentjek ✓</span>
              <span className="res-time">07:48</span>
            </div>
            <div className="res-item">
              <div className="res-dot d-amber" />
              <span className="res-name">Camilla Frost</span>
              <span className="res-mood">Lys: angst</span>
              <span className="res-time">08:05</span>
            </div>
            <div className="res-item">
              <div className="res-dot d-red" />
              <span className="res-name">Jakob Møller</span>
              <span className="res-mood">Intet tjek</span>
              <span className="res-time">—</span>
            </div>
            <div className="pmh-alert">
              ⚠ Camilla har markeret angst i Lys — anbefalet opfølgning før kl. 09
            </div>
            <div className="pmh-sep" />
            <div className="pmh-stat-row">
              <div className="pmh-stat">
                <div className="pmh-stat-n">9</div>
                <div className="pmh-stat-l">Tjekket ind</div>
              </div>
              <div className="pmh-stat">
                <div className="pmh-stat-n">2</div>
                <div className="pmh-stat-l">Kræver dig</div>
              </div>
              <div className="pmh-stat">
                <div className="pmh-stat-n">1</div>
                <div className="pmh-stat-l">Uden kontakt</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="stats-bar fi">
        <div className="stats-inner">
          <div>
            <div className="stat-n">3</div>
            <div className="stat-l">Aktive botilbud i pilot</div>
          </div>
          <div>
            <div className="stat-n">&lt;5 min</div>
            <div className="stat-l">Til første rigtige overblik</div>
          </div>
          <div>
            <div className="stat-n">~2 t</div>
            <div className="stat-l">Mindre dokumentation pr. døgn*</div>
          </div>
          <div>
            <div className="stat-n">0</div>
            <div className="stat-l">Ringbind som eneste sandhed</div>
          </div>
        </div>
      </div>

      <section className="switch-section" id="skift">
        <div className="switch-grid fi">
          <div>
            <div className="eyebrow">Det I mærker hver dag</div>
            <h2 className="section-h">
              Eksisterende systemer er bygget til sager — <em>ikke til jeres vagt</em>
            </h2>
            <p className="section-p">
              Som pædagog eller leder skal I både være til stede i nuet og dokumentere bagefter.
              Kommunale platforme er ofte skabt til sagsbehandling, tilsyn og regler — ikke til at
              besvare spørgsmålet: <em>Hvem har brug for mig først — og hvorfor?</em> BUDR Care
              supplerer billedet med borgerens egne signaler og et overblik, I kan handle på, mens
              kaffen stadig er varm.
            </p>
            <div className="pain-list">
              <div className="pain-item">
                <div className="pain-icon">📝</div>
                <div className="pain-text">
                  <strong>Journal og dokumentation</strong> lægger sig som en sidste opgave efter
                  vagt — eller bliver til generiske sætninger, fordi tiden ikke er der. I mister
                  nuancer, og borgeren mister synlighed i egen fremgang.
                </div>
              </div>
              <div className="pain-item">
                <div className="pain-icon">💊</div>
                <div className="pain-text">
                  <strong>Medicin og udlevering</strong> kræver fokus hver eneste gang. Når lister
                  ligger i forskellige systemer, stiger risikoen — og den mentale belastning for
                  personalet, der allerede har nok at holde styr på.
                </div>
              </div>
              <div className="pain-item">
                <div className="pain-icon">🗂</div>
                <div className="pain-text">
                  <strong>Borgeroplysninger</strong> er spredt: PRP, allergier, pårørende, triggere,
                  aftaler. I bruger minutter på at lede — minutter, borgeren kunne have fået som
                  nærvær.
                </div>
              </div>
            </div>
          </div>

          <div className="fi fi-d1">
            <div className="eyebrow" style={{ marginBottom: 20 }}>
              Hvad kan hvad? (kort fortalt)
            </div>
            <div className="comp-table">
              <div className="comp-row hdr">
                <div className="comp-cell">Funktion</div>
                <div className="comp-cell budr-c">BUDR</div>
                <div className="comp-cell">Planner4You</div>
                <div className="comp-cell">Citizen ONE</div>
                <div className="comp-cell">KMD</div>
              </div>
              <div className="comp-row">
                <div className="comp-cell feat-label">Journal- &amp; notatstøtte tæt på vagten</div>
                <div className="comp-cell budr-c">
                  <span className="yes">✓</span>
                </div>
                <div className="comp-cell">
                  <span className="no">✗</span>
                </div>
                <div className="comp-cell">
                  <span className="part">Delvist</span>
                </div>
                <div className="comp-cell">
                  <span className="part">Delvist</span>
                </div>
              </div>
              <div className="comp-row">
                <div className="comp-cell feat-label">Medicin &amp; udlevering med sporbarhed</div>
                <div className="comp-cell budr-c">
                  <span className="yes">✓</span>
                </div>
                <div className="comp-cell">
                  <span className="no">✗</span>
                </div>
                <div className="comp-cell">
                  <span className="part">Delvist</span>
                </div>
                <div className="comp-cell">
                  <span className="part">Delvist</span>
                </div>
              </div>
              <div className="comp-row">
                <div className="comp-cell feat-label">
                  Samlet borgerprofil (PRP, risiko, kontakter)
                </div>
                <div className="comp-cell budr-c">
                  <span className="yes">✓</span>
                </div>
                <div className="comp-cell">
                  <span className="part">Delvist</span>
                </div>
                <div className="comp-cell">
                  <span className="no">✗</span>
                </div>
                <div className="comp-cell">
                  <span className="part">Delvist</span>
                </div>
              </div>
              <div className="comp-row">
                <div className="comp-cell feat-label">Realtidsstatus pr. borger</div>
                <div className="comp-cell budr-c">
                  <span className="yes">✓</span>
                </div>
                <div className="comp-cell">
                  <span className="no">✗</span>
                </div>
                <div className="comp-cell">
                  <span className="no">✗</span>
                </div>
                <div className="comp-cell">
                  <span className="no">✗</span>
                </div>
              </div>
              <div className="comp-row">
                <div className="comp-cell feat-label">
                  Borgerens stemme direkte i systemet (Lys)
                </div>
                <div className="comp-cell budr-c">
                  <span className="yes">✓</span>
                </div>
                <div className="comp-cell">
                  <span className="no">✗</span>
                </div>
                <div className="comp-cell">
                  <span className="no">✗</span>
                </div>
                <div className="comp-cell">
                  <span className="no">✗</span>
                </div>
              </div>
              <div className="comp-row">
                <div className="comp-cell feat-label">
                  AI-dagplan — først efter personalets godkendelse
                </div>
                <div className="comp-cell budr-c">
                  <span className="yes">✓</span>
                </div>
                <div className="comp-cell">
                  <span className="no">✗</span>
                </div>
                <div className="comp-cell">
                  <span className="no">✗</span>
                </div>
                <div className="comp-cell">
                  <span className="no">✗</span>
                </div>
              </div>
              <div className="comp-row">
                <div className="comp-cell feat-label">Vagtskifte-overblik på under 2 min.</div>
                <div className="comp-cell budr-c">
                  <span className="yes">✓</span>
                </div>
                <div className="comp-cell">
                  <span className="part">Delvist</span>
                </div>
                <div className="comp-cell">
                  <span className="no">✗</span>
                </div>
                <div className="comp-cell">
                  <span className="no">✗</span>
                </div>
              </div>
              <div className="comp-row">
                <div className="comp-cell feat-label">Varsler ved krise / manglende tjek-in</div>
                <div className="comp-cell budr-c">
                  <span className="yes">✓</span>
                </div>
                <div className="comp-cell">
                  <span className="no">✗</span>
                </div>
                <div className="comp-cell">
                  <span className="no">✗</span>
                </div>
                <div className="comp-cell">
                  <span className="no">✗</span>
                </div>
              </div>
              <div className="comp-row">
                <div className="comp-cell feat-label">Onboarding under 5 minutter</div>
                <div className="comp-cell budr-c">
                  <span className="yes">✓</span>
                </div>
                <div className="comp-cell">
                  <span className="yes">✓</span>
                </div>
                <div className="comp-cell">
                  <span className="no">✗</span>
                </div>
                <div className="comp-cell">
                  <span className="no">✗</span>
                </div>
              </div>
              <div className="comp-row">
                <div className="comp-cell feat-label">GDPR · databehandling i DK/EU</div>
                <div className="comp-cell budr-c">
                  <span className="yes">✓</span>
                </div>
                <div className="comp-cell">
                  <span className="yes">✓</span>
                </div>
                <div className="comp-cell">
                  <span className="part">Delvist</span>
                </div>
                <div className="comp-cell">
                  <span className="yes">✓</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="portal-section" id="portalen">
        <div className="portal-grid fi">
          <div>
            <div className="eyebrow">Care Portal — bygget til personalet</div>
            <h2 className="section-h">
              Alt det, I alligevel ville spørge kollegaen om — <em>samlet ét sted</em>
            </h2>
            <p className="section-p">
              Portalen er jeres fælles situationssyn: hvem har det svært lige nu, hvad er aftalt om
              medicin og aktiviteter, og hvad skal journalen vide — uden at I skal jagte tråde i
              fire forskellige programmer. Det er beslutningsstøtte, ikke erstatning for jeres
              faglighed.
            </p>
            <div className="feature-pills">
              <div className="fpill">
                <div className="fpill-icon">📊</div>
                <div>
                  <div className="fpill-title">Dagsoverblik pr. beboer</div>
                  <div className="fpill-desc">
                    Ét skærmbillede: hvem er ok, hvem skal have øje på, og hvem har ikke meldt sig.
                    Sorteret efter behov — ikke alfabetisk.
                  </div>
                </div>
              </div>
              <div className="fpill">
                <div className="fpill-icon">📝</div>
                <div>
                  <div className="fpill-title">Journal &amp; dokumentation der følger dagen</div>
                  <div className="fpill-desc">
                    Udkast og struktur bygget på det, der faktisk skete — inkl. signaler fra Lys —
                    så I kan godkende og justere i stedet for at starte fra blank skærm kl. 21.
                  </div>
                </div>
              </div>
              <div className="fpill">
                <div className="fpill-icon">💊</div>
                <div>
                  <div className="fpill-title">Medicin, lister og borgeroplysninger samlet</div>
                  <div className="fpill-desc">
                    Færre skærmbilleder når I skal handle sikkert: overblik over relevante
                    oplysninger og sporbarhed omkring udlevering — så hverdagen føles mere tryg for
                    alle.
                  </div>
                </div>
              </div>
              <div className="fpill">
                <div className="fpill-icon">⚡</div>
                <div>
                  <div className="fpill-title">Realtidsvarsler</div>
                  <div className="fpill-desc">
                    Når Lys markerer uro, eller et tjek mangler, lander det i portalen med det samme
                    — ikke som en mail i morgen.
                  </div>
                </div>
              </div>
              <div className="fpill">
                <div className="fpill-icon">✅</div>
                <div>
                  <div className="fpill-title">Planforslag — I godkender</div>
                  <div className="fpill-desc">
                    AI kan foreslå struktur for dagen ud fra mønstre; intet aktiveres uden
                    personalets klare ok. Borgeren møder en plan, I står inde for.
                  </div>
                </div>
              </div>
            </div>
            <div style={{ display: 'flex', gap: 12, marginTop: 28, flexWrap: 'wrap' }}>
              <Link href="/care-portal-demo" className="btn-sm">
                Interaktiv demo
              </Link>
              <Link href="/care-portal-login" className="btn-sm-ghost">
                Log ind →
              </Link>
            </div>
          </div>

          <div className="portal-screen fi fi-d1">
            <div className="ps-bar">
              <div className="ps-dots">
                <div className="ps-dot" style={{ background: '#e05555' }} />
                <div className="ps-dot" style={{ background: '#e8a847' }} />
                <div className="ps-dot" style={{ background: '#3cbf70' }} />
              </div>
              <div className="ps-url">care.budr.dk</div>
            </div>
            <div className="ps-body">
              <div className="ps-sidebar">
                <div
                  style={{
                    fontSize: '0.7rem',
                    color: 'var(--fog)',
                    fontWeight: 600,
                    marginBottom: 12,
                    padding: '0 4px',
                  }}
                >
                  BUDR
                </div>
                <div className="ps-nav-item active">📊 Dagsoverblik</div>
                <div className="ps-nav-item">👤 Beboere &amp; profil</div>
                <div className="ps-nav-item">📝 Journal</div>
                <div className="ps-nav-item">💊 Medicin</div>
                <div className="ps-nav-item">✅ Planforslag</div>
                <div className="ps-nav-item">⚡ Varsler</div>
                <div className="ps-nav-item">⚙ Indstillinger</div>
              </div>
              <div className="ps-main">
                <div className="ps-main-title">Dagsoverblik · 12 beboere</div>
                <div className="ps-col-h">
                  <span />
                  <span>Navn</span>
                  <span>Status</span>
                  <span>Signal</span>
                  <span>Siden</span>
                </div>
                <div className="ps-res-row">
                  <div className="res-dot d-green" />
                  <span>Thomas Vang</span>
                  <span className="ps-badge badge-ok">Rolig</span>
                  <span className="ps-note">God energi</span>
                  <span className="ps-note">07:48</span>
                </div>
                <div className="ps-res-row">
                  <div className="res-dot d-amber" />
                  <span>Camilla Frost</span>
                  <span className="ps-badge badge-warn">Opmærksom</span>
                  <span className="ps-note">Lys: angst</span>
                  <span className="ps-note">08:05</span>
                </div>
                <div className="ps-res-row">
                  <div className="res-dot d-red" />
                  <span>Jakob Møller</span>
                  <span className="ps-badge badge-crit">Intet tjek</span>
                  <span className="ps-note">—</span>
                  <span className="ps-note">—</span>
                </div>
                <div className="ps-res-row">
                  <div className="res-dot d-green" />
                  <span>Sara Jensen</span>
                  <span className="ps-badge badge-ok">Rolig</span>
                  <span className="ps-note">Glad</span>
                  <span className="ps-note">07:22</span>
                </div>
                <div className="ps-res-row">
                  <div className="res-dot d-green" />
                  <span>Mikkel Dahl</span>
                  <span className="ps-badge badge-ok">Rolig</span>
                  <span className="ps-note">Ok</span>
                  <span className="ps-note">08:11</span>
                </div>
                <div
                  style={{
                    padding: '10px 10px 0',
                    fontSize: '0.68rem',
                    color: 'var(--fog)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span>Viser 5 af 12 beboere</span>
                  <span style={{ color: 'var(--amber)', fontSize: '0.7rem' }}>Se alle →</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="roles-section" id="hvad-kan-budr" aria-labelledby={rolesHeadingId}>
        <div className="fi">
          <div className="eyebrow">Én platform — mange roller</div>
          <h2 className="section-h" id={rolesHeadingId}>
            Hvad kan BUDR Care? <em>Det afhænger af, hvem du er.</em>
          </h2>
          <p className="section-p roles-intro">
            Vælg jeres rolle og se, hvordan Care Portal og Lys gør arbejdet nemmere, hurtigere og
            mere meningsfuldt. Vi tilpasser gerne demoen, så den starter med det, der betyder mest
            for jer — ofte med pædagogerne først, for når de får ro i maven, følger resten trop.
          </p>

          <div
            className="roles-tablist"
            role="tablist"
            aria-label="Vælg rolle for at se, hvad BUDR Care tilbyder"
          >
            {ROLE_BLOCKS.map((r) => {
              const tabId = `budr-role-tab-${r.id}`;
              const panelId = `budr-role-panel-${r.id}`;
              return (
                <button
                  key={r.id}
                  type="button"
                  role="tab"
                  id={tabId}
                  className="roles-tab"
                  aria-selected={activeRole === r.id}
                  aria-controls={panelId}
                  tabIndex={activeRole === r.id ? 0 : -1}
                  onClick={() => setActiveRole(r.id)}
                >
                  {r.label}
                </button>
              );
            })}
          </div>

          <div
            role="tabpanel"
            id={`budr-role-panel-${active.id}`}
            aria-labelledby={`budr-role-tab-${active.id}`}
            className="roles-panel"
          >
            <h3 className="roles-panel-h">{active.title}</h3>
            <p className="roles-panel-lead">{active.lead}</p>
            <ul className="roles-panel-ul">
              {active.bullets.map((line, i) => (
                <li key={`${active.id}-${i}`} className="roles-panel-li">
                  {line}
                </li>
              ))}
            </ul>
            <p className="roles-panel-demo">
              I en demo: <span>{active.demo}</span>
            </p>
            {active.showLysSectionLink ? (
              <a href="#lys" className="roles-lys-link">
                Se hele Lys-sektionen — produktet for borgeren →
              </a>
            ) : null}
          </div>
        </div>
      </section>

      <section className="lys-section" id="lys">
        <div className="lys-grid fi">
          <div className="lys-mock-wrap">
            <div className="lys-hdr">
              <div className="lys-av">L</div>
              <div>
                <div className="lys-nm">Lys</div>
                <div className="lys-st">● Aktiv nu</div>
              </div>
              <div style={{ marginLeft: 'auto', fontSize: '0.68rem', color: 'var(--fog)' }}>
                09:41
              </div>
            </div>
            <div className="chat-b user">
              Jeg er lidt nervøs i dag. Ikke helt sikker på hvorfor.
            </div>
            <div className="chat-b ai">
              Det lyder som en tung start. Hvad tror du er det første, der fylder mest lige nu?
            </div>
            <div className="chat-notif">⚡ Angstmarkering sendt til personalets portal</div>
            <div className="chat-b user">Måske mødet med sagsbehandleren senere.</div>
            <div className="chat-b ai">
              Sådanne møder kan føles store. Vil du prøve en helt lille plan for, hvad du gerne vil
              sige?
            </div>
            <div
              style={{ marginTop: 12, fontSize: '0.68rem', color: 'var(--fog)', marginBottom: 5 }}
            >
              Dagens energi (fra borgeren)
            </div>
            <div className="energy-bar">
              <div className="e-seg" style={{ background: '#d95555' }} />
              <div className="e-seg" style={{ background: '#e8874a' }} />
              <div
                className="e-seg"
                style={{
                  background: 'var(--amber)',
                  boxShadow: '0 0 7px rgba(233,170,71,.5)',
                }}
              />
              <div className="e-seg" style={{ background: 'rgba(255,255,255,.08)' }} />
              <div className="e-seg" style={{ background: 'rgba(255,255,255,.08)' }} />
            </div>
          </div>
          <div>
            <div className="eyebrow">Lys — borgerens stemme</div>
            <h2 className="section-h">
              Værdighed starter med at blive hørt — <em>også når ordene mangler</em>
            </h2>
            <p className="section-p">
              Under <a href="#hvad-kan-budr">Hvad kan BUDR Care?</a> forklarer vi også Lys set fra
              borgerens side. Her går vi i dybden: Lys er et selvstændigt produkt, der hænger sammen
              med portalen — det, borgeren deler, kan blive til tryghed og bedre beslutninger i
              huset, uden at gøre nogen til et sagsnummer.
            </p>
            <div className="lys-bonus-pills">
              <div className="lys-bonus-pill">
                <div className="lys-bonus-pill-icon">🗣</div>
                <p>
                  <strong>Borgeren som aktiv kilde — ikke kun observation.</strong> I konkurrerende
                  løsninger er data ofte personalets vurdering. Lys tilføjer borgerens egen
                  oplevelse direkte i flowet.
                </p>
              </div>
              <div className="lys-bonus-pill">
                <div className="lys-bonus-pill-icon">🌙</div>
                <p>
                  <strong>Tilgængelig 24/7.</strong> Når natten er lang, eller angsten rammer, er
                  der et sted at gå hen — som samtidig kan eskalere til jer, når det er nødvendigt.
                </p>
              </div>
              <div className="lys-bonus-pill">
                <div className="lys-bonus-pill-icon">🔐</div>
                <p>
                  <strong>Ingen app-butik. Intet kodeord.</strong> Personligt link og ét klik —
                  designet til reelle mennesker, ikke superbrugere.
                </p>
              </div>
            </div>
            <div style={{ marginTop: 24 }}>
              <Link href="/app" className="btn-sm">
                Åbn Lys-demo
              </Link>
            </div>
          </div>
        </div>
      </section>

      <section className="testimonials">
        <div className="fi" style={{ textAlign: 'center' }}>
          <div className="eyebrow" style={{ display: 'flex', justifyContent: 'center' }}>
            Fra pædagoger og ledere
          </div>
          <h2
            className="section-h"
            style={{ margin: '0 auto', textAlign: 'center', maxWidth: 'none' }}
          >
            Når hverdagen føles anderledes
          </h2>
        </div>
        <div className="t-grid fi fi-d1">
          <div className="t-card">
            <div className="t-stars">★★★★★</div>
            <p className="t-text">
              Borgerne fortæller Lys ting, de ikke når at sige i køkkenet. Vi ser det i portalen,
              før vi fordeler opgaver — det føles som at få et forspring på omsorgen.
            </p>
            <div className="t-author">
              Socialpsykiatrisk pædagog · botilbud · Region Midtjylland
            </div>
          </div>
          <div className="t-card">
            <div className="t-stars">★★★★★</div>
            <p className="t-text">
              Vi har frigjort omkring to timer om dagen til borgerne i stedet for skærm og notater.
              Som leder er det det tydeligste tegn på, at vi er på rette vej.
            </p>
            <div className="t-author">Leder · socialpsykiatrisk botilbud · Aalborg</div>
          </div>
          <div className="t-card">
            <div className="t-stars">★★★★☆</div>
            <p className="t-text">
              Det her føles ikke som endnu et kontrolsystem. Det hjælper os med at være mennesker
              over for mennesker — og borgerne mærker det.
            </p>
            <div className="t-author">Pædagog · bosted · Nordjylland</div>
          </div>
        </div>
      </section>

      <section className="origin-section" id="om-budr">
        <div className="origin-grid fi">
          <div>
            <div className="eyebrow">Om BUDR</div>
            <h2 className="section-h">
              Skabt ud fra praksis — ikke fra et whiteboard langt fra vagten
            </h2>
            <p className="section-p">
              BUDR er vokset ud af ønsket om at give borgere en værdig hverdag og personalet et
              værktøj, der respekterer deres faglighed. Ikke flere tomme felter — men hjælp til at
              huske, prioritere og dokumentere det, der betyder noget for den enkelte borger.
            </p>
            <div className="origin-quote">
              <p>
                Når borgeren bliver hørt gennem Lys, bliver vores arbejde mere meningsfuldt. Det er
                ikke teknologi for teknologiens skyld — det er bedre møder mellem mennesker.
              </p>
              <cite>Socialpsykiatrisk pædagog · botilbud · Region Midtjylland</cite>
            </div>
          </div>
          <div>
            <div
              style={{
                fontSize: '0.75rem',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: 'var(--fog)',
                marginBottom: 24,
              }}
            >
              Udviklingen bag BUDR
            </div>
            <div className="timeline">
              <div className="tl-item">
                <div className="tl-dot-col">
                  <div className="tl-dot" />
                  <div className="tl-line" />
                </div>
                <div>
                  <div className="tl-year">Udgangspunkt</div>
                  <div className="tl-text">
                    Frustration over systemer, der dokumenterer fortiden, men ikke hjælper pædagoger
                    og ledere med at prioritere nuet.
                  </div>
                </div>
              </div>
              <div className="tl-item">
                <div className="tl-dot-col">
                  <div className="tl-dot" />
                  <div className="tl-line" />
                </div>
                <div>
                  <div className="tl-year">PARK som rygrad</div>
                  <div className="tl-text">
                    Lys og portalen bygger på personcentreret, anerkendende praksis — ikke som
                    papirarbejde, men som noget, I kan mærke i hverdagen.
                  </div>
                </div>
              </div>
              <div className="tl-item">
                <div className="tl-dot-col">
                  <div className="tl-dot" />
                  <div className="tl-line" />
                </div>
                <div>
                  <div className="tl-year">Pilot 2025</div>
                  <div className="tl-text">
                    Tre botilbud i Nord- og Midtjylland: markant mindre tid på dokumentation, og
                    borgere der selv opsøger Lys uden at blive bedt om det.
                  </div>
                </div>
              </div>
              <div className="tl-item">
                <div className="tl-dot-col">
                  <div className="tl-dot" />
                </div>
                <div>
                  <div className="tl-year">Nu</div>
                  <div className="tl-text">
                    Klar til flere bosteder. Kort onboarding. Vi viser gerne, hvordan det kan se ud
                    med jeres faglige øjne — for ledere og for dem, der går vagt.
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="cta-section">
        <div className="cta-bg" aria-hidden />
        <div style={{ position: 'relative', zIndex: 1 }} className="fi">
          <div
            className="eyebrow"
            style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}
          >
            Klar til at mærke forskellen?
          </div>
          <h2>
            Vi viser det på <em>jeres</em> præmisser — for personale og borgere
          </h2>
          <p className="cta-lead">
            Ingen generisk slidshow. En gennemgang af journal, medicin-overblik, borgerprofiler og
            Lys — med jeres egne dilemmaer fra hverdagen i centrum.
          </p>
          <div className="cta-actions">
            <a
              href="mailto:hej@budrcare.dk?subject=Demo%20af%20BUDR%20Care"
              className="btn-primary"
            >
              Book en samtale
            </a>
            <Link href="/care-portal-demo" className="btn-ghost">
              Prøv Care Portal demo →
            </Link>
          </div>
        </div>
      </section>

      <footer>
        <div className="footer-grid">
          <div>
            <div className="footer-logo">
              <div className="logo-mark">B</div>
              BUDR Care
            </div>
            <p className="footer-desc">
              Portal til personalet. Lys til borgeren. Bygget til socialpsykiatrien og botilbud,
              hvor værdighed og faglighed går hånd i hånd.
            </p>
            <a
              href="mailto:hej@budrcare.dk"
              style={{
                fontSize: '0.8rem',
                color: 'var(--fog)',
                textDecoration: 'none',
                marginTop: 8,
                display: 'block',
              }}
            >
              hej@budrcare.dk
            </a>
          </div>
          <div className="footer-col">
            <h5>Produkter</h5>
            <Link href="/care-portal-demo">Care Portal demo</Link>
            <Link href="/care-portal-login">Log ind</Link>
            <Link href="/app">Lys</Link>
          </div>
          <div className="footer-col">
            <h5>Selskab</h5>
            <a href="#hvad-kan-budr">Hvad kan BUDR?</a>
            <a href="#om-budr">Om BUDR</a>
            <a href="#skift">Hverdag &amp; systemer</a>
            <a href="mailto:hej@budrcare.dk">Kontakt</a>
            <a
              href="https://www.linkedin.com/company/budr"
              target="_blank"
              rel="noopener noreferrer"
            >
              LinkedIn
            </a>
          </div>
          <div className="footer-col">
            <h5>Juridisk</h5>
            <Link href="/privacy">Privatlivspolitik</Link>
            <Link href="/cookies">Cookiepolitik</Link>
            <Link href="/terms">Vilkår</Link>
          </div>
        </div>
        <div className="footer-bottom">
          <span>© {new Date().getFullYear()} BUDR ApS · Aalborg, Danmark</span>
          <span style={{ opacity: 0.4, fontSize: '0.7rem' }}>
            *Baseret på lederudsagn fra pilot · botilbud Aalborg 2025
          </span>
        </div>
      </footer>
    </div>
  );
}
