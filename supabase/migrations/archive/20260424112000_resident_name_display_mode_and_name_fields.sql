-- Resident naming model:
-- - care_residents.first_name / last_name for human-friendly rendering
-- - organisations.resident_name_display_mode for org-level formatting policy

ALTER TABLE public.care_residents
  ADD COLUMN IF NOT EXISTS first_name text,
  ADD COLUMN IF NOT EXISTS last_name text;

ALTER TABLE public.organisations
  ADD COLUMN IF NOT EXISTS resident_name_display_mode text NOT NULL DEFAULT 'first_name_initial';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'organisations_resident_name_display_mode_check'
  ) THEN
    ALTER TABLE public.organisations
      ADD CONSTRAINT organisations_resident_name_display_mode_check
      CHECK (resident_name_display_mode IN ('first_name_initial', 'full_name', 'initials_only'));
  END IF;
END $$;
