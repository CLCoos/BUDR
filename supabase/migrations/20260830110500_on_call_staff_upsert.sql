-- Named unique constraint so staff can upsert today's on-call row per shift
-- (dashboard «Vagthavende i dag» → Lys kriseflow). Unique index already exists
-- on (org_id, date, shift) from baseline. Reaffirm table grants for authenticated.

GRANT SELECT, INSERT, UPDATE, DELETE ON public.on_call_staff TO authenticated;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'on_call_staff_org_date_shift_key'
      AND conrelid = 'public.on_call_staff'::regclass
  ) THEN
    IF EXISTS (
      SELECT 1
      FROM pg_class c
      JOIN pg_namespace n ON n.oid = c.relnamespace
      WHERE c.relkind = 'i'
        AND c.relname = 'on_call_staff_org_date_shift_unique_idx'
        AND n.nspname = 'public'
    ) THEN
      ALTER TABLE public.on_call_staff
        ADD CONSTRAINT on_call_staff_org_date_shift_key
        UNIQUE USING INDEX on_call_staff_org_date_shift_unique_idx;
    ELSE
      ALTER TABLE public.on_call_staff
        ADD CONSTRAINT on_call_staff_org_date_shift_key UNIQUE (org_id, date, shift);
    END IF;
  END IF;
END $$;
