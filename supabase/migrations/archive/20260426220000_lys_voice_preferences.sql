-- Lys: TTS/STT stemme-præferencer (ingen lyd gemmes — kun metadata).
ALTER TABLE public.care_residents
  ADD COLUMN IF NOT EXISTS lys_voice_id TEXT,
  ADD COLUMN IF NOT EXISTS lys_voice_autoplay BOOLEAN DEFAULT false,
  ADD COLUMN IF NOT EXISTS lys_voice_intro_played_at TIMESTAMPTZ;

COMMENT ON COLUMN public.care_residents.lys_voice_id IS
  'ElevenLabs voice ID som beboeren har valgt. NULL = brug organisations default eller app-fallback.';
COMMENT ON COLUMN public.care_residents.lys_voice_autoplay IS
  'Hvis true, afspilles AI-svar automatisk (efter brugerinteraktion).';
COMMENT ON COLUMN public.care_residents.lys_voice_intro_played_at IS
  'Første gang voice-intro blev vist/spillet. NULL = aldrig.';

ALTER TABLE public.organisations
  ADD COLUMN IF NOT EXISTS lys_default_voice_id TEXT;

COMMENT ON COLUMN public.organisations.lys_default_voice_id IS
  'Standard ElevenLabs voice ID for nye beboere i organisationen.';
