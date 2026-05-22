import type { OverrapportResidentInput } from './composeStructuredReport';

/**
 * Same beboerfortælling som ResidentListDemo, til auto-overrapport uden Supabase.
 * Trafiklys bruger dansk stavemåde som i live data (grøn/rød/gul).
 */
export function getDemoOverrapportResidents(): OverrapportResidentInput[] {
  return [
    {
      name: 'Sara K.',
      initials: 'SK',
      moodLabel: 'Tung',
      trafficLight: 'rød',
      checkinTime: '07.30',
      notePreview: 'Dårlig nat, opsøgte selv Lys. Følger tryghedsplan — opmærksom på optakt.',
      pendingMessages: 1,
    },
    {
      name: 'Camilla B.',
      initials: 'CB',
      moodLabel: 'Svingende',
      trafficLight: 'gul',
      checkinTime: '08.05',
      notePreview: 'Beder om rolig opfølgning i morgen formiddag.',
      pendingMessages: 1,
    },
    {
      name: 'Jonas F.',
      initials: 'JF',
      moodLabel: 'Usikker',
      trafficLight: 'gul',
      checkinTime: '08.20',
      notePreview: 'Nyindflyttet, ved at finde rytme. Holder ekstra øje.',
      pendingMessages: 0,
    },
    {
      name: 'Mikkel T.',
      initials: 'MT',
      moodLabel: 'OK',
      trafficLight: 'gul',
      checkinTime: '07.55',
      notePreview: 'Stabil men lidt lav energi.',
      pendingMessages: 0,
    },
    {
      name: 'Anders P.',
      initials: 'AP',
      moodLabel: 'Rolig',
      trafficLight: 'gul',
      checkinTime: '08.00',
      notePreview: 'I en rolig fase, ingen særlige tiltag.',
      pendingMessages: 0,
    },
    {
      name: 'Mette P.',
      initials: 'MP',
      moodLabel: 'Godt',
      trafficLight: 'grøn',
      checkinTime: '07.40',
      notePreview: 'Velfungerende, hjalp med morgenmad.',
      pendingMessages: 0,
    },
  ];
}
