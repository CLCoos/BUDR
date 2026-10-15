-- Fælles dokumentmotor for alle borgerdokumenter (statusrapport, indsatsplan, magtanvendelse m.fl.).
--
-- Ét dokument = én række i resident_documents. Indholdet ligger som afsnit i jsonb, med kilder pr. afsnit.
-- Livscyklus:  kladde → til_godkendelse → godkendt → (erstattet af en ny version)
--   * læsning kræver view_360 og adgang til borgeren
--   * oprettelse og redigering kræver write_journal; kun kladde og til_godkendelse kan redigeres
--   * godkendelse kræver approve_journal; et godkendt dokument er låst og kan kun erstattes af en ny version
--   * ingen DELETE
-- Alle statusskift og AI-udkast logges i resident_document_events. Ved godkendelse gemmes et fuldt
-- øjebliksbillede af indholdet, så hver godkendt version kan genskabes ordret.
--
-- Erstatter resident_status_reports (0 rækker i prod ved oprettelsen); den gamle tabel fjernes senere.

CREATE TABLE IF NOT EXISTS public.resident_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  resident_id uuid NOT NULL REFERENCES public.care_residents(user_id) ON DELETE CASCADE,
  doc_type text NOT NULL CHECK (doc_type IN (
    'vum_bestilling',
    'statusrapport',
    'magtanvendelse',
    'tilsynsrapport',
    'indsatsplan',
    'krap_skema',
    'dagsstruktur',
    'sundhed',
    'dagbog',
    'kvikguide',
    'trafiklys'
  )),
  status text NOT NULL DEFAULT 'kladde'
    CHECK (status IN ('kladde', 'til_godkendelse', 'godkendt', 'erstattet')),
  version integer NOT NULL DEFAULT 1 CHECK (version >= 1),
  previous_id uuid REFERENCES public.resident_documents(id) ON DELETE SET NULL,
  title text CHECK (title IS NULL OR char_length(title) <= 200),
  meta jsonb NOT NULL DEFAULT '{}',
  sections jsonb NOT NULL DEFAULT '{}',
  section_sources jsonb NOT NULL DEFAULT '{}',
  due_date date,
  responsible_id uuid REFERENCES public.care_staff(id) ON DELETE SET NULL,
  created_by uuid DEFAULT auth.uid() REFERENCES public.care_staff(id) ON DELETE SET NULL,
  updated_by uuid DEFAULT auth.uid() REFERENCES public.care_staff(id) ON DELETE SET NULL,
  submitted_by uuid REFERENCES public.care_staff(id) ON DELETE SET NULL,
  submitted_at timestamptz,
  approved_by uuid REFERENCES public.care_staff(id) ON DELETE SET NULL,
  approved_at timestamptz,
  review_note text CHECK (review_note IS NULL OR char_length(review_note) <= 2000),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT resident_documents_json_shape CHECK (
    jsonb_typeof(meta) = 'object'
    AND jsonb_typeof(sections) = 'object'
    AND jsonb_typeof(section_sources) = 'object'
  ),
  CONSTRAINT resident_documents_size CHECK (
    octet_length(meta::text) <= 20000
    AND octet_length(sections::text) <= 200000
    AND octet_length(section_sources::text) <= 200000
  )
);

-- Et godkendt dokument kan kun erstattes af én ny version
CREATE UNIQUE INDEX IF NOT EXISTS resident_documents_previous_uniq
  ON public.resident_documents (previous_id) WHERE previous_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS resident_documents_resident_idx
  ON public.resident_documents (resident_id, doc_type, created_at DESC);
CREATE INDEX IF NOT EXISTS resident_documents_org_status_idx
  ON public.resident_documents (org_id, status, due_date);
CREATE INDEX IF NOT EXISTS resident_documents_created_by_idx ON public.resident_documents (created_by);
CREATE INDEX IF NOT EXISTS resident_documents_updated_by_idx ON public.resident_documents (updated_by);
CREATE INDEX IF NOT EXISTS resident_documents_submitted_by_idx ON public.resident_documents (submitted_by);
CREATE INDEX IF NOT EXISTS resident_documents_approved_by_idx ON public.resident_documents (approved_by);
CREATE INDEX IF NOT EXISTS resident_documents_responsible_idx ON public.resident_documents (responsible_id);

CREATE TABLE IF NOT EXISTS public.resident_document_events (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  document_id uuid NOT NULL REFERENCES public.resident_documents(id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  resident_id uuid NOT NULL,
  action text NOT NULL CHECK (action IN (
    'oprettet', 'sendt_til_godkendelse', 'sendt_retur', 'godkendt', 'ny_version', 'ai_udkast'
  )),
  actor_id uuid DEFAULT auth.uid() REFERENCES public.care_staff(id) ON DELETE SET NULL,
  detail jsonb NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT resident_document_events_detail CHECK (
    jsonb_typeof(detail) = 'object' AND octet_length(detail::text) <= 450000
  )
);

CREATE INDEX IF NOT EXISTS resident_document_events_doc_idx
  ON public.resident_document_events (document_id, created_at);
CREATE INDEX IF NOT EXISTS resident_document_events_org_idx
  ON public.resident_document_events (org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS resident_document_events_actor_idx
  ON public.resident_document_events (actor_id);

-- ── RLS ──
ALTER TABLE public.resident_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resident_document_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY resident_documents_staff_select
  ON public.resident_documents FOR SELECT TO authenticated
  USING (
    public.care_staff_can_access_resident(resident_id::text)
    AND public.care_staff_has_permission('view_360')
  );

CREATE POLICY resident_documents_staff_insert
  ON public.resident_documents FOR INSERT TO authenticated
  WITH CHECK (
    public.care_staff_can_access_resident(resident_id::text)
    AND public.care_staff_has_permission('write_journal')
    AND created_by = (SELECT auth.uid())
    AND status = 'kladde'
    AND approved_by IS NULL
    AND submitted_by IS NULL
    AND org_id = (SELECT cr.org_id FROM public.care_residents cr WHERE cr.user_id = resident_id)
  );

CREATE POLICY resident_documents_staff_update
  ON public.resident_documents FOR UPDATE TO authenticated
  USING (
    public.care_staff_can_access_resident(resident_id::text)
    AND public.care_staff_has_permission('write_journal')
    AND status IN ('kladde', 'til_godkendelse')
  )
  WITH CHECK (
    public.care_staff_can_access_resident(resident_id::text)
    AND public.care_staff_has_permission('write_journal')
    AND status IN ('kladde', 'til_godkendelse', 'godkendt')
  );

CREATE POLICY resident_document_events_staff_select
  ON public.resident_document_events FOR SELECT TO authenticated
  USING (
    public.care_staff_can_access_resident(resident_id::text)
    AND public.care_staff_has_permission('view_360')
  );

-- Kun AI-udkast logges direkte fra klienten; alt andet skrives af triggerne nedenfor.
CREATE POLICY resident_document_events_staff_insert_ai
  ON public.resident_document_events FOR INSERT TO authenticated
  WITH CHECK (
    action = 'ai_udkast'
    AND actor_id = (SELECT auth.uid())
    AND public.care_staff_has_permission('write_journal')
    AND EXISTS (
      SELECT 1 FROM public.resident_documents d
      WHERE d.id = document_id
        AND d.org_id = resident_document_events.org_id
        AND d.resident_id = resident_document_events.resident_id
        AND d.status IN ('kladde', 'til_godkendelse')
        AND public.care_staff_can_access_resident(d.resident_id::text)
    )
  );

-- ── Triggere ──

-- Før INSERT: ny version arver type og borger fra en godkendt forgænger og får næste versionsnummer.
CREATE OR REPLACE FUNCTION public.resident_documents_before_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  prev record;
BEGIN
  NEW.updated_by := NEW.created_by;
  NEW.created_at := now();
  NEW.updated_at := now();
  IF NEW.previous_id IS NULL THEN
    NEW.version := 1;
    RETURN NEW;
  END IF;
  SELECT id, org_id, resident_id, doc_type, status, version INTO prev
  FROM public.resident_documents WHERE id = NEW.previous_id;
  IF NOT FOUND
     OR prev.org_id <> NEW.org_id
     OR prev.resident_id <> NEW.resident_id
     OR prev.doc_type <> NEW.doc_type THEN
    RAISE EXCEPTION 'Den tidligere version passer ikke til dokumentet';
  END IF;
  IF prev.status <> 'godkendt' THEN
    RAISE EXCEPTION 'Kun et godkendt dokument kan få en ny version';
  END IF;
  NEW.version := prev.version + 1;
  RETURN NEW;
END;
$$;

-- Efter INSERT: log oprettelsen og marker forgængeren som erstattet.
CREATE OR REPLACE FUNCTION public.resident_documents_after_insert()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.resident_document_events (document_id, org_id, resident_id, action, actor_id, detail)
  VALUES (
    NEW.id, NEW.org_id, NEW.resident_id,
    CASE WHEN NEW.previous_id IS NULL THEN 'oprettet' ELSE 'ny_version' END,
    NEW.created_by,
    jsonb_build_object('version', NEW.version, 'previous_id', NEW.previous_id)
  );
  IF NEW.previous_id IS NOT NULL THEN
    UPDATE public.resident_documents SET status = 'erstattet' WHERE id = NEW.previous_id;
  END IF;
  RETURN NEW;
END;
$$;

-- Før UPDATE: faste felter, lovlige statusskift og hvem der må godkende.
CREATE OR REPLACE FUNCTION public.resident_documents_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF current_user IN ('postgres', 'service_role', 'supabase_admin') THEN
    NEW.updated_at := now();
    RETURN NEW;
  END IF;
  IF NEW.id IS DISTINCT FROM OLD.id
     OR NEW.org_id IS DISTINCT FROM OLD.org_id
     OR NEW.resident_id IS DISTINCT FROM OLD.resident_id
     OR NEW.doc_type IS DISTINCT FROM OLD.doc_type
     OR NEW.version IS DISTINCT FROM OLD.version
     OR NEW.previous_id IS DISTINCT FROM OLD.previous_id
     OR NEW.created_by IS DISTINCT FROM OLD.created_by
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Borger, type, version og oprettelse kan ikke ændres på et dokument';
  END IF;

  NEW.updated_by := auth.uid();
  NEW.updated_at := now();

  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF OLD.status = 'kladde' AND NEW.status = 'til_godkendelse' THEN
      NEW.submitted_by := auth.uid();
      NEW.submitted_at := now();
      NEW.review_note := NULL;
    ELSIF OLD.status = 'til_godkendelse' AND NEW.status = 'kladde' THEN
      NEW.submitted_by := NULL;
      NEW.submitted_at := NULL;
    ELSIF OLD.status IN ('kladde', 'til_godkendelse') AND NEW.status = 'godkendt' THEN
      IF NOT public.care_staff_has_permission('approve_journal') THEN
        RAISE EXCEPTION 'Du har ikke ret til at godkende dokumenter';
      END IF;
      NEW.approved_by := auth.uid();
      NEW.approved_at := now();
      IF NEW.submitted_at IS NULL THEN
        NEW.submitted_by := auth.uid();
        NEW.submitted_at := now();
      END IF;
    ELSE
      RAISE EXCEPTION 'Ugyldigt statusskift: % til %', OLD.status, NEW.status;
    END IF;
  ELSE
    -- Godkendelsesfelter kan kun sættes af triggeren ved statusskift
    IF NEW.approved_by IS DISTINCT FROM OLD.approved_by
       OR NEW.approved_at IS DISTINCT FROM OLD.approved_at
       OR NEW.submitted_by IS DISTINCT FROM OLD.submitted_by
       OR NEW.submitted_at IS DISTINCT FROM OLD.submitted_at THEN
      RAISE EXCEPTION 'Godkendelsesfelter kan ikke ændres direkte';
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Efter UPDATE: log statusskift; ved godkendelse gemmes et fuldt øjebliksbillede.
CREATE OR REPLACE FUNCTION public.resident_documents_after_update()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_action text;
  v_detail jsonb := '{}';
BEGIN
  IF NEW.status IS NOT DISTINCT FROM OLD.status OR NEW.status = 'erstattet' THEN
    RETURN NEW;
  END IF;
  IF NEW.status = 'til_godkendelse' THEN
    v_action := 'sendt_til_godkendelse';
  ELSIF NEW.status = 'kladde' THEN
    v_action := 'sendt_retur';
    v_detail := jsonb_build_object('note', NEW.review_note);
  ELSIF NEW.status = 'godkendt' THEN
    v_action := 'godkendt';
    v_detail := jsonb_build_object(
      'version', NEW.version,
      'title', NEW.title,
      'meta', NEW.meta,
      'sections', NEW.sections,
      'section_sources', NEW.section_sources
    );
  ELSE
    RETURN NEW;
  END IF;
  INSERT INTO public.resident_document_events (document_id, org_id, resident_id, action, actor_id, detail)
  VALUES (NEW.id, NEW.org_id, NEW.resident_id, v_action, auth.uid(), v_detail);
  RETURN NEW;
END;
$$;

CREATE TRIGGER resident_documents_before_insert
  BEFORE INSERT ON public.resident_documents
  FOR EACH ROW EXECUTE FUNCTION public.resident_documents_before_insert();
CREATE TRIGGER resident_documents_after_insert
  AFTER INSERT ON public.resident_documents
  FOR EACH ROW EXECUTE FUNCTION public.resident_documents_after_insert();
CREATE TRIGGER resident_documents_guard
  BEFORE UPDATE ON public.resident_documents
  FOR EACH ROW EXECUTE FUNCTION public.resident_documents_guard();
CREATE TRIGGER resident_documents_after_update
  AFTER UPDATE ON public.resident_documents
  FOR EACH ROW EXECUTE FUNCTION public.resident_documents_after_update();

REVOKE ALL ON FUNCTION public.resident_documents_before_insert() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.resident_documents_after_insert() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.resident_documents_guard() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.resident_documents_after_update() FROM PUBLIC, anon, authenticated;

REVOKE ALL ON public.resident_documents FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.resident_documents TO authenticated;
REVOKE ALL ON public.resident_document_events FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON public.resident_document_events TO authenticated;
