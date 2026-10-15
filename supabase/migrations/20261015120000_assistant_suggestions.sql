-- Assistentens forslag + kontaktpersoner.
--
-- resident_contacts: hvem er borgerens kontaktperson(er). Bruges til at sende forslag til den rette.
--   * alle i bostedet med view_residents kan se det; kun ledere (manage_residents) kan ændre det
--
-- assistant_suggestions: korte forslag fra assistenten ("Borger X havde lægetid kl. 9.45 …").
--   * oprettes af systemet (service role) eller af medarbejderen selv, når de svarer assistenten
--   * en modtager er enten én medarbejder (recipient_id), alle ledere eller alle i bostedet
--   * kun status og beslutningsfelter kan ændres; ingen DELETE
--   * intet bliver ændret i borgerens data, før en medarbejder godkender; det sker i API'et med
--     medarbejderens egne rettigheder, og hvad der blev oprettet, gemmes i `applied`

CREATE TABLE IF NOT EXISTS public.resident_contacts (
  resident_id uuid NOT NULL REFERENCES public.care_residents(user_id) ON DELETE CASCADE,
  staff_id uuid NOT NULL REFERENCES public.care_staff(id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'primaer' CHECK (role IN ('primaer', 'sekundaer')),
  created_by uuid DEFAULT auth.uid() REFERENCES public.care_staff(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (resident_id, staff_id)
);

CREATE INDEX IF NOT EXISTS resident_contacts_staff_idx ON public.resident_contacts (staff_id);
CREATE INDEX IF NOT EXISTS resident_contacts_org_idx ON public.resident_contacts (org_id);
CREATE INDEX IF NOT EXISTS resident_contacts_created_by_idx ON public.resident_contacts (created_by);

ALTER TABLE public.resident_contacts ENABLE ROW LEVEL SECURITY;

CREATE POLICY resident_contacts_staff_select
  ON public.resident_contacts FOR SELECT TO authenticated
  USING (public.care_staff_can_access_resident(resident_id::text));

CREATE POLICY resident_contacts_manage_insert
  ON public.resident_contacts FOR INSERT TO authenticated
  WITH CHECK (
    public.care_staff_can_access_resident(resident_id::text)
    AND public.care_staff_has_permission('manage_residents')
    AND org_id = (SELECT cr.org_id FROM public.care_residents cr WHERE cr.user_id = resident_id)
    AND org_id = (SELECT cs.org_id FROM public.care_staff cs WHERE cs.id = staff_id)
  );

CREATE POLICY resident_contacts_manage_update
  ON public.resident_contacts FOR UPDATE TO authenticated
  USING (
    public.care_staff_can_access_resident(resident_id::text)
    AND public.care_staff_has_permission('manage_residents')
  )
  WITH CHECK (
    public.care_staff_can_access_resident(resident_id::text)
    AND public.care_staff_has_permission('manage_residents')
    AND org_id = (SELECT cr.org_id FROM public.care_residents cr WHERE cr.user_id = resident_id)
    AND org_id = (SELECT cs.org_id FROM public.care_staff cs WHERE cs.id = staff_id)
  );

CREATE POLICY resident_contacts_manage_delete
  ON public.resident_contacts FOR DELETE TO authenticated
  USING (
    public.care_staff_can_access_resident(resident_id::text)
    AND public.care_staff_has_permission('manage_residents')
  );

REVOKE ALL ON public.resident_contacts FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.resident_contacts TO authenticated;


CREATE TABLE IF NOT EXISTS public.assistant_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  resident_id uuid REFERENCES public.care_residents(user_id) ON DELETE CASCADE,
  recipient_id uuid REFERENCES public.care_staff(id) ON DELETE CASCADE,
  audience text NOT NULL DEFAULT 'personlig' CHECK (audience IN ('personlig', 'ledere', 'alle')),
  kind text NOT NULL CHECK (kind IN (
    'aftale_opfoelgning', 'dokument_frist', 'trafiklys', 'svar'
  )),
  title text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 300),
  body text CHECK (body IS NULL OR char_length(body) <= 2000),
  actions jsonb NOT NULL DEFAULT '[]',
  prompt text CHECK (prompt IS NULL OR char_length(prompt) <= 300),
  link text CHECK (link IS NULL OR (char_length(link) <= 500 AND link LIKE '/%')),
  status text NOT NULL DEFAULT 'aaben' CHECK (status IN ('aaben', 'udfoert', 'afvist', 'udloebet')),
  dedupe_key text CHECK (dedupe_key IS NULL OR char_length(dedupe_key) <= 200),
  source jsonb NOT NULL DEFAULT '{}',
  applied jsonb NOT NULL DEFAULT '[]',
  expires_at timestamptz,
  decided_by uuid REFERENCES public.care_staff(id) ON DELETE SET NULL,
  decided_at timestamptz,
  created_by uuid DEFAULT auth.uid() REFERENCES public.care_staff(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT assistant_suggestions_recipient CHECK (
    (audience = 'personlig') = (recipient_id IS NOT NULL)
  ),
  CONSTRAINT assistant_suggestions_json CHECK (
    jsonb_typeof(actions) = 'array' AND jsonb_typeof(applied) = 'array'
    AND jsonb_typeof(source) = 'object'
    AND octet_length(actions::text) <= 30000 AND octet_length(applied::text) <= 30000
    AND octet_length(source::text) <= 10000
  )
);

CREATE UNIQUE INDEX IF NOT EXISTS assistant_suggestions_dedupe_uniq
  ON public.assistant_suggestions (org_id, dedupe_key) WHERE dedupe_key IS NOT NULL;
CREATE INDEX IF NOT EXISTS assistant_suggestions_open_idx
  ON public.assistant_suggestions (org_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS assistant_suggestions_recipient_idx
  ON public.assistant_suggestions (recipient_id, status);
CREATE INDEX IF NOT EXISTS assistant_suggestions_resident_idx
  ON public.assistant_suggestions (resident_id);
CREATE INDEX IF NOT EXISTS assistant_suggestions_decided_by_idx
  ON public.assistant_suggestions (decided_by);
CREATE INDEX IF NOT EXISTS assistant_suggestions_created_by_idx
  ON public.assistant_suggestions (created_by);

ALTER TABLE public.assistant_suggestions ENABLE ROW LEVEL SECURITY;

-- Synlig for modtageren, for ledere når den er til ledere, og for alle i bostedet når den er til alle.
CREATE POLICY assistant_suggestions_select
  ON public.assistant_suggestions FOR SELECT TO authenticated
  USING (
    org_id = (SELECT cs.org_id FROM public.care_staff cs WHERE cs.id = (SELECT auth.uid()))
    AND (resident_id IS NULL OR public.care_staff_can_access_resident(resident_id::text))
    AND (
      recipient_id = (SELECT auth.uid())
      OR audience = 'alle'
      OR (audience = 'ledere' AND public.care_staff_has_permission('approve_journal'))
    )
  );

-- Medarbejderen kan selv gemme et svar til assistenten (som historik); alt andet oprettes af systemet.
CREATE POLICY assistant_suggestions_insert_own_reply
  ON public.assistant_suggestions FOR INSERT TO authenticated
  WITH CHECK (
    kind = 'svar'
    AND audience = 'personlig'
    AND recipient_id = (SELECT auth.uid())
    AND created_by = (SELECT auth.uid())
    AND org_id = (SELECT cs.org_id FROM public.care_staff cs WHERE cs.id = (SELECT auth.uid()))
    AND (resident_id IS NULL OR public.care_staff_can_access_resident(resident_id::text))
    AND public.care_staff_has_permission('write_journal')
  );

CREATE POLICY assistant_suggestions_update
  ON public.assistant_suggestions FOR UPDATE TO authenticated
  USING (
    status = 'aaben'
    AND org_id = (SELECT cs.org_id FROM public.care_staff cs WHERE cs.id = (SELECT auth.uid()))
    AND (resident_id IS NULL OR public.care_staff_can_access_resident(resident_id::text))
    AND (
      recipient_id = (SELECT auth.uid())
      OR audience = 'alle'
      OR (audience = 'ledere' AND public.care_staff_has_permission('approve_journal'))
    )
  )
  WITH CHECK (status IN ('aaben', 'udfoert', 'afvist'));

-- Kun status, beslutning og hvad der blev oprettet kan ændres, og kun af den der beslutter.
CREATE OR REPLACE FUNCTION public.assistant_suggestions_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF current_user IN ('postgres', 'service_role', 'supabase_admin') THEN
    RETURN NEW;
  END IF;
  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.org_id IS DISTINCT FROM OLD.org_id
     OR NEW.resident_id IS DISTINCT FROM OLD.resident_id
     OR NEW.recipient_id IS DISTINCT FROM OLD.recipient_id
     OR NEW.audience IS DISTINCT FROM OLD.audience
     OR NEW.kind IS DISTINCT FROM OLD.kind
     OR NEW.title IS DISTINCT FROM OLD.title
     OR NEW.body IS DISTINCT FROM OLD.body
     OR NEW.actions IS DISTINCT FROM OLD.actions
     OR NEW.prompt IS DISTINCT FROM OLD.prompt
     OR NEW.link IS DISTINCT FROM OLD.link
     OR NEW.dedupe_key IS DISTINCT FROM OLD.dedupe_key
     OR NEW.source IS DISTINCT FROM OLD.source
     OR NEW.expires_at IS DISTINCT FROM OLD.expires_at
     OR NEW.created_by IS DISTINCT FROM OLD.created_by
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Et forslag kan kun godkendes eller afvises';
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    NEW.decided_by := auth.uid();
    NEW.decided_at := now();
  ELSIF NEW.decided_by IS DISTINCT FROM OLD.decided_by
     OR NEW.decided_at IS DISTINCT FROM OLD.decided_at THEN
    RAISE EXCEPTION 'Beslutningsfelter kan ikke ændres direkte';
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER assistant_suggestions_guard
  BEFORE UPDATE ON public.assistant_suggestions
  FOR EACH ROW EXECUTE FUNCTION public.assistant_suggestions_guard();

REVOKE ALL ON FUNCTION public.assistant_suggestions_guard() FROM PUBLIC, anon, authenticated;

REVOKE ALL ON public.assistant_suggestions FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.assistant_suggestions TO authenticated;
