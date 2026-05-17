-- Manuel én-gangs data-seed: BUDR Demo Botilbud + 3 demo-borgere (14 dages recovery-historik)
-- Kør IKKE som migration (supabase db push). Kør manuelt mod prod når godkendt, fx Supabase SQL Editor.
-- Forudsætning: migrations kørt (bl.a. 20260516000000_lys_recovery_schema, 20260516160000_lys_checkin_checkin_type).
-- Idempotent: faste UUID'er + ON CONFLICT DO NOTHING

BEGIN;

-- ─── 1. Demo-organisation ───────────────────────────────────────────────────
INSERT INTO public.organisations (
  id, name, slug, invite_code, primary_color, resident_name_display_mode
)
VALUES (
  '11111111-1111-1111-1111-111111111111',
  'BUDR Demo Botilbud',
  'budr-demo',
  'DEMO-LIVE-2026',
  '#1D9E75',
  'full_name'
)
ON CONFLICT (id) DO NOTHING;

-- ─── 2. Demo-borgere ──────────────────────────────────────────────────────────
INSERT INTO public.care_residents (
  user_id, org_id, display_name, first_name, last_name, nickname, preferred_language, color_theme, simple_mode
)
VALUES
  (
    '21111111-1111-1111-1111-111111111111',
    '11111111-1111-1111-1111-111111111111',
    'Sara Kristensen',
    'Sara',
    'Kristensen',
    'Sara K.',
    'da',
    'purple',
    false
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    '11111111-1111-1111-1111-111111111111',
    'Mikkel Thomsen',
    'Mikkel',
    'Thomsen',
    'Mikkel T.',
    'da',
    'purple',
    false
  ),
  (
    '23333333-3333-3333-3333-333333333333',
    '11111111-1111-1111-1111-111111111111',
    'Anders Pedersen',
    'Anders',
    'Pedersen',
    'Anders P.',
    'da',
    'purple',
    false
  )
ON CONFLICT (user_id) DO NOTHING;

-- ─── 3. lys_checkin (14 dage × 3 borgere) ─────────────────────────────────────
INSERT INTO public.lys_checkin (
  id, resident_id, org_id, checkin_type, mood_score, mood_label, traffic_light, free_text,
  connectedness_score, hope_score, identity_score, meaning_score, empowerment_score, created_at
)
VALUES
  -- Sara Kristensen — stigende, overvejende grøn
  ('31111111-1111-1111-1111-000000000001', '21111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'daily', 5, 'OK', 'gul', 'Træt efter weekend, men kom igennem.', 5, 5, 5, 6, 5, now() - interval '13 days 8 hours 15 minutes'),
  ('31111111-1111-1111-1111-000000000002', '21111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'daily', 5, 'OK', 'grøn', 'Rolig morgen. Kaffe på terrassen.', 5, 5, 6, 6, 5, now() - interval '12 days 9 hours 2 minutes'),
  ('31111111-1111-1111-1111-000000000003', '21111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'daily', 6, 'Godt', 'grøn', 'Hjalp Line med opvask. Det føltes fint.', 6, 6, 6, 6, 6, now() - interval '11 days 8 hours 40 minutes'),
  ('31111111-1111-1111-1111-000000000004', '21111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'daily', 6, 'Godt', 'grøn', NULL, 6, 6, 6, 7, 6, now() - interval '10 days 10 hours 11 minutes'),
  ('31111111-1111-1111-1111-000000000005', '21111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'daily', 6, 'Godt', 'gul', 'Lidt urolig om aftenen. Sov sent.', 6, 5, 6, 6, 6, now() - interval '9 days 19 hours 30 minutes'),
  ('31111111-1111-1111-1111-000000000006', '21111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'daily', 7, 'Godt', 'grøn', 'Gik tur med hunden hos min søster.', 7, 7, 7, 7, 6, now() - interval '8 days 14 hours 20 minutes'),
  ('31111111-1111-1111-1111-000000000007', '21111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'daily', 7, 'Godt', 'grøn', 'Vågnede tidligt. Drak kaffe ved vinduet, regnede. Det var fint.', 7, 7, 7, 7, 7, now() - interval '7 days 7 hours 55 minutes'),
  ('31111111-1111-1111-1111-000000000008', '21111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'daily', 7, 'Godt', 'grøn', NULL, 7, 7, 8, 7, 7, now() - interval '6 days 9 hours 18 minutes'),
  ('31111111-1111-1111-1111-000000000009', '21111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'daily', 7, 'Godt', 'grøn', 'Lavede mad sammen med naboerne.', 8, 7, 8, 8, 7, now() - interval '5 days 17 hours 5 minutes'),
  ('31111111-1111-1111-1111-000000000010', '21111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'daily', 8, 'Godt', 'gul', 'Tandlæge i morgen. Nervøs for det.', 7, 6, 8, 8, 7, now() - interval '4 days 20 hours 12 minutes'),
  ('31111111-1111-1111-1111-000000000011', '21111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'daily', 8, 'Godt', 'grøn', 'Tandlægen gik faktisk okay.', 8, 8, 8, 8, 8, now() - interval '3 days 11 hours 40 minutes'),
  ('31111111-1111-1111-1111-000000000012', '21111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'daily', 8, 'Godt', 'grøn', 'Tror måske jeg kan ringe til min søster i weekenden.', 8, 8, 8, 8, 8, now() - interval '2 days 16 hours 33 minutes'),
  ('31111111-1111-1111-1111-000000000013', '21111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'daily', 8, 'Godt', 'grøn', NULL, 8, 8, 8, 8, 8, now() - interval '1 day 8 hours 22 minutes'),
  ('31111111-1111-1111-1111-000000000014', '21111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'daily', 8, 'Godt', 'grøn', 'Rolig søndag. Læste og lyttede til musik.', 8, 8, 8, 8, 8, now() - interval '0 days 10 hours 5 minutes'),

  -- Mikkel Thomsen — ustabil, lave scores
  ('32222222-2222-2222-2222-000000000001', '22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'daily', 4, 'Dårligt', 'rød', 'Sov dårligt. Tankerne kørte.', 3, 3, 4, 4, 3, now() - interval '13 days 7 hours 10 minutes'),
  ('32222222-2222-2222-2222-000000000002', '22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'daily', 4, 'Dårligt', 'gul', NULL, 3, 3, 3, 4, 3, now() - interval '12 days 8 hours 45 minutes'),
  ('32222222-2222-2222-2222-000000000003', '22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'daily', 5, 'OK', 'gul', 'Kom ikke ud af sengen før kl. 11.', 4, 3, 4, 4, 3, now() - interval '11 days 11 hours 20 minutes'),
  ('32222222-2222-2222-2222-000000000004', '22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'daily', 4, 'Dårligt', 'rød', 'Skændtes med en i fællesrummet.', 3, 2, 3, 4, 3, now() - interval '10 days 15 hours 50 minutes'),
  ('32222222-2222-2222-2222-000000000005', '22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'daily', 5, 'OK', 'gul', 'Lidt bedre efter samtale med Peter.', 4, 4, 4, 4, 4, now() - interval '9 days 9 hours 30 minutes'),
  ('32222222-2222-2222-2222-000000000006', '22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'daily', 6, 'OK', 'grøn', 'Hjalp med at dække bord til fødselsdag.', 5, 4, 5, 5, 4, now() - interval '8 days 12 hours 15 minutes'),
  ('32222222-2222-2222-2222-000000000007', '22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'daily', 5, 'OK', 'gul', NULL, 4, 3, 4, 5, 4, now() - interval '7 days 8 hours 0 minutes'),
  ('32222222-2222-2222-2222-000000000008', '22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'daily', 4, 'Dårligt', 'rød', 'Mistede pungen. Stress.', 3, 2, 3, 4, 3, now() - interval '6 days 18 hours 40 minutes'),
  ('32222222-2222-2222-2222-000000000009', '22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'daily', 5, 'OK', 'gul', 'Fandt den igen. Lettet.', 4, 4, 4, 4, 4, now() - interval '5 days 10 hours 25 minutes'),
  ('32222222-2222-2222-2222-000000000010', '22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'daily', 5, 'OK', 'gul', NULL, 4, 3, 5, 5, 4, now() - interval '4 days 9 hours 55 minutes'),
  ('32222222-2222-2222-2222-000000000011', '22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'daily', 6, 'OK', 'grøn', 'Var ude at gå 20 min.', 5, 4, 5, 5, 5, now() - interval '3 days 14 hours 10 minutes'),
  ('32222222-2222-2222-2222-000000000012', '22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'daily', 5, 'OK', 'gul', 'Ensom om aftenen.', 4, 3, 4, 5, 4, now() - interval '2 days 21 hours 5 minutes'),
  ('32222222-2222-2222-2222-000000000013', '22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'daily', 5, 'OK', 'rød', 'Dårlig drøm.', 3, 3, 4, 4, 3, now() - interval '1 day 7 hours 30 minutes'),
  ('32222222-2222-2222-2222-000000000014', '22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'daily', 6, 'OK', 'grøn', 'Drikke et glas vand før kaffen hjalp.', 5, 4, 5, 5, 5, now() - interval '0 days 8 hours 18 minutes'),

  -- Anders Pedersen — grøn men flad; meaning/empowerment høje, connectedness lav
  ('33333333-3333-3333-3333-000000000001', '23333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'daily', 6, 'OK', 'grøn', 'Stille dag. Læste avisen.', 4, 6, 6, 8, 8, now() - interval '13 days 9 hours 0 minutes'),
  ('33333333-3333-3333-3333-000000000002', '23333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'daily', 6, 'OK', 'grøn', NULL, 4, 6, 6, 8, 8, now() - interval '12 days 10 hours 30 minutes'),
  ('33333333-3333-3333-3333-000000000003', '23333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'daily', 7, 'Godt', 'grøn', 'Malede lidt om eftermiddagen.', 4, 7, 7, 8, 8, now() - interval '11 days 15 hours 20 minutes'),
  ('33333333-3333-3333-3333-000000000004', '23333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'daily', 6, 'OK', 'grøn', 'Savner at nogen spørger ind.', 3, 6, 6, 8, 7, now() - interval '10 days 19 hours 0 minutes'),
  ('33333333-3333-3333-3333-000000000005', '23333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'daily', 7, 'Godt', 'grøn', NULL, 4, 7, 7, 9, 8, now() - interval '9 days 8 hours 45 minutes'),
  ('33333333-3333-3333-3333-000000000006', '23333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'daily', 7, 'Godt', 'grøn', 'Gik i værkstedet. Fik samlet en hylde.', 4, 7, 7, 9, 9, now() - interval '8 days 13 hours 40 minutes'),
  ('33333333-3333-3333-3333-000000000007', '23333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'daily', 6, 'OK', 'grøn', 'FaceTime med far — kort, men fint.', 5, 6, 7, 8, 8, now() - interval '7 days 16 hours 15 minutes'),
  ('33333333-3333-3333-3333-000000000008', '23333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'daily', 7, 'Godt', 'grøn', NULL, 4, 7, 7, 9, 9, now() - interval '6 days 9 hours 10 minutes'),
  ('33333333-3333-3333-3333-000000000009', '23333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'daily', 7, 'Godt', 'grøn', 'Hjalp en ny med at finde køkkenet.', 5, 7, 7, 9, 9, now() - interval '5 days 11 hours 55 minutes'),
  ('33333333-3333-3333-3333-000000000010', '23333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'daily', 6, 'OK', 'grøn', 'Ensomheden er der stadig.', 3, 6, 6, 8, 8, now() - interval '4 days 20 hours 30 minutes'),
  ('33333333-3333-3333-3333-000000000011', '23333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'daily', 7, 'Godt', 'grøn', 'Vandrede en tur i skoven.', 4, 7, 7, 9, 9, now() - interval '3 days 14 hours 0 minutes'),
  ('33333333-3333-3333-3333-000000000012', '23333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'daily', 7, 'Godt', 'grøn', NULL, 4, 7, 7, 9, 9, now() - interval '2 days 10 hours 20 minutes'),
  ('33333333-3333-3333-3333-000000000013', '23333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'daily', 6, 'OK', 'grøn', 'Rolig aften med radio.', 4, 6, 7, 8, 8, now() - interval '1 day 21 hours'),
  ('33333333-3333-3333-3333-000000000014', '23333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'daily', 7, 'Godt', 'grøn', 'Planlægger at male igen i morgen.', 4, 7, 7, 9, 9, now() - interval '0 days 9 hours 35 minutes')
ON CONFLICT (id) DO NOTHING;

-- ─── 4. lys_recovery_profile ──────────────────────────────────────────────────
INSERT INTO public.lys_recovery_profile (
  id, resident_id, org_id,
  connectedness_people, connectedness_support, connectedness_belonging,
  hope_dreams, hope_small_wishes,
  identity_strengths, identity_proud_of, identity_likes, identity_body,
  meaning_values, meaning_purpose,
  empowerment_choices, empowerment_capabilities,
  version, created_at, updated_at
)
VALUES
  (
    '41111111-1111-1111-1111-111111111111',
    '21111111-1111-1111-1111-111111111111',
    '11111111-1111-1111-1111-111111111111',
    'Min søster Line, naboerne i opgangen, og Sofie fra aktivitetsteamet.',
    'Peter (pædagog), min læge, og telefonveninden Mette.',
    'Køkkenet om morgenen, haven bag huset, og biblioteket i byen.',
    'At bo mere selvstændigt på sigt. Måske en lille lejlighed med altan.',
    'Tandlægetid i næste uge. En tur i skoven med Line.',
    'Jeg er god til at lytte. Jeg kan lave mad der varmer.',
    'At jeg holdt ud da det var svært sidste vinter.',
    'Kaffe, hunde, og gamle film.',
    'Gåture. Vand på kroppen om morgenen.',
    'Ærlighed. Ro. At man ikke skal præstere.',
    'At hjælpe andre i huset føles meningsfuldt.',
    'Jeg valgte at sige fra om støj om natten.',
    'Jeg kan selv lave mad, ringe til familie, og tage bussen.',
    1, now() - interval '60 days', now() - interval '2 days'
  ),
  (
    '42222222-2222-2222-2222-222222222222',
    '22222222-2222-2222-2222-222222222222',
    '11111111-1111-1111-1111-111111111111',
    'Min mor ringer nogle gange. En kammerat fra tidligere.',
    'Peter og nattevagten.',
    NULL,
    NULL,
    'At finde en fast rutine.',
    'Jeg kan være sjov når jeg er tryg.',
    'At jeg kom til fødselsdagen selvom jeg var nervøs.',
    'Musik. Gaming.',
    NULL,
    NULL,
    NULL,
    'Jeg sagde ja til at gå en kort tur.',
    'Jeg kan lave te og finde ting i køleskabet.',
    1, now() - interval '30 days', now() - interval '5 days'
  ),
  (
    '43333333-3333-3333-3333-333333333333',
    '23333333-3333-3333-3333-333333333333',
    '11111111-1111-1111-1111-111111111111',
    'Min far (sjældent). En gammel ven jeg skriver til.',
    'Personalet her kender mig. Det betyder noget.',
    'Mit værksted i kælderen. Skoven udenfor.',
    'At male flere billeder. Måske udstille et enkelt.',
    'At få besøg af min niece til sommer.',
    'Tålmodighed. Hænder der kan bygge små ting.',
    'At jeg har boet her i fire år og stadig holder ved.',
    'Træ, bøger, stilhed.',
    'At gå uden at skynde mig.',
    'Frihed. At ting tager den tid de tager.',
    'At male giver mig en grund til at stå op.',
    'Jeg ved hvornår jeg har brug for ro. Jeg kan sige nej.',
    'Jeg kan passe mit eget værelse, lave mad, og gå til lægen alene.',
    1, now() - interval '200 days', now() - interval '1 day'
  )
ON CONFLICT (id) DO NOTHING;

-- ─── 5. lys_reflection ────────────────────────────────────────────────────────
INSERT INTO public.lys_reflection (
  id, resident_id, org_id, situation, what_was_hard, what_gave_strength,
  ai_suggested_next_step, resident_chosen_step, feeling, feeling_score, primary_chime_domain, created_at
)
VALUES
  -- Sara (5)
  ('51111111-1111-1111-1111-000000000001', '21111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111',
   'I går da Sofie kom forbi og vi drak te i stuen.', 'Jeg blev lidt genert og vidste ikke hvad jeg skulle sige først.',
   'Hun spurgte om min uge uden at skynde mig.', 'Smile til Sofie næste gang hun kommer', 'Smile og sige hej til Sofie', 'Lettet', 7, 'connectedness', now() - interval '12 days'),
  ('51111111-1111-1111-1111-000000000002', '21111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111',
   'Da jeg så min søster på FaceTime og hun viste mig hunden.', NULL,
   'At hun husker små ting om mig.', 'Ringe til Line i weekenden', 'Ringe til Line lørdag formiddag', 'Varm', 8, 'hope', now() - interval '9 days'),
  ('51111111-1111-1111-1111-000000000003', '21111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111',
   'Tandlægebesøget jeg havde udskudt.', 'Panik i venteværelset de første ti minutter.',
   'Peter sad i nærheden. Jeg fik lov til at holde pause.', 'Drikke vand før jeg går ud af døren', 'Drikke et glas vand før jeg går ud', 'Stolt', 7, 'empowerment', now() - interval '4 days'),
  ('51111111-1111-1111-1111-000000000004', '21111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111',
   'Da jeg lavede supper til naboerne.', 'Jeg var bange for at det smagte forkert.',
   'De spiste det hele og grinede.', 'Lave en ret jeg kan lide selv', 'Lave pasta i morgen', 'Glad', 8, 'identity', now() - interval '6 days'),
  ('51111111-1111-1111-1111-000000000005', '21111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111',
   'En stille morgen med regn på ruden.', NULL,
   'At jeg ikke behøvede at gøre noget som helst.', 'Sidde fem minutter ved vinduet', 'Sidde ved vinduet med kaffe', 'Rolig', 8, 'meaning', now() - interval '2 days'),

  -- Mikkel (3)
  ('52222222-2222-2222-2222-000000000001', '22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111',
   'Da jeg tabte pungen og troede alt var væk.', 'Skam over at være uopmærksom.',
   'Peter hjalp med at ringe og stoppe kort.', 'Lægge nøgler samme sted hver dag', 'Lægge nøgler i skålen ved døren', 'Stresset', 4, 'empowerment', now() - interval '6 days'),
  ('52222222-2222-2222-2222-000000000002', '22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111',
   'Fødselsdagen i fællesrummet.', 'Mange mennesker. Larm.', 'At jeg kunne gå ud en tur bagefter.', 'Gå 15 min før middag', 'Gå en kort tur før middag', 'Overvældet', 5, 'connectedness', now() - interval '8 days'),
  ('52222222-2222-2222-2222-000000000003', '22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111',
   'En nat hvor jeg ikke kunne sove.', 'Tankerne om gamle fejl.', NULL, 'Skrive tre ord i notesbog', 'Skrive tre ord før sengetid', 'Træt', 4, 'identity', now() - interval '3 days'),

  -- Anders (4)
  ('53333333-3333-3333-3333-000000000001', '23333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111',
   'Da jeg så min far på FaceTime — han viste garagen.', 'Det blev kort. Jeg vidste ikke hvad jeg skulle spørge om.',
   'At han ringede selv.', 'Skrive en besked til far', 'Skrive en kort besked til far', 'Blandet', 6, 'connectedness', now() - interval '7 days'),
  ('53333333-3333-3333-3333-000000000002', '23333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111',
   'Da jeg malede i tre timer og glemte tiden.', NULL,
   'At farverne blev som jeg så dem inde i hovedet.', 'Male én time i morgen', 'Male én time i morgen', 'Fokuseret', 8, 'meaning', now() - interval '11 days'),
  ('53333333-3333-3333-3333-000000000003', '23333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111',
   'Hjælp til den nye beboer med at finde køkkenet.', 'Jeg er ikke vant til at være den der viser vej.',
   'Han sagde tak og mente det.', 'Sig goddag til den nye', 'Sig goddag til ham i morgen', 'Rolig stolthed', 7, 'empowerment', now() - interval '5 days'),
  ('53333333-3333-3333-3333-000000000004', '23333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111',
   'En søndag hvor huset var stille og jeg læste halvdelen af en bog.', 'Ensomheden mellem siderne.',
   'At jeg valgte at blive og ikke lukke mig inde hele dagen.', 'Gå i haven ti minutter', 'Gå i haven ti minutter', 'Stille', 6, 'hope', now() - interval '14 days')
ON CONFLICT (id) DO NOTHING;

-- ─── 6. lys_next_steps ────────────────────────────────────────────────────────
INSERT INTO public.lys_next_steps (
  id, resident_id, org_id, created_by_type, title, description, status, related_chime_domain,
  related_reflection_id, completed_at, created_at, updated_at
)
VALUES
  -- Sara: 3 aktiv + 2 fuldført
  ('61111111-1111-1111-1111-000000000001', '21111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'resident',
   'Ringe til Line lørdag formiddag', NULL, 'aktiv', 'hope', '51111111-1111-1111-1111-000000000002', NULL, now() - interval '8 days', now() - interval '8 days'),
  ('61111111-1111-1111-1111-000000000002', '21111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'resident',
   'Smile og sige hej til Sofie', NULL, 'aktiv', 'connectedness', '51111111-1111-1111-1111-000000000001', NULL, now() - interval '11 days', now() - interval '11 days'),
  ('61111111-1111-1111-1111-000000000003', '21111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'resident',
   'Drikke et glas vand før jeg går ud', NULL, 'aktiv', 'empowerment', '51111111-1111-1111-1111-000000000003', NULL, now() - interval '4 days', now() - interval '4 days'),
  ('61111111-1111-1111-1111-000000000004', '21111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'resident',
   'Lave pasta i morgen', NULL, 'fuldført', 'identity', '51111111-1111-1111-1111-000000000004', now() - interval '5 days', now() - interval '6 days', now() - interval '5 days'),
  ('61111111-1111-1111-1111-000000000005', '21111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111', 'resident',
   'Sidde ved vinduet med kaffe', NULL, 'fuldført', 'meaning', '51111111-1111-1111-1111-000000000005', now() - interval '1 day', now() - interval '2 days', now() - interval '1 day'),

  -- Mikkel: 2 aktiv
  ('62222222-2222-2222-2222-000000000001', '22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'resident',
   'Lægge nøgler i skålen ved døren', NULL, 'aktiv', 'empowerment', '52222222-2222-2222-2222-000000000001', NULL, now() - interval '5 days', now() - interval '5 days'),
  ('62222222-2222-2222-2222-000000000002', '22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111', 'resident',
   'Gå en kort tur før middag', NULL, 'aktiv', 'connectedness', '52222222-2222-2222-2222-000000000002', NULL, now() - interval '7 days', now() - interval '7 days'),

  -- Anders: 4 aktiv + 5 fuldført
  ('63333333-3333-3333-3333-000000000001', '23333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'resident',
   'Skrive en kort besked til far', NULL, 'aktiv', 'connectedness', '53333333-3333-3333-3333-000000000001', NULL, now() - interval '6 days', now() - interval '6 days'),
  ('63333333-3333-3333-3333-000000000002', '23333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'resident',
   'Male én time i morgen', NULL, 'aktiv', 'meaning', '53333333-3333-3333-3333-000000000002', NULL, now() - interval '10 days', now() - interval '10 days'),
  ('63333333-3333-3333-3333-000000000003', '23333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'resident',
   'Sig goddag til den nye beboer', NULL, 'aktiv', 'empowerment', '53333333-3333-3333-3333-000000000003', NULL, now() - interval '4 days', now() - interval '4 days'),
  ('63333333-3333-3333-3333-000000000004', '23333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'resident',
   'Gå i haven ti minutter', NULL, 'aktiv', 'hope', '53333333-3333-3333-3333-000000000004', NULL, now() - interval '13 days', now() - interval '13 days'),
  ('63333333-3333-3333-3333-000000000005', '23333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'resident',
   'Samle værktøj efter brug', NULL, 'fuldført', 'empowerment', NULL, now() - interval '20 days', now() - interval '25 days', now() - interval '20 days'),
  ('63333333-3333-3333-3333-000000000006', '23333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'resident',
   'Male færdig med landskabsbilledet', NULL, 'fuldført', 'meaning', NULL, now() - interval '30 days', now() - interval '45 days', now() - interval '30 days'),
  ('63333333-3333-3333-3333-000000000007', '23333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'resident',
   'Gå til lægen alene', NULL, 'fuldført', 'empowerment', NULL, now() - interval '60 days', now() - interval '90 days', now() - interval '60 days'),
  ('63333333-3333-3333-3333-000000000008', '23333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'resident',
   'Hænge billedet op i gangen', NULL, 'fuldført', 'identity', NULL, now() - interval '15 days', now() - interval '20 days', now() - interval '15 days'),
  ('63333333-3333-3333-3333-000000000009', '23333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111', 'resident',
   'Læse en bog færdig', NULL, 'fuldført', 'hope', NULL, now() - interval '10 days', now() - interval '40 days', now() - interval '10 days')
ON CONFLICT (id) DO NOTHING;

-- ─── 7. journal_entries (15) ────────────────────────────────────────────────
INSERT INTO public.journal_entries (
  id, resident_id, org_id, staff_name, entry_text, category, created_at, show_in_diary
)
VALUES
  -- Sara (4)
  ('71111111-1111-1111-1111-000000000001', '21111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111',
   'Mette K.', 'Sara virker mere åben i fællesrummet denne uge. Hun hilste først på nabo.', 'observation', now() - interval '10 days', true),
  ('71111111-1111-1111-1111-000000000002', '21111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111',
   'Peter N.', 'Samtale om tandlæge — hun var nervøs men gennemførte. God støtte fra personale.', 'observation', now() - interval '3 days', true),
  ('71111111-1111-1111-1111-000000000003', '21111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111',
   'Mette K.', 'Deltog i madlavning med naboer. Spiste med andre uden at trække sig.', 'observation', now() - interval '6 days', true),
  ('71111111-1111-1111-1111-000000000004', '21111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111',
   'Peter N.', 'Plan for weekend: mulighed for opkald til søster. Sara motiveret.', 'plan', now() - interval '1 day', true),

  -- Mikkel (6)
  ('72222222-2222-2222-2222-000000000001', '22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111',
   'Peter N.', 'Mikkel havde konflikt i fællesrummet. De-eskaleret efter 20 min. Han var rystende bagefter.', 'observation', now() - interval '10 days', true),
  ('72222222-2222-2222-2222-000000000002', '22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111',
   'Anna L.', 'Søvnproblemer rapporteret. Nattevagt tilbudt samtale — afvist først, tog den senere.', 'observation', now() - interval '13 days', true),
  ('72222222-2222-2222-2222-000000000003', '22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111',
   'Peter N.', 'Tabte pung — meget stress. Fundet samme dag. Følger op i morgen.', 'observation', now() - interval '6 days', true),
  ('72222222-2222-2222-2222-000000000004', '22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111',
   'Anna L.', 'Deltog kort i fødselsdag. Gik ud bagefter — det var planlagt og OK.', 'observation', now() - interval '8 days', true),
  ('72222222-2222-2222-2222-000000000005', '22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111',
   'Peter N.', 'Rød check-in i dag. Tilbydes ekstra samtale — venter på svar.', 'observation', now() - interval '1 day', true),
  ('72222222-2222-2222-2222-000000000006', '22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111',
   'Anna L.', 'Mikkel virker isoleret om aftenen. Overvejer aktivitet med lavt pres.', 'plan', now() - interval '2 days', true),

  -- Anders (5)
  ('73333333-3333-3333-3333-000000000001', '23333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111',
   'Mette K.', 'Anders malede i værkstedet hele eftermiddagen. Rolig og fokuseret.', 'observation', now() - interval '11 days', true),
  ('73333333-3333-3333-3333-000000000002', '23333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111',
   'Peter N.', 'Kort FaceTime med far — Anders virkede glad bagefter men også lidt tom.', 'observation', now() - interval '7 days', true),
  ('73333333-3333-3333-3333-000000000003', '23333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111',
   'Mette K.', 'Hjalp ny beboer med orientering. God kontakt uden at blive overvældet.', 'observation', now() - interval '5 days', true),
  ('73333333-3333-3333-3333-000000000004', '23333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111',
   'Anna L.', 'Savner mere social kontakt siger han — vi planlægger stille fællesaktivitet.', 'plan', now() - interval '10 days', true),
  ('73333333-3333-3333-3333-000000000005', '23333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111',
   'Peter N.', 'Stabil uge. Check-ins grønne. Ensomhed nævnt men håndterbart.', 'observation', now() - interval '0 days', true)
ON CONFLICT (id) DO NOTHING;

-- Lys journal-entries (til recovery_stories — ikke med i de 15 staff-tællinger ovenfor er staff; disse er voice)
INSERT INTO public.journal_entries (
  id, resident_id, org_id, staff_name, entry_text, category, created_at, show_in_diary
)
VALUES
  ('71111111-1111-1111-1111-000000000101', '21111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111',
   'Lys', 'Voice journal — struktureret notat.', 'Lys journal', now() - interval '14 days', false),
  ('71111111-1111-1111-1111-000000000102', '21111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111',
   'Lys', 'Voice journal — struktureret notat.', 'Lys journal', now() - interval '5 days', false),
  ('72222222-2222-2222-2222-000000000101', '22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111',
   'Lys', 'Voice journal — struktureret notat.', 'Lys journal', now() - interval '7 days', false),
  ('73333333-3333-3333-3333-000000000101', '23333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111',
   'Lys', 'Voice journal — struktureret notat.', 'Lys journal', now() - interval '20 days', false),
  ('73333333-3333-3333-3333-000000000102', '23333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111',
   'Lys', 'Voice journal — struktureret notat.', 'Lys journal', now() - interval '12 days', false),
  ('73333333-3333-3333-3333-000000000103', '23333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111',
   'Lys', 'Voice journal — struktureret notat.', 'Lys journal', now() - interval '3 days', false)
ON CONFLICT (id) DO NOTHING;

-- ─── 8. lys_recovery_stories (6 godkendte) ────────────────────────────────────
INSERT INTO public.lys_recovery_stories (
  id, resident_id, org_id, related_journal_entry_id, raw_transcript, cleaned_story, resident_approved, created_at, updated_at
)
VALUES
  ('81111111-1111-1111-1111-000000000001', '21111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111',
   '71111111-1111-1111-1111-000000000101',
   '[rå optagelse — ikke vist]',
   'Jeg husker vinteren hvor jeg ikke ville ud af sengen. Line kom med suppe. Jeg sagde nej først, men åbnede døren alligevel. Det var ikke en stor gestus — bare en skål og lidt snak. Dengang troede jeg ingen gad. Nu ved jeg at nogen gjorde.',
   true, now() - interval '14 days', now() - interval '12 days'),
  ('81111111-1111-1111-1111-000000000002', '21111111-1111-1111-1111-111111111111', '11111111-1111-1111-1111-111111111111',
   '71111111-1111-1111-1111-000000000102',
   '[rå optagelse — ikke vist]',
   'I går lavede jeg mad til naboerne. Jeg var nervøs for at det smagte forkert. De spiste det hele. Jeg gik hjem og tænkte: måske er jeg ikke så håbløs som jeg troede.',
   true, now() - interval '5 days', now() - interval '4 days'),
  ('82222222-2222-2222-2222-000000000001', '22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111111',
   '72222222-2222-2222-2222-000000000101',
   '[rå optagelse — ikke vist]',
   'Da jeg tabte pungen troede jeg at alt var kaos igen. Peter hjalp mig ringe og stoppe kort. Jeg skammede mig, men han sagde bare at det sker. Det hjalp lidt.',
   true, now() - interval '7 days', now() - interval '5 days'),
  ('83333333-3333-3333-3333-000000000001', '23333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111',
   '73333333-3333-3333-3333-000000000101',
   '[rå optagelse — ikke vist]',
   'Jeg har malet i mange år. Det er ikke for at blive berømt. Det er fordi når jeg har penslen i hånden, så er der ikke plads til alt det andet der larmer. Farverne behøver ikke forklaring.',
   true, now() - interval '20 days', now() - interval '18 days'),
  ('83333333-3333-3333-3333-000000000002', '23333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111',
   '73333333-3333-3333-3333-000000000102',
   '[rå optagelse — ikke vist]',
   'Min far ringede. Vi talte om garagen og vejret. Det lyder lidt, men for mig var det stort at han ringede selv. Jeg skrev det ned bagefter så jeg husker det.',
   true, now() - interval '12 days', now() - interval '10 days'),
  ('83333333-3333-3333-3333-000000000003', '23333333-3333-3333-3333-333333333333', '11111111-1111-1111-1111-111111111111',
   '73333333-3333-3333-3333-000000000103',
   '[rå optagelse — ikke vist]',
   'Den nye beboer spurgte hvor køkkenet var. Jeg viste ham vej. Han sagde tak. Små ting, men jeg gjorde det — og det var okay.',
   true, now() - interval '3 days', now() - interval '2 days')
ON CONFLICT (id) DO NOTHING;

COMMIT;
