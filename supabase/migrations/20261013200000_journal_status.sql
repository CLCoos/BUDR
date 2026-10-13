-- Journal-arbejdsgangen (kladde → godkendt) og borgerens private Lys-noter.
-- Prod manglede journal_status/approved_at/approved_by helt (de lå kun i archive/),
-- så Lys-dagbogen fejlede, og kladde/godkendt fandtes reelt ikke.
--
-- * Eksisterende rækker bliver 'godkendt' (de har hele tiden været synlige som journal).
-- * Nye rækker uden status bliver 'kladde' (fx AI-udkast skal godkendes af personalet).
-- * 'resident_private' + is_resident_private: borgerens «Kun for dig»-noter; personalet
--   kan hverken se, oprette eller ændre dem (RLS). Serveren (service role) kan.
-- * Trigger: godkendelse stempler approved_at/approved_by; en godkendt note kan ikke
--   gøres til kladde igen, og dens indhold, borger, org og forfatter er låst.
-- * Ingen DELETE for klientroller.

ALTER TABLE public.journal_entries
  ADD COLUMN IF NOT EXISTS journal_status text NOT NULL DEFAULT 'godkendt',
  ADD COLUMN IF NOT EXISTS approved_at timestamptz,
  ADD COLUMN IF NOT EXISTS approved_by uuid REFERENCES public.care_staff(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS is_resident_private boolean NOT NULL DEFAULT false;

ALTER TABLE public.journal_entries ALTER COLUMN journal_status SET DEFAULT 'kladde';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'journal_entries_status_values') THEN
    ALTER TABLE public.journal_entries ADD CONSTRAINT journal_entries_status_values
      CHECK (journal_status IN ('kladde', 'godkendt', 'resident_private'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'journal_entries_private_matches_status') THEN
    ALTER TABLE public.journal_entries ADD CONSTRAINT journal_entries_private_matches_status
      CHECK (is_resident_private = (journal_status = 'resident_private'));
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS journal_entries_resident_status_created_idx
  ON public.journal_entries (resident_id, journal_status, created_at DESC);

ALTER POLICY journal_entries_staff_select_own_org ON public.journal_entries
  USING (
    is_resident_private = false
    AND org_id = (SELECT cs.org_id FROM public.care_staff cs WHERE cs.id = auth.uid())
  );

ALTER POLICY journal_entries_staff_insert_own_org ON public.journal_entries
  WITH CHECK (
    is_resident_private = false
    AND org_id = (SELECT cs.org_id FROM public.care_staff cs WHERE cs.id = auth.uid())
  );

ALTER POLICY journal_entries_staff_update_own_org ON public.journal_entries
  USING (
    is_resident_private = false
    AND org_id = (SELECT cs.org_id FROM public.care_staff cs WHERE cs.id = auth.uid())
  )
  WITH CHECK (
    is_resident_private = false
    AND org_id = (SELECT cs.org_id FROM public.care_staff cs WHERE cs.id = auth.uid())
  );

CREATE OR REPLACE FUNCTION public.journal_entries_status_guard()
RETURNS trigger
LANGUAGE plpgsql
SET search_path TO 'public'
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.journal_status = 'godkendt' THEN
      NEW.approved_at := coalesce(NEW.approved_at, now());
      IF current_user NOT IN ('postgres', 'service_role', 'supabase_admin') THEN
        NEW.approved_by := auth.uid();
      END IF;
    ELSE
      NEW.approved_at := NULL;
      NEW.approved_by := NULL;
    END IF;
    RETURN NEW;
  END IF;

  IF current_user IN ('postgres', 'service_role', 'supabase_admin') THEN
    RETURN NEW;
  END IF;

  IF OLD.journal_status = 'godkendt' THEN
    IF NEW.journal_status IS DISTINCT FROM OLD.journal_status
       OR NEW.entry_text IS DISTINCT FROM OLD.entry_text
       OR NEW.resident_id IS DISTINCT FROM OLD.resident_id
       OR NEW.org_id IS DISTINCT FROM OLD.org_id
       OR NEW.staff_id IS DISTINCT FROM OLD.staff_id
       OR NEW.created_at IS DISTINCT FROM OLD.created_at
       OR NEW.approved_at IS DISTINCT FROM OLD.approved_at
       OR NEW.approved_by IS DISTINCT FROM OLD.approved_by THEN
      RAISE EXCEPTION 'En godkendt journalnote kan ikke ændres';
    END IF;
    RETURN NEW;
  END IF;

  IF NEW.resident_id IS DISTINCT FROM OLD.resident_id
     OR NEW.org_id IS DISTINCT FROM OLD.org_id
     OR NEW.created_at IS DISTINCT FROM OLD.created_at THEN
    RAISE EXCEPTION 'Borger, organisation og oprettelse kan ikke ændres på en journalnote';
  END IF;

  IF NEW.journal_status = 'godkendt' THEN
    NEW.approved_at := now();
    NEW.approved_by := auth.uid();
  ELSE
    NEW.approved_at := NULL;
    NEW.approved_by := NULL;
  END IF;
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'journal_entries_status_guard'
      AND tgrelid = 'public.journal_entries'::regclass
  ) THEN
    CREATE TRIGGER journal_entries_status_guard
      BEFORE INSERT OR UPDATE ON public.journal_entries
      FOR EACH ROW EXECUTE FUNCTION public.journal_entries_status_guard();
  END IF;
END $$;

REVOKE DELETE ON public.journal_entries FROM PUBLIC, anon, authenticated;
