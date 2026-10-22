-- CPR-nummer på borgeren, så personalet hurtigt kan finde det på borgerens side.
--
-- care_resident_cpr: ét CPR pr. borger. Ingen direkte adgang fra klienten (ingen policies,
-- ingen grants); alt går gennem funktionerne nedenfor, som tjekker rettighed og bosted.
--   * get_resident_cpr_masked: fødselsdato + "-••••" (kræver view_360 i samme bosted)
--   * reveal_resident_cpr:     hele nummeret, og visningen logges (kræver view_360)
--   * set_resident_cpr:        gem, ret eller slet (kræver manage_residents), logges
-- care_resident_cpr_log: hvem så eller ændrede hvilket CPR hvornår. Kan læses af dem med
-- view_audit_log i samme bosted; skrives kun af funktionerne.

CREATE TABLE IF NOT EXISTS public.care_resident_cpr (
  resident_id uuid PRIMARY KEY REFERENCES public.care_residents(user_id) ON DELETE CASCADE,
  org_id uuid NOT NULL,
  cpr text NOT NULL CHECK (cpr ~ '^[0-9]{10}$'),
  updated_by uuid,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.care_resident_cpr ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.care_resident_cpr FROM PUBLIC, anon, authenticated;

CREATE TABLE IF NOT EXISTS public.care_resident_cpr_log (
  id bigserial PRIMARY KEY,
  resident_id uuid NOT NULL,
  org_id uuid NOT NULL,
  staff_id uuid,
  action text NOT NULL CHECK (action IN ('vist', 'gemt', 'slettet')),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS care_resident_cpr_log_org_idx
  ON public.care_resident_cpr_log (org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS care_resident_cpr_log_resident_idx
  ON public.care_resident_cpr_log (resident_id, created_at DESC);

ALTER TABLE public.care_resident_cpr_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY care_resident_cpr_log_select
  ON public.care_resident_cpr_log FOR SELECT TO authenticated
  USING (
    org_id = (SELECT cs.org_id FROM public.care_staff cs WHERE cs.id = auth.uid())
    AND public.care_staff_has_permission('view_audit_log')
  );

REVOKE ALL ON public.care_resident_cpr_log FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.care_resident_cpr_log TO authenticated;

-- Bostedet, hvis den indloggede medarbejder og borgeren hører til samme bosted; ellers NULL.
CREATE OR REPLACE FUNCTION public.care_cpr_shared_org(p_resident_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT cs.org_id
  FROM public.care_staff cs
  JOIN public.care_residents cr ON cr.user_id = p_resident_id AND cr.org_id = cs.org_id
  WHERE cs.id = auth.uid()
$$;

REVOKE ALL ON FUNCTION public.care_cpr_shared_org(uuid) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.get_resident_cpr_masked(p_resident_id uuid)
RETURNS text
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_org uuid := public.care_cpr_shared_org(p_resident_id);
  v_cpr text;
BEGIN
  IF v_org IS NULL OR NOT public.care_staff_has_permission('view_360') THEN
    RAISE EXCEPTION 'Ingen adgang' USING ERRCODE = '42501';
  END IF;
  SELECT c.cpr INTO v_cpr FROM public.care_resident_cpr c
  WHERE c.resident_id = p_resident_id AND c.org_id = v_org;
  IF v_cpr IS NULL THEN
    RETURN NULL;
  END IF;
  RETURN left(v_cpr, 6) || '-••••';
END;
$$;

CREATE OR REPLACE FUNCTION public.reveal_resident_cpr(p_resident_id uuid)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_org uuid := public.care_cpr_shared_org(p_resident_id);
  v_cpr text;
BEGIN
  IF v_org IS NULL OR NOT public.care_staff_has_permission('view_360') THEN
    RAISE EXCEPTION 'Ingen adgang' USING ERRCODE = '42501';
  END IF;
  SELECT c.cpr INTO v_cpr FROM public.care_resident_cpr c
  WHERE c.resident_id = p_resident_id AND c.org_id = v_org;
  IF v_cpr IS NULL THEN
    RETURN NULL;
  END IF;
  INSERT INTO public.care_resident_cpr_log (resident_id, org_id, staff_id, action)
  VALUES (p_resident_id, v_org, auth.uid(), 'vist');
  RETURN left(v_cpr, 6) || '-' || right(v_cpr, 4);
END;
$$;

CREATE OR REPLACE FUNCTION public.set_resident_cpr(p_resident_id uuid, p_cpr text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_org uuid := public.care_cpr_shared_org(p_resident_id);
  v_digits text := regexp_replace(coalesce(p_cpr, ''), '[^0-9]', '', 'g');
BEGIN
  IF v_org IS NULL OR NOT public.care_staff_has_permission('manage_residents') THEN
    RAISE EXCEPTION 'Ingen adgang' USING ERRCODE = '42501';
  END IF;
  IF v_digits = '' THEN
    DELETE FROM public.care_resident_cpr WHERE resident_id = p_resident_id AND org_id = v_org;
    IF FOUND THEN
      INSERT INTO public.care_resident_cpr_log (resident_id, org_id, staff_id, action)
      VALUES (p_resident_id, v_org, auth.uid(), 'slettet');
    END IF;
    RETURN;
  END IF;
  IF v_digits !~ '^[0-9]{10}$' THEN
    RAISE EXCEPTION 'CPR-nummeret skal have 10 cifre' USING ERRCODE = '22023';
  END IF;
  INSERT INTO public.care_resident_cpr (resident_id, org_id, cpr, updated_by, updated_at)
  VALUES (p_resident_id, v_org, v_digits, auth.uid(), now())
  ON CONFLICT (resident_id) DO UPDATE
    SET cpr = EXCLUDED.cpr, updated_by = EXCLUDED.updated_by, updated_at = now()
    WHERE public.care_resident_cpr.org_id = v_org;
  INSERT INTO public.care_resident_cpr_log (resident_id, org_id, staff_id, action)
  VALUES (p_resident_id, v_org, auth.uid(), 'gemt');
END;
$$;

REVOKE ALL ON FUNCTION public.get_resident_cpr_masked(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.reveal_resident_cpr(uuid) FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.set_resident_cpr(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_resident_cpr_masked(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reveal_resident_cpr(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.set_resident_cpr(uuid, text) TO authenticated;
