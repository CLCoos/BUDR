-- Dagsplan og planforslag: koden har altid brugt plan_date, user_message, created_by og
-- updated_at, men prod-tabellerne hed «date» og manglede resten. Derfor fejlede Lys-
-- forslag, godkendelse og visning af dagsplanen.
-- * date → plan_date (omdøbning, ingen data går tabt; unik-nøglen følger med).
-- * Nye kolonner er nullable/har default, så eksisterende rækker er uændrede.
-- Ingen views, funktioner eller triggere afhænger af kolonnerne (tjekket 2026-10-13).

DO $$
BEGIN
  IF to_regclass('public.daily_plans') IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema = 'public' AND table_name = 'daily_plans' AND column_name = 'date')
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema = 'public' AND table_name = 'daily_plans' AND column_name = 'plan_date') THEN
      ALTER TABLE public.daily_plans RENAME COLUMN date TO plan_date;
    END IF;
    ALTER TABLE public.daily_plans
      ADD COLUMN IF NOT EXISTS created_by uuid,
      ADD COLUMN IF NOT EXISTS updated_at timestamptz NOT NULL DEFAULT now();
  END IF;

  IF to_regclass('public.plan_proposals') IS NOT NULL THEN
    IF EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema = 'public' AND table_name = 'plan_proposals' AND column_name = 'date')
       AND NOT EXISTS (SELECT 1 FROM information_schema.columns
               WHERE table_schema = 'public' AND table_name = 'plan_proposals' AND column_name = 'plan_date') THEN
      ALTER TABLE public.plan_proposals RENAME COLUMN date TO plan_date;
    END IF;
    ALTER TABLE public.plan_proposals ADD COLUMN IF NOT EXISTS user_message text;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'plan_proposals_user_message_len') THEN
      ALTER TABLE public.plan_proposals ADD CONSTRAINT plan_proposals_user_message_len
        CHECK (user_message IS NULL OR char_length(user_message) <= 2000);
    END IF;
    CREATE INDEX IF NOT EXISTS plan_proposals_resident_date_status_idx
      ON public.plan_proposals (resident_id, plan_date, status);
  END IF;
END $$;
