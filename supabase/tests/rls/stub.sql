-- Minimal kopi af prod-skemaets relevante tabeller og policies (før bølge 1), til RLS-tests.
-- Ikke en fuld genskabelse af databasen; kun det, checks.sql rører ved.
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN CREATE ROLE anon NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN CREATE ROLE authenticated NOLOGIN; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN CREATE ROLE service_role NOLOGIN BYPASSRLS; END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'supabase_admin') THEN CREATE ROLE supabase_admin NOLOGIN; END IF;
END $$;
CREATE SCHEMA auth;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(current_setting('test.uid', true),'')::uuid $$;
GRANT USAGE ON SCHEMA auth, public TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION auth.uid() TO anon, authenticated, service_role;
CREATE TABLE auth.users (id uuid primary key);
CREATE TABLE organisations (id uuid primary key, name text);
CREATE TABLE org_roles (id uuid primary key default gen_random_uuid(), org_id uuid, name text, permissions text[]);
CREATE TABLE care_staff (id uuid primary key, org_id uuid, role text, role_id uuid);
CREATE TABLE care_residents (user_id uuid primary key, org_id uuid);
CREATE TABLE resident_plan_items (id serial primary key, resident_id uuid, org_id uuid, staff_suggestion boolean);
CREATE TABLE daily_plans (id serial primary key, resident_id uuid, org_id uuid, plan_date date);
CREATE TABLE plan_proposals (id serial primary key, resident_id uuid, org_id uuid, date date NOT NULL DEFAULT current_date, status text, reviewed_by uuid, reviewed_at timestamptz);
CREATE TABLE marketing_content_blocks (key text primary key, draft jsonb);
CREATE TABLE journal_entries (id serial primary key, org_id uuid, resident_id uuid, staff_id uuid, staff_name text, entry_text text, category text, created_at timestamptz not null default now(), show_in_diary boolean);
CREATE TABLE crisis_plans (id serial primary key, resident_id uuid);
CREATE TABLE lys_conversations (id serial primary key, resident_id uuid);
CREATE TABLE lys_recovery_stories (id serial primary key, resident_id uuid);
CREATE TABLE resident_sessions (id uuid primary key default gen_random_uuid(), resident_user_id uuid references care_residents(user_id), org_id uuid, session_token_hash text unique, expires_at timestamptz, revoked_at timestamptz, revoked_by uuid);
CREATE TABLE lys_safety_events (id serial primary key, resident_id uuid, risk_level text, acknowledged_at timestamptz, acknowledged_by uuid);
CREATE TABLE audit_logs (id serial primary key, action text);
CREATE TABLE care_planner_entries (id uuid primary key default gen_random_uuid(), org_id uuid, title text, starts_at timestamptz);
CREATE TABLE resident_medications (id uuid primary key, resident_id uuid, org_id uuid, name text, time_group text not null default 'morgen', status text not null default 'aktiv');
DO $$ DECLARE t text; BEGIN FOR t IN SELECT tablename FROM pg_tables WHERE schemaname='public' LOOP
  EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY', t);
  EXECUTE format('GRANT ALL ON public.%I TO authenticated, service_role', t); END LOOP; END $$;
GRANT USAGE ON ALL SEQUENCES IN SCHEMA public TO authenticated;
CREATE FUNCTION care_is_portal_staff() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$ SELECT EXISTS (SELECT 1 FROM care_staff WHERE id = auth.uid()) $$;
CREATE FUNCTION care_visible_facility_ids() RETURNS uuid[] LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public' AS $$ SELECT coalesce(array_agg(org_id), '{}') FROM care_staff WHERE id = auth.uid() $$;
CREATE FUNCTION care_staff_can_access_resident(p_resident_id text) RETURNS boolean LANGUAGE sql STABLE SET search_path TO 'public' AS $$
  SELECT care_is_portal_staff() AND EXISTS (SELECT 1 FROM care_residents cr WHERE cr.user_id::text = p_resident_id AND cr.org_id = ANY (care_visible_facility_ids())) $$;
CREATE FUNCTION create_audit_log(p_actor_type text, p_action text, p_actor_id uuid DEFAULT NULL, p_actor_org_id uuid DEFAULT NULL, p_target_table text DEFAULT NULL, p_target_id uuid DEFAULT NULL, p_metadata jsonb DEFAULT NULL, p_ip_address text DEFAULT NULL)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public' AS $$ BEGIN INSERT INTO audit_logs(action) VALUES (p_action); END $$;
GRANT EXECUTE ON FUNCTION create_audit_log(text,text,uuid,uuid,text,uuid,jsonb,text) TO authenticated;
-- prod's current (pre-fix) policies
CREATE POLICY staff_roles_own_org ON org_roles FOR ALL USING (org_id = (SELECT org_id FROM care_staff WHERE id = auth.uid()));
CREATE POLICY staff_suggest_plan_items ON resident_plan_items FOR INSERT WITH CHECK (staff_suggestion = true);
CREATE POLICY "Staff manage plans" ON daily_plans FOR ALL TO authenticated USING (care_is_portal_staff()) WITH CHECK (care_is_portal_staff());
CREATE POLICY "Staff see org plans" ON daily_plans FOR SELECT TO authenticated USING (care_is_portal_staff() AND org_id = ANY (care_visible_facility_ids()));
CREATE POLICY "Staff review proposals" ON plan_proposals FOR UPDATE TO authenticated USING (care_is_portal_staff()) WITH CHECK (care_is_portal_staff());
CREATE POLICY "Staff see org proposals" ON plan_proposals FOR SELECT TO authenticated USING (care_is_portal_staff() AND org_id = ANY (care_visible_facility_ids()));
CREATE POLICY journal_entries_staff_delete_own_org ON journal_entries FOR DELETE TO authenticated USING (org_id = (SELECT org_id FROM care_staff WHERE id = auth.uid()));
CREATE POLICY journal_entries_staff_select_own_org ON journal_entries FOR SELECT TO authenticated USING (org_id = (SELECT org_id FROM care_staff WHERE id = auth.uid()));
CREATE POLICY journal_entries_staff_insert_own_org ON journal_entries FOR INSERT TO authenticated WITH CHECK (org_id = (SELECT org_id FROM care_staff WHERE id = auth.uid()));
CREATE POLICY journal_entries_staff_update_own_org ON journal_entries FOR UPDATE TO authenticated USING (org_id = (SELECT org_id FROM care_staff WHERE id = auth.uid())) WITH CHECK (org_id = (SELECT org_id FROM care_staff WHERE id = auth.uid()));
CREATE POLICY resident_sessions_staff_revoke_own_org ON resident_sessions FOR UPDATE TO authenticated USING (org_id = (SELECT org_id FROM care_staff WHERE id = auth.uid())) WITH CHECK (true);
CREATE POLICY resident_sessions_staff_select ON resident_sessions FOR SELECT TO authenticated USING (org_id = (SELECT org_id FROM care_staff WHERE id = auth.uid()));
CREATE POLICY lys_safety_events_staff_select ON lys_safety_events FOR SELECT TO authenticated USING (care_staff_can_access_resident(resident_id::text));
CREATE POLICY lys_safety_events_staff_update ON lys_safety_events FOR UPDATE TO authenticated USING (care_staff_can_access_resident(resident_id::text)) WITH CHECK (care_staff_can_access_resident(resident_id::text));
-- fixtures: org1 (leder L, medarbejder M), org2 (leder X); residents R1 (org1), R2 (org2)
INSERT INTO organisations VALUES ('00000000-0000-0000-0000-0000000000a1','Org1'),('00000000-0000-0000-0000-0000000000a2','Org2');
INSERT INTO care_staff VALUES ('00000000-0000-0000-0000-0000000000c1','00000000-0000-0000-0000-0000000000a1','leder',null);
INSERT INTO care_staff VALUES ('00000000-0000-0000-0000-0000000000c2','00000000-0000-0000-0000-0000000000a1','medarbejder',null),('00000000-0000-0000-0000-0000000000c3','00000000-0000-0000-0000-0000000000a2','leder',null);
INSERT INTO care_residents VALUES ('00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-0000000000a1'),('00000000-0000-0000-0000-0000000000b2','00000000-0000-0000-0000-0000000000a2');
INSERT INTO org_roles (id, org_id, name, permissions) VALUES ('00000000-0000-0000-0000-0000000000d1','00000000-0000-0000-0000-0000000000a1','medarbejder','{view_dashboard}'),
  ('00000000-0000-0000-0000-0000000000d2','00000000-0000-0000-0000-0000000000a1','gæst','{view_dashboard,view_handover}');
INSERT INTO auth.users SELECT ('00000000-0000-0000-0000-0000000000c'||i)::uuid FROM generate_series(1,4) i;
-- c4: gæst i org1 (kun læse-rettigheder via role_id)
INSERT INTO care_staff VALUES ('00000000-0000-0000-0000-0000000000c4','00000000-0000-0000-0000-0000000000a1','medarbejder','00000000-0000-0000-0000-0000000000d2');
INSERT INTO lys_safety_events (resident_id, risk_level) VALUES ('00000000-0000-0000-0000-0000000000b1','acute');
INSERT INTO plan_proposals (resident_id, org_id, status) VALUES ('00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-0000000000a1','pending');
INSERT INTO journal_entries (org_id, resident_id) VALUES ('00000000-0000-0000-0000-0000000000a1','00000000-0000-0000-0000-0000000000b1');
INSERT INTO resident_sessions (resident_user_id, org_id, session_token_hash, expires_at) VALUES ('00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-0000000000a1','h', now()+interval '1 day');
CREATE POLICY cs_sel ON care_staff FOR SELECT TO authenticated USING (true);
CREATE POLICY cr_sel ON care_residents FOR SELECT TO authenticated USING (org_id = ANY (care_visible_facility_ids()));
CREATE POLICY org_sel ON organisations FOR SELECT TO authenticated USING (id = (SELECT org_id FROM care_staff WHERE id = auth.uid()));
INSERT INTO resident_medications VALUES ('00000000-0000-0000-0000-0000000000e1','00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-0000000000a1','Quetiapin','morgen','aktiv'),
  ('00000000-0000-0000-0000-0000000000e2','00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-0000000000a1','Oxazepam','behoev','aktiv');
CREATE POLICY rm_sel ON resident_medications FOR SELECT TO authenticated USING (care_staff_can_access_resident(resident_id::text));
-- award_xp: SECURITY DEFINER, i prod kaldbar af anon (før 20261013180000)
CREATE FUNCTION award_xp(p_resident_id uuid, p_activity text, p_xp integer) RETURNS integer LANGUAGE sql SECURITY DEFINER SET search_path TO 'public' AS $$ SELECT p_xp $$;
GRANT EXECUTE ON FUNCTION award_xp(uuid, text, integer) TO anon, authenticated;
-- Kliniske tabeller med staff-DELETE-policies som i prod (før 20261013190000)
CREATE POLICY rm_staff_delete ON resident_medications FOR DELETE TO authenticated USING (org_id = (SELECT org_id FROM care_staff WHERE id = auth.uid()));
CREATE TABLE crisis_alerts (id uuid primary key default gen_random_uuid(), resident_id uuid, org_id uuid);
ALTER TABLE crisis_alerts ENABLE ROW LEVEL SECURITY;
GRANT ALL ON crisis_alerts TO authenticated, anon;
CREATE POLICY crisis_alerts_staff_select ON crisis_alerts FOR SELECT TO authenticated USING (care_staff_can_access_resident(resident_id::text));
CREATE POLICY crisis_alerts_staff_delete ON crisis_alerts FOR DELETE TO authenticated USING (care_staff_can_access_resident(resident_id::text));
CREATE POLICY staff_crisis_alerts_org ON crisis_alerts FOR ALL USING (org_id = (SELECT org_id FROM care_staff WHERE id = auth.uid()));
INSERT INTO crisis_alerts (resident_id, org_id) VALUES ('00000000-0000-0000-0000-0000000000b1','00000000-0000-0000-0000-0000000000a1');
