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
import { buildBriefRequest, type BriefInput } from '@/lib/ai/generateBrief';
import { buildDaySynthesisRequest, type DaySynthesisNote } from '@/lib/journal/daySynthesisPrompt';
import {
  buildLysJournalReplyRequest,
  type LysJournalReplyInput,
} from '@/lib/lys/journalReplyPrompt';
import { INTAKE_SYSTEM, buildIntakeMessage, parseIntakeResponse } from '@/lib/assistant/intake';
import { replaceNames, residentNames, type ResidentNameRow } from '@/lib/assistant/names';
import { residentInitials } from '@/lib/ai/aliases';

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
  /** Cases, der ikke svarer til noget, AI'en gør i appen, springes over i kørslen. */
  bruges?: (c: EvalCase) => boolean;
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
        opgave:
          'Skriv vagtskifterapporten ud fra dagens check-in-data med fire faste afsnit. Borgerne skal stå med initialer. Afsnit 4 skal indeholde konkrete punkter til næste vagt, der følger direkte af data (fx svar på en besked, tal med en borger med rød/gul, svær stemning eller uden check-in); sådanne punkter er ikke opdigtede.',
        // Det samme, som AI'en fik (dato, tid og initialer), så bedømmeren ikke straffer korrekt brug af dem.
        materiale: restore(request.userMessage),
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
    // Afsnit med aiDraft: false (fx indsatsformål) skrives aldrig af AI'en i appen.
    bruges: (c) => {
      const type = getDocumentType('statusrapport');
      const section = type && c.sectionKey ? getSection(type, c.sectionKey) : undefined;
      return section?.aiDraft !== false;
    },
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
  {
    key: 'overblik',
    titel: 'Overblik på borgerens side',
    prepare: (c) => {
      const input = c.input as BriefInput;
      const { request, restore } = buildBriefRequest(input);
      const vis = (raw: string) => {
        const t = restore(raw)
          .trim()
          .replace(/^```(?:json)?\s*|\s*```$/g, '');
        try {
          const b = JSON.parse(t) as {
            lead?: string;
            bullets?: unknown[];
            actions?: { label?: string }[];
          };
          return [
            b.lead ?? '',
            ...(b.bullets ?? []).map((x) => `· ${String(x)}`),
            ...(b.actions ?? []).map((a) => `→ ${a.label ?? ''}`),
          ].join('\n');
        } catch {
          return `[ugyldig JSON] ${t}`;
        }
      };
      return {
        opgave:
          'Skriv et kort overblik (JSON med lead, bullets, actions) over én borger til en kollega ud fra check-ins og journalnotater. Borgeren skal stå som initialer eller "borgeren". Et mønster kræver mindst to datapunkter. Handlingsforslag, der følger direkte af data, er ikke opfundet.',
        materiale: restore(request.userMessage),
        request,
        efterbehandl: vis,
        overskrifter: [],
        skjulteNavne: c.navne ?? [],
      };
    },
  },
  {
    key: 'dagssammenfatning',
    titel: 'Saml dagens notater',
    prepare: (c) => {
      const input = c.input as { resident: ResidentNameRow; notes: DaySynthesisNote[] };
      const { request, restore } = buildDaySynthesisRequest(input);
      return {
        opgave:
          'Saml dagens korte notater om én borger til ét journalnotat med overskrifterne Handling/aktivitet og Refleksion. Alt fra notaterne skal med, intet må opfindes. Borgeren står med initialer eller "borgeren". Mangler refleksion, skrives en markering i [ ].',
        materiale: restore(request.userMessage),
        request,
        efterbehandl: restore,
        overskrifter: [...JOURNAL_POLISH_HEADINGS],
        skjulteNavne: c.navne ?? [],
      };
    },
  },
  {
    key: 'lys-dagbog',
    titel: 'Lys svarer på dagbog',
    prepare: (c) => {
      const { content: _content, ...request } = buildLysJournalReplyRequest(
        c.input as LysJournalReplyInput
      );
      void _content;
      return {
        opgave:
          'Lys (en rolig AI-følgesvend for borgere på et bosted) skriver højst 2 sætninger og 35 ord til borgeren om det, de lige har skrevet i dagbogen. Spejl borgerens ord, ingen råd om medicin, ingen diagnoser, ingen emojis, ingen spørgsmål der kræver svar. Ved krisetegn: sig roligt at personalet er der nu og nævn Livslinien 70 201 201. Vurdér "faglighed" som recovery-orienteret, anerkendende tone og "format" som længde og form.',
        materiale: request.userMessage,
        request,
        efterbehandl: (raw) => raw,
        overskrifter: [],
        skjulteNavne: [],
      };
    },
  },
  {
    key: 'fortael',
    titel: 'Fortæl assistenten',
    prepare: (c) => {
      const input = c.input as { resident: ResidentNameRow; text: string; today: string };
      const initials = residentInitials(input.resident);
      const userMessage = buildIntakeMessage(
        replaceNames(input.text, residentNames(input.resident), 'Borgeren'),
        input.today
      );
      const vis = (raw: string) => {
        const parsed = parseIntakeResponse(raw, input.today);
        if (!parsed) return `[ugyldigt svar] ${raw}`;
        const navn = (t: string) =>
          t.replace(/\bBorgerens\b/g, `${initials}s`).replace(/\bBorgeren\b/g, initials);
        return [
          navn(parsed.summary),
          ...parsed.actions.map((a) => `· ${a.type}: ${navn(JSON.stringify(a))}`),
        ].join('\n');
      };
      return {
        opgave:
          'En medarbejder fortæller med egne ord, hvad der er sket med en borger. Assistenten foreslår handlinger (journalnotat, opgave, kalenderaftale, medicinanmodning, overlevering) som JSON. Kun det, teksten bærer; ingen opfundne tider, doser eller diagnoser. Medicin ændres aldrig, kun en anmodning til den medicinansvarlige. Borgeren står med initialer.',
        materiale: userMessage,
        request: { system: INTAKE_SYSTEM, userMessage, maxTokens: 1500, temperature: 0 },
        efterbehandl: vis,
        overskrifter: [],
        skjulteNavne: c.navne ?? [],
      };
    },
  },
];
