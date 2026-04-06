-- Portal-alerts (dashboard badge + AlertPanel). Indsættes med service role fra park-API’er;
-- personale læser/kvitterer med staff-JWT. Kræver care_staff_can_access_resident(text).

CREATE TABLE IF NOT EXISTS public.care_portal_notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id uuid NOT NULL,
  type text NOT NULL,
  detail text NOT NULL,
  severity text NOT NULL,
  source_table text,
  created_at timestamptz NOT NULL DEFAULT now(),
  acknowledged_at timestamptz,
  acknowledged_by uuid REFERENCES auth.users (id) ON DELETE SET NULL
);

-- Eksisterende manuelle tabeller kan mangle kolonner
ALTER TABLE public.care_portal_notifications
  ADD COLUMN IF NOT EXISTS source_table text;
ALTER TABLE public.care_portal_notifications
  ADD COLUMN IF NOT EXISTS acknowledged_at timestamptz;
ALTER TABLE public.care_portal_notifications
  ADD COLUMN IF NOT EXISTS acknowledged_by uuid REFERENCES auth.users (id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS care_portal_notifications_resident_unacked_idx
  ON public.care_portal_notifications (resident_id, type)
  WHERE acknowledged_at IS NULL;

CREATE INDEX IF NOT EXISTS care_portal_notifications_created_idx
  ON public.care_portal_notifications (created_at DESC);

ALTER TABLE public.care_portal_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "cpn_staff_select_org" ON public.care_portal_notifications;
DROP POLICY IF EXISTS "cpn_staff_update_org" ON public.care_portal_notifications;

CREATE POLICY "cpn_staff_select_org"
  ON public.care_portal_notifications
  FOR SELECT
  TO authenticated
  USING (public.care_staff_can_access_resident(resident_id::text));

CREATE POLICY "cpn_staff_update_org"
  ON public.care_portal_notifications
  FOR UPDATE
  TO authenticated
  USING (public.care_staff_can_access_resident(resident_id::text))
  WITH CHECK (public.care_staff_can_access_resident(resident_id::text));

-- Ingen INSERT/DELETE for authenticated — kun service role (park-API’er).
GRANT SELECT, UPDATE ON public.care_portal_notifications TO authenticated;
