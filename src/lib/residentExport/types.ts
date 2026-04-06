import type { MedDefinition } from '@/app/resident-360-view/[residentId]/components/types';

export type ExportJournalRow = {
  id: string;
  staff_name: string;
  entry_text: string;
  category: string;
  created_at: string;
  journal_status: string;
};

export type ExportConcernRow = {
  id: string;
  note: string;
  category: string;
  severity: number;
  staff_name: string;
  created_at: string;
};

export type ExportPlanItem = {
  title: string;
  done: boolean;
  time?: string;
};

export type ResidentExportInput = {
  residentId: string;
  generatedAtIso: string;
  resident: {
    name: string;
    room: string;
    trafficLight: 'groen' | 'gul' | 'roed' | null;
    moodScore: number | null;
    lastCheckin: string | null;
    moveInDate: string | null;
    primaryContact: string | null;
    primaryContactPhone: string | null;
    primaryContactRelation: string | null;
  };
  checkinNote: string | null;
  medications: MedDefinition[];
  journalEntries: ExportJournalRow[];
  concernNotes: ExportConcernRow[];
  todayPlanItems: ExportPlanItem[];
  pendingProposalsCount: number;
};

export type ExportAudience = 'laege' | 'psykiater' | 'sagsbehandler';
