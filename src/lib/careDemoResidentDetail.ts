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

export type ResidentDemoDetail = ResidentDemoDetailSeed & {
  borgerApp: BorgerAppSnapshot;
  standardEvents: StandardEventDemo[];
  situationRecommendation: {
    templateId: SituationTemplateId;
    reason: string;
  };
};

function hashId(id: string): number {
  return id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
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
  'res-001': {
    traffic: 'groen',
    checkIn: {
      checkedIn: true,
      time: '08:12',
      mood: 'God (7/10)',
      note: 'Vil gerne ud efter frokost.',
    },
    aiBrief: {
      lead: 'Anders er i god form — perfekt dag til at understøtte hans egne mål om udeaktivitet.',
      bullets: [
        'To PN-doser Panodil sidste 7 dage — kort vurdering om eftermiddagen.',
        'Gruppe gåtur 14:00 matcher hans app-mål; tilbyd plads.',
        'Ingen kommende lægeaftaler denne uge.',
      ],
      actions: [
        { label: 'Åbn dagsplan', sectionId: 'dagsplan' },
        { label: 'Borgermål (app)', sectionId: 'maal' },
        { label: 'Medicin', sectionId: 'medicin' },
      ],
    },
    dagsplan: [
      { time: '08:00', label: 'Morgenmad, Metformin', done: true },
      { time: '10:30', label: 'Rengøring værelse (tilbudt)', done: true },
      { time: '12:00', label: 'Frokost fællesskab' },
      { time: '14:00', label: 'Gåtur — gruppe (anbefalet af assistent)' },
      { time: '17:30', label: 'Aftensmad' },
      { time: '20:00', label: 'Afrunding / medicin aften' },
    ],
    appointments: [
      { when: '8. apr. kl. 11:00', what: 'Tandlæge', place: 'Kommunal klinik' },
      { when: '22. apr. kl. 09:30', what: 'Årlig lægesamtale', place: 'Video' },
    ],
    medications: [
      {
        name: 'Metformin',
        dose: '500 mg',
        schedule: '2× dagligt',
        nextDue: 'I dag 20:00',
      },
      { name: 'Panodil', dose: '500 mg', schedule: 'PN', pn: true, nextDue: 'Max 4 g / 24 t' },
    ],
    plans: [
      {
        title: 'Handleplan Q2 — diabetes og aktivitet',
        focus: 'Stabilisering af blodsukker + daglig bevægelse',
        owner: 'Sanne L. / læge',
        nextReview: '10. apr. 2026',
      },
      {
        title: 'Individuel støtteplan',
        focus: 'Sociale tilbud og energistyring',
        owner: 'Sara K.',
        nextReview: '3. maj 2026',
      },
    ],
    goalsResident: [
      {
        title: 'Gå tur udenfor 4× om ugen',
        progress: 75,
        fromApp: true,
        note: 'Registreret i Lys',
      },
      { title: 'Mindre sukker i kaffen', progress: 50, fromApp: true },
    ],
    goalsStaff: [
      {
        title: 'Logge måltider 5/7 dage',
        progress: 60,
        note: 'Fælles mål med køkken',
      },
      {
        title: 'Tjek fodstatus ved bad (1× uge)',
        progress: 100,
        note: 'Udført mandag',
      },
    ],
    journal: [
      {
        when: 'I dag 06:50',
        author: 'Morgenvagt · Line',
        excerpt: 'Vågnede selv, humør let opstemt. Tog morgenmedicin uden problemer.',
        type: 'vagt',
      },
      {
        when: 'I går 22:10',
        author: 'Aftenvagt',
        excerpt: 'Så film med andre beboere. Gik tidligt i seng.',
        type: 'vagt',
      },
    ],
    agreements: [
      { title: 'Samtykke behandling + medicin', updated: '2. jan. 2026', status: 'aktiv' },
      { title: 'Forløbsplan kommune', updated: '15. mar. 2026', status: 'aktiv' },
    ],
    extras: [
      { label: 'Kontaktperson', value: 'Sara K. — intern 4529' },
      { label: 'CPR (demo)', value: 'XXXXXX-XXXX' },
    ],
  },
  'res-002': {
    traffic: 'roed',
    checkIn: {
      checkedIn: false,
      note: 'Ikke set til morgenrunde endnu — prioriter kontakt.',
    },
    aiBrief: {
      lead: 'Finn er i en sårbar periode. Assistenten foreslår ro, forudsigelighed og tæt journal.',
      bullets: [
        'Kriseplan aktiv — kend placering af nøgler og vagttelefon.',
        'Undgå store gruppepres; tilbyd 1:1 eller kort samtale.',
        'Medicin i går nat givet under observation — følg op.',
      ],
      actions: [
        { label: 'Se medicin', sectionId: 'medicin' },
        { label: 'Journal (nat)', sectionId: 'journal' },
        { label: 'Dagsplan (minimal)', sectionId: 'dagsplan' },
      ],
    },
    dagsplan: [
      { time: '09:00', label: 'Forsigtig opvågning — tilbud te' },
      { time: '11:00', label: 'Kort samtale kontaktperson' },
      { time: '13:00', label: 'Rolig frokost (evt. værelse)' },
      { time: '16:00', label: 'Gåtur hvis overskud — ellers hvile' },
      { time: '19:30', label: 'Aftensmad lav stimulus' },
    ],
    appointments: [{ when: '4. apr. kl. 14:00', what: 'Behandler — telefon', place: 'Privat rum' }],
    medications: [
      {
        name: 'Sertralin',
        dose: '100 mg',
        schedule: '1× morgen',
        nextDue: 'I dag ved opvågning',
      },
      {
        name: 'Oxazepam',
        dose: '10 mg',
        schedule: 'PN angst',
        pn: true,
        nextDue: 'Max 3× / 24 t — log',
      },
    ],
    plans: [
      {
        title: 'Krise- og nedtrapningsplan',
        focus: 'Observation, søvn, kontakt til behandler',
        owner: 'Tværfagligt',
        nextReview: 'Løbende',
      },
    ],
    goalsResident: [{ title: 'Finde én tryg person at tale med', progress: 30, fromApp: true }],
    goalsStaff: [
      {
        title: 'Screening søvn og væske hver vagt',
        progress: 45,
        note: 'Rød status',
      },
      { title: 'Invitere til kriseplan-repetition', progress: 0 },
    ],
    journal: [
      {
        when: 'I nat 02:40',
        author: 'Nat · Hanne',
        excerpt: 'Meget urolig. Kriseplan aktiveret. Vagtlæge orienteret.',
        type: 'bekymring',
      },
    ],
    agreements: [
      {
        title: 'Tvangsrisiko — proceduresamtale',
        updated: '20. mar. 2026',
        status: 'til gennemgang',
      },
    ],
    extras: [
      { label: 'Behandler', value: 'Region — psykiatri (demo)' },
      { label: 'Pårørende', value: 'Kontakt kun efter aftale' },
    ],
  },
  'res-003': {
    traffic: 'roed',
    checkIn: {
      checkedIn: true,
      time: '07:55',
      mood: 'Lav (3/10)',
      note: 'Spiste lidt morgenmad.',
    },
    aiBrief: {
      lead: 'Kirsten har brug for nærvær og små, konkrete valg — undgå at presse samtaler.',
      bullets: [
        'Seneste nat — urolig; hold øje med energi og væske.',
        'Medicin efter læge — ingen ændring uden ordination.',
        'Eftermiddagsro med musik kan hjælpe (tidligere effekt).',
      ],
      actions: [
        { label: 'Journal fra nat', sectionId: 'journal' },
        { label: 'Blid dagsplan', sectionId: 'dagsplan' },
      ],
    },
    dagsplan: [
      { time: '09:30', label: 'Stille morgen — kaffe på værelse' },
      { time: '11:30', label: 'Tilbud: kort gåtur i gården' },
      { time: '14:00', label: 'Håndarbejdegruppe (valgfrit)' },
      { time: '18:00', label: 'Aftensmad — sidde nær personale' },
    ],
    appointments: [
      { when: '10. apr. kl. 13:20', what: 'Sygehus — ambulant', place: 'Bus bestilt' },
    ],
    medications: [
      {
        name: 'Risperidon',
        dose: '1 mg',
        schedule: 'Aften',
        nextDue: 'I dag 20:30',
      },
    ],
    plans: [
      {
        title: 'Ernæring og appetit',
        focus: 'Små måltider, kalorieindtag',
        owner: 'Kost + sygepleje',
        nextReview: '5. apr. 2026',
      },
    ],
    goalsResident: [{ title: 'Spise mindst ét måltid med andre', progress: 25, fromApp: true }],
    goalsStaff: [{ title: 'Dokumentere måltider i journal', progress: 55 }],
    journal: [
      {
        when: 'I går 18:00',
        author: 'Aften',
        excerpt: 'Græd ved aftensmad. Ville ikke tale. Tilbudt samtale — afvist pænt.',
        type: 'vagt',
      },
    ],
    agreements: [{ title: 'Indlæggelsesaftale', updated: '1. feb. 2026', status: 'aktiv' }],
    extras: [{ label: 'Særlige hensyn', value: 'Lydfølsom — undgå høj musik i fællesrum' }],
  },
  'res-004': {
    traffic: 'gul',
    checkIn: {
      checkedIn: true,
      time: '08:40',
      mood: 'Spændt men OK',
      note: 'Gruppe kl. 15 — forberedelse hjælper.',
    },
    aiBrief: {
      lead: 'Maja har angst — forudsigelighed og forberedelse før aktiviteter reducerer stress.',
      bullets: [
        'Husk at bekræfte tidspunkt og varighed for gruppe i dag.',
        'Åndedrætsøvelser virkede i går — tilbyd igen ved behov.',
      ],
      actions: [
        { label: 'Se aftaler', sectionId: 'aftaler' },
        { label: 'Borgermål', sectionId: 'maal' },
      ],
    },
    dagsplan: [
      { time: '09:00', label: 'Morgenrutine' },
      { time: '11:00', label: 'Samtale kontaktperson (30 min)' },
      { time: '15:00', label: 'Gruppeaktivitet — kreativ' },
      { time: '19:00', label: 'Aftenkaffe + afslapning' },
    ],
    appointments: [
      { when: 'I dag 15:00', what: 'Gruppe — kreativ workshop', place: 'Aktivitetsrum B' },
      { when: '18. apr. kl. 10:00', what: 'Psykolog', place: 'Online' },
    ],
    medications: [
      { name: 'Lisinopril', dose: '5 mg', schedule: '1× daglig', nextDue: 'I morgen 08:00' },
    ],
    plans: [
      {
        title: 'Angst og deltagelse',
        focus: 'Gradvis eksponering i tryg ramme',
        owner: 'Psykolog + Sara',
        nextReview: '12. apr. 2026',
      },
    ],
    goalsResident: [
      { title: 'Deltage i én gruppe om ugen', progress: 40, fromApp: true },
      { title: 'Daglig 3-min åndedræt', progress: 80, fromApp: true },
    ],
    goalsStaff: [{ title: 'Forberedelsestekst sendt i Lys dagen før', progress: 100 }],
    journal: [
      {
        when: 'I går 16:20',
        author: 'Dag',
        excerpt: 'Let uro før gruppe — vejrtrækning. Deltog 40 min.',
        type: 'vagt',
      },
    ],
    agreements: [{ title: 'Samtykke terapi', updated: '8. mar. 2026', status: 'aktiv' }],
    extras: [],
  },
  'res-005': {
    traffic: null,
    checkIn: {
      checkedIn: false,
      note: 'Besøg hos familie i går — forventet retur i eftermiddag.',
    },
    aiBrief: {
      lead: 'Thomas er ude af huset — ved hjemkomst: kort status og tilbyd måltid.',
      bullets: [
        'Ingen medicin i dag endnu — afstem ved ankomst.',
        'Tjek om jobcenter-brev er kommet (post).',
      ],
      actions: [
        { label: 'Medicin', sectionId: 'medicin' },
        { label: 'Planer', sectionId: 'planer' },
      ],
    },
    dagsplan: [
      { time: '—', label: 'Forsinket start — familiebesøg' },
      { time: '17:00', label: 'Forventet tilbage — velkomst + te' },
      { time: '18:30', label: 'Aftensmad' },
    ],
    appointments: [
      { when: '12. apr. kl. 13:00', what: 'Jobcenter — samtale', place: 'Digitalt link' },
    ],
    medications: [{ name: 'Ingen fast ordineret', dose: '—', schedule: '—', nextDue: '—' }],
    plans: [
      {
        title: 'Økonomi og beskæftigelse',
        focus: 'Støtte til møder med myndigheder',
        owner: 'Socialrådgiver (demo)',
        nextReview: '20. apr. 2026',
      },
    ],
    goalsResident: [{ title: 'Holde styr på aftaler i kalender', progress: 35, fromApp: true }],
    goalsStaff: [{ title: 'Opfølgning efter jobcentermøde', progress: 0 }],
    journal: [
      {
        when: 'I går 14:00',
        author: 'Dag',
        excerpt: 'Ude med familie. Ingen observationer.',
        type: 'vagt',
      },
    ],
    agreements: [{ title: 'Fuldmagt post', updated: 'Jan. 2026', status: 'aktiv' }],
    extras: [],
  },
  'res-006': {
    traffic: 'groen',
    checkIn: {
      checkedIn: true,
      time: '08:05',
      mood: 'Rigtig god',
      note: 'Deltog i morgenyoga.',
    },
    aiBrief: {
      lead: 'Lena trives — brug energien til at støtte andre i fællesskab (valgfrit).',
      bullets: [
        'Hun har overskud: tilbyd mentorrolle i lille gruppe hvis hun vil.',
        'Pårørendebesøg søndag — bekræft tid i kalender.',
      ],
      actions: [
        { label: 'Fremtidige aftaler', sectionId: 'aftaler' },
        { label: 'Mål fra app', sectionId: 'maal' },
      ],
    },
    dagsplan: [
      { time: '08:30', label: 'Yoga / stræk', done: true },
      { time: '10:00', label: 'Fælles quiz' },
      { time: '13:00', label: 'Gåtur' },
      { time: '16:00', label: 'Kage i køkkenet' },
    ],
    appointments: [{ when: 'Søn. 6. apr. kl. 14:00', what: 'Pårørende', place: 'Besøgsstue' }],
    medications: [
      { name: 'Panodil', dose: '500 mg', schedule: 'PN', pn: true, nextDue: 'Sjelden' },
    ],
    plans: [
      {
        title: 'Social recovery',
        focus: 'Bevare netværk og meningsfulde aktiviteter',
        owner: 'Aktivitet',
        nextReview: '1. maj 2026',
      },
    ],
    goalsResident: [
      { title: 'Hjælpe med at dække bord 1× om ugen', progress: 90, fromApp: true },
      { title: 'Ringe til veninde hver torsdag', progress: 100, fromApp: true },
    ],
    goalsStaff: [{ title: 'Evaluere fællesaktivitet (tilfredshed)', progress: 70 }],
    journal: [
      {
        when: 'I går 20:00',
        author: 'Aften',
        excerpt: 'Høj stemning ved spil. Hjalp med oprydning.',
        type: 'vagt',
      },
    ],
    agreements: [{ title: 'Foto samtykke aktiviteter', updated: 'Mar. 2026', status: 'aktiv' }],
    extras: [{ label: 'Styrke', value: 'God peer-støtte i gruppen' }],
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
  ];

  return {
    summary: clip(d.aiBrief.lead, 160),
    tiles,
  };
}
