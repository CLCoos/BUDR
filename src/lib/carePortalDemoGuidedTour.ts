/**
 * Guidet 5-minutters demo-rute for Care Portal + Lys (salgsflow).
 * Bruges af `DemoGuidedTourProvider` — hold tekster korte og handlingsorienterede.
 */

export type DemoGuidedTourStep = {
  id: string;
  /** Path + valgfri query, fx `/care-portal-demo?tab=alerts` */
  path: string;
  title: string;
  body: string;
  /** Valgfrit element-id at scrolle til efter navigation */
  scrollToId?: string;
  /** Sidste trin: vis CTA i panelet */
  isFinal?: boolean;
};

export const DEMO_GUIDED_TOUR_STORAGE_COMPLETED = 'budr_care_portal_demo_guided_tour_done';

export const DEMO_GUIDED_TOUR_STEPS: DemoGuidedTourStep[] = [
  {
    id: 'overblik',
    path: '/care-portal-demo',
    title: '1 · Dagsoverblik',
    body: 'Her samles medicin, opgaver, advarsler og beboerliste — samme logik som efter login. Alt du ser er simuleret (DEMO).',
    scrollToId: 'demo-tour-dashboard',
  },
  {
    id: 'advarsler',
    path: '/care-portal-demo?tab=alerts',
    title: '2 · Advarsler og opmærksomhed',
    body: 'Portalen samler signaler, så vagten kan prioritere. I produktion kommer data fra rigtige flows — her er det mock, så du trygt kan klikke rundt.',
    scrollToId: 'budr-advarsler',
  },
  {
    id: 'beboere',
    path: '/care-portal-demo/residents',
    title: '3 · Beboeroversigt',
    body: 'Liste med trafiklys og hurtige handlinger. Vælg en beboer for at åbne 360°-visningen med journal, plan og aktivitet fra Lys.',
  },
  {
    id: 'beboer360',
    path: '/care-portal-demo/residents/res-002',
    title: '4 · Beboer 360°',
    body: 'Én flade for status, journal (kladde → godkendt), medicin og kobling til borgerens app. Det er kernen i BUDR for det daglige arbejde.',
    scrollToId: 'section-oversigt',
  },
  {
    id: 'handover',
    path: '/care-portal-demo/handover',
    title: '5 · Vagtoverlevering',
    body: 'AI kan udkaste overdragelse — personalet retter og godkender. BUDR erstatter ikke faglig dømmekraft; det fremskynder dokumentationen.',
  },
  {
    id: 'lys',
    path: '/resident-demo',
    title: '6 · Borger-appen Lys',
    body: 'Sådan oplever borgeren dagen, mål og støtte. Skærmen er demo med lokalt indhold — ikke en rigtig borgerkonto.',
  },
  {
    id: 'afslut',
    path: '/care-portal-demo',
    title: '7 · Næste skridt',
    body: 'Det var den korte rundtur. Vil du se produktet med jeres egne data og pilotforløb?',
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
