ALTER TABLE public.lys_next_steps
  ADD COLUMN IF NOT EXISTS related_reflection_id uuid REFERENCES public.lys_reflection(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS lys_next_steps_related_reflection_id_idx
  ON public.lys_next_steps (related_reflection_id);
