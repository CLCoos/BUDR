-- ── Fjern beboere i BingBong-org som IKKE er de 18 seed-initialer ─────────────
-- Brug hvis listen i portalen viser "gamle" navne (fx rigtige navne) ved siden af
-- de nye initialer — uden at slette de 18 eller køre fuld from-scratch.
-- Kør i Supabase → SQL Editor → Run.
--
-- De 18 tilladte display_name (samme som seed):
-- NOP, MP, RN, ESS, TKH, HT, HAF, CJT, LBC, LPK, MHL, BRT, OPT, TS, CLN, AT, SK, LS

DO $$
DECLARE
  v_org uuid;
BEGIN
  SELECT id INTO v_org FROM public.organisations WHERE slug = 'bingbong-demo' LIMIT 1;
  IF v_org IS NULL THEN
    RAISE EXCEPTION 'Ingen organisation med slug bingbong-demo';
  END IF;

  DELETE FROM public.journal_entries
    WHERE resident_id::text IN (
      SELECT user_id::text FROM public.care_residents
      WHERE org_id = v_org
        AND trim(display_name) NOT IN (
          'NOP', 'MP', 'RN', 'ESS', 'TKH', 'HT', 'HAF', 'CJT', 'LBC',
          'LPK', 'MHL', 'BRT', 'OPT', 'TS', 'CLN', 'AT', 'SK', 'LS'
        )
    );
  DELETE FROM public.park_daily_checkin
    WHERE resident_id::text IN (
      SELECT user_id::text FROM public.care_residents
      WHERE org_id = v_org
        AND trim(display_name) NOT IN (
          'NOP', 'MP', 'RN', 'ESS', 'TKH', 'HT', 'HAF', 'CJT', 'LBC',
          'LPK', 'MHL', 'BRT', 'OPT', 'TS', 'CLN', 'AT', 'SK', 'LS'
        )
    );
  DELETE FROM public.crisis_plans
    WHERE resident_id::text IN (
      SELECT user_id::text FROM public.care_residents
      WHERE org_id = v_org
        AND trim(display_name) NOT IN (
          'NOP', 'MP', 'RN', 'ESS', 'TKH', 'HT', 'HAF', 'CJT', 'LBC',
          'LPK', 'MHL', 'BRT', 'OPT', 'TS', 'CLN', 'AT', 'SK', 'LS'
        )
    );
  DELETE FROM public.care_concern_notes
    WHERE resident_id::text IN (
      SELECT user_id::text FROM public.care_residents
      WHERE org_id = v_org
        AND trim(display_name) NOT IN (
          'NOP', 'MP', 'RN', 'ESS', 'TKH', 'HT', 'HAF', 'CJT', 'LBC',
          'LPK', 'MHL', 'BRT', 'OPT', 'TS', 'CLN', 'AT', 'SK', 'LS'
        )
    );
  DELETE FROM public.plan_proposals
    WHERE resident_id::text IN (
      SELECT user_id::text FROM public.care_residents
      WHERE org_id = v_org
        AND trim(display_name) NOT IN (
          'NOP', 'MP', 'RN', 'ESS', 'TKH', 'HT', 'HAF', 'CJT', 'LBC',
          'LPK', 'MHL', 'BRT', 'OPT', 'TS', 'CLN', 'AT', 'SK', 'LS'
        )
    );
  DELETE FROM public.daily_plans
    WHERE resident_id::text IN (
      SELECT user_id::text FROM public.care_residents
      WHERE org_id = v_org
        AND trim(display_name) NOT IN (
          'NOP', 'MP', 'RN', 'ESS', 'TKH', 'HT', 'HAF', 'CJT', 'LBC',
          'LPK', 'MHL', 'BRT', 'OPT', 'TS', 'CLN', 'AT', 'SK', 'LS'
        )
    );
  DELETE FROM public.resident_plan_items
    WHERE resident_id::text IN (
      SELECT user_id::text FROM public.care_residents
      WHERE org_id = v_org
        AND trim(display_name) NOT IN (
          'NOP', 'MP', 'RN', 'ESS', 'TKH', 'HT', 'HAF', 'CJT', 'LBC',
          'LPK', 'MHL', 'BRT', 'OPT', 'TS', 'CLN', 'AT', 'SK', 'LS'
        )
    );
  DELETE FROM public.resident_badges
    WHERE resident_id::text IN (
      SELECT user_id::text FROM public.care_residents
      WHERE org_id = v_org
        AND trim(display_name) NOT IN (
          'NOP', 'MP', 'RN', 'ESS', 'TKH', 'HT', 'HAF', 'CJT', 'LBC',
          'LPK', 'MHL', 'BRT', 'OPT', 'TS', 'CLN', 'AT', 'SK', 'LS'
        )
    );
  DELETE FROM public.resident_plan_completions
    WHERE resident_id::text IN (
      SELECT user_id::text FROM public.care_residents
      WHERE org_id = v_org
        AND trim(display_name) NOT IN (
          'NOP', 'MP', 'RN', 'ESS', 'TKH', 'HT', 'HAF', 'CJT', 'LBC',
          'LPK', 'MHL', 'BRT', 'OPT', 'TS', 'CLN', 'AT', 'SK', 'LS'
        )
    );
  DELETE FROM public.resident_xp
    WHERE resident_id::text IN (
      SELECT user_id::text FROM public.care_residents
      WHERE org_id = v_org
        AND trim(display_name) NOT IN (
          'NOP', 'MP', 'RN', 'ESS', 'TKH', 'HT', 'HAF', 'CJT', 'LBC',
          'LPK', 'MHL', 'BRT', 'OPT', 'TS', 'CLN', 'AT', 'SK', 'LS'
        )
    );
  DELETE FROM public.garden_plots
    WHERE resident_id::text IN (
      SELECT user_id::text FROM public.care_residents
      WHERE org_id = v_org
        AND trim(display_name) NOT IN (
          'NOP', 'MP', 'RN', 'ESS', 'TKH', 'HT', 'HAF', 'CJT', 'LBC',
          'LPK', 'MHL', 'BRT', 'OPT', 'TS', 'CLN', 'AT', 'SK', 'LS'
        )
    );
  DELETE FROM public.lys_conversations
    WHERE resident_id::text IN (
      SELECT user_id::text FROM public.care_residents
      WHERE org_id = v_org
        AND trim(display_name) NOT IN (
          'NOP', 'MP', 'RN', 'ESS', 'TKH', 'HT', 'HAF', 'CJT', 'LBC',
          'LPK', 'MHL', 'BRT', 'OPT', 'TS', 'CLN', 'AT', 'SK', 'LS'
        )
    );

  DELETE FROM public.care_residents
    WHERE org_id = v_org
      AND trim(display_name) NOT IN (
        'NOP', 'MP', 'RN', 'ESS', 'TKH', 'HT', 'HAF', 'CJT', 'LBC',
        'LPK', 'MHL', 'BRT', 'OPT', 'TS', 'CLN', 'AT', 'SK', 'LS'
      );

  RAISE NOTICE 'Ekstra BingBong-beboere (uden for de 18 initialer) er fjernet.';
END $$;
