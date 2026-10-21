-- Atomisk fletning af dokumentfelter.
--
-- PATCH læste hele jsonb-kolonnen, flettede i appen og skrev objektet tilbage.
-- To overlappende gem (autosave på et langsomt net, eller to faner) kunne derfor
-- skrive et forældet øjebliksbillede sidst og slette den andens afsnit, kilder
-- eller metadata. Her flettes kun de sendte nøgler oven i rækken, under låsen
-- på UPDATE, så den anden gem ikke bliver overskrevet.
-- Godkendte dokumenter røres ikke (samme regel som RLS). Funktionen kører som
-- kalderen, så RLS og resident_documents_guard stadig gælder.

CREATE OR REPLACE FUNCTION public.resident_documents_apply_patch(
  p_id uuid,
  p_sections jsonb,
  p_section_sources jsonb,
  p_meta jsonb,
  p_due_date date,
  p_set_due_date boolean,
  p_responsible_id uuid,
  p_set_responsible boolean,
  p_title text,
  p_set_title boolean
) RETURNS SETOF public.resident_documents
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path TO 'public'
AS $$
BEGIN
  IF p_sections IS NOT NULL AND jsonb_typeof(p_sections) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'Ugyldige afsnit';
  END IF;
  IF p_section_sources IS NOT NULL AND jsonb_typeof(p_section_sources) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'Ugyldige kilder';
  END IF;
  IF p_meta IS NOT NULL AND jsonb_typeof(p_meta) IS DISTINCT FROM 'object' THEN
    RAISE EXCEPTION 'Ugyldige oplysninger';
  END IF;

  RETURN QUERY
  UPDATE public.resident_documents AS d
  SET
    sections = CASE
      WHEN p_sections IS NULL THEN d.sections
      ELSE d.sections || p_sections
    END,
    section_sources = CASE
      WHEN p_section_sources IS NULL THEN d.section_sources
      ELSE d.section_sources || p_section_sources
    END,
    meta = CASE
      WHEN p_meta IS NULL THEN d.meta
      ELSE d.meta || p_meta
    END,
    due_date = CASE WHEN p_set_due_date THEN p_due_date ELSE d.due_date END,
    responsible_id = CASE WHEN p_set_responsible THEN p_responsible_id ELSE d.responsible_id END,
    title = CASE WHEN p_set_title THEN p_title ELSE d.title END
  WHERE d.id = p_id
    AND d.status IN ('kladde', 'til_godkendelse')
  RETURNING d.*;
END;
$$;

REVOKE ALL ON FUNCTION public.resident_documents_apply_patch(
  uuid, jsonb, jsonb, jsonb, date, boolean, uuid, boolean, text, boolean
) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.resident_documents_apply_patch(
  uuid, jsonb, jsonb, jsonb, date, boolean, uuid, boolean, text, boolean
) TO authenticated;
