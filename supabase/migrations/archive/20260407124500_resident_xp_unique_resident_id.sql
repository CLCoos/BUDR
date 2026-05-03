-- Sikrer at public.resident_xp har præcis én række pr. resident_id og UNIQUE på resident_id,
-- så award_xp(... ON CONFLICT (resident_id)) ikke fejler på ældre skemaer (fx PK kun på id).

DO $$
DECLARE
  has_single_col_resident_pk_or_uq boolean;
BEGIN
  IF to_regclass('public.resident_xp') IS NULL THEN
    RETURN;
  END IF;

  SELECT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = c.connamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'resident_xp'
      AND c.contype IN ('p', 'u')
      AND cardinality(c.conkey) = 1
      AND EXISTS (
        SELECT 1
        FROM pg_attribute a
        WHERE a.attrelid = t.oid
          AND a.attnum = c.conkey[1]
          AND NOT a.attisdropped
          AND a.attname = 'resident_id'
      )
  )
  INTO has_single_col_resident_pk_or_uq;

  IF has_single_col_resident_pk_or_uq THEN
    RETURN;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND tablename = 'resident_xp'
      AND indexname = 'resident_xp_resident_id_uidx'
  ) THEN
    RETURN;
  END IF;

  DELETE FROM public.resident_xp WHERE resident_id IS NULL;

  CREATE TEMP TABLE _rx_keep ON COMMIT DROP AS
  SELECT DISTINCT ON (resident_id)
    ctid AS keeper_ctid
  FROM public.resident_xp
  ORDER BY resident_id, updated_at DESC NULLS LAST, ctid DESC;

  UPDATE public.resident_xp r
  SET
    total_xp = s.merged_total,
    level = public.care_level_from_total_xp(s.merged_total),
    updated_at = COALESCE(s.max_updated, now())
  FROM (
    SELECT
      resident_id,
      SUM(COALESCE(total_xp, 0))::integer AS merged_total,
      MAX(updated_at) AS max_updated
    FROM public.resident_xp
    GROUP BY resident_id
  ) s
  WHERE r.resident_id = s.resident_id
    AND r.ctid IN (SELECT keeper_ctid FROM _rx_keep);

  DELETE FROM public.resident_xp r
  WHERE r.ctid NOT IN (SELECT keeper_ctid FROM _rx_keep);

  ALTER TABLE public.resident_xp
    ALTER COLUMN resident_id SET NOT NULL;

  CREATE UNIQUE INDEX resident_xp_resident_id_uidx
    ON public.resident_xp (resident_id);
END $$;
