-- CMS-lite for marketing copy managed from Care Portal settings.
-- Initial scope: institutions hero/CTA/pilot-link text variants.

CREATE TABLE IF NOT EXISTS public.marketing_content_blocks (
  key text PRIMARY KEY,
  draft jsonb NOT NULL DEFAULT '{}'::jsonb,
  published jsonb,
  updated_at timestamptz NOT NULL DEFAULT now(),
  updated_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  published_at timestamptz,
  published_by uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

ALTER TABLE public.marketing_content_blocks ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "mcb_staff_select" ON public.marketing_content_blocks;
CREATE POLICY "mcb_staff_select"
  ON public.marketing_content_blocks
  FOR SELECT
  TO authenticated
  USING (public.care_is_portal_staff());

DROP POLICY IF EXISTS "mcb_staff_insert" ON public.marketing_content_blocks;
CREATE POLICY "mcb_staff_insert"
  ON public.marketing_content_blocks
  FOR INSERT
  TO authenticated
  WITH CHECK (public.care_is_portal_staff());

DROP POLICY IF EXISTS "mcb_staff_update" ON public.marketing_content_blocks;
CREATE POLICY "mcb_staff_update"
  ON public.marketing_content_blocks
  FOR UPDATE
  TO authenticated
  USING (public.care_is_portal_staff())
  WITH CHECK (public.care_is_portal_staff());

GRANT SELECT, INSERT, UPDATE ON public.marketing_content_blocks TO authenticated;

INSERT INTO public.marketing_content_blocks (key, draft, published)
VALUES (
  'institutioner.hero_copy',
  jsonb_build_object(
    'variant', 'B',
    'A', jsonb_build_object(
      'title_html', '<em>Kom hurtigt i gang</em> — fra overblik til tryg pilot',
      'cta', 'Book en kort afklaring',
      'pilot_link', 'Se pilotpakken: leverancer, opstart og næste skridt →'
    ),
    'B', jsonb_build_object(
      'title_html', '<em>Skab ro i driften</em> — fra første overblik til målbar pilot',
      'cta', 'Få et konkret pilotoplæg',
      'pilot_link', 'Se pilotpakken: mål, leverancer og forventet effekt →'
    )
  ),
  jsonb_build_object(
    'variant', 'B',
    'A', jsonb_build_object(
      'title_html', '<em>Kom hurtigt i gang</em> — fra overblik til tryg pilot',
      'cta', 'Book en kort afklaring',
      'pilot_link', 'Se pilotpakken: leverancer, opstart og næste skridt →'
    ),
    'B', jsonb_build_object(
      'title_html', '<em>Skab ro i driften</em> — fra første overblik til målbar pilot',
      'cta', 'Få et konkret pilotoplæg',
      'pilot_link', 'Se pilotpakken: mål, leverancer og forventet effekt →'
    )
  )
)
ON CONFLICT (key) DO NOTHING;

INSERT INTO public.marketing_content_blocks (key, draft, published)
VALUES (
  'institutioner.sections_copy',
  jsonb_build_object(
    'implementering_intro', 'Implementeringen skal opleves enkel i hverdagen. BUDR står for onboarding, opsætning og dataoverflytning, så jeres team kan fokusere på borgerne og den daglige drift.',
    'implementering_items', jsonb_build_array(
      'Opstart: Vi laver en konkret plan med jer og tager de tunge praktiske opgaver, så opstarten bliver kort og overskuelig.',
      'Roller: Én kontaktperson hos jer er nok til koordinering. Vi håndterer resten sammen med relevante nøglepersoner.',
      'Onboarding: Vi træner personale i Care Portal og introducerer Lys i et tempo, der passer jeres vagtplan og hverdag.',
      'Teknik: Adgang via browser eller mobil app-wrapper. Vi hjælper med opsætning, logins og sikker overflytning af relevante data fra start.'
    ),
    'pilot_intro', 'En pilot er en afgrænset periode, hvor I får løsningen ind i hverdagen med tæt støtte. Målet er hurtig læring og tydelig effekt.',
    'pilot_items', jsonb_build_array(
      'Varighed: Aftales efter jeres drift og mål, så I hurtigt får en brugbar evaluering uden at belaste organisationen unødigt.',
      'Succeskriterier: Vi sætter konkrete mål fra start, fx bedre overblik ved vagtskifte, mere ensartet journalpraksis og højere tryghed i teamet.',
      'Support: Fast kontakt, klare responstider og aktiv opfølgning under hele pilotforløbet, så I ikke står alene undervejs.',
      'Persondata: Roller som dataansvarlig og underdatabehandlere afklares skriftligt i aftalegrundlaget. Se overordnet ramme i vores privatlivspolitik.'
    ),
    'pilot_helper', 'Har I behov for materiale til DPO eller IT, understøtter vi med teknisk beskrivelse og underdatabehandlerliste.'
  ),
  jsonb_build_object(
    'implementering_intro', 'Implementeringen skal opleves enkel i hverdagen. BUDR står for onboarding, opsætning og dataoverflytning, så jeres team kan fokusere på borgerne og den daglige drift.',
    'implementering_items', jsonb_build_array(
      'Opstart: Vi laver en konkret plan med jer og tager de tunge praktiske opgaver, så opstarten bliver kort og overskuelig.',
      'Roller: Én kontaktperson hos jer er nok til koordinering. Vi håndterer resten sammen med relevante nøglepersoner.',
      'Onboarding: Vi træner personale i Care Portal og introducerer Lys i et tempo, der passer jeres vagtplan og hverdag.',
      'Teknik: Adgang via browser eller mobil app-wrapper. Vi hjælper med opsætning, logins og sikker overflytning af relevante data fra start.'
    ),
    'pilot_intro', 'En pilot er en afgrænset periode, hvor I får løsningen ind i hverdagen med tæt støtte. Målet er hurtig læring og tydelig effekt.',
    'pilot_items', jsonb_build_array(
      'Varighed: Aftales efter jeres drift og mål, så I hurtigt får en brugbar evaluering uden at belaste organisationen unødigt.',
      'Succeskriterier: Vi sætter konkrete mål fra start, fx bedre overblik ved vagtskifte, mere ensartet journalpraksis og højere tryghed i teamet.',
      'Support: Fast kontakt, klare responstider og aktiv opfølgning under hele pilotforløbet, så I ikke står alene undervejs.',
      'Persondata: Roller som dataansvarlig og underdatabehandlere afklares skriftligt i aftalegrundlaget. Se overordnet ramme i vores privatlivspolitik.'
    ),
    'pilot_helper', 'Har I behov for materiale til DPO eller IT, understøtter vi med teknisk beskrivelse og underdatabehandlerliste.'
  )
)
ON CONFLICT (key) DO NOTHING;
