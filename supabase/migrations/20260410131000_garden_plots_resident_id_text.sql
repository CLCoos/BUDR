-- Hvis garden_plots blev oprettet med resident_id uuid, fejler demo-id'er som "demo-resident-001".
-- Appen bruger tekst-id'er (samme som care_residents.user_id, park flows).

DO $$
BEGIN
  IF to_regclass('public.garden_plots') IS NULL THEN
    RETURN;
  END IF;

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
