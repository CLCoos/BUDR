import { careDemoProfileById, type CareDemoResidentProfile } from '@/lib/careDemoResidents';

export type TrafficDemo = 'groen' | 'gul' | 'roed' | null;

export type CheckInDemo = {
  checkedIn: boolean;
  time?: string;
  mood?: string;
  note?: string;
};

export type MedicationDemo = {
  name: string;
  dose: string;
  schedule: string;
  nextDue?: string;
  /** Medicin efter behov (PN) */
  pn?: boolean;
};

export type JournalDemo = {
  /** Stabil nøgle til UI (kladde → godkend) */
  id?: string;
  when: string;
  author: string;
  excerpt: string;
  type: 'vagt' | 'læge' | 'bekymring';
  /** `kladde` vises kun som udkast til godkendelse; `godkendt` er synlig journal (standard). */
  status?: 'kladde' | 'godkendt';
};

export type AgreementDemo = {
  title: string;
  updated: string;
  status: 'aktiv' | 'til gennemgang';
};

export type DaySlotDemo = {
  time: string;
  label: string;
  done?: boolean;
};

export type AppointmentDemo = {
  when: string;
  what: string;
  place?: string;
};

export type GoalDemo = {
  title: string;
  progress?: number;
  note?: string;
  fromApp?: boolean;
};

export type PlanDemo = {
  title: string;
  focus: string;
  owner: string;
  nextReview: string;
};

export type AiDayBrief = {
  lead: string;
  bullets: string[];
  actions: { label: string; sectionId: string }[];
};

/** Synlig kobling borger-app ↔ portal (samme underliggende demo-record som øvrige felter). */
export type BorgerAppActivityKind =
  | 'checkin'
  | 'humør'
  | 'mål'
  | 'besked'
  | 'aktivitet'
  | 'dagsplan';

export type BorgerAppActivity = {
  when: string;
  kind: BorgerAppActivityKind;
  title: string;
  detail?: string;
};

export type BorgerAppSnapshot = {
  headline: string;
  sameSourceFootnote: string;
  mood: { label: string; at: string } | null;
  syncedFields: string[];
  activities: BorgerAppActivity[];
};

export type ResidentDemoDetailSeed = {
  profile: CareDemoResidentProfile;
  traffic: TrafficDemo;
  checkIn: CheckInDemo;
  aiBrief: AiDayBrief;
  dagsplan: DaySlotDemo[];
  appointments: AppointmentDemo[];
  medications: MedicationDemo[];
  plans: PlanDemo[];
  goalsResident: GoalDemo[];
  goalsStaff: GoalDemo[];
  journal: JournalDemo[];
  agreements: AgreementDemo[];
  extras: { label: string; value: string }[];
};

/** Standardiseret hændelse — ét log, kan vises flere steder i portalen (demo). */
export type StandardEventDemoKind =
  | 'pn_medicin'
  | 'kriseplan'
  | 'observation'
  | 'dagsplan_trin'
  | 'neutral';

export type StandardEventDemo = {
  id: string;
  kind: StandardEventDemoKind;
  title: string;
  when: string;
  summary: string;
  loggedBy?: string;
  visibleIn: string[];
};

/** Skabeloner pr. situation — struktur og hints til vagt (demo). */
export type SituationTemplateId = 'nat' | 'weekend' | 'nyindflytning' | 'udskrivning';

export type SituationTemplateDemo = {
  id: SituationTemplateId;
  label: string;
  shortLabel: string;
  intro: string;
  checklist: string[];
  journalPrompts: string[];
  handoverBullets: string[];
};

export const SITUATION_TEMPLATES: SituationTemplateDemo[] = [
  {
    id: 'nat',
    label: 'Nattevagt',
    shortLabel: 'Nat',
    intro:
      'Minimalt pres, forudsigelige runder og klare observationer. PN og kriseplan skal være tilgængelige uden søgning.',
    checklist: [
      'Korte runder — undgå unødig vækkelse.',
      'Log PN med tidspunkt og årsag i ét felt.',
      'Ved uro: kriseplan først, derefter journal (standardtekst).',
      'Overdragelse: sov, medicin givet/ikke givet, særlige hændelser.',
    ],
    journalPrompts: [
      'Søvn: ind- og opvågningstid (cirka).',
      'Observation: humør, kontakt, appetit hvis relevant.',
      'PN: præparat, dosis, virkning kort.',
    ],
    handoverBullets: [
      'Natten samlet i tre linjer: rolig / urolig / kritisk.',
      'Hvad skal dagvagten vide først?',
    ],
  },
  {
    id: 'weekend',
    label: 'Weekend / lav bemanding',
    shortLabel: 'Weekend',
    intro:
      'Færre kolleger — prioriter sikkerhed, måltider og synlige valg for borgeren. Fælles aktivitet kun hvis overskud.',
    checklist: [
      'Aftalt minimum: måltider, medicin, korte kontakter.',
      'Pårørende/besøg: notér tid og evt. aftaler i journal.',
      'Udskyd ikke bekymringsnotater til mandag — brug standardhændelse.',
      'Ved tvivl: eskalér til vagtleder tidligt.',
    ],
    journalPrompts: [
      'Hvem var på arbejde, og hvad nåede vi ikke?',
      'Borgerens dagsform i forhold til hverdagen.',
    ],
    handoverBullets: ['Åbne punkter til mandag.', 'Besøg eller særlige ønsker fra borger.'],
  },
  {
    id: 'nyindflytning',
    label: 'Nyindflytning',
    shortLabel: 'Ny',
    intro:
      'Tryghed og forudsigelighed. Første dage handler om kort struktur, introduktion til huset og klare kontaktpersoner.',
    checklist: [
      'Gennemgå samtykker og praktisk info (nøgle, måltider, dør).',
      'Aftal første uges mål sammen med borger (også i Lys).',
      'Obs: søvn, spisning, social tilbagetrækning.',
      'Book opfølgning med kontaktperson inden for X dage (demo).',
    ],
    journalPrompts: [
      'Første indtryk: hvad virker trygt / utrygt?',
      'Små skridt der lykkedes i dag.',
    ],
    handoverBullets: [
      'Hvad skal næste vagt sige “god morgen” ud fra?',
      'Åbne spørgsmål til teammøde.',
    ],
  },
  {
    id: 'udskrivning',
    label: 'Udskrivning / overgang',
    shortLabel: 'Ud',
    intro:
      'Overdragelse til næste tilbud eller hjem. Medicin, nøgler, dokumentation og borgerens oplevelse af processen.',
    checklist: [
      'Medicinliste og sidste doseringer dobbelttjekket.',
      'Aftaler med kommune / pårørende logget.',
      'Afsluttende notat med dato og ansvarlig.',
      'Borger informeret om kontakt efter udskrivning.',
    ],
    journalPrompts: [
      'Borgerens reaktion på udskrivning.',
      'Risici og anbefalinger til modtagende sted.',
    ],
    handoverBullets: [
      'Kritisk info der ikke må tabes i overdragelsen.',
      'Hvem overtager medicin og aftaler?',
    ],
  },
];

/** Lys “Min have” — spejles i portal-demo under Haven-fanen (samme logik som borger-app). */
export type HavenDemoPlot = {
  id: string;
  slot_index: number;
  plant_type: 'tree' | 'flower' | 'herb' | 'bush' | 'vegetable';
  plant_name: string;
  goal_text: string;
  growth_stage: 0 | 1 | 2 | 3 | 4;
  total_water: number;
  last_watered_at: string | null;
};

export type ResidentDemoDetail = ResidentDemoDetailSeed & {
  borgerApp: BorgerAppSnapshot;
  standardEvents: StandardEventDemo[];
  situationRecommendation: {
    templateId: SituationTemplateId;
    reason: string;
  };
  gardenPlots: HavenDemoPlot[];
};

function hashId(id: string): number {
  return id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
}

function isoDaysAgo(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(12, 0, 0, 0);
  return d.toISOString();
}

/** Deterministisk have pr. demo-beboer — rig udgave for res-sara (Sara). */
export function synthesizeGardenPlots(residentId: string): HavenDemoPlot[] {
  if (residentId === 'res-sara') {
    return [
      {
        id: `${residentId}-g1`,
        slot_index: 0,
        plant_type: 'flower',
        plant_name: 'Kornblomst',
        goal_text: 'Tegne 15 minutter hver dag',
        growth_stage: 4,
        total_water: 210,
        last_watered_at: isoDaysAgo(0),
      },
      {
        id: `${residentId}-g2`,
        slot_index: 1,
        plant_type: 'tree',
        plant_name: 'Lind',
        goal_text: 'Én struktureret samtale om ugen',
        growth_stage: 2,
        total_water: 45,
        last_watered_at: isoDaysAgo(1),
      },
      {
        id: `${residentId}-g3`,
        slot_index: 2,
        plant_type: 'herb',
        plant_name: 'Kamille',
        goal_text: 'Sove mindst seks timer fem nætter i træk',
        growth_stage: 3,
        total_water: 72,
        last_watered_at: isoDaysAgo(0),
      },
      {
        id: `${residentId}-g4`,
        slot_index: 3,
        plant_type: 'vegetable',
        plant_name: 'Tomat',
        goal_text: 'Ringe til søster Anna én gang om ugen',
        growth_stage: 1,
        total_water: 18,
        last_watered_at: isoDaysAgo(3),
      },
    ];
  }

  const h = hashId(residentId);
  const count = h % 5;
  if (count === 0) return [];

  const types: HavenDemoPlot['plant_type'][] = ['flower', 'tree', 'herb', 'bush', 'vegetable'];
  const names = ['Lavendel', 'Birk', 'Basilikum', 'Hindbær', 'Gulerod'];
  const goals = ['Finde ro før sengetid', 'Gå 10 minutter dagligt', 'Snakke med én om dagen'];
  const out: HavenDemoPlot[] = [];
  for (let i = 0; i < count; i++) {
    const ti = types[(h + i) % types.length]!;
    out.push({
      id: `${residentId}-g-${i}`,
      slot_index: i,
      plant_type: ti,
      plant_name: names[(h + i) % names.length]!,
      goal_text: goals[(h + i) % goals.length]!,
      growth_stage: Math.min(4, (h + i) % 5) as 0 | 1 | 2 | 3 | 4,
      total_water: 10 + ((h * (i + 3)) % 180),
      last_watered_at: isoDaysAgo((h + i) % 5),
    });
  }
  return out;
}

function fallbackDetail(profile: CareDemoResidentProfile): ResidentDemoDetailSeed {
  const h = hashId(profile.id);
  const checked = h % 4 !== 0;
  return {
    profile,
    traffic: (['groen', 'gul', 'groen', null] as TrafficDemo[])[h % 4],
    checkIn: {
      checkedIn: checked,
      time: checked ? `${7 + (h % 3)}:${(h % 2) * 30 === 0 ? '00' : '30'}` : undefined,
      mood: checked ? (['OK', 'God', 'Træt'] as const)[h % 3] : undefined,
      note: checked ? 'Kort check-in via Lys.' : undefined,
    },
    aiBrief: {
      lead: `I dag er fokus på struktur og tryghed for ${profile.displayName.split(' ')[0]}.`,
      bullets: [
        'Ingen kendte konflikter i kalenderen.',
        'Husk at notere PN medicin i loggen.',
        'Aftenaktivitet kl. 19 kan støtte dagsrytme.',
      ],
      actions: [
        { label: 'Se dagsplan', sectionId: 'dagsplan' },
        { label: 'Gennemgå medicin', sectionId: 'medicin' },
        { label: 'Seneste journal', sectionId: 'journal' },
      ],
    },
    dagsplan: [
      { time: '08:00', label: 'Morgenmad + medicin', done: true },
      { time: '10:00', label: 'Gåtur eller stille aktivitet' },
      { time: '12:30', label: 'Frokost' },
      { time: '15:00', label: 'Socialt tilbud / værelse efter behov' },
      { time: '19:00', label: 'Aftensmad, afslutning af dag' },
    ],
    appointments: [
      {
        when: `${5 + (h % 5)}. apr. kl. 10:15`,
        what: 'Sygeplejerske — kontrol',
        place: 'Hus C',
      },
    ],
    medications: [
      { name: 'Panodil', dose: '500 mg', schedule: 'Ved behov', pn: true, nextDue: '—' },
      {
        name: 'Morgen vitaminer',
        dose: '1 tbl',
        schedule: '1× dagligt',
        nextDue: 'I morgen 08:00',
      },
    ],
    plans: [
      {
        title: 'Handleplan (demo)',
        focus: 'Stabil døgnrytme og sociale micro-skridt',
        owner: 'Mette K.',
        nextReview: '15. apr. 2026',
      },
    ],
    goalsResident: [
      { title: 'Gå en tur i haven 2× om ugen', progress: 40, fromApp: true },
      { title: 'Skrive én linje i dagbogen om dagen', progress: 65, fromApp: true },
    ],
    goalsStaff: [
      { title: 'Observation af søvn — notér i journal', progress: 20, note: 'Uge 14' },
      { title: 'Invitere til fællesspisning minimum 1×', progress: 0 },
    ],
    journal: [
      {
        when: 'I går 21:40',
        author: 'Nattevagt',
        excerpt: 'Rolig aften. Vælger ofte at være på værelset — respekteret.',
        type: 'vagt',
      },
    ],
    agreements: [
      { title: 'Samtykke billeddeling aktiviteter', updated: '12. mar. 2026', status: 'aktiv' },
    ],
    extras: [
      { label: 'Primær kontakt', value: 'Pårørende (demo) — hverdage efter 16' },
      { label: 'Allergier', value: 'Ingen kendte (demo)' },
    ],
  };
}

const RICH: Record<string, Omit<ResidentDemoDetailSeed, 'profile'>> = {
  'res-sara': {
    traffic: 'roed',
    checkIn: {
      checkedIn: true,
      time: '07:30',
      mood: 'Tung',
      note: 'Sov dårligt tredje nat i træk. Mere tilbagetrukket.',
    },
    aiBrief: {
      lead: 'Sara er i en sårbar periode. Et mønster træder frem over de sidste uger: hendes svære dage kommer typisk et par dage efter besøg af moren — ikke under selve besøget.',
      bullets: [
        'Humøret er faldet tre dage i træk; søvn forstyrret.',
        'Mønster: lavpunkter 1-2 dage efter mors besøg (4 besøg, samme mønster).',
        'Tidligere indlæggelse for seks uger siden — vær opmærksom på lignende optakt.',
      ],
      actions: [
        { label: 'Se humørforløb', sectionId: 'indtjek' },
        { label: 'Lys-samtale (nat)', sectionId: 'borgerapp' },
        { label: 'Journal', sectionId: 'journal' },
      ],
    },
    medications: [
      { name: 'Olanzapin', dose: '10 mg', schedule: '1× aften', nextDue: 'I aften kl. 21:00' },
      { name: 'Olanzapin', dose: '5 mg', schedule: '1× morgen', nextDue: 'Givet kl. 08:30' },
      { name: 'Melatonin', dose: '2 mg', schedule: 'Ved sengetid', nextDue: 'I aften' },
      {
        name: 'Oxazepam',
        dose: '15 mg',
        schedule: 'PN uro',
        pn: true,
        nextDue: 'Max 2× / 24 t — log',
      },
    ],
    plans: [
      {
        title: 'Recovery- og tryghedsplan',
        focus: 'Tidlige tegn, søvn, kontakt til kontaktpædagog',
        owner: 'Lars N. (kontaktpædagog)',
        nextReview: 'Om to uger',
      },
    ],
    goalsResident: [{ title: 'Genkende egne tidlige tegn', progress: 60, fromApp: true }],
    goalsStaff: [
      { title: 'Daglig kontakt + søvnscreening', progress: 70, note: 'Rød status' },
      { title: 'Repetér tryghedsplan med Sara', progress: 40 },
    ],
    journal: [
      {
        id: 'res-sara-j-kladde',
        when: 'I dag 07:40',
        author: 'Morgenvagt · kladde',
        excerpt:
          'Udkast: Sara sov dårligt i nat. Mere tilbagetrukket, men i kontakt. Følger tryghedsplanen — opmærksom på optakt som tidligere.',
        type: 'bekymring',
        status: 'kladde',
      },
      {
        id: 'res-sara-j-0',
        when: 'I nat 02:10',
        author: 'Nat · Hanne',
        excerpt:
          'Sara vågen, urolig. Talte med Lys. Faldt til ro ca. 03:00. Ingen yderligere tiltag nødvendige.',
        type: 'vagt',
        status: 'godkendt',
      },
      {
        id: 'res-sara-j-1',
        when: 'I går 14:00',
        author: 'Lars N.',
        excerpt:
          'Begyndende uro som minder om tidligere optakt. MEN Sara genkender selv tegnene og opsøger personale aktivt. Vi laver tryghedsplan sammen. Ingen indlæggelse nødvendig.',
        type: 'vagt',
        status: 'godkendt',
      },
      {
        id: 'res-sara-j-2',
        when: 'For 3 uger siden',
        author: 'Lars N.',
        excerpt:
          'Sara udskrevet efter seks dages indlæggelse. Genoptager ophold. Plan: rolig opstart, kendte rutiner, daglig kontakt.',
        type: 'læge',
        status: 'godkendt',
      },
    ],
    agreements: [
      {
        title: 'Samtykke til kontakt med pårørende',
        updated: 'For 1 måned siden',
        status: 'aktiv',
      },
    ],
    extras: [
      { label: 'Kontaktpædagog', value: 'Lars N.' },
      { label: 'Indflyttet', value: 'Januar 2026' },
    ],
    dagsplan: [
      { time: '08:00', label: 'Morgenmad i fællesrummet' },
      { time: '08:30', label: 'Medicin morgen', done: true },
      { time: '10:30', label: 'Gåtur med kontaktpædagog' },
      { time: '12:00', label: 'Frokost' },
      { time: '15:00', label: 'Eftermiddagskaffe' },
      { time: '21:00', label: 'Medicin aften' },
    ],
    appointments: [
      { when: 'Om to uger', what: 'Statusmøde med kontaktpædagog', place: 'Mødelokale' },
    ],
  },
  'res-mikkel': {
    traffic: 'gul',
    checkIn: {
      checkedIn: true,
      time: '08:15',
      mood: 'OK',
      note: 'Sov rimeligt. Lidt anspændt før frokost i fællesrum.',
    },
    aiBrief: {
      lead: 'Mikkel er stabil men svingende. Skizoaffektiv lidelse — hold øje med søvn og social belastning.',
      bullets: [
        'Check-in i Lys i morges; humør neutralt.',
        'Medicin taget som planlagt — ingen PN siden i går.',
      ],
      actions: [
        { label: 'Medicin', sectionId: 'medicin' },
        { label: 'Journal', sectionId: 'journal' },
      ],
    },
    dagsplan: [
      { time: '08:00', label: 'Morgenmad', done: true },
      { time: '10:00', label: 'Stille aktivitet på værelset' },
      { time: '12:30', label: 'Frokost fælles' },
      { time: '19:00', label: 'Aftensmad' },
    ],
    appointments: [{ when: 'Fredag kl. 11:00', what: 'Behandler — telefon', place: 'Privat rum' }],
    medications: [
      { name: 'Abilify', dose: '10 mg', schedule: '1× morgen', nextDue: 'I morgen 08:00' },
      { name: 'Oxazepam', dose: '10 mg', schedule: 'PN uro', pn: true, nextDue: 'Log ved behov' },
    ],
    plans: [
      {
        title: 'Stabiliseringsplan',
        focus: 'Søvn, struktur, tidlig varsling ved forværring',
        owner: 'Tværfagligt',
        nextReview: '18. maj 2026',
      },
    ],
    goalsResident: [{ title: 'Gå en kort tur 3× om ugen', progress: 45, fromApp: true }],
    goalsStaff: [{ title: 'Ugentlig opfølgning med behandler', progress: 60 }],
    journal: [
      {
        id: 'res-mikkel-j-0',
        when: 'I går 20:00',
        author: 'Aftenvagt',
        excerpt: 'Rolig aften på værelset. Spiste aftensmad. Ingen uro observeret.',
        type: 'vagt',
        status: 'godkendt',
      },
      {
        id: 'res-mikkel-j-1',
        when: 'For 4 dage siden',
        author: 'Dagvagt · Line',
        excerpt: 'Kort samtale — Mikkel oplever mere energi efter rolig weekend. Medicin uændret.',
        type: 'vagt',
        status: 'godkendt',
      },
    ],
    agreements: [{ title: 'Samtykke behandling', updated: 'Feb. 2026', status: 'aktiv' }],
    extras: [
      { label: 'Alder', value: '28 år' },
      { label: 'Diagnose (demo)', value: 'Skizoaffektiv' },
    ],
  },
  'res-anders': {
    traffic: 'gul',
    checkIn: {
      checkedIn: true,
      time: '08:20',
      mood: 'Rolig',
      note: 'God morgen. Læser i fællesrummet.',
    },
    aiBrief: {
      lead: 'Anders er i en rolig fase med bipolar lidelse. Bevar rutiner og skær ned for sent stimuli.',
      bullets: [
        'Stabil indtjek de seneste dage.',
        'Næste lægevideo om to uger — forbered spørgsmål sammen med Anders.',
      ],
      actions: [
        { label: 'Dagsplan', sectionId: 'dagsplan' },
        { label: 'Planer', sectionId: 'planer' },
      ],
    },
    dagsplan: [
      { time: '08:30', label: 'Morgenmad og medicin', done: true },
      { time: '11:00', label: 'Gåtur i gården' },
      { time: '14:00', label: 'Hvile på værelset' },
      { time: '18:30', label: 'Aftensmad' },
    ],
    appointments: [{ when: 'Om 2 uger', what: 'Læge — video', place: 'Værelse' }],
    medications: [{ name: 'Lithium', dose: '600 mg', schedule: '1× aften', nextDue: 'I aften' }],
    plans: [
      {
        title: 'Vedligeholdelsesplan',
        focus: 'Søvn, aktivitet, tidlige tegn på mani eller depression',
        owner: 'Læge + kontaktperson',
        nextReview: '1. juni 2026',
      },
    ],
    goalsResident: [{ title: 'Holde døgnrytme stabil', progress: 70, fromApp: true }],
    goalsStaff: [{ title: 'Månedlig humørskala i journal', progress: 80 }],
    journal: [
      {
        when: 'I går 09:00',
        author: 'Morgenvagt',
        excerpt: 'Anders i roligt humør. Deltog i morgenmad. Ingen bekymringer.',
        type: 'vagt',
        status: 'godkendt',
      },
      {
        when: 'For 1 uge siden',
        author: 'Læge',
        excerpt: 'Opfølgning: lithium niveau OK. Fortsætter uændret. Anders forstår planen.',
        type: 'læge',
        status: 'godkendt',
      },
    ],
    agreements: [{ title: 'Forløbsplan', updated: 'Mar. 2026', status: 'aktiv' }],
    extras: [
      { label: 'Alder', value: '52 år' },
      { label: 'Diagnose (demo)', value: 'Bipolar' },
    ],
  },
  'res-mette': {
    traffic: 'groen',
    checkIn: {
      checkedIn: true,
      time: '07:55',
      mood: 'God',
      note: 'Deltog i morgenyoga. Positiv stemning.',
    },
    aiBrief: {
      lead: 'Mette er et velfungerende holdepunkt på afdelingen. Depression i stabil bedring — understøt hendes egne mål.',
      bullets: [
        'Grønt trafiklys og stabil check-in rutine.',
        'Hun tilbyder ofte at hjælpe i køkkenet — god peer-støtte.',
      ],
      actions: [
        { label: 'Borgermål', sectionId: 'maal' },
        { label: 'Aftaler', sectionId: 'aftaler' },
      ],
    },
    dagsplan: [
      { time: '08:00', label: 'Yoga', done: true },
      { time: '10:00', label: 'Fælles quiz' },
      { time: '13:00', label: 'Gåtur' },
      { time: '16:00', label: 'Kage i køkkenet' },
    ],
    appointments: [{ when: 'Næste uge', what: 'Pårørendebesøg', place: 'Besøgsstue' }],
    medications: [
      { name: 'Sertralin', dose: '50 mg', schedule: '1× morgen', nextDue: 'I morgen 08:00' },
    ],
    plans: [
      {
        title: 'Recovery og aktivitet',
        focus: 'Sociale skridt og meningsfuld hverdag',
        owner: 'Aktivitetskoordinator',
        nextReview: '15. juni 2026',
      },
    ],
    goalsResident: [
      { title: 'Deltage i fællesspisning 2× om ugen', progress: 85, fromApp: true },
      { title: 'Gå tur dagligt', progress: 90, fromApp: true },
    ],
    goalsStaff: [{ title: 'Evaluere fællesaktivitet', progress: 75 }],
    journal: [
      {
        when: 'I går 19:00',
        author: 'Aftenvagt',
        excerpt: 'Mette hjalp med oprydning efter quiz. God stemning i fællesrum.',
        type: 'vagt',
        status: 'godkendt',
      },
    ],
    agreements: [{ title: 'Foto samtykke aktiviteter', updated: 'Mar. 2026', status: 'aktiv' }],
    extras: [
      { label: 'Alder', value: '54 år' },
      { label: 'Diagnose (demo)', value: 'Depression' },
    ],
  },
  'res-camilla': {
    traffic: 'gul',
    checkIn: {
      checkedIn: true,
      time: '08:35',
      mood: 'Spændt men OK',
      note: 'God kontakt med personalet i morges.',
    },
    aiBrief: {
      lead: 'Camilla har emotionelt ustabil personlighedsstruktur og god kontakt til personalet. Forudsigelighed og tydelige rammer hjælper.',
      bullets: [
        'Humør svinger — hold rolig tone ved konflikter.',
        'Én kort samtale med kontaktperson planlagt i dag.',
      ],
      actions: [
        { label: 'Journal', sectionId: 'journal' },
        { label: 'Dagsplan', sectionId: 'dagsplan' },
      ],
    },
    dagsplan: [
      { time: '09:00', label: 'Morgenrutine' },
      { time: '11:00', label: 'Samtale kontaktperson (30 min)' },
      { time: '14:00', label: 'Tegne på værelset' },
      { time: '19:00', label: 'Aftensmad' },
    ],
    appointments: [{ when: 'Onsdag', what: 'Psykolog', place: 'Online' }],
    medications: [{ name: 'Lamictal', dose: '100 mg', schedule: '1× morgen', nextDue: 'I morgen' }],
    plans: [
      {
        title: 'Relations- og tryghedsplan',
        focus: 'Deeskalering, validering, struktureret dag',
        owner: 'Kontaktperson + psykolog',
        nextReview: '8. maj 2026',
      },
    ],
    goalsResident: [{ title: 'Bruge pause før reaktion', progress: 55, fromApp: true }],
    goalsStaff: [{ title: 'Fælles forståelse i teamet', progress: 50 }],
    journal: [
      {
        when: 'I går 15:00',
        author: 'Dagvagt',
        excerpt:
          'Camilla blev ked af det efter misforståelse — rolig samtale hjalp. Ingen eskalering.',
        type: 'vagt',
        status: 'godkendt',
      },
      {
        when: 'For 3 dage siden',
        author: 'Kontaktperson',
        excerpt: 'God samtale om grænser og behov. Camilla takkede bagefter.',
        type: 'vagt',
        status: 'godkendt',
      },
    ],
    agreements: [{ title: 'Samtykke terapi', updated: 'Jan. 2026', status: 'aktiv' }],
    extras: [
      { label: 'Alder', value: '27 år' },
      { label: 'Diagnose (demo)', value: 'Emotionelt ustabil' },
    ],
  },
  'res-jonas': {
    traffic: 'gul',
    checkIn: {
      checkedIn: true,
      time: '08:10',
      mood: 'OK',
      note: 'Nyindflyttet — spørger til husregler og måltider.',
    },
    aiBrief: {
      lead: 'Jonas er nyindflyttet og finder sig til rette. Skizofreni — fokus på tryghed, struktur og korte kontakter.',
      bullets: [
        'Indflyttet for tre uger siden — stadig orientering i huset.',
        'God kontakt når personalet tager initiativ med små skridt.',
      ],
      actions: [
        { label: 'Skabeloner', sectionId: 'skabeloner' },
        { label: 'Planer', sectionId: 'planer' },
      ],
    },
    dagsplan: [
      { time: '08:30', label: 'Introduktion til fællesrum' },
      { time: '10:00', label: 'Kort gåtur med personale' },
      { time: '12:00', label: 'Frokost' },
      { time: '15:00', label: 'Egentid på værelset' },
    ],
    appointments: [{ when: 'Om 1 uge', what: 'Opfølgning kontaktperson', place: 'Mødelokale' }],
    medications: [{ name: 'Risperidon', dose: '2 mg', schedule: '1× aften', nextDue: 'I aften' }],
    plans: [
      {
        title: 'Indflytningsplan',
        focus: 'Praktisk info, rutiner, gradvis sociale tilbud',
        owner: 'Kontaktperson',
        nextReview: 'Løbende første måned',
      },
    ],
    goalsResident: [{ title: 'Lære huset og navne på personale', progress: 40, fromApp: true }],
    goalsStaff: [{ title: 'Ugentlig evaluering af tilpasning', progress: 30 }],
    journal: [
      {
        when: 'I går 11:00',
        author: 'Dagvagt',
        excerpt:
          'Jonas deltog i kort gåtur. Spurgte til PARK og fælles aktiviteter — positiv nysgerrighed.',
        type: 'vagt',
        status: 'godkendt',
      },
      {
        when: 'For 1 uge siden',
        author: 'Kontaktperson',
        excerpt:
          'Gennemgang af samtykker og praktisk info. Jonas virker lettet over tydelige rammer.',
        type: 'vagt',
        status: 'godkendt',
      },
    ],
    agreements: [{ title: 'Indflytningsaftale', updated: 'For 3 uger siden', status: 'aktiv' }],
    extras: [
      { label: 'Alder', value: '31 år' },
      { label: 'Status', value: 'Nyindflyttet' },
    ],
  },
};

function synthesizeBorgerApp(seed: ResidentDemoDetailSeed): BorgerAppSnapshot {
  const activities: BorgerAppActivity[] = [];
  const h = hashId(seed.profile.id);

  if (seed.checkIn.checkedIn) {
    activities.push({
      when: seed.checkIn.time ? `I dag ${seed.checkIn.time}` : 'I dag',
      kind: 'checkin',
      title: 'Check-in i Lys',
      detail:
        [seed.checkIn.mood ? `Stemning: ${seed.checkIn.mood}` : null, seed.checkIn.note]
          .filter(Boolean)
          .join(' · ') || undefined,
    });
  }

  const topAppGoal = seed.goalsResident.find((g) => g.fromApp);
  if (topAppGoal) {
    activities.push({
      when: 'Senest i app',
      kind: 'mål',
      title: 'Borgermål (samme som under «Mål»)',
      detail: `${topAppGoal.title}${topAppGoal.progress != null ? ` · ${topAppGoal.progress}%` : ''}`,
    });
  }

  activities.push({
    when: seed.checkIn.checkedIn && seed.checkIn.time ? `I dag ${seed.checkIn.time}` : 'I dag',
    kind: 'humør',
    title: 'Humør i Lys',
    detail: seed.checkIn.mood
      ? `Registreret: ${seed.checkIn.mood}`
      : 'Ikke registreret endnu — matcher feltet under Indtjek.',
  });

  const beskeder = [
    'Kort besked: Kan vi tage en lille gåtur i eftermiddag?',
    'Tak for hjælp i går — sov bedre i nat.',
    'Vil gerne tale med min kontaktperson i morgen.',
    'Ingen særlige ønsker i dag.',
  ];
  activities.push({
    when: `${7 + (h % 4)}:${(h % 2) * 20 + 10}`,
    kind: 'besked',
    title: 'Besked til personalet (Lys)',
    detail: beskeder[h % beskeder.length],
  });

  if (seed.dagsplan.some((s) => s.done)) {
    activities.push({
      when: 'I dag',
      kind: 'dagsplan',
      title: 'Dagsplan set i app',
      detail: 'Samme struktur som under «Dagsplan» i portalen (én tidslinje, demo).',
    });
  }

  activities.push({
    when: 'I går',
    kind: 'aktivitet',
    title: 'Aktivitet logget',
    detail: ['Deltog i fællesrum', 'Stille dag på værelset', 'Gåtur med støtte'][h % 3],
  });

  const mood =
    seed.checkIn.checkedIn && seed.checkIn.mood
      ? {
          label: seed.checkIn.mood,
          at: seed.checkIn.time ? `I dag kl. ${seed.checkIn.time}` : 'I dag',
        }
      : null;

  return {
    headline:
      'Det, borgeren gør i Lys, vises her uden at I skal indtaste det igen — samme demo-record som journal, mål og indtjek.',
    sameSourceFootnote:
      'I produktion synkroniseres disse felter automatisk. I demo er alt afledt af ét samlet datasæt, så der ikke opstår modstrid mellem app og portal.',
    mood,
    syncedFields: [
      'Check-in og stemning',
      'Borgermål og fremskridt',
      'Dagsplan (vist begge steder)',
      'Korte beskeder til vagten',
      'Aktivitet / deltagelse (oversigt)',
    ],
    activities: activities.slice(0, 6),
  };
}

function clipStr(s: string, max: number): string {
  if (s.length <= max) return s;
  return `${s.slice(0, max - 1).trimEnd()}…`;
}

function synthesizeStandardEvents(seed: ResidentDemoDetailSeed): StandardEventDemo[] {
  const out: StandardEventDemo[] = [];
  const bek = seed.journal.find((j) => j.type === 'bekymring');

  if (bek && seed.traffic === 'roed') {
    out.push({
      id: `${seed.profile.id}-evt-krise`,
      kind: 'kriseplan',
      title: 'Kriseplan aktiveret',
      when: bek.when,
      summary: clipStr(bek.excerpt, 130),
      loggedBy: bek.author,
      visibleIn: ['Journal', 'Samlet status', 'Planer', 'BUDR Assistent'],
    });
  } else if (bek) {
    out.push({
      id: `${seed.profile.id}-evt-bek`,
      kind: 'observation',
      title: 'Bekymringsnotat (standard)',
      when: bek.when,
      summary: clipStr(bek.excerpt, 130),
      loggedBy: bek.author,
      visibleIn: ['Journal', 'Samlet status'],
    });
  }

  const pnMed = seed.medications.find((m) => m.pn);
  if (pnMed) {
    out.push({
      id: `${seed.profile.id}-evt-pn`,
      kind: 'pn_medicin',
      title: 'PN medicin',
      when: 'Seneste 24 t (demo)',
      summary: `${pnMed.name} efter behov — ét registreringspunkt, spejlet til medicin og journal.`,
      loggedBy: 'Vagt (demo)',
      visibleIn: ['Medicin', 'Journal', 'Samlet status'],
    });
  }

  const j0 = seed.journal[0];
  if (j0 && (!bek || j0 !== bek)) {
    out.push({
      id: `${seed.profile.id}-evt-journal`,
      kind: 'observation',
      title: j0.type === 'bekymring' ? 'Bekymringsnotat (standard)' : 'Vagtnotat (standard)',
      when: j0.when,
      summary: clipStr(j0.excerpt, 120),
      loggedBy: j0.author,
      visibleIn: ['Journal', 'Samlet status'],
    });
  }

  const doneSlots = seed.dagsplan.filter((x) => x.done).length;
  if (doneSlots > 0) {
    out.push({
      id: `${seed.profile.id}-evt-dag`,
      kind: 'dagsplan_trin',
      title: 'Dagsplan',
      when: 'I dag',
      summary: `${doneSlots} punkt(er) fuldført — samme status vises under Dagsplan og her.`,
      visibleIn: ['Dagsplan', 'Samlet status'],
    });
  }

  if (out.length === 0) {
    out.push({
      id: `${seed.profile.id}-evt-neutral`,
      kind: 'neutral',
      title: 'Ingen markante hændelser',
      when: 'I dag',
      summary: 'Standardlog klar til næste registrering (demo).',
      visibleIn: ['Samlet status'],
    });
  }

  return out.slice(0, 5);
}

function synthesizeSituationRecommendation(seed: ResidentDemoDetailSeed): {
  templateId: SituationTemplateId;
  reason: string;
} {
  const h = hashId(seed.profile.id);
  if (seed.traffic === 'roed') {
    return {
      templateId: 'nat',
      reason:
        'Rød status — nat-skabelon understøtter observation, ro og PN/krise uden at sprede information.',
    };
  }
  if (seed.traffic === 'gul') {
    return {
      templateId: 'weekend',
      reason: 'Gul status — weekend-skabelon prioriterer forudsigelighed og lav bemanding.',
    };
  }
  const rotate: SituationTemplateId[] = ['nyindflytning', 'udskrivning', 'weekend', 'nat'];
  return {
    templateId: rotate[h % rotate.length],
    reason:
      'Demo-forslag ud fra profil — i produktion kan det kobles til dato, vagttype og sagsfase.',
  };
}

export function situationTemplateById(id: SituationTemplateId): SituationTemplateDemo | undefined {
  return SITUATION_TEMPLATES.find((t) => t.id === id);
}

/** Kladder + id på alle poster; kobles til samme journal som øvrige demo-felter. */
export function prepareJournalForDemo(seed: ResidentDemoDetailSeed): JournalDemo[] {
  const h = hashId(seed.profile.id);
  const withIds = seed.journal.map((j, i) => ({
    ...j,
    id: j.id ?? `${seed.profile.id}-j-${i}`,
    status: j.status ?? ('godkendt' as const),
  }));

  // Hvis seeden allerede har en kladde-entry, brug dem som de er
  const hasExplicitKladde = withIds.some((j) => j.status === 'kladde');
  if (hasExplicitKladde) return withIds;

  // Ellers: tilføj en auto-genereret kladde øverst
  if (h % 3 === 0) {
    return [
      {
        id: `${seed.profile.id}-kladde-1`,
        when: 'I dag 11:20',
        author: 'Dagvagt · kladde',
        excerpt:
          'Udkast: observeret god stemning efter samtale. Skal godkendes før synlig i fuld journal og ved overdragelse.',
        type: 'vagt',
        status: 'kladde',
      },
      ...withIds,
    ];
  }
  if (h % 3 === 1) {
    return [
      {
        id: `${seed.profile.id}-kladde-2`,
        when: 'I dag 09:05',
        author: 'Dagvagt · kladde',
        excerpt:
          'Udkast bekymring: øget tilbagetrækning — afventer faglig vurdering før godkendelse.',
        type: 'bekymring',
        status: 'kladde',
      },
      ...withIds,
    ];
  }
  return withIds;
}

export function getResidentDemoDetail(residentId: string): ResidentDemoDetail | null {
  const profile = careDemoProfileById(residentId);
  if (!profile) return null;
  const rich = RICH[residentId];
  const baseSeed: ResidentDemoDetailSeed = rich ? { ...rich, profile } : fallbackDetail(profile);
  const journal = prepareJournalForDemo(baseSeed);
  const seed: ResidentDemoDetailSeed = { ...baseSeed, journal };
  return {
    ...seed,
    borgerApp: synthesizeBorgerApp(seed),
    standardEvents: synthesizeStandardEvents(seed),
    situationRecommendation: synthesizeSituationRecommendation(seed),
    gardenPlots: synthesizeGardenPlots(profile.id),
  };
}

/** Ét samlet overblik — alle felter afledes af samme `ResidentDemoDetail` som detaljesektionerne. */
export type UnifiedStatusTone = 'neutral' | 'ok' | 'warn' | 'alert';

export type UnifiedStatusTile = {
  id: string;
  label: string;
  value: string;
  hint?: string;
  tone: UnifiedStatusTone;
  /** Sektions-id til scroll (uden `section-` præfiks) */
  goToSection: string;
};

export function buildUnifiedResidentStatus(d: ResidentDemoDetail): {
  summary: string;
  tiles: UnifiedStatusTile[];
} {
  const clip = (s: string, n: number) =>
    s.length <= n ? s : `${s.slice(0, Math.max(0, n - 1)).trimEnd()}…`;

  const trafficLabel =
    d.traffic === 'roed'
      ? 'Rødt trafiklys'
      : d.traffic === 'gul'
        ? 'Gult trafiklys'
        : d.traffic === 'groen'
          ? 'Grønt trafiklys'
          : 'Trafiklys ikke sat';

  const trafficTone: UnifiedStatusTone =
    d.traffic === 'roed'
      ? 'alert'
      : d.traffic === 'gul'
        ? 'warn'
        : d.traffic === 'groen'
          ? 'ok'
          : 'neutral';

  let checkInValue = '';
  let checkInTone: UnifiedStatusTone = 'neutral';
  if (d.checkIn.checkedIn) {
    checkInValue = `Check-in${d.checkIn.time ? ` kl. ${d.checkIn.time}` : ''}${d.checkIn.mood ? ` · ${d.checkIn.mood}` : ''}`;
    checkInTone = 'ok';
  } else {
    checkInValue = 'Ikke checket ind';
    checkInTone = d.traffic === 'roed' ? 'alert' : 'warn';
  }

  const jPub = d.journal.find((x) => x.status !== 'kladde') ?? d.journal[0];
  const journalValue = jPub ? clip(jPub.excerpt, 96) : 'Ingen journal i demo';
  const journalTone: UnifiedStatusTone = jPub?.type === 'bekymring' ? 'alert' : 'neutral';

  const ordMed = d.medications.find((m) => !m.pn);
  const medValue = ordMed
    ? `${ordMed.name} ${ordMed.dose} · ${ordMed.schedule}${ordMed.nextDue && ordMed.nextDue !== '—' ? ` · Næste: ${ordMed.nextDue}` : ''}`
    : d.medications[0]
      ? `${d.medications[0].name}${d.medications[0].pn ? ' (PN)' : ` · ${d.medications[0].schedule}`}`
      : 'Ingen medicin i demo';

  const appt = d.appointments[0];
  const apptValue = appt ? `${appt.what} — ${appt.when}` : 'Ingen kommende aftaler';

  const plan = d.plans[0];
  const planValue = plan ? clip(`${plan.title} — ${plan.focus}`, 96) : 'Ingen aktiv plan i demo';

  const openStaff = d.goalsStaff.filter((g) => g.progress == null || g.progress < 100);
  const goalsValue =
    openStaff.length === 0
      ? 'Ingen åbne personalemål (demo)'
      : `${openStaff.length} åbne mål for personalet`;

  const goalsTone: UnifiedStatusTone =
    openStaff.length === 0 ? 'ok' : openStaff.length >= 2 ? 'warn' : 'neutral';

  const tiles: UnifiedStatusTile[] = [
    {
      id: 'traffic',
      label: 'Trafiklys',
      value: trafficLabel,
      tone: trafficTone,
      goToSection: 'oversigt',
    },
    {
      id: 'checkin',
      label: 'Indtjek i dag',
      value: checkInValue,
      hint: d.checkIn.note ? clip(d.checkIn.note, 72) : undefined,
      tone: checkInTone,
      goToSection: 'indtjek',
    },
    {
      id: 'lys',
      label: 'Lys (borger-app)',
      value: d.borgerApp.mood
        ? `Humør: ${d.borgerApp.mood.label}`
        : 'Ingen humør registreret i dag',
      hint: d.borgerApp.activities[0]
        ? clip(
            `${d.borgerApp.activities[0].title}${d.borgerApp.activities[0].detail ? ` — ${d.borgerApp.activities[0].detail}` : ''}`,
            88
          )
        : undefined,
      tone: 'neutral',
      goToSection: 'borgerapp',
    },
    {
      id: 'journal',
      label: 'Seneste journal',
      value: journalValue,
      tone: journalTone,
      goToSection: 'journal',
    },
    (() => {
      const topEvt = d.standardEvents[0];
      const evtTone: UnifiedStatusTone =
        topEvt?.kind === 'kriseplan'
          ? 'alert'
          : topEvt?.title.includes('Bekymring')
            ? 'warn'
            : 'neutral';
      return {
        id: 'haendelser',
        label: 'Standardhændelser',
        value: topEvt?.title ?? '—',
        hint: topEvt ? clip(topEvt.summary, 88) : undefined,
        tone: topEvt ? evtTone : 'neutral',
        goToSection: 'haendelser',
      };
    })(),
    (() => {
      const tpl = situationTemplateById(d.situationRecommendation.templateId);
      return {
        id: 'skabelon',
        label: 'Skabelon (situation)',
        value: tpl?.label ?? d.situationRecommendation.templateId,
        hint: clip(d.situationRecommendation.reason, 88),
        tone: 'neutral' as UnifiedStatusTone,
        goToSection: 'skabeloner',
      };
    })(),
    {
      id: 'med',
      label: 'Medicin (overblik)',
      value: clip(medValue, 100),
      tone: 'neutral',
      goToSection: 'medicin',
    },
    {
      id: 'appt',
      label: 'Næste aftale',
      value: clip(apptValue, 100),
      tone: 'neutral',
      goToSection: 'aftaler',
    },
    {
      id: 'plan',
      label: 'Handleplan',
      value: planValue,
      tone: 'neutral',
      goToSection: 'planer',
    },
    {
      id: 'staffgoals',
      label: 'Personalemål',
      value: goalsValue,
      tone: goalsTone,
      goToSection: 'maal',
    },
    (() => {
      const g = d.gardenPlots;
      const n = g.length;
      const tone: UnifiedStatusTone = n >= 3 ? 'ok' : n >= 1 ? 'neutral' : 'neutral';
      return {
        id: 'haven',
        label: 'Haven (Lys)',
        value:
          n === 0
            ? 'Ingen planter endnu i demo'
            : `${n} ${n === 1 ? 'plante' : 'planter'} — samme som borgeren ser`,
        hint:
          n > 0
            ? clip(
                g
                  .slice(0, 2)
                  .map((p) => p.plant_name)
                  .join(', ') + (n > 2 ? '…' : ''),
                88
              )
            : undefined,
        tone,
        goToSection: 'haven',
      };
    })(),
  ];

  return {
    summary: clip(d.aiBrief.lead, 160),
    tiles,
  };
}
