/**
 * Fiktive data til «Borgerens forløb» i demoen. Samme historie som Vagt-forsiden og Fortæl:
 * Sara i en god periode med indkøb som delmål, Camilla gul og søvnløs, Mikkel med manglende
 * morgendosis, Anders efter lægebesøg.
 */
import { careDemoProfileById } from '@/lib/careDemoResidents';

export type Traffic = 'groen' | 'gul' | 'roed';

export type MoodPoint = { mood: number; traffic: Traffic; marker?: string };

export type ForloebGoal = {
  title: string;
  progress: number;
  lastStep: string;
  source: string;
};

export type TimelineKind = 'notat' | 'lys' | 'laege' | 'haendelse' | 'aftale';

export type TimelineItem = {
  id: string;
  when: string;
  kind: TimelineKind;
  title: string;
  body: string;
  by?: string;
};

export type MedDose = { time: string; name: string; status: 'givet' | 'mangler' | 'senere' | 'pn' };

export type ForloebData = {
  id: string;
  name: string;
  firstName: string;
  initials: string;
  paragraph: string;
  house: string;
  room: string;
  contact: string;
  today: { traffic: Traffic; summary: string };
  mood: MoodPoint[];
  pattern: { title: string; body: string; basis: string } | null;
  goals: ForloebGoal[];
  ownWords: { when: string; text: string }[];
  timeline: TimelineItem[];
  next: { when: string; what: string; href?: string; deadline?: boolean }[];
  meds: MedDose[];
  safetyPlan: string[];
  relatives: string;
};

const SARA: ForloebData = {
  id: 'res-sara',
  name: 'Sara Kristensen',
  firstName: 'Sara',
  initials: 'SK',
  paragraph: '§107',
  house: 'Hus A',
  room: '104',
  contact: 'Peter N.',
  today: {
    traffic: 'groen',
    summary:
      'Sara er i en god periode. Hun har handlet selv ind fire gange i oktober og glæder sig til turen på tirsdag. Statusudtalelsen til kommunen skal afsted om 6 dage.',
  },
  mood: [
    { mood: 6, traffic: 'groen' },
    { mood: 6, traffic: 'groen' },
    { mood: 7, traffic: 'groen' },
    { mood: 6, traffic: 'groen', marker: 'Mors besøg' },
    { mood: 5, traffic: 'gul' },
    { mood: 3, traffic: 'roed' },
    { mood: 4, traffic: 'gul' },
    { mood: 4, traffic: 'gul' },
    { mood: 5, traffic: 'gul' },
    { mood: 6, traffic: 'groen' },
    { mood: 6, traffic: 'groen' },
    { mood: 7, traffic: 'groen' },
    { mood: 7, traffic: 'groen' },
    { mood: 8, traffic: 'groen' },
  ],
  pattern: {
    title: 'Dårlige dage kommer 1–3 dage efter mors besøg',
    body: 'Det er sket efter 4 af de sidste 5 besøg. Ikke under besøget, men bagefter. En rolig dag med en fast aftale dagen efter et besøg har hjulpet to gange.',
    basis: 'Set af AI i 41 check-ins og 12 notater. Tjek det med Sara, før det bruges.',
  },
  goals: [
    {
      title: 'Handle ind efter liste',
      progress: 70,
      lastStep: 'Betalte selv ved kassen i går og var stolt bagefter.',
      source: 'Opdateret af Lars N.s notat i går',
    },
    {
      title: 'Sove mindst 6 timer fem nætter i træk',
      progress: 55,
      lastStep: 'Fire nætter i træk denne uge ifølge Lys.',
      source: 'Opdateret fra Lys i morges',
    },
    {
      title: 'Ringe til søster Anna én gang om ugen',
      progress: 25,
      lastStep: 'Ringede for 9 dage siden.',
      source: 'Sara satte målet selv i Lys',
    },
  ],
  ownWords: [
    { when: 'I dag 07.32', text: 'Jeg sov godt. Glæder mig til tirsdag.' },
    {
      when: 'For 3 dage siden',
      text: 'Jeg vil gerne kunne handle uden at få det dårligt bagefter.',
    },
    { when: 'For 9 dage siden', text: 'Det var hårdt efter mor var her. Jeg ved ikke hvorfor.' },
  ],
  timeline: [
    {
      id: 't1',
      when: 'I går 14.38',
      kind: 'notat',
      title: 'Indkøb efter liste',
      body: 'Sara deltog i indkøb efter egen liste og betalte selv ved kassen. Udtrykte stolthed bagefter og ønsker at gentage det tirsdag.',
      by: 'Lars N. · Pædagogisk · godkendt',
    },
    {
      id: 't2',
      when: 'For 3 dage siden',
      kind: 'aftale',
      title: 'Ugentlig samtale med kontaktperson',
      body: 'Talte om delmål 1 og om, hvad der gør dagene efter mors besøg svære. Aftalt en fast gåtur dagen efter næste besøg.',
      by: 'Peter N. · godkendt',
    },
    {
      id: 'forloeb-lys',
      when: 'For 8 dage siden 02.14',
      kind: 'lys',
      title: 'Sara skrev til Lys om natten',
      body: 'Hun skrev, at hun ikke kunne sove og havde det tungt. Lys foreslog hendes tryghedsplan, og personalet fik stille besked. Nattevagten bankede på kl. 02.30, og hun faldt i søvn kl. 03.',
      by: 'Sikkerhedslag i Lys · nattevagt Jonas N.',
    },
    {
      id: 't4',
      when: 'For 10 dage siden',
      kind: 'haendelse',
      title: 'Besøg af mor',
      body: 'Godt besøg på 2 timer. De drak kaffe og så billeder.',
      by: 'Hanne B. · døgnnotat',
    },
  ],
  next: [
    { when: 'Tirsdag kl. 10', what: 'Indkøb med Lars (delmål 1)' },
    {
      when: 'Om 6 dage',
      what: 'Statusudtalelse til kommunen · 3 af 7 afsnit læst',
      href: '/care-portal-demo/dokumenter',
      deadline: true,
    },
    { when: 'Om 12 dage', what: 'Mors næste besøg · gåtur dagen efter er aftalt' },
  ],
  meds: [
    { time: '08.00', name: 'Sertralin 50 mg', status: 'givet' },
    { time: '22.00', name: 'Melatonin 3 mg', status: 'senere' },
    { time: 'Ved behov', name: 'Oxapax 15 mg', status: 'pn' },
  ],
  safetyPlan: [
    'Gå en tur i haven eller sid på bænken ved søen.',
    'Skriv til Lys, eller bank på personalekontoret.',
    'Ring til søster Anna, hvis det er dag.',
  ],
  relatives: 'Mor (besøg hver 2.–3. uge) · søster Anna',
};

const CAMILLA: ForloebData = {
  id: 'res-camilla',
  name: 'Camilla Birk',
  firstName: 'Camilla',
  initials: 'CB',
  paragraph: '§107',
  house: 'Hus B',
  room: '211',
  contact: 'Peter N.',
  today: {
    traffic: 'gul',
    summary:
      'Camilla har været gul i Lys tre dage i træk og sover dårligt. Samtale om søvn kl. 11 i dag. Hun har det bedst med ro og en kop te.',
  },
  mood: [7, 7, 6, 7, 6, 6, 7, 6, 6, 5, 5, 4, 4, 4].map((m, i) => ({
    mood: m,
    traffic: (m <= 4 ? 'gul' : 'groen') as Traffic,
    marker: i === 10 ? 'Ny nabo' : undefined,
  })),
  pattern: {
    title: 'Søvnen blev dårligere, da naboen flyttede ind',
    body: 'Camilla har skrevet «larm om aftenen» i Lys tre gange siden. Humøret følger søvnen med en dags forsinkelse.',
    basis: 'Set af AI i 14 check-ins og 5 notater. Tjek det med Camilla.',
  },
  goals: [
    {
      title: 'Faste sengetider på hverdage',
      progress: 40,
      lastStep: 'Sengetid kl. 23 to af de sidste fem aftener.',
      source: 'Opdateret fra Lys',
    },
    {
      title: 'Deltage i fællesspisning to gange om ugen',
      progress: 60,
      lastStep: 'Spiste med mandag.',
      source: 'Opdateret af notat',
    },
  ],
  ownWords: [
    { when: 'I dag 08.10', text: 'Træt igen. Der var larm til kl. 1.' },
    { when: 'I går', text: 'Jeg vil gerne have det som før.' },
  ],
  timeline: [
    {
      id: 'c1',
      when: 'I går 21.50',
      kind: 'notat',
      title: 'Urolig aften',
      body: 'Camilla meldte gul i Lys. Vi tog en snak, og hun faldt til ro. Sov kl. 23.',
      by: 'Lars N. · døgnnotat · godkendt',
    },
    {
      id: 'c2',
      when: 'For 4 dage siden',
      kind: 'haendelse',
      title: 'Ny nabo i 212',
      body: 'Jonas F. er flyttet ind ved siden af.',
      by: 'Hanne B.',
    },
  ],
  next: [
    { when: 'I dag kl. 11', what: 'Samtale om søvn med Lars' },
    { when: 'Om 13 dage', what: 'Opfølgning på handleplan', deadline: true },
  ],
  meds: [
    { time: '08.00', name: 'Escitalopram 10 mg', status: 'givet' },
    { time: '22.00', name: 'Mirtazapin 15 mg', status: 'senere' },
  ],
  safetyPlan: ['Te og ro på værelset.', 'Musik i høretelefoner.', 'Tal med personalet.'],
  relatives: 'Far · ringer søndage',
};

const MIKKEL: ForloebData = {
  id: 'res-mikkel',
  name: 'Mikkel Thomsen',
  firstName: 'Mikkel',
  initials: 'MT',
  paragraph: '§108',
  house: 'Hus A',
  room: '103',
  contact: 'Lars N.',
  today: {
    traffic: 'gul',
    summary:
      'Morgendosis kl. 08 er ikke registreret, og Mikkel afslog aftenmedicinen i går. Han tager den bedst sammen med morgenmaden.',
  },
  mood: [5, 5, 6, 5, 5, 6, 6, 5, 5, 5, 6, 5, 5, 4].map((m) => ({
    mood: m,
    traffic: (m <= 4 ? 'gul' : 'groen') as Traffic,
  })),
  pattern: {
    title: 'Afslår oftere medicin om aftenen end om morgenen',
    body: 'Tre afslag om aftenen på to uger, ingen om morgenen. Han siger selv, at han bliver «tung» af aftenmedicinen.',
    basis: 'Set af AI i medicinlisten og 6 notater. Tal med lægen, før noget ændres.',
  },
  goals: [
    {
      title: 'Tage medicin selv på faste tider',
      progress: 50,
      lastStep: 'Tog morgendosis selv 5 af 7 dage.',
      source: 'Opdateret fra medicinlisten',
    },
  ],
  ownWords: [{ when: 'I går 22.05', text: 'Jeg gider ikke tage den i aften.' }],
  timeline: [
    {
      id: 'm1',
      when: 'I går 22.00',
      kind: 'haendelse',
      title: 'Afslog aftenmedicin',
      body: 'Mikkel afslog Quetiapin kl. 22. Noteret, lægen er ikke kontaktet.',
      by: 'Jonas N. · nattevagt',
    },
  ],
  next: [{ when: 'Fredag', what: 'Samtale med lægen om aftenmedicin', deadline: true }],
  meds: [
    { time: '08.00', name: 'Quetiapin 50 mg', status: 'mangler' },
    { time: '22.00', name: 'Quetiapin 200 mg', status: 'senere' },
  ],
  safetyPlan: ['Gåtur med personale.', 'Musik på værelset.'],
  relatives: 'Mor · ringer onsdage',
};

const ANDERS: ForloebData = {
  id: 'res-anders',
  name: 'Anders Pedersen',
  firstName: 'Anders',
  initials: 'AP',
  paragraph: '§107',
  house: 'Hus A',
  room: '109',
  contact: 'Lars N.',
  today: {
    traffic: 'groen',
    summary:
      'Anders var hos egen læge i går. Såret på underbenet er ikke helet, og han har fået en ny creme. Kontrol om 14 dage.',
  },
  mood: [6, 6, 6, 7, 6, 6, 6, 6, 7, 7, 6, 6, 6, 6].map((m) => ({ mood: m, traffic: 'groen' })),
  pattern: null,
  goals: [
    {
      title: 'Smøre såret selv to gange om dagen',
      progress: 30,
      lastStep: 'Ny creme fra i går. Personalet viser hvordan.',
      source: 'Opdateret af sundhedsnotat i går',
    },
  ],
  ownWords: [{ when: 'I går', text: 'Lægen var flink. Jeg skal komme igen.' }],
  timeline: [
    {
      id: 'a1',
      when: 'I går 10.20',
      kind: 'laege',
      title: 'Hos egen læge',
      body: 'Såret på underbenet er ikke helet. Ny creme udskrevet. Kontrol om 14 dage.',
      by: 'Lars N. · sundhed · godkendt',
    },
  ],
  next: [{ when: 'Om 14 dage', what: 'Kontrol hos egen læge' }],
  meds: [{ time: '08.00 og 20.00', name: 'Ny creme til sår', status: 'senere' }],
  safetyPlan: ['Kaffe og avis i fællesstuen.'],
  relatives: 'Bror · besøger sjældent',
};

const BY_ID: Record<string, ForloebData> = {
  'res-sara': SARA,
  'res-camilla': CAMILLA,
  'res-mikkel': MIKKEL,
  'res-anders': ANDERS,
};

export function getForloeb(id: string): ForloebData | null {
  if (BY_ID[id]) return BY_ID[id];
  const p = careDemoProfileById(id);
  if (!p) return null;
  const first = p.displayName.split(' ')[0]!;
  return {
    id,
    name: p.displayName,
    firstName: first,
    initials: p.initials,
    paragraph: '§107',
    house: `Hus ${p.house}`,
    room: p.room,
    contact: 'Peter N.',
    today: {
      traffic: 'groen',
      summary: `${first} har en rolig periode. Intet kræver handling i dag.`,
    },
    mood: [6, 6, 7, 6, 6, 6, 7, 7, 6, 6, 7, 6, 6, 7].map((m) => ({ mood: m, traffic: 'groen' })),
    pattern: null,
    goals: [
      {
        title: 'Gå en tur i haven to gange om ugen',
        progress: 40,
        lastStep: 'Gik en tur i mandags.',
        source: 'Opdateret fra Lys',
      },
    ],
    ownWords: [{ when: 'I dag', text: 'Det går fint.' }],
    timeline: [
      {
        id: 'x1',
        when: 'I går',
        kind: 'notat',
        title: 'Rolig dag',
        body: `${first} var med til fællesspisning og gik tidligt i seng.`,
        by: 'Døgnnotat · godkendt',
      },
    ],
    next: [{ when: 'Næste måned', what: 'Opfølgning på handleplan' }],
    meds: [],
    safetyPlan: ['Tal med personalet.'],
    relatives: 'Ikke registreret i demoen',
  };
}
