-- Lokal test af 20261015140000_journal_fagsystem_transfers.sql:
--   createdb fag && psql -d fag -f supabase/tests/fagsystem/test.sql
\set ON_ERROR_STOP 1
DO $$ BEGIN CREATE ROLE authenticated; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE ROLE anon; EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('request.uid', true), '')::uuid $$;
GRANT USAGE ON SCHEMA auth TO authenticated;
CREATE TABLE public.organisations (id uuid primary key);
CREATE TABLE public.care_staff (id uuid primary key, org_id uuid, perms text[] default '{}');
CREATE TABLE public.journal_entries (id uuid primary key, org_id uuid, resident_id uuid, journal_status text, is_resident_private boolean not null default false);
CREATE TABLE public.assistant_suggestions (id serial, kind text NOT NULL CHECK (kind IN ('aftale_opfoelgning','dokument_frist','trafiklys','svar')));
CREATE FUNCTION public.care_staff_has_permission(p text) RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$ SELECT p = ANY(perms) FROM public.care_staff WHERE id = auth.uid() $$;
GRANT SELECT ON public.care_staff, public.journal_entries TO authenticated;
INSERT INTO organisations VALUES ('00000000-0000-0000-0000-0000000000a1'),('00000000-0000-0000-0000-0000000000a2');
INSERT INTO care_staff VALUES
 ('00000000-0000-0000-0000-0000000000c1','00000000-0000-0000-0000-0000000000a1','{}'),
 ('00000000-0000-0000-0000-0000000000c2','00000000-0000-0000-0000-0000000000a1','{approve_journal}'),
 ('00000000-0000-0000-0000-0000000000c3','00000000-0000-0000-0000-0000000000a2','{}');
INSERT INTO journal_entries VALUES
 ('00000000-0000-0000-0000-0000000000e1','00000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-0000000000b1','godkendt',false),
 ('00000000-0000-0000-0000-0000000000e2','00000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-0000000000b1','kladde',false),
 ('00000000-0000-0000-0000-0000000000e3','00000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-0000000000b1','godkendt',true),
 ('00000000-0000-0000-0000-0000000000e4','00000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-0000000000b1','godkendt',false);
\i supabase/migrations/20261015140000_journal_fagsystem_transfers.sql
\unset ON_ERROR_STOP

CREATE FUNCTION t(label text, sql text, expect_ok boolean) RETURNS text LANGUAGE plpgsql AS $$
DECLARE n int;
BEGIN
  EXECUTE sql; GET DIAGNOSTICS n = ROW_COUNT;
  RETURN label || ': ' || CASE WHEN expect_ok = (n > 0) THEN 'ok' ELSE 'FAIL' END;
EXCEPTION WHEN others THEN
  RETURN label || ': ' || CASE WHEN expect_ok THEN 'FAIL (' || SQLERRM || ')' ELSE 'ok' END;
END $$;
GRANT EXECUTE ON FUNCTION t TO authenticated;

SET ROLE authenticated;
SELECT set_config('request.uid','00000000-0000-0000-0000-0000000000c1',false);
SELECT t('godkendt notat kan markeres', $q$INSERT INTO journal_fagsystem_transfers (journal_entry_id, org_id, resident_id, transferred_by) VALUES ('00000000-0000-0000-0000-0000000000e1','00000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-0000000000c1')$q$, true);
SELECT t('kladde afvises', $q$INSERT INTO journal_fagsystem_transfers (journal_entry_id, org_id, resident_id, transferred_by) VALUES ('00000000-0000-0000-0000-0000000000e2','00000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-0000000000c1')$q$, false);
SELECT t('privat afvises', $q$INSERT INTO journal_fagsystem_transfers (journal_entry_id, org_id, resident_id, transferred_by) VALUES ('00000000-0000-0000-0000-0000000000e3','00000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-0000000000c1')$q$, false);
SELECT t('andens navn afvises', $q$INSERT INTO journal_fagsystem_transfers (journal_entry_id, org_id, resident_id, transferred_by) VALUES ('00000000-0000-0000-0000-0000000000e4','00000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-0000000000c2')$q$, false);
SELECT t('forkert borger afvises', $q$INSERT INTO journal_fagsystem_transfers (journal_entry_id, org_id, resident_id, transferred_by) VALUES ('00000000-0000-0000-0000-0000000000e4','00000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-0000000000b9','00000000-0000-0000-0000-0000000000c1')$q$, false);
SELECT t('ingen update', $q$UPDATE journal_fagsystem_transfers SET transferred_at = now()$q$, false);
SELECT set_config('request.uid','00000000-0000-0000-0000-0000000000c3',false);
SELECT t('andet bosted ser intet', $q$SELECT * FROM journal_fagsystem_transfers$q$, false);
SELECT t('andet bosted kan ikke markere', $q$INSERT INTO journal_fagsystem_transfers (journal_entry_id, org_id, resident_id, transferred_by) VALUES ('00000000-0000-0000-0000-0000000000e4','00000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-0000000000c3')$q$, false);
SELECT t('andet bosted kan ikke slette', $q$DELETE FROM journal_fagsystem_transfers$q$, false);
SELECT set_config('request.uid','00000000-0000-0000-0000-0000000000c2',false);
SELECT t('kollega ser markering', $q$SELECT * FROM journal_fagsystem_transfers$q$, true);
SELECT t('leder kan fortryde', $q$DELETE FROM journal_fagsystem_transfers$q$, true);
RESET ROLE;
SELECT t('ny kind fagsystem', $q$INSERT INTO assistant_suggestions (kind) VALUES ('fagsystem')$q$, true);
SET ROLE anon;
SELECT t('anon ingen adgang', $q$SELECT * FROM journal_fagsystem_transfers$q$, false);
