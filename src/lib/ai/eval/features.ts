/**
 * Hver AI-funktion i testsættet: hvordan en case bliver til et kald, og hvilke faste tjek der gælder.
 * Bruger præcis de samme byggefunktioner som ruterne, så testen måler det, der kører i produktion.
 */
import { buildJournalPolishRequest, JOURNAL_POLISH_HEADINGS } from '@/lib/journal/polishPrompt';
import {
  buildOverrapportRequest,
  OVERRAPPORT_HEADINGS,
  type OverrapportResidentIn,
} from '@/lib/overrapport/aiPrompt';
import { DRAFTERS } from '@/lib/documents/drafters';
import { getDocumentType, getSection } from '@/lib/documents/registry';
import { extractCitations } from '@/lib/documents/citations';
import {
  buildSectionUserMessage,
  buildSourceMaterial,
  cleanSectionText,
} from '@/lib/statusReport/prompt';
import type { StatusReportSources } from '@/lib/statusReport/types';

export type Forventet = { skalIndeholde?: string[]; maaIkkeIndeholde?: string[]; noter?: string };

export type EvalCase = {
  id: string;
  beskrivelse: string;
  input: unknown;
  navne?: string[];
  sectionKey?: string;
  forventet: Forventet;
};

export type Prepared = {
  opgave: string;
  /** Det, AI'en fik (til bedømmeren og til tjek af nye tal/diagnoser). */
  materiale: string;
  request: {
    system: string;
    userMessage: string;
    maxTokens: number;
    temperature: number;
    preferredModels?: string[];
  };
  efterbehandl: (raw: string) => string;
  overskrifter: string[];
  /** Navne, der ikke må stå i det, der sendes til AI. */
  skjulteNavne: string[];
};

export type Feature = {
  key: string;
  titel: string;
  prepare: (c: EvalCase) => Prepared;
};

export const FEATURES: Feature[] = [
  {
    key: 'journal-polish',
    titel: 'Journalforbedring',
    prepare: (c) => {
      const input = c.input as { draft: string; category?: string; residentLabel?: string };
      const request = buildJournalPolishRequest(input);
      return {
        opgave:
          'Redigér et rånotat til et journalnotat med overskrifterne Handling/aktivitet og Refleksion uden at ændre indholdet. Mangler refleksion, skrives et markeret forslag i [ ].',
        materiale: request.userMessage,
        request,
        efterbehandl: (raw) => raw,
        overskrifter: [...JOURNAL_POLISH_HEADINGS],
        skjulteNavne: [],
      };
    },
  },
  {
    key: 'overrapport',
    titel: 'Overrapport',
    prepare: (c) => {
      const input = c.input as {
        residents: OverrapportResidentIn[];
        dateStr: string;
        timeStr: string;
      };
      const { restore, ...request } = buildOverrapportRequest(
        input.residents,
        input.dateStr,
        input.timeStr
      );
      return {
        opgave: 'Skriv vagtskifterapporten ud fra dagens check-in-data med fire faste afsnit.',
        materiale: JSON.stringify(input.residents, null, 1),
        request,
        efterbehandl: restore,
        overskrifter: [...OVERRAPPORT_HEADINGS],
        skjulteNavne: c.navne ?? [],
      };
    },
  },
  {
    key: 'statusudtalelse',
    titel: 'Statusudtalelse',
    prepare: (c) => {
      const type = getDocumentType('statusrapport');
      const section = type && c.sectionKey ? getSection(type, c.sectionKey) : undefined;
      const drafter = DRAFTERS.statusrapport;
      if (!section || !drafter) throw new Error(`ukendt afsnit ${c.sectionKey}`);
      const material = buildSourceMaterial(c.input as StatusReportSources);
      return {
        opgave: `Skriv afsnittet "${section.title}" i en statusudtalelse til kommunen. Instruks: ${section.instruction ?? ''}`,
        materiale: material.text,
        request: {
          system: drafter.system,
          userMessage: buildSectionUserMessage(section, material.text),
          maxTokens: 1200,
          temperature: 0.2,
        },
        efterbehandl: (raw) =>
          cleanSectionText(extractCitations(raw, material.refs).text, section.title),
        overskrifter: [],
        skjulteNavne: c.navne ?? [],
      };
    },
  },
];
