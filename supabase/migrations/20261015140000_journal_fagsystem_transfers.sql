-- Kopiér til fagsystem: BUDR husker, hvilke journalnotater der er overført til bostedets officielle
-- fagsystem (fx Sensum eller Nexus), så intet bliver glemt og intet overføres to gange.
--
-- journal_fagsystem_transfers: én række pr. overført notat.
--   * alle i bostedet kan se, hvad der er overført
--   * man kan kun markere notater i sit eget bosted, kun godkendte og ikke-private, og kun i eget navn
--   * fortryd: den der markerede (eller en med approve_journal) kan slette markeringen
--   * ingen UPDATE
--
-- assistant_suggestions.kind får 'fagsystem': en daglig påmindelse til den der skrev notaterne,
-- når bostedet bruger overførslen, og der ligger notater fra tidligere dage, som ikke er overført.

CREATE TABLE IF NOT EXISTS public.journal_fagsystem_transfers (
  journal_entry_id uuid PRIMARY KEY REFERENCES public.journal_entries(id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  resident_id uuid NOT NULL,
  transferred_by uuid DEFAULT auth.uid() REFERENCES public.care_staff(id) ON DELETE SET NULL,
  transferred_by_name text CHECK (transferred_by_name IS NULL OR char_length(transferred_by_name) <= 200),
  transferred_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS journal_fagsystem_transfers_org_idx
  ON public.journal_fagsystem_transfers (org_id, transferred_at DESC);
CREATE INDEX IF NOT EXISTS journal_fagsystem_transfers_resident_idx
  ON public.journal_fagsystem_transfers (resident_id);
CREATE INDEX IF NOT EXISTS journal_fagsystem_transfers_by_idx
  ON public.journal_fagsystem_transfers (transferred_by);

ALTER TABLE public.journal_fagsystem_transfers ENABLE ROW LEVEL SECURITY;

CREATE POLICY journal_fagsystem_transfers_select
  ON public.journal_fagsystem_transfers FOR SELECT TO authenticated
  USING (org_id = (SELECT cs.org_id FROM public.care_staff cs WHERE cs.id = auth.uid()));

CREATE POLICY journal_fagsystem_transfers_insert
  ON public.journal_fagsystem_transfers FOR INSERT TO authenticated
  WITH CHECK (
    transferred_by = auth.uid()
    AND org_id = (SELECT cs.org_id FROM public.care_staff cs WHERE cs.id = auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.journal_entries je
      WHERE je.id = journal_entry_id
        AND je.org_id = journal_fagsystem_transfers.org_id
        AND je.resident_id = journal_fagsystem_transfers.resident_id
        AND je.is_resident_private = false
        AND coalesce(je.journal_status, 'godkendt') <> 'kladde'
    )
  );

CREATE POLICY journal_fagsystem_transfers_delete
  ON public.journal_fagsystem_transfers FOR DELETE TO authenticated
  USING (
    org_id = (SELECT cs.org_id FROM public.care_staff cs WHERE cs.id = auth.uid())
    AND (transferred_by = auth.uid() OR public.care_staff_has_permission('approve_journal'))
  );

REVOKE ALL ON public.journal_fagsystem_transfers FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, DELETE ON public.journal_fagsystem_transfers TO authenticated;


ALTER TABLE public.assistant_suggestions DROP CONSTRAINT IF EXISTS assistant_suggestions_kind_check;
ALTER TABLE public.assistant_suggestions ADD CONSTRAINT assistant_suggestions_kind_check
  CHECK (kind IN ('aftale_opfoelgning', 'dokument_frist', 'trafiklys', 'svar', 'fagsystem'));
