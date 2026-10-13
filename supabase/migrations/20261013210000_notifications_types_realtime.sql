-- Personaleportalens notifikationer.
-- * Typen 'medication_missed' var ikke tilladt af CHECK, så medicin-alarmer kunne aldrig gemmes.
--   ('mood_alert' fjernes fra koden i stedet; lav stemning bruger den eksisterende 'lav_stemning'.)
-- * care_portal_notifications var ikke med i supabase_realtime, så alarm-panelet og
--   alarm-tælleren opdaterede ikke live. RLS (cpn_staff_select_org) gælder også for realtime.

DO $$
BEGIN
  IF to_regclass('public.care_portal_notifications') IS NULL THEN
    RETURN;
  END IF;

  ALTER TABLE public.care_portal_notifications
    DROP CONSTRAINT IF EXISTS care_portal_notifications_type_check;
  ALTER TABLE public.care_portal_notifications
    ADD CONSTRAINT care_portal_notifications_type_check
    CHECK (type IN ('lav_stemning', 'krise', 'besked', 'inaktivitet', 'medication_missed'));

  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime')
     AND NOT EXISTS (
       SELECT 1 FROM pg_publication_tables
       WHERE pubname = 'supabase_realtime'
         AND schemaname = 'public'
         AND tablename = 'care_portal_notifications'
     ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.care_portal_notifications;
  END IF;
END $$;
