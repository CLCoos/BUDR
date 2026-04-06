/** Park-hub demo (middleware / forsides demo) — samme id som DemoSeeder. */
export const LYS_DEMO_RESIDENT_ID = 'demo-resident-001';

export function isLysDemoResidentId(id: string | null | undefined): boolean {
  return !!id && id === LYS_DEMO_RESIDENT_ID;
}

/** Staff-plan JSON shape som i `daily_plans.plan_items` — bruges når demo mangler række i DB. */
export function buildSimulatedStaffDailyPlan(plan_date: string): {
  id: string;
  plan_date: string;
  plan_items: Array<{
    id: string;
    time: string;
    title: string;
    description?: string;
    category: 'mad' | 'medicin' | 'aktivitet' | 'hvile' | 'social';
  }>;
} {
  return {
    id: 'lys-demo-staff-daily-plan',
    plan_date,
    plan_items: [
      {
        id: 'demo-dp-1',
        time: '08:00',
        title: 'Morgenmad i fælleskøkkenet',
        category: 'mad',
        description: 'Dagens første måltid sammen med de andre',
      },
      {
        id: 'demo-dp-2',
        time: '09:30',
        title: 'Ro på værelset',
        category: 'hvile',
        description: 'Læsning eller musik — du bestemmer tempoet',
      },
      {
        id: 'demo-dp-3',
        time: '11:00',
        title: 'Gåtur i gården',
        category: 'aktivitet',
        description: 'Kort tur — kun hvis du har lyst',
      },
      {
        id: 'demo-dp-4',
        time: '12:30',
        title: 'Frokost',
        category: 'mad',
      },
      {
        id: 'demo-dp-5',
        time: '14:00',
        title: 'Kreativ gruppe',
        category: 'social',
        description: 'Male eller snakke — valgfrit',
      },
      {
        id: 'demo-dp-6',
        time: '18:00',
        title: 'Aftensmad med gruppen',
        category: 'mad',
      },
      {
        id: 'demo-dp-7',
        time: '20:00',
        title: 'Aftenmedicin',
        category: 'medicin',
        description: 'Efter aftale med personalet',
      },
    ],
  };
}
