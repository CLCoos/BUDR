import type { OverrapportResidentInput } from './composeStructuredReport';

/**
 * Demoens beboere til overrapport og tilsynsrapport, uden Supabase.
 * Samme historie som Vagt-forsiden, Fortæl og forløbssiderne (forloebData.ts),
 * så rapporterne aldrig siger noget andet end resten af demoen.
 * Borgerne står kun med initialer (GDPR); `name` er derfor også initialerne.
 * Trafiklys bruger dansk stavemåde som i live data (grøn/rød/gul).
 */
export function getDemoOverrapportResidents(): OverrapportResidentInput[] {
  return [
    {
      name: 'SK',
      initials: 'SK',
      moodLabel: 'Godt',
      trafficLight: 'grøn',
      checkinTime: '07.32',
      notePreview:
        'God periode. Sov godt, handlede selv ind i går og glæder sig til ny tur tirsdag kl. 10. Statusudtalelse til kommunen om 6 dage.',
      pendingMessages: 0,
    },
    {
      name: 'CB',
      initials: 'CB',
      moodLabel: 'Træt',
      trafficLight: 'gul',
      checkinTime: '08.05',
      notePreview:
        'Gul i Lys tre dage i træk. Larm fra ny nabo til kl. 1 i nat. Samtale om søvn kl. 11.',
      pendingMessages: 1,
    },
    {
      name: 'MT',
      initials: 'MT',
      moodLabel: 'OK',
      trafficLight: 'gul',
      checkinTime: '07.55',
      notePreview:
        'Morgendosis kl. 08 er ikke registreret. Afslog aftenmedicin i går. Lægesamtale om aftenmedicin fredag.',
      pendingMessages: 0,
    },
    {
      name: 'AP',
      initials: 'AP',
      moodLabel: 'Rolig',
      trafficLight: 'grøn',
      checkinTime: '08.00',
      notePreview:
        'Hos egen læge i går. Såret på underbenet er ikke helet, ny creme morgen og aften. Kontrol om 14 dage.',
      pendingMessages: 0,
    },
    {
      name: 'JF',
      initials: 'JF',
      moodLabel: 'Usikker',
      trafficLight: 'gul',
      checkinTime: '08.20',
      notePreview: 'Nyindflyttet i 212, finder sin rytme. Holder ekstra øje.',
      pendingMessages: 0,
    },
    {
      name: 'MP',
      initials: 'MP',
      moodLabel: 'Godt',
      trafficLight: 'grøn',
      checkinTime: '07.40',
      notePreview: 'Velfungerende, hjalp med morgenmaden.',
      pendingMessages: 0,
    },
  ];
}
