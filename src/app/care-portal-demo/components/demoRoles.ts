/**
 * Demo-roller på forsiden: samme bosted, men hver rolle får sin egen næste opgave,
 * sin egen tjekliste og kun de forslag, der vedrører den.
 */

export type DemoRole = 'leder' | 'kontaktperson' | 'medarbejder' | 'vikar';

export type DemoTask = {
  id: string;
  time: string;
  title: string;
  detail?: string;
  href?: string;
  doneFromStart?: boolean;
};

export type DemoRoleProfile = {
  id: DemoRole;
  label: string;
  person: string;
  shift: string;
  /** Én linje under hilsenen: hvad rollen skal nå. */
  intro: string;
  next: {
    tag: string;
    tone: 'red' | 'amber' | 'blue' | 'green';
    title: string;
    body: string;
    action: { label: string; href?: string };
    secondary?: string;
  };
  tasks: DemoTask[];
};

export const DEMO_ROLE_STORAGE_KEY = 'budr_demo_role_v1';

export const DEMO_ROLES: DemoRoleProfile[] = [
  {
    id: 'medarbejder',
    label: 'Medarbejder',
    person: 'Lars',
    shift: 'Dagvagt 07–15',
    intro: 'Start med det øverste. Resten af vagten står i rækkefølge herunder.',
    next: {
      tag: 'Medicin',
      tone: 'red',
      title: 'Mikkels morgendosis er ikke registreret',
      body: 'Quetiapin kl. 08.00. Giv dosis eller ring til den ansvarlige inden kl. 09.00.',
      action: { label: 'Registrér dosis' },
      secondary: 'Ring til ansvarlig',
    },
    tasks: [
      { id: 'm1', time: '07.15', title: 'Læs overlevering fra nattevagten', doneFromStart: true },
      { id: 'm2', time: '08.00', title: 'Morgenmedicin til 5 borgere', doneFromStart: true },
      {
        id: 'm3',
        time: '11.00',
        title: 'Samtale med Camilla om søvn',
        detail: 'Hun har været gul i tre dage',
      },
      { id: 'm4', time: '12.00', title: 'Middagsmedicin', detail: '3 borgere' },
      { id: 'm5', time: '14.00', title: 'Skriv dagens notater', detail: '2 af 5 skrevet' },
      {
        id: 'm6',
        time: '14.45',
        title: 'Godkend overleveringen til aftenvagten',
        detail: 'Udkastet skrives for dig',
        href: '/care-portal-demo/handover',
      },
    ],
  },
  {
    id: 'kontaktperson',
    label: 'Kontaktperson',
    person: 'Peter',
    shift: 'Kontaktperson for Sara og Anders',
    intro: 'Dine to borgere har én frist og én opfølgning, der venter på dig.',
    next: {
      tag: 'Frist om 6 dage',
      tone: 'amber',
      title: 'Læs statusudtalelsen for Sara igennem',
      body: 'Udkastet er skrevet ud fra 41 godkendte notater og handleplanen. Ret det til, og send det til godkendelse.',
      action: { label: 'Åbn udkastet', href: '/care-portal-demo/dokumenter' },
    },
    tasks: [
      {
        id: 'k1',
        time: 'I dag',
        title: 'Statusudtalelse for Sara',
        detail: '3 af 7 afsnit læst',
        href: '/care-portal-demo/dokumenter',
      },
      {
        id: 'k2',
        time: 'I dag',
        title: 'Følg op på Anders’ lægebesøg',
        detail: 'Ny creme, kontrol om 14 dage',
      },
      {
        id: 'k3',
        time: 'I morgen',
        title: 'Ugentlig samtale med Sara',
        detail: 'Delmål 1: indkøb efter liste',
      },
      { id: 'k4', time: 'Fredag', title: 'Opdatér delmål for Anders', doneFromStart: false },
      {
        id: 'k5',
        time: 'Mandag',
        title: 'Send ugebrev til Saras mor',
        detail: 'Efter aftale med Sara',
        doneFromStart: true,
      },
    ],
  },
  {
    id: 'leder',
    label: 'Leder',
    person: 'Hanne',
    shift: 'Leder · Bosted Solhaven',
    intro: 'To dokumenter venter på din godkendelse. Vagtplanen mangler to vagter.',
    next: {
      tag: 'Godkendelse',
      tone: 'blue',
      title: 'Godkend statusudtalelsen for Sara',
      body: 'Kontaktpersonen har læst alle afsnit. Fristen hos kommunen er om 6 dage.',
      action: { label: 'Se og godkend', href: '/care-portal-demo/dokumenter' },
    },
    tasks: [
      {
        id: 'l1',
        time: 'I dag',
        title: 'Godkend statusudtalelse for Sara',
        href: '/care-portal-demo/dokumenter',
      },
      {
        id: 'l2',
        time: 'I dag',
        title: 'Læs ugens indsatsnotater',
        detail: '3 nye · ingen magtanvendelser',
        href: '/care-portal-demo/indsatsdok',
      },
      {
        id: 'l3',
        time: 'Denne uge',
        title: 'Dæk 2 åbne vagter i næste uge',
        detail: 'Tirsdag aften og lørdag nat',
        href: '/care-portal-demo/vagtplan',
      },
      {
        id: 'l4',
        time: 'Om 3 uger',
        title: 'Tilsyn: rapporten er 92 % klar',
        detail: 'Mangler 2 kursusbeviser',
      },
      { id: 'l5', time: 'Mandag', title: 'Personalemøde: dagsorden sendt', doneFromStart: true },
    ],
  },
  {
    id: 'vikar',
    label: 'Vikar',
    person: 'Mette',
    shift: 'Vikar · Dagvagt 07–15',
    intro: 'Du ser kun det, din vagt kræver. Spørg den faste kollega, hvis du er i tvivl.',
    next: {
      tag: 'Før du starter',
      tone: 'green',
      title: 'Læs dagens overlevering',
      body: 'Det tager to minutter. Her står, hvem der har brug for ekstra opmærksomhed i dag.',
      action: { label: 'Læs overlevering', href: '/care-portal-demo/handover' },
    },
    tasks: [
      {
        id: 'v1',
        time: '07.00',
        title: 'Læs dagens overlevering',
        href: '/care-portal-demo/handover',
      },
      {
        id: 'v2',
        time: '07.15',
        title: 'Mød de 3 borgere på din vagt',
        detail: 'Kort om hver, og hvad de har brug for',
      },
      {
        id: 'v3',
        time: '12.00',
        title: 'Middagsmedicin sammen med fast personale',
        detail: 'Du giver aldrig medicin alene',
      },
      {
        id: 'v4',
        time: '14.00',
        title: 'Skriv ét notat om din vagt',
        detail: 'Tryk “Ny journal” og fortæl med egne ord',
      },
    ],
  },
];

export function demoRole(id: DemoRole): DemoRoleProfile {
  return DEMO_ROLES.find((r) => r.id === id) ?? DEMO_ROLES[0]!;
}

export function readDemoRole(): DemoRole {
  try {
    const v = window.localStorage.getItem(DEMO_ROLE_STORAGE_KEY);
    if (v && DEMO_ROLES.some((r) => r.id === v)) return v as DemoRole;
  } catch {
    /* ignore */
  }
  return 'medarbejder';
}

/** Sendes på `window`, når rollen skiftes, så fx sidemenuen kan vise den rigtige person. */
export const DEMO_ROLE_EVENT = 'budr-demo-role';

export function saveDemoRole(id: DemoRole): void {
  try {
    window.localStorage.setItem(DEMO_ROLE_STORAGE_KEY, id);
  } catch {
    /* ignore */
  }
  try {
    window.dispatchEvent(new CustomEvent(DEMO_ROLE_EVENT, { detail: id }));
  } catch {
    /* ignore */
  }
}
