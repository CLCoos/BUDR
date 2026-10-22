-- Krisetegn alle steder borgeren skriver: hvor kom hændelsen fra?
-- Ældre hændelser kommer alle fra Lys-samtaler.
ALTER TABLE public.lys_safety_events
  ADD COLUMN IF NOT EXISTS source text NOT NULL DEFAULT 'lys_samtale';

ALTER TABLE public.lys_safety_events
  DROP CONSTRAINT IF EXISTS lys_safety_events_source_check;

ALTER TABLE public.lys_safety_events
  ADD CONSTRAINT lys_safety_events_source_check CHECK (
    source IN (
      'lys_samtale',
      'tjek_ind',
      'dagbog',
      'privat_dagbog',
      'stemmedagbog',
      'besked_til_personalet'
    )
  );
