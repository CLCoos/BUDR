import type { VumFunctionLevel, VumGoal } from '@/lib/vum/vumTypes';

export type StatusReportVumTheme = {
  number: number;
  title: string;
  categoryLabel: string;
  level?: VumFunctionLevel;
  notes?: string;
  answers: string[];
};

/** Alt kildemateriale til én udtalelse. Indeholder ikke personalets navne. */
export type StatusReportSources = {
  periodStart: string;
  periodEnd: string;
  /** Borgerens navne (fornavn, efternavn, visningsnavn) — bruges kun til at pseudonymisere. */
  residentNames: string[];
  vum: {
    casePurpose: string | null;
    referralSource: string | null;
    themes: StatusReportVumTheme[];
    goals: VumGoal[];
  } | null;
  nextSteps: {
    title: string;
    description: string | null;
    status: string;
    targetDate: string | null;
    residentNote: string | null;
    staffNote: string | null;
    completedAt: string | null;
  }[];
  journal: { date: string; category: string; text: string }[];
  checkins: { date: string; mood: number; trafficLight: string | null; text: string | null }[];
  concerns: { date: string; category: string; severity: number; note: string }[];
  crises: { date: string; trin: number; status: string; notes: string | null }[];
  medications: {
    name: string;
    dose: string;
    frequency: string;
    status: string;
    since: string | null;
  }[];
};
