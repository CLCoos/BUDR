/** Types aligned with future GET /api/demo/sara response shape. */

export type SaraTimelineBeatId =
  | 'week1-tuesday-evening'
  | 'week1-wednesday-morning'
  | 'week1-wednesday-meeting'
  | 'week2-saturday'
  | 'week3-thursday';

export type SaraTimelineBeat = {
  id: SaraTimelineBeatId;
  periodLabel: string;
  body: string;
  quote?: string;
  outcome: string;
};

export type SaraRecoveryTimelineResponse = {
  residentId: string;
  residentDisplayName: string;
  intro: {
    age: number;
    diagnosisLabel: string;
    locationLabel: string;
    summary: string;
  };
  beats: SaraTimelineBeat[];
  closing: string;
};

// TODO: replace hardcoded data with /api/demo/sara when ready

export const SARA_DEMO_RESIDENT_ID = '21111111-1111-1111-1111-111111111111';

export const SARA_RECOVERY_TIMELINE: SaraRecoveryTimelineResponse = {
  residentId: SARA_DEMO_RESIDENT_ID,
  residentDisplayName: 'Sara Kristensen',
  intro: {
    age: 34,
    diagnosisLabel: 'skizoaffektiv lidelse',
    locationLabel: 'socialpsykiatrisk bosted i Aalborg',
    summary:
      'Det her er hendes første tre uger med BUDR — fortalt så realistisk som det faktisk sker.',
  },
  beats: [
    {
      id: 'week1-tuesday-evening',
      periodLabel: 'Uge 1, tirsdag aften',
      body: 'Sara har en svær aften. Hun har siddet i fællesrummet, men trækker sig tilbage da Sofie (en anden beboer) sætter sig ved siden af. På sit værelse åbner hun Lys og taler ind:',
      quote: 'Jeg ville gerne have hilst. Men jeg blev så bange. Igen.',
      outcome: 'Lys gemmer refleksionen. Ingen alarm. Ingen overdrivelse. Bare et notat.',
    },
    {
      id: 'week1-wednesday-morning',
      periodLabel: 'Uge 1, onsdag morgen',
      body: 'Dagvagten åbner Saras profil før kontaktsamtalen. Hun ser refleksionen fra aftenen. Hun ser også, at det er tredje gang på to uger Sara har skrevet noget lignende. Connectedness-trenden viser en tydelig nedgang.',
      outcome: 'Personalet møder Sara med konteksten i hånden — uden at konfrontere.',
    },
    {
      id: 'week1-wednesday-meeting',
      periodLabel: 'Uge 1, onsdag kl. 10',
      body: 'I samtalen formulerer Sara og kontaktpersonen et næste skridt sammen:',
      quote:
        'Smile og sige hej til Sofie én gang i denne uge — også selvom det føles småt.',
      outcome: 'Mål sat med Sara. Ikke for hende.',
    },
    {
      id: 'week2-saturday',
      periodLabel: 'Uge 2, lørdag',
      body: 'Sara markerer skridtet som taget. Hun skriver:',
      quote: 'Jeg sagde hej. Sofie smilede tilbage. Det var ikke så slemt.',
      outcome: 'Et lille øjeblik gemmes som ressource for fremtiden.',
    },
    {
      id: 'week3-thursday',
      periodLabel: 'Uge 3, torsdag',
      body: 'Sara har en svær dag igen. Hun åbner Lys, scroller tilbage, læser sin egen fortælling fra lørdag.',
      quote: 'Jeg gjorde det én gang. Måske kan jeg igen.',
      outcome: 'Recovery er ikke en lige linje. Men nu har Sara værktøjer til at huske sig selv.',
    },
  ],
  closing:
    'Dette er ikke en kur. Sara har stadig svære dage. Men personalet møder hende nu med et helt billede — og Sara har en stemme i sit eget forløb. Det er recovery i praksis.',
};
