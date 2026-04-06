-- Hvis garden_plots blev oprettet med resident_id uuid, fejler demo-id'er som "demo-resident-001".
-- Policies must be dropped before ALTER TYPE (Postgres: column used in policy).

DROP POLICY IF EXISTS "gp_staff_select" ON public.garden_plots;
DROP POLICY IF EXISTS "gp_staff_insert" ON public.garden_plots;
DROP POLICY IF EXISTS "gp_staff_update" ON public.garden_plots;
DROP POLICY IF EXISTS "gp_staff_delete" ON public.garden_plots;
DROP POLICY IF EXISTS "gp_resident_select" ON public.garden_plots;
DROP POLICY IF EXISTS "gp_resident_insert" ON public.garden_plots;
DROP POLICY IF EXISTS "gp_resident_update" ON public.garden_plots;
DROP POLICY IF EXISTS "gp_resident_delete" ON public.garden_plots;

DO $$
BEGIN
  IF to_regclass('public.garden_plots') IS NULL THEN
    RETURN;
  END IF;

  -- FK til user_id (uuid) blokerer ALTER … TYPE text; app bruger tekst-id'er inkl. demo.
  EXECUTE 'ALTER TABLE public.garden_plots DROP CONSTRAINT IF EXISTS garden_plots_resident_id_fkey';

  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'garden_plots'
      AND column_name = 'resident_id'
      AND udt_name = 'uuid'
  ) THEN
    ALTER TABLE public.garden_plots
      ALTER COLUMN resident_id TYPE text USING resident_id::text;
  END IF;
END $$;

CREATE POLICY "gp_staff_select"
  ON public.garden_plots
  FOR SELECT
  TO authenticated
  USING (public.care_staff_can_access_resident(resident_id::text));

CREATE POLICY "gp_staff_insert"
  ON public.garden_plots
  FOR INSERT
  TO authenticated
  WITH CHECK (public.care_staff_can_access_resident(resident_id::text));

CREATE POLICY "gp_staff_update"
  ON public.garden_plots
  FOR UPDATE
  TO authenticated
  USING (public.care_staff_can_access_resident(resident_id::text))
  WITH CHECK (public.care_staff_can_access_resident(resident_id::text));

CREATE POLICY "gp_staff_delete"
  ON public.garden_plots
  FOR DELETE
  TO authenticated
  USING (public.care_staff_can_access_resident(resident_id::text));

CREATE POLICY "gp_resident_select"
  ON public.garden_plots
  FOR SELECT
  TO authenticated
  USING (auth.uid()::text = resident_id::text);

CREATE POLICY "gp_resident_insert"
  ON public.garden_plots
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid()::text = resident_id::text);

CREATE POLICY "gp_resident_update"
  ON public.garden_plots
  FOR UPDATE
  TO authenticated
  USING (auth.uid()::text = resident_id::text)
  WITH CHECK (auth.uid()::text = resident_id::text);

CREATE POLICY "gp_resident_delete"
  ON public.garden_plots
  FOR DELETE
  TO authenticated
  USING (auth.uid()::text = resident_id::text);
