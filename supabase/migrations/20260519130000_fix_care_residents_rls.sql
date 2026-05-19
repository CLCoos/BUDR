-- HOTFIX: care_residents.open_select var "USING (true)" - alle authenticated kunne se alle borgere
-- Erstattes med org-scoped policies

BEGIN;

-- Drop den lækkende policy
DROP POLICY IF EXISTS open_select ON public.care_residents;

-- Staff kan se borgere i deres egen org
CREATE POLICY care_residents_staff_select_own_org
  ON public.care_residents
  FOR SELECT
  TO authenticated
  USING (
    org_id = (SELECT cs.org_id FROM public.care_staff cs WHERE cs.id = auth.uid())
  );

-- Resident kan se sin egen profil (matcher mønster fra lys_conversations m.fl.)
CREATE POLICY care_residents_resident_select_self
  ON public.care_residents
  FOR SELECT
  TO authenticated
  USING (
    user_id::text = ((current_setting('request.jwt.claims', true))::json ->> 'sub')
  );

-- Staff kan oprette/opdatere borgere i deres egen org
CREATE POLICY care_residents_staff_insert_own_org
  ON public.care_residents
  FOR INSERT
  TO authenticated
  WITH CHECK (
    org_id = (SELECT cs.org_id FROM public.care_staff cs WHERE cs.id = auth.uid())
  );

CREATE POLICY care_residents_staff_update_own_org
  ON public.care_residents
  FOR UPDATE
  TO authenticated
  USING (
    org_id = (SELECT cs.org_id FROM public.care_staff cs WHERE cs.id = auth.uid())
  )
  WITH CHECK (
    org_id = (SELECT cs.org_id FROM public.care_staff cs WHERE cs.id = auth.uid())
  );

-- Resident kan opdatere sin egen profil (avatar, color_theme, voice-præferencer, mm.)
CREATE POLICY care_residents_resident_update_self
  ON public.care_residents
  FOR UPDATE
  TO authenticated
  USING (
    user_id::text = ((current_setting('request.jwt.claims', true))::json ->> 'sub')
  )
  WITH CHECK (
    user_id::text = ((current_setting('request.jwt.claims', true))::json ->> 'sub')
  );

COMMIT;
