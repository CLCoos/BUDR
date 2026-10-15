import type { DocumentTypeKey } from './registry';

export type DocumentStatus = 'kladde' | 'til_godkendelse' | 'godkendt' | 'erstattet';

/** Ét kildeelement, som et AI-udkast bygger på (fx et journalnotat eller et check-in). */
export type SourceRef = {
  /** Kort kode i kildematerialet, fx "J12". */
  ref: string;
  kind: 'journal' | 'checkin' | 'bekymring' | 'krise' | 'naeste_skridt';
  date: string | null;
  label: string;
  excerpt: string;
};

export type DocumentSections = Record<string, string>;
export type DocumentSectionSources = Record<string, SourceRef[]>;
export type DocumentMeta = Record<string, string | null>;

export type ResidentDocumentRow = {
  id: string;
  org_id: string;
  resident_id: string;
  doc_type: DocumentTypeKey;
  status: DocumentStatus;
  version: number;
  previous_id: string | null;
  title: string | null;
  meta: DocumentMeta;
  sections: DocumentSections;
  section_sources: DocumentSectionSources;
  due_date: string | null;
  responsible_id: string | null;
  created_by: string | null;
  updated_by: string | null;
  submitted_by: string | null;
  submitted_at: string | null;
  approved_by: string | null;
  approved_at: string | null;
  review_note: string | null;
  created_at: string;
  updated_at: string;
};

export type DocumentEventAction =
  | 'oprettet'
  | 'sendt_til_godkendelse'
  | 'sendt_retur'
  | 'godkendt'
  | 'ny_version'
  | 'ai_udkast';

export type DocumentEventRow = {
  id: number;
  document_id: string;
  action: DocumentEventAction;
  actor_id: string | null;
  detail: Record<string, unknown>;
  created_at: string;
};

export const DOCUMENT_STATUS_LABELS: Record<DocumentStatus, string> = {
  kladde: 'Kladde',
  til_godkendelse: 'Til godkendelse',
  godkendt: 'Godkendt',
  erstattet: 'Erstattet af ny version',
};

export const DOCUMENT_EVENT_LABELS: Record<DocumentEventAction, string> = {
  oprettet: 'Oprettet',
  sendt_til_godkendelse: 'Sendt til godkendelse',
  sendt_retur: 'Sendt retur til rettelse',
  godkendt: 'Godkendt',
  ny_version: 'Ny version oprettet',
  ai_udkast: 'AI-udkast skrevet',
};
