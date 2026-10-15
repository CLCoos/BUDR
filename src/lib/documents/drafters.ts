/**
 * AI-udkast pr. dokumenttype: hvilke kilder der hentes, og hvilken systeminstruks modellen får.
 * Alle drafters arbejder med brugerens egen Supabase-klient, så RLS gælder for kilderne.
 */
import type { SupabaseClient } from '@supabase/supabase-js';
import {
  STATUS_REPORT_SYSTEM,
  buildSourceMaterial,
  type SourceMaterial,
} from '@/lib/statusReport/prompt';
import { collectStatusReportSources, hasAnySource } from '@/lib/statusReport/sources';
import type { DocumentTypeKey } from './registry';
import type { ResidentDocumentRow } from './types';

export type DraftContext = {
  supabase: SupabaseClient;
  orgId: string;
  doc: Pick<ResidentDocumentRow, 'resident_id' | 'meta'>;
};

export type Drafter = {
  system: string;
  /** null = ingen data at skrive ud fra. */
  collect: (ctx: DraftContext) => Promise<SourceMaterial | null>;
};

export const DRAFTERS: Partial<Record<DocumentTypeKey, Drafter>> = {
  statusrapport: {
    system: STATUS_REPORT_SYSTEM,
    collect: async ({ supabase, orgId, doc }) => {
      const periodStart = doc.meta.period_start;
      const periodEnd = doc.meta.period_end;
      if (!periodStart || !periodEnd) return null;
      const sources = await collectStatusReportSources(supabase, {
        residentId: doc.resident_id,
        orgId,
        periodStart,
        periodEnd,
      });
      return hasAnySource(sources) ? buildSourceMaterial(sources) : null;
    },
  },
};
