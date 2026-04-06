-- Lys-samtaler (park-hub / lys-chat). Tidligere kun i app-kode; her versioneret skema + RLS som resident_plan_items.
-- Kræver care_staff_can_access_resident(text). Service role bypasser RLS som sædvanligt.
-- Eksisterende DB kan have resident_id som uuid — cast til text så policies altid rammer (text)-overloaden.

CREATE TABLE IF NOT EXISTS public.lys_conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id text NOT NULL,
  title text,
  messages jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS lys_conversations_resident_idx
  ON public.lys_conversations (resident_id);

ALTER TABLE public.lys_conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lc_staff_select" ON public.lys_conversations;
DROP POLICY IF EXISTS "lc_staff_insert" ON public.lys_conversations;
DROP POLICY IF EXISTS "lc_staff_update" ON public.lys_conversations;
DROP POLICY IF EXISTS "lc_staff_delete" ON public.lys_conversations;
DROP POLICY IF EXISTS "lc_resident_select" ON public.lys_conversations;
DROP POLICY IF EXISTS "lc_resident_insert" ON public.lys_conversations;
DROP POLICY IF EXISTS "lc_resident_update" ON public.lys_conversations;
DROP POLICY IF EXISTS "lc_resident_delete" ON public.lys_conversations;

CREATE POLICY "lc_staff_select"
  ON public.lys_conversations
  FOR SELECT
  TO authenticated
  USING (public.care_staff_can_access_resident(resident_id::text));

CREATE POLICY "lc_staff_insert"
  ON public.lys_conversations
  FOR INSERT
  TO authenticated
  WITH CHECK (public.care_staff_can_access_resident(resident_id::text));

CREATE POLICY "lc_staff_update"
  ON public.lys_conversations
  FOR UPDATE
  TO authenticated
  USING (public.care_staff_can_access_resident(resident_id::text))
  WITH CHECK (public.care_staff_can_access_resident(resident_id::text));

CREATE POLICY "lc_staff_delete"
  ON public.lys_conversations
  FOR DELETE
  TO authenticated
  USING (public.care_staff_can_access_resident(resident_id::text));

CREATE POLICY "lc_resident_select"
  ON public.lys_conversations
  FOR SELECT
  TO authenticated
  USING (auth.uid()::text = resident_id::text);

CREATE POLICY "lc_resident_insert"
  ON public.lys_conversations
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid()::text = resident_id::text);

CREATE POLICY "lc_resident_update"
  ON public.lys_conversations
  FOR UPDATE
  TO authenticated
  USING (auth.uid()::text = resident_id::text)
  WITH CHECK (auth.uid()::text = resident_id::text);

CREATE POLICY "lc_resident_delete"
  ON public.lys_conversations
  FOR DELETE
  TO authenticated
  USING (auth.uid()::text = resident_id::text);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.lys_conversations TO authenticated;
