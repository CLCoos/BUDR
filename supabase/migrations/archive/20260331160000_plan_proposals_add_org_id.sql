ALTER TABLE public.plan_proposals
  ADD COLUMN IF NOT EXISTS org_id uuid REFERENCES public.organisations(id);

CREATE INDEX IF NOT EXISTS plan_proposals_org_id_idx
  ON public.plan_proposals (org_id);
