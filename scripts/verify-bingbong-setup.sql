-- ── Kør i Supabase → SQL Editor → Run ─────────────────────────────────────────
-- Én resultatrække: org-id, antal beboere, og om show_in_diary findes (1 = ja).

SELECT
  (SELECT id::text FROM public.organisations WHERE slug = 'bingbong-demo' LIMIT 1) AS bingbong_org_id,
  (
    SELECT count(*)::integer
    FROM public.care_residents cr
    JOIN public.organisations o ON o.id = cr.org_id
    WHERE o.slug = 'bingbong-demo'
  ) AS antal_beboere_forvent_18,
  (
    SELECT count(*)::integer
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'journal_entries'
      AND column_name = 'show_in_diary'
  ) AS show_in_diary_kolon_findes_1_ellers_0;

-- (Valgfrit) Kør separat hvis du vil se fordeling pr. hus:
-- SELECT coalesce(cr.onboarding_data->>'house', '(mangler)') AS hus, count(*) AS antal
-- FROM public.care_residents cr
-- JOIN public.organisations o ON o.id = cr.org_id
-- WHERE o.slug = 'bingbong-demo'
-- GROUP BY 1 ORDER BY 1;
