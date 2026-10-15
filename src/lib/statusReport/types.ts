import type { VumFunctionLevel, VumGoal } from '@/lib/vum/vumTypes';
import type { StatusReportSections } from './sections';

export type StatusReportStatus = 'kladde' | 'faerdig';

export type StatusReportRow = {
  id: string;
  org_id: string;
  resident_id: string;
  status: StatusReportStatus;
  period_start: string;
  period_end: string;
  meeting_date: string | null;
  paragraph: string | null;
  contact_person: string | null;
  sections: StatusReportSections;
  created_by: string | null;
  updated_by: string | null;
  finished_at: string | null;
  created_at: string;
  updated_at: string;
};

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
