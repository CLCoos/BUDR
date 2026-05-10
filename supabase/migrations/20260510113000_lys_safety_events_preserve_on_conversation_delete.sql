DO $$
DECLARE
  fk_name text;
BEGIN
  IF to_regclass('public.lys_safety_events') IS NULL THEN
    RETURN;
  END IF;

  SELECT c.conname
    INTO fk_name
  FROM pg_constraint c
  JOIN pg_class t ON t.oid = c.conrelid
  JOIN pg_namespace n ON n.oid = t.relnamespace
  JOIN unnest(c.conkey) AS cols(attnum) ON true
  JOIN pg_attribute a ON a.attrelid = t.oid AND a.attnum = cols.attnum
  WHERE n.nspname = 'public'
    AND t.relname = 'lys_safety_events'
    AND c.contype = 'f'
    AND a.attname = 'conversation_id'
  LIMIT 1;

  IF fk_name IS NOT NULL THEN
    EXECUTE format('ALTER TABLE public.lys_safety_events DROP CONSTRAINT %I', fk_name);
  END IF;

  ALTER TABLE public.lys_safety_events
    ADD CONSTRAINT lys_safety_events_conversation_id_fkey
    FOREIGN KEY (conversation_id)
    REFERENCES public.lys_conversations(id)
    ON DELETE SET NULL;
END;
$$;
