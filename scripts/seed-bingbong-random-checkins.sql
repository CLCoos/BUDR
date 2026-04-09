-- ── BingBong demo: tilfældige check-ins til test (kør i Supabase SQL Editor) ──
--
-- Gør to ting (kan kommenteres ud separat):
--   A) Backfill: én pseudo-tilfældig check-in pr. beboer pr. dag for de sidste N dage
--      (springer dage over, hvor der allerede findes en række med samme København-dato).
--   B) I dag: SLETTER eksisterende check-ins i dag for BingBong-beboere og indsætter NYE
--      med random() — kør dette igen og igen under udvikling for nye tal/tekster.
--
-- Kræver at organisationen `bingbong-demo` og `care_residents` allerede findes
-- (kør først `scripts/seed-bingbong-demo.sql` hvis tom).
--
-- RLS: SQL Editor kører som postgres og omgår RLS ved INSERT/DELETE.

DO $$
DECLARE
  v_org uuid;
  v_today date;
  v_day date;
  i int;
  v_days_back int := 14; -- antal dage tilbage (uden i dag i del A; del B håndterer "i dag")
  r record;
  v_mood int;
  v_tl text;
  v_note text;
  v_created timestamptz;
  tls text[] := ARRAY['grøn', 'gul', 'rød'];
  notes text[] := ARRAY[
    'Rolig morgen — sov godt.',
    'Lidt urolig nat, men OK nu.',
    'Deltager i fælles morgenmad.',
    'Ønsker ro — lav stimuli i dag.',
    'God energi efter gåtur.',
    'Savner familie — ekstra støtte i dag.',
    'Medicin som planlagt.',
    'Kort samtale med personale — virker tryg.',
    'Vil gerne være alene først på dagen.',
    'Deltog i aktivitet om eftermiddagen.'
  ];
BEGIN
  SELECT id INTO v_org FROM public.organisations WHERE slug = 'bingbong-demo' LIMIT 1;
  IF v_org IS NULL THEN
    RAISE EXCEPTION 'Ingen organisation med slug bingbong-demo — kør seed-bingbong-demo.sql først.';
  END IF;

  v_today := (now() AT TIME ZONE 'Europe/Copenhagen')::date;

  -- ── A) Historik: sidste v_days_back kalenderdage (i går og bagud), tilfældige værdier ──
  FOR i IN 1..v_days_back LOOP
    v_day := v_today - i;
    FOR r IN SELECT user_id::text AS rid FROM public.care_residents WHERE org_id = v_org LOOP
      IF EXISTS (
        SELECT 1
        FROM public.park_daily_checkin p
        WHERE p.resident_id = r.rid
          AND (timezone('Europe/Copenhagen', p.created_at))::date = v_day
      ) THEN
        CONTINUE;
      END IF;

      v_mood := 1 + floor(random() * 10)::int; -- 1..10
      v_tl := tls[1 + floor(random() * 3)::int];
      v_note := notes[1 + floor(random() * array_length(notes, 1))::int];
      v_created :=
        ((v_day::timestamp + time '06:00:00') + (random() * interval '12 hours'))
        AT TIME ZONE 'Europe/Copenhagen';

      INSERT INTO public.park_daily_checkin (resident_id, mood_score, traffic_light, note, created_at)
      VALUES (r.rid, v_mood, v_tl, v_note, v_created);
    END LOOP;
  END LOOP;

  RAISE NOTICE 'Backfill: op til % dage pr. beboer (sprunget over hvor der allerede var data for den dato).', v_days_back;

  -- ── B) I dag: nye tilfældige check-ins (så du kan teste igen og igen) ──
  DELETE FROM public.park_daily_checkin p
  USING public.care_residents cr
  WHERE cr.org_id = v_org
    AND cr.user_id::text = p.resident_id
    AND (timezone('Europe/Copenhagen', p.created_at))::date = v_today;

  FOR r IN SELECT user_id::text AS rid FROM public.care_residents WHERE org_id = v_org LOOP
    v_mood := 1 + floor(random() * 10)::int;
    v_tl := tls[1 + floor(random() * 3)::int];
    v_note := notes[1 + floor(random() * array_length(notes, 1))::int];
    v_created :=
      ((v_today::timestamp + time '07:00:00') + (random() * interval '10 hours'))
      AT TIME ZONE 'Europe/Copenhagen';

    INSERT INTO public.park_daily_checkin (resident_id, mood_score, traffic_light, note, created_at)
    VALUES (r.rid, v_mood, v_tl, v_note, v_created);
  END LOOP;

  RAISE NOTICE 'I dag (%): slettet tidligere check-ins og indsat nye tilfældige for alle BingBong-beboere.', v_today;
END $$;
