-- Live vagtoverlevering: staff notes that previously only lived in React state.
-- Unique per resident + Copenhagen civil date + shift so "Gem alle noter" is an upsert.

CREATE TABLE IF NOT EXISTS public.care_handover_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id uuid NOT NULL REFERENCES public.care_residents(user_id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES public.organisations(id) ON DELETE CASCADE,
  staff_id uuid REFERENCES public.care_staff(id) ON DELETE SET NULL,
  flag_color text,
  shift_label text NOT NULL,
  shift_date date NOT NULL,
  body text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT care_handover_notes_flag_check
    CHECK (flag_color IS NULL OR flag_color = ANY (ARRAY['groen'::text, 'gul'::text, 'roed'::text, 'sort'::text])),
  CONSTRAINT care_handover_notes_shift_check
    CHECK (shift_label = ANY (ARRAY['dag'::text, 'aften'::text, 'nat'::text, 'doegnnotat'::text])),
  CONSTRAINT care_handover_notes_body_check
    CHECK (char_length(body) <= 8000),
  CONSTRAINT care_handover_notes_resident_shift_key
    UNIQUE (resident_id, shift_date, shift_label)
);

CREATE INDEX IF NOT EXISTS care_handover_notes_org_date_idx
  ON public.care_handover_notes (org_id, shift_date DESC);

ALTER TABLE public.care_handover_notes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS chn_staff_select ON public.care_handover_notes;
CREATE POLICY chn_staff_select ON public.care_handover_notes
  FOR SELECT TO authenticated
  USING (public.care_staff_can_access_resident((resident_id)::text));

DROP POLICY IF EXISTS chn_staff_insert ON public.care_handover_notes;
CREATE POLICY chn_staff_insert ON public.care_handover_notes
  FOR INSERT TO authenticated
  WITH CHECK (public.care_staff_can_access_resident((resident_id)::text));

DROP POLICY IF EXISTS chn_staff_update ON public.care_handover_notes;
CREATE POLICY chn_staff_update ON public.care_handover_notes
  FOR UPDATE TO authenticated
  USING (public.care_staff_can_access_resident((resident_id)::text))
  WITH CHECK (public.care_staff_can_access_resident((resident_id)::text));

GRANT SELECT, INSERT, UPDATE ON public.care_handover_notes TO authenticated;
REVOKE DELETE ON public.care_handover_notes FROM PUBLIC, anon, authenticated;
