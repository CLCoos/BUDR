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
  prn?: boolean;
};

export type JournalDemo = {
  when: string;
  author: string;
  excerpt: string;
  type: 'vagt' | 'læge' | 'bekymring';
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

export type ResidentDemoDetail = {
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

function hashId(id: string): number {
  return id.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
}

function fallbackDetail(profile: CareDemoResidentProfile): ResidentDemoDetail {
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
        'Husk at notere medicin ved PRN.',
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
      { name: 'Panodil', dose: '500 mg', schedule: 'Ved behov', prn: true, nextDue: '—' },
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

const RICH: Record<string, Omit<ResidentDemoDetail, 'profile'>> = {
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
        'To PRN-doser Panodil sidste 7 dage — kort vurdering om eftermiddagen.',
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
      { name: 'Panodil', dose: '500 mg', schedule: 'PRN', prn: true, nextDue: 'Max 4 g / 24 t' },
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
        schedule: 'PRN angst',
        prn: true,
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
      { name: 'Panodil', dose: '500 mg', schedule: 'PRN', prn: true, nextDue: 'Sjelden' },
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

export function getResidentDemoDetail(residentId: string): ResidentDemoDetail | null {
  const profile = careDemoProfileById(residentId);
  if (!profile) return null;
  const rich = RICH[residentId];
  if (rich) return { ...rich, profile };
  return fallbackDetail(profile);
}
