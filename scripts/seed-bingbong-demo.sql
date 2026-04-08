-- ── Bostedet BingBong: realistisk testdata (kør manuelt i Supabase SQL Editor) ──
-- Opretter organisation (slug bingbong-demo), 4 beboere og dagens humør-check-in
-- (Europa/København-dato), KUN hvis organisationen endnu ikke har beboere.
--
-- Efter kørsel:
-- 1) Kopiér org-ID fra NOTICE eller:  SELECT id, name FROM public.organisations WHERE slug = 'bingbong-demo';
-- 2) I Authentication → Users: sæt "org_id" i User metadata til den UUID (på alle portal-brugere).
-- 3) I app: NEXT_PUBLIC_CARE_PORTAL_SIMULATED_DATA=false (på Netlify / .env.local), så dashboard og
--    beboerliste læser denne database — ikke demo-widgets.
-- 4) Genindlæs /care-portal-dashboard og /resident-360-view.

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
    RAISE NOTICE 'Organisation % (slug %) har allerede % beboere — ingen nye rækker. Org-id: %',
      (SELECT name FROM public.organisations WHERE id = v_org),
      'bingbong-demo',
      v_count,
      v_org;
  ELSE
    INSERT INTO public.care_residents (user_id, display_name, onboarding_data, org_id)
    VALUES
      (
        gen_random_uuid(),
        'Finn Bingen',
        jsonb_build_object(
          'avatar_initials', 'FB',
          'room', '101',
          'move_in_date', '2024-08-15',
          'primary_contact', 'Lone Bingen',
          'primary_contact_phone', '+45 12 34 56 78',
          'primary_contact_relation', 'Søster'
        ),
        v_org
      ),
      (
        gen_random_uuid(),
        'Maja Bing',
        jsonb_build_object(
          'avatar_initials', 'MB',
          'room', '103',
          'move_in_date', '2023-11-02',
          'primary_contact', 'Kommunal sagsbehandler',
          'primary_contact_phone', '+45 98 76 54 32',
          'primary_contact_relation', 'Myndighed'
        ),
        v_org
      ),
      (
        gen_random_uuid(),
        'Thomas Bong',
        jsonb_build_object(
          'avatar_initials', 'TB',
          'room', '108',
          'move_in_date', '2025-01-20',
          'primary_contact', 'Kirsten Bong',
          'primary_contact_phone', '+45 22 11 44 55',
          'primary_contact_relation', 'Mor'
        ),
        v_org
      ),
      (
        gen_random_uuid(),
        'Sofie Nordbing',
        jsonb_build_object(
          'avatar_initials', 'SN',
          'room', '110',
          'move_in_date', '2022-05-10',
          'primary_contact', 'Pårørendekoordinator',
          'primary_contact_phone', '+45 33 44 55 66',
          'primary_contact_relation', 'Koordinator'
        ),
        v_org
      );

    RAISE NOTICE 'Oprettet 4 beboere under org-id: % (slug bingbong-demo)', v_org;
  END IF;

  -- Dagens check-ins (kun hvis der ikke allerede findes en række i dag efter dansk dato)
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
