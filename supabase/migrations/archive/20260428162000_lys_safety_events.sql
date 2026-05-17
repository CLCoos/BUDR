CREATE TABLE IF NOT EXISTS public.lys_safety_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id text NOT NULL,
  organisation_id uuid REFERENCES public.organisations(id),
  conversation_id uuid REFERENCES public.lys_conversations(id) ON DELETE CASCADE,
  risk_level text NOT NULL CHECK (risk_level IN ('none', 'elevated', 'acute')),
  category text NOT NULL CHECK (
    category IN ('suicidalitet', 'selvskade', 'vold', 'psykose', 'overgreb', 'medicin_misbrug', 'none', 'other')
  ),
  reasoning text,
  user_utterance text NOT NULL,
  acknowledged_at timestamptz,
  acknowledged_by uuid REFERENCES public.care_staff(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_lys_safety_events_resident
  ON public.lys_safety_events (resident_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_lys_safety_events_org_unack
  ON public.lys_safety_events (organisation_id, created_at DESC)
  WHERE acknowledged_at IS NULL AND risk_level IN ('elevated', 'acute');

ALTER TABLE public.lys_safety_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lse_staff_select" ON public.lys_safety_events;
DROP POLICY IF EXISTS "lse_staff_update_ack" ON public.lys_safety_events;

CREATE POLICY "lse_staff_select"
  ON public.lys_safety_events
  FOR SELECT
  TO authenticated
  USING (public.care_staff_can_access_resident(resident_id::text));

CREATE POLICY "lse_staff_update_ack"
  ON public.lys_safety_events
  FOR UPDATE
  TO authenticated
  USING (public.care_staff_can_access_resident(resident_id::text))
  WITH CHECK (public.care_staff_can_access_resident(resident_id::text));

GRANT SELECT, UPDATE ON public.lys_safety_events TO authenticated;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime'
      AND schemaname = 'public'
      AND tablename = 'lys_safety_events'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.lys_safety_events;
  END IF;
END;
$$;
