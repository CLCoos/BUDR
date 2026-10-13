-- Staff dashboard «Dagens aftaler» wrote only to React state and seeded demo
-- residents (Sara-univers) on the live path. Persist extra display fields on
-- existing care_planner_entries. RLS already org-scopes via care_staff.

ALTER TABLE public.care_planner_entries
  ADD COLUMN IF NOT EXISTS location text NOT NULL DEFAULT '';

ALTER TABLE public.care_planner_entries
  ADD COLUMN IF NOT EXISTS responsible text NOT NULL DEFAULT '';

ALTER TABLE public.care_planner_entries
  ADD COLUMN IF NOT EXISTS house text NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS care_planner_entries_org_starts_idx
  ON public.care_planner_entries (org_id, starts_at);
