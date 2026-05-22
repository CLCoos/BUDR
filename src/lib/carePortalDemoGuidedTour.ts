/**
 * Guidet demo-rute for Care Portal + Lys (salgsflow).
 * Bygget om Saras storyline: stabil → krise → AI ser mønsteret → recovery.
 * Tone: saglig ramme, menneskelig kerne. Bruges af `DemoGuidedTourProvider`.
 */

export type DemoGuidedTourStep = {
  id: string;
  path: string;
  title: string;
  body: string;
  scrollToId?: string;
  isFinal?: boolean;
};

export const DEMO_GUIDED_TOUR_STORAGE_COMPLETED = 'budr_care_portal_demo_guided_tour_done';

/** Læs om guidet tour er gennemført (kun browser; til welcome-overlays). */
export function readDemoGuidedTourCompleted(): boolean {
  if (typeof window === 'undefined') return false;
  try {
    return window.localStorage.getItem(DEMO_GUIDED_TOUR_STORAGE_COMPLETED) === '1';
  } catch {
    return false;
  }
}

export const DEMO_GUIDED_TOUR_STEPS: DemoGuidedTourStep[] = [
  {
    id: 'overblik',
    path: '/care-portal-demo',
    title: '1 · Morgenoverblik',
    body: 'Du møder ind som dagvagt og kontaktpædagog. Her er hele bostedet samlet på ét blik — hvem har det godt, hvem kræver opmærksomhed i dag. Alt du ser er demo med fiktive borgere.',
    scrollToId: 'demo-tour-dashboard',
  },
  {
    id: 'krise',
    path: '/care-portal-demo?tab=alerts',
    title: '2 · Sara er i rød',
    body: 'Sara Kristensen lyser rød i morges. Hun sov dårligt, og humøret er faldet tre dage i træk. Personalet behøver ikke lede efter det — portalen løftede det selv frem.',
    scrollToId: 'budr-advarsler',
  },
  {
    id: 'moenster',
    path: '/care-portal-demo/residents/res-sara?tab=overblik',
    title: '3 · Mønsteret ingen så',
    body: 'Åbn Saras forløb. AI har set noget over de sidste uger, som er svært at fange i en travl hverdag: hendes dårlige dage kommer typisk et par dage efter mors besøg. Ikke under besøget — bagefter. Den slags indsigt er kernen i BUDR.',
    scrollToId: 'section-oversigt',
  },
  {
    id: 'samtale',
    path: '/care-portal-demo/residents/res-sara',
    title: '4 · Lys fangede det først',
    body: 'Da det spidsede til, talte Sara med Lys om natten. Samtalen viste tidlige tegn, og sikkerhedslaget gav personalet besked — stille, uden alarm. Her ser du hvad borgeren delte, og hvad systemet reagerede på.',
    scrollToId: 'section-borgerapp',
  },
  {
    id: 'handover',
    path: '/care-portal-demo/handover',
    title: '5 · Vagtoverlevering på minutter',
    body: 'Ved vagtskifte udkaster AI overdragelsen ud fra dagens hændelser. Personalet læser, retter og godkender. BUDR erstatter ikke faglig dømmekraft — det fjerner tasterarbejdet, så tiden går til borgeren.',
  },
  {
    id: 'recovery',
    path: '/care-portal-demo/residents/res-sara',
    title: '6 · Da mestringen virkede',
    body: 'Uger senere kommer de samme tidlige tegn igen. Men denne gang griber Sara selv ind — hun bruger sin tryghedsplan, og uroen vendes uden indlæggelse. Forløbet viser fremgangen sort på hvidt, og det er den historie en handleplan skal kunne fortælle.',
    scrollToId: 'section-indtjek',
  },
  {
    id: 'lys',
    path: '/resident-demo',
    title: '7 · Set fra Saras side',
    body: 'Det her er borgerens egen app. Samme dag, samme forløb — men fra Saras stol: hendes mål, hendes dagsplan, hendes samtaler med Lys. To sider af samme system, der taler sammen.',
  },
  {
    id: 'afslut',
    path: '/care-portal-demo',
    title: '8 · Næste skridt',
    body: 'Det var Saras forløb gennem BUDR. I en pilot kører det på jeres egne borgere og jeres egne data. Skal vi tage en snak om, hvordan det ville se ud hos jer?',
    scrollToId: 'demo-tour-cta',
    isFinal: true,
  },
];

export function parseDemoTourPath(path: string): { pathname: string; search: string } {
  const [pathname, query] = path.split('?');
  return { pathname: pathname || '/', search: query ? `?${query}` : '' };
}

export function demoTourStepMatches(
  pathname: string,
  searchParams: URLSearchParams,
  step: DemoGuidedTourStep
): boolean {
  const { pathname: wantPath, search: wantSearch } = parseDemoTourPath(step.path);
  if (pathname !== wantPath) return false;
  if (!wantSearch) return true;
  const want = new URLSearchParams(wantSearch.startsWith('?') ? wantSearch.slice(1) : wantSearch);
  for (const [k, v] of want.entries()) {
    if (searchParams.get(k) !== v) return false;
  }
  return true;
}
