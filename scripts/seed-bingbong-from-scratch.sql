-- ── BingBong: nulstil bosted og opret 18 beboere (initialer pr. hus) ───────────
-- Kør i Supabase SQL Editor (service role / postgres). Ødelægger eksisterende
-- BingBong-beboere og tilknyttede rækker for org slug `bingbong-demo`.
--
-- Efter kørsel: sæt staff `org_id` i Auth metadata til org-UUID (som i demo-seed).
-- Ingen automatiske check-ins her — brug `scripts/seed-bingbong-random-checkins.sql` ved behov.

DO $$
DECLARE
  v_org uuid;
BEGIN
  INSERT INTO public.organisations (name, slug, invite_code, primary_color)
  VALUES (
    'Bostedet BingBong',
    'bingbong-demo',
    'BINGBONG-DEMO-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 10)),
    '#1D9E75'
  )
  ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name;

  SELECT id INTO v_org FROM public.organisations WHERE slug = 'bingbong-demo' LIMIT 1;
  IF v_org IS NULL THEN
    RAISE EXCEPTION 'Kunne ikke finde organisation bingbong-demo';
  END IF;

  IF EXISTS (SELECT 1 FROM public.care_residents WHERE org_id = v_org) THEN
    -- resident_id er uuid nogle steder og text andre; ::text på begge sider undgår "operator does not exist: uuid = text"
    DELETE FROM public.journal_entries
      WHERE resident_id::text IN (SELECT user_id::text FROM public.care_residents WHERE org_id = v_org);
    DELETE FROM public.park_daily_checkin
      WHERE resident_id::text IN (SELECT user_id::text FROM public.care_residents WHERE org_id = v_org);
    DELETE FROM public.crisis_plans
      WHERE resident_id::text IN (SELECT user_id::text FROM public.care_residents WHERE org_id = v_org);
    DELETE FROM public.care_concern_notes
      WHERE resident_id::text IN (SELECT user_id::text FROM public.care_residents WHERE org_id = v_org);
    DELETE FROM public.plan_proposals
      WHERE resident_id::text IN (SELECT user_id::text FROM public.care_residents WHERE org_id = v_org);
    DELETE FROM public.daily_plans
      WHERE resident_id::text IN (SELECT user_id::text FROM public.care_residents WHERE org_id = v_org);
    DELETE FROM public.resident_plan_items
      WHERE resident_id::text IN (SELECT user_id::text FROM public.care_residents WHERE org_id = v_org);
    DELETE FROM public.resident_badges
      WHERE resident_id::text IN (SELECT user_id::text FROM public.care_residents WHERE org_id = v_org);
    DELETE FROM public.resident_plan_completions
      WHERE resident_id::text IN (SELECT user_id::text FROM public.care_residents WHERE org_id = v_org);
    DELETE FROM public.resident_xp
      WHERE resident_id::text IN (SELECT user_id::text FROM public.care_residents WHERE org_id = v_org);
    DELETE FROM public.garden_plots
      WHERE resident_id::text IN (SELECT user_id::text FROM public.care_residents WHERE org_id = v_org);
    DELETE FROM public.lys_conversations
      WHERE resident_id::text IN (SELECT user_id::text FROM public.care_residents WHERE org_id = v_org);
    DELETE FROM public.care_residents WHERE org_id = v_org;
    RAISE NOTICE 'Slettet tidligere BingBong-beboere og tilknyttede data.';
  END IF;

  INSERT INTO public.care_residents (user_id, display_name, onboarding_data, org_id)
  VALUES
    (gen_random_uuid(), 'NOP', jsonb_build_object('avatar_initials', 'NOP', 'house', 'Hus A', 'room', 'A-01'), v_org),
    (gen_random_uuid(), 'MP', jsonb_build_object('avatar_initials', 'MP', 'house', 'Hus A', 'room', 'A-02'), v_org),
    (gen_random_uuid(), 'RN', jsonb_build_object('avatar_initials', 'RN', 'house', 'Hus A', 'room', 'A-03'), v_org),
    (gen_random_uuid(), 'ESS', jsonb_build_object('avatar_initials', 'ESS', 'house', 'Hus B', 'room', 'B-01'), v_org),
    (gen_random_uuid(), 'TKH', jsonb_build_object('avatar_initials', 'TKH', 'house', 'Hus B', 'room', 'B-02'), v_org),
    (gen_random_uuid(), 'HT', jsonb_build_object('avatar_initials', 'HT', 'house', 'Hus B', 'room', 'B-03'), v_org),
    (gen_random_uuid(), 'HAF', jsonb_build_object('avatar_initials', 'HAF', 'house', 'Hus B', 'room', 'B-04'), v_org),
    (gen_random_uuid(), 'CJT', jsonb_build_object('avatar_initials', 'CJT', 'house', 'Hus B', 'room', 'B-05'), v_org),
    (gen_random_uuid(), 'LBC', jsonb_build_object('avatar_initials', 'LBC', 'house', 'Hus B', 'room', 'B-06'), v_org),
    (gen_random_uuid(), 'LPK', jsonb_build_object('avatar_initials', 'LPK', 'house', 'Hus C', 'room', 'C-01'), v_org),
    (gen_random_uuid(), 'MHL', jsonb_build_object('avatar_initials', 'MHL', 'house', 'Hus C', 'room', 'C-02'), v_org),
    (gen_random_uuid(), 'BRT', jsonb_build_object('avatar_initials', 'BRT', 'house', 'Hus C', 'room', 'C-03'), v_org),
    (gen_random_uuid(), 'OPT', jsonb_build_object('avatar_initials', 'OPT', 'house', 'Hus C', 'room', 'C-04'), v_org),
    (gen_random_uuid(), 'TS', jsonb_build_object('avatar_initials', 'TS', 'house', 'Hus D', 'room', 'D-01'), v_org),
    (gen_random_uuid(), 'CLN', jsonb_build_object('avatar_initials', 'CLN', 'house', 'Hus D', 'room', 'D-02'), v_org),
    (gen_random_uuid(), 'AT', jsonb_build_object('avatar_initials', 'AT', 'house', 'Hus D', 'room', 'D-03'), v_org),
    (gen_random_uuid(), 'SK', jsonb_build_object('avatar_initials', 'SK', 'house', 'Hus D', 'room', 'D-04'), v_org),
    (gen_random_uuid(), 'LS', jsonb_build_object('avatar_initials', 'LS', 'house', 'TLS', 'room', 'TLS-01'), v_org);

  RAISE NOTICE 'BingBong: 18 beboere oprettet. Org-id: %', v_org;
END $$;
