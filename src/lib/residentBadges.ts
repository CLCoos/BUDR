/** Fælles badge-katalog for borger-appen (Lys, haven, journal, m.m.) */

export type ResidentBadgeCategory = 'tjek_ind' | 'journal' | 'haven' | 'lys' | 'plan' | 'milepæl';

export type ResidentBadgeDef = {
  key: string;
  name: string;
  desc: string;
  emoji: string;
  hint: string;
  category: ResidentBadgeCategory;
};

/** Ældre DB-nøgler mappes til primær nøgle ved visning og optælling. */
export function normalizeBadgeKeyForDisplay(key: string): string {
  if (key === 'consistent_7') return 'week_streak';
  if (key === 'first_journal') return 'journal_debut';
  return key;
}

export const RESIDENT_BADGE_DEFS: ResidentBadgeDef[] = [
  {
    key: 'first_checkin',
    name: 'Første tjek-ind',
    desc: 'Du har registreret din stemning for første gang',
    emoji: '🌅',
    hint: 'Tjek ind én gang under Hjem',
    category: 'tjek_ind',
  },
  {
    key: 'checkin_streak_3',
    name: 'På vej',
    desc: '3 dage i træk med tjek-ind',
    emoji: '✨',
    hint: 'Tjek ind 3 dage i træk',
    category: 'tjek_ind',
  },
  {
    key: 'week_streak',
    name: 'Ugens helt',
    desc: '7 dage i træk med dagligt tjek-ind',
    emoji: '🔥',
    hint: '7 dages streak',
    category: 'tjek_ind',
  },
  {
    key: 'fortnight_fire',
    name: 'To uger stærk',
    desc: '14 dage i træk med tjek-ind',
    emoji: '🌋',
    hint: 'Hold streak i 14 dage',
    category: 'tjek_ind',
  },
  {
    key: 'checkin_10_days',
    name: 'Ti dage set',
    desc: 'Mindst 10 dage med tjek-ind i alt',
    emoji: '📆',
    hint: 'Tjek ind på 10 forskellige dage',
    category: 'tjek_ind',
  },
  {
    key: 'checkin_30_days',
    name: 'Måned for måned',
    desc: 'Mindst 30 dage med tjek-ind i alt',
    emoji: '🗓️',
    hint: '30 dages tjek-ind spredt over tid',
    category: 'tjek_ind',
  },
  {
    key: 'calm_week',
    name: 'Ro i sindet',
    desc: '7 dage i træk med energi “godt” eller bedre',
    emoji: '🌊',
    hint: 'Vælg høj energi 7 dage i træk',
    category: 'tjek_ind',
  },
  {
    key: 'journal_debut',
    name: 'Forfatter',
    desc: 'Første journalindlæg',
    emoji: '📝',
    hint: 'Skriv i journalen',
    category: 'journal',
  },
  {
    key: 'journal_5',
    name: 'Fem stemmer',
    desc: '5 journalindlæg',
    emoji: '📖',
    hint: 'Skriv 5 gange i journalen',
    category: 'journal',
  },
  {
    key: 'journal_25',
    name: 'Ord på vejen',
    desc: '25 journalindlæg',
    emoji: '✍️',
    hint: 'Skriv 25 journalindlæg',
    category: 'journal',
  },
  {
    key: 'brave',
    name: 'Modig',
    desc: 'Et længere, personligt journalindlæg',
    emoji: '💙',
    hint: 'Skriv et lidt længere indlæg om noget vigtigt',
    category: 'journal',
  },
  {
    key: 'garden_first',
    name: 'Grøn tommelfinger',
    desc: 'Første plante i haven',
    emoji: '🌱',
    hint: 'Plant noget i Min have',
    category: 'haven',
  },
  {
    key: 'haven_full_bloom',
    name: 'Fuld blomst',
    desc: 'En plante nåede fuld vækst',
    emoji: '🌸',
    hint: 'Vand og plej indtil fuld blomst',
    category: 'haven',
  },
  {
    key: 'haven_water_streak_3',
    name: 'Vandløb',
    desc: 'Vandet haven 3 dage i træk',
    emoji: '💧',
    hint: 'Vand haven 3 dage i træk',
    category: 'haven',
  },
  {
    key: 'haven_water_streak_7',
    name: 'Stødig gartner',
    desc: 'Vandet haven 7 dage i træk',
    emoji: '🚿',
    hint: 'Vand haven 7 dage i træk',
    category: 'haven',
  },
  {
    key: 'krap_master',
    name: 'Tankemester',
    desc: 'Gennemført tankeøvelse med Lys',
    emoji: '🧠',
    hint: 'Brug tankefanger-flowet',
    category: 'lys',
  },
  {
    key: 'first_chat',
    name: 'Åben',
    desc: 'Første samtale med Lys',
    emoji: '💬',
    hint: 'Skriv til Lys',
    category: 'lys',
  },
  {
    key: 'staff_bridge',
    name: 'Bro til teamet',
    desc: 'Første besked sendt til personalet',
    emoji: '📮',
    hint: 'Send en besked til personale fra Mig',
    category: 'lys',
  },
  {
    key: 'planner_first',
    name: 'Første skridt i planen',
    desc: 'Første egne planpunkt oprettet',
    emoji: '🎯',
    hint: 'Tilføj et punkt under Din dag',
    category: 'plan',
  },
  {
    key: 'planner_5',
    name: 'Planlægger',
    desc: '5 egne planpunkter',
    emoji: '📅',
    hint: 'Opret 5 egne aktiviteter',
    category: 'plan',
  },
  {
    key: 'planner_10',
    name: 'Hverdagsarkitekt',
    desc: '10 egne planpunkter',
    emoji: '🏗️',
    hint: 'Opret 10 egne planpunkter',
    category: 'plan',
  },
  {
    key: 'xp_100',
    name: 'Spirer',
    desc: '100 XP optjent',
    emoji: '⭐',
    hint: 'Brug appen og fuldfør små mål',
    category: 'milepæl',
  },
  {
    key: 'xp_250',
    name: 'Vækst',
    desc: '250 XP optjent',
    emoji: '🌿',
    hint: 'Fortsæt med aktiviteter der giver XP',
    category: 'milepæl',
  },
  {
    key: 'xp_500',
    name: 'Rodnet',
    desc: '500 XP optjent',
    emoji: '🌳',
    hint: '500 XP i alt',
    category: 'milepæl',
  },
  {
    key: 'xp_1000',
    name: 'Kroneløv',
    desc: '1000 XP optjent',
    emoji: '👑',
    hint: '1000 XP — du er ved at toppe niveau',
    category: 'milepæl',
  },
];

const DEF_BY_KEY = new Map(RESIDENT_BADGE_DEFS.map((d) => [d.key, d]));

export function getResidentBadgeDef(key: string): ResidentBadgeDef | undefined {
  return DEF_BY_KEY.get(normalizeBadgeKeyForDisplay(key)) ?? DEF_BY_KEY.get(key);
}
