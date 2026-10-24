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
      id: 'res-sara',
      fullName: 'Sara Kristensen',
      href: '/care-portal-demo/residents/res-sara',
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
      id: 'res-camilla',
      fullName: 'Camilla Birk',
      href: '/care-portal-demo/residents/res-camilla',
      tag: { tone: 'today', label: 'I dag · Søvn' },
      moodLabel: 'Træt',
      trafficLight: 'gul',
      checkinTime: '08.05',
      notePreview:
        'Gul i Lys tre dage i træk. Larm fra ny nabo til kl. 1, sov først igen kl. 02. Samtale om søvn kl. 11.',
      pendingMessages: 1,
    },
    {
      name: 'MT',
      initials: 'MT',
      id: 'res-mikkel',
      fullName: 'Mikkel Thomsen',
      href: '/care-portal-demo/residents/res-mikkel',
      tag: { tone: 'now', label: 'Nu · Medicin' },
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
      id: 'res-anders',
      fullName: 'Anders Pedersen',
      href: '/care-portal-demo/residents/res-anders',
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
      id: 'res-jonas',
      fullName: 'Jonas Friis',
      href: '/care-portal-demo/residents/res-jonas',
      tag: { tone: 'today', label: 'I dag · Ny beboer' },
      moodLabel: 'Usikker',
      trafficLight: 'gul',
      checkinTime: '08.20',
      notePreview: 'Nyindflyttet i 212, finder sin rytme. Holder ekstra øje.',
      pendingMessages: 0,
    },
    {
      name: 'MP',
      initials: 'MP',
      id: 'res-mette',
      fullName: 'Mette Poulsen',
      href: '/care-portal-demo/residents/res-mette',
      moodLabel: 'Godt',
      trafficLight: 'grøn',
      checkinTime: '07.40',
      notePreview: 'Velfungerende, hjalp med morgenmaden.',
      pendingMessages: 0,
    },
  ];
}
