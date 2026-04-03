import type { OverrapportResidentInput } from './composeStructuredReport';

/**
 * Same beboerfortælling som ResidentListDemo, til auto-overrapport uden Supabase.
 * Trafiklys bruger dansk stavemåde som i live data (grøn/rød/gul).
 */
export function getDemoOverrapportResidents(): OverrapportResidentInput[] {
  return [
    {
      name: 'Finn L.',
      initials: 'FL',
      moodLabel: 'Dårligt',
      trafficLight: 'rød',
      checkinTime: '08.12',
      notePreview: 'Åbnede kriseplan kl. 08.12. Meget ked af det.',
      pendingMessages: 2,
    },
    {
      name: 'Kirsten R.',
      initials: 'KR',
      moodLabel: 'OK',
      trafficLight: 'rød',
      checkinTime: '07.50',
      notePreview: 'Dårlig nat, klager over mave og angst.',
      pendingMessages: 1,
    },
    {
      name: 'Thomas B.',
      initials: 'TB',
      moodLabel: null,
      trafficLight: null,
      checkinTime: null,
      notePreview: 'Ingen check-in i dag endnu',
      pendingMessages: 0,
    },
    {
      name: 'Maja T.',
      initials: 'MT',
      moodLabel: 'Godt',
      trafficLight: 'gul',
      checkinTime: '09.05',
      notePreview: 'Lidt ked af det, vil gerne snakke.',
      pendingMessages: 1,
    },
    {
      name: 'Anders M.',
      initials: 'AM',
      moodLabel: 'Fantastisk',
      trafficLight: 'grøn',
      checkinTime: '07.45',
      notePreview: 'God morgen! Sov godt og klar til dagen.',
      pendingMessages: 0,
    },
    {
      name: 'Lena P.',
      initials: 'LP',
      moodLabel: 'Godt',
      trafficLight: 'grøn',
      checkinTime: '08.30',
      notePreview: 'OK dag. Glæder mig til haverne.',
      pendingMessages: 0,
    },
    {
      name: 'Henrik S.',
      initials: 'HS',
      moodLabel: 'Fantastisk',
      trafficLight: 'grøn',
      checkinTime: '08.00',
      notePreview: 'Fantastisk — første gang jeg har sovet igennem!',
      pendingMessages: 0,
    },
    {
      name: 'Birgit N.',
      initials: 'BN',
      moodLabel: 'OK',
      trafficLight: 'gul',
      checkinTime: '08.45',
      notePreview: 'OK men lidt urolig. Venter på besked fra læge.',
      pendingMessages: 1,
    },
    {
      name: 'Rasmus V.',
      initials: 'RV',
      moodLabel: 'Godt',
      trafficLight: 'grøn',
      checkinTime: '07.30',
      notePreview: 'Klar til gåtur og frokost med gruppen.',
      pendingMessages: 0,
    },
    {
      name: 'Dorthe A.',
      initials: 'DA',
      moodLabel: 'Fantastisk',
      trafficLight: 'grøn',
      checkinTime: '07.15',
      notePreview: 'Super dag! Ser frem til familiebesøg.',
      pendingMessages: 0,
    },
  ];
}
