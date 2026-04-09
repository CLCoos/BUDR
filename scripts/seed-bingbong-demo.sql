-- ── Bostedet BingBong: første gangs seed (kør manuelt i Supabase SQL Editor) ──
-- Opretter organisation (slug bingbong-demo) og 18 beboere med initialer pr. hus,
-- KUN hvis organisationen endnu ikke har beboere.
-- For at nulstille en eksisterende BingBong-database: kør `seed-bingbong-from-scratch.sql`.
--
-- Efter kørsel:
-- 1) Kopiér org-ID fra NOTICE eller:  SELECT id, name FROM public.organisations WHERE slug = 'bingbong-demo';
-- 2) I Authentication → Users: sæt "org_id" i User metadata til den UUID (på alle portal-brugere).
-- 3) I app: NEXT_PUBLIC_CARE_PORTAL_SIMULATED_DATA=false (.env.local / Netlify).
-- 4) Kør `supabase db push` så `journal_entries.show_in_diary` findes (migration 20260418120000).
-- 5) Genindlæs /resident-360-view og /resident-360-view/dagbog.

DO $$
DECLARE
  v_org uuid;
  v_count int;
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
    RAISE EXCEPTION 'Kunne ikke finde eller oprette organisation bingbong-demo';
  END IF;

  SELECT count(*) INTO v_count FROM public.care_residents WHERE org_id = v_org;

  IF v_count > 0 THEN
    RAISE NOTICE 'Organisation % (slug %) har allerede % beboere — ingen nye rækker. Org-id: %. For at erstatte alle beboere, kør scripts/seed-bingbong-from-scratch.sql',
      (SELECT name FROM public.organisations WHERE id = v_org),
      'bingbong-demo',
      v_count,
      v_org;
  ELSE
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

    RAISE NOTICE 'Oprettet 18 beboere under org-id: % (slug bingbong-demo)', v_org;
  END IF;

  INSERT INTO public.park_daily_checkin (resident_id, mood_score, traffic_light, note, created_at)
  SELECT
    cr.user_id::text,
    case_n.mood,
    case_n.tl,
    case_n.msg,
    now()
  FROM public.care_residents cr
  CROSS JOIN LATERAL (
    SELECT
      (array[7, 5, 8, 6])[1 + (abs(hashtext(cr.user_id::text || current_date::text)) % 4)] AS mood,
      (array['grøn', 'gul', 'grøn', 'grøn'])[1 + (abs(hashtext(cr.user_id::text)) % 4)] AS tl,
      (array[
        'Rolig morgen — sov godt.',
        'Lidt urolig nat, men OK nu.',
        'Deltager i fælles morgenmad.',
        'Ønsker ro — lav stimuli i dag.'
      ])[1 + (abs(hashtext(cr.display_name)) % 4)] AS msg
  ) AS case_n
  WHERE cr.org_id = v_org
    AND NOT EXISTS (
      SELECT 1
      FROM public.park_daily_checkin p
      WHERE p.resident_id = cr.user_id::text
        AND (timezone('Europe/Copenhagen', p.created_at))::date =
            (timezone('Europe/Copenhagen', now()))::date
    );

  RAISE NOTICE 'Færdig. Husk org_id på staff-brugere: %', v_org;
END $$;
