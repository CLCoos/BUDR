-- Daily plans: staff-created schedules for each resident per day
CREATE TABLE IF NOT EXISTS public.daily_plans (
  id          uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id text        NOT NULL,
  plan_date   date        NOT NULL,
  plan_items  jsonb       NOT NULL DEFAULT '[]',
  created_by  text,
  created_at  timestamptz DEFAULT now(),
  updated_at  timestamptz DEFAULT now(),
  UNIQUE (resident_id, plan_date)
);

-- Plan proposals: AI-generated suggestions awaiting staff approval
-- Residents can NEVER approve their own proposals — status only changes via staff portal
CREATE TABLE IF NOT EXISTS public.plan_proposals (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id   text        NOT NULL,
  plan_date     date        NOT NULL,
  user_message  text        NOT NULL,
  proposed_items jsonb      NOT NULL DEFAULT '[]',
  ai_reasoning  text,
  status        text        NOT NULL DEFAULT 'pending',
  reviewed_by   text,
  reviewed_at   timestamptz,
  created_at    timestamptz DEFAULT now(),
  CONSTRAINT plan_proposals_status_check
    CHECK (status IN ('pending', 'approved', 'rejected'))
);

-- Index for fast lookups by resident + date
CREATE INDEX IF NOT EXISTS daily_plans_resident_date_idx
  ON public.daily_plans (resident_id, plan_date);

CREATE INDEX IF NOT EXISTS plan_proposals_resident_date_status_idx
  ON public.plan_proposals (resident_id, plan_date, status);
