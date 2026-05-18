-- Valgfri demo: VUM 2.0-kladde for Sara K. (BUDR Demo Botilbud)
-- Kør manuelt efter migration 20260518120000_vum_assessments.sql
-- Forudsætter demo_recovery_seed.sql (org + Sara)

BEGIN;

INSERT INTO public.vum_assessments (
  id,
  org_id,
  resident_id,
  status,
  case_opened_at,
  referral_source,
  case_purpose,
  theme_8_relationships,
  theme_10_personal,
  function_levels
)
VALUES (
  '31111111-1111-1111-1111-111111111111',
  '11111111-1111-1111-1111-111111111111',
  '21111111-1111-1111-1111-111111111111',
  'draft',
  now() - interval '14 days',
  'Kommunal visitering',
  'Opstart recovery-orienteret udredning — pilot med BUDR',
  jsonb_build_object(
    'level', 2,
    'notes', 'Sara ønsker mere kontakt til fællesskabet på afdelingen. Små sociale skridt registreres i Lys.',
    'inspiration', jsonb_build_object(
      'network', 'Sofie på afdelingen, søster Mette',
      'conflict', 'Undgår fællesarrangementer ved dårlige dage'
    )
  ),
  jsonb_build_object(
    'level', 1,
    'notes', 'Håb og drømme dokumenteret i recovery-profil. Recovery-fortællinger fra uge 2.',
    'inspiration', jsonb_build_object(
      'hope', 'Egen lejlighed på sigt',
      'values', 'Ærlighed, musik, ro'
    )
  ),
  '{"8": 2, "10": 1}'::jsonb
)
ON CONFLICT (id) DO NOTHING;

COMMIT;
