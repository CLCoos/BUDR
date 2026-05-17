-- Gør mood_score nullable så weekly check-ins kan oprettes uden mood-data.
-- Daily check-ins skal fortsat validere mood_score på applikationslaget.
ALTER TABLE public.lys_checkin ALTER COLUMN mood_score DROP NOT NULL;
