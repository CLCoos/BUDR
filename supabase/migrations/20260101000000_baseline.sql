--
-- PostgreSQL database dump
--

\restrict ClK9lP0RJHAi3Jgha6A92yCgNsvkDK0buiLPwRw9sCEEKhhfILyu9H6yXppgB86

-- Dumped from database version 17.6
-- Dumped by pg_dump version 18.3

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: -
--

CREATE SCHEMA public;


--
-- Name: SCHEMA public; Type: COMMENT; Schema: -; Owner: -
--

COMMENT ON SCHEMA public IS 'standard public schema';


--
-- Name: award_xp(uuid, text, integer); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.award_xp(p_resident_id uuid, p_activity text, p_xp integer) RETURNS integer
    LANGUAGE plpgsql SECURITY DEFINER
    AS $$
DECLARE
  v_last timestamptz;
  v_total int;
  v_level int;
BEGIN
  -- Get current XP row (upsert)
  INSERT INTO resident_xp(resident_id) VALUES (p_resident_id)
  ON CONFLICT (resident_id) DO NOTHING;

  SELECT
    CASE p_activity
      WHEN 'hum_check'        THEN last_hum_check
      WHEN 'journal'          THEN last_journal
      WHEN 'lys_chat'         THEN last_lys_chat
      WHEN 'plan_completion'  THEN last_plan_completion
    END,
    total_xp
  INTO v_last, v_total
  FROM resident_xp WHERE resident_id = p_resident_id;

  -- Anti-spam: skip if same activity within 1 hour
  IF v_last IS NOT NULL AND v_last > now() - interval '1 hour' THEN
    RETURN v_total;
  END IF;

  v_total := COALESCE(v_total, 0) + p_xp;
  v_level := CASE
    WHEN v_total >= 1000 THEN 5
    WHEN v_total >= 500  THEN 4
    WHEN v_total >= 250  THEN 3
    WHEN v_total >= 100  THEN 2
    ELSE 1
  END;

  UPDATE resident_xp SET
    total_xp = v_total,
    level = v_level,
    last_hum_check        = CASE WHEN p_activity = 'hum_check'       THEN now() ELSE last_hum_check END,
    last_journal          = CASE WHEN p_activity = 'journal'          THEN now() ELSE last_journal END,
    last_lys_chat         = CASE WHEN p_activity = 'lys_chat'        THEN now() ELSE last_lys_chat END,
    last_plan_completion  = CASE WHEN p_activity = 'plan_completion'  THEN now() ELSE last_plan_completion END,
    updated_at = now()
  WHERE resident_id = p_resident_id;

  RETURN v_total;
END;
$$;


--
-- Name: care_is_portal_staff(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.care_is_portal_staff() RETURNS boolean
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.care_staff WHERE id = auth.uid()
  )
$$;


--
-- Name: care_staff_can_access_resident(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.care_staff_can_access_resident(p_resident_id text) RETURNS boolean
    LANGUAGE sql STABLE
    SET search_path TO 'public'
    AS $$
  SELECT
    care_is_portal_staff()
    AND EXISTS (
      SELECT 1
      FROM public.care_residents cr
      WHERE cr.user_id::text = p_resident_id
        AND cr.org_id IS NOT NULL
        AND cr.org_id = ANY (public.care_visible_facility_ids())
    );
$$;


--
-- Name: care_visible_facility_ids(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.care_visible_facility_ids() RETURNS uuid[]
    LANGUAGE sql STABLE SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
  SELECT ARRAY(
    SELECT org_id FROM public.care_staff WHERE id = auth.uid()
  )
$$;


--
-- Name: create_audit_log(text, text, uuid, uuid, text, uuid, jsonb, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.create_audit_log(p_actor_type text, p_action text, p_actor_id uuid DEFAULT NULL::uuid, p_actor_org_id uuid DEFAULT NULL::uuid, p_target_table text DEFAULT NULL::text, p_target_id uuid DEFAULT NULL::uuid, p_metadata jsonb DEFAULT NULL::jsonb, p_ip_address text DEFAULT NULL::text) RETURNS void
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.audit_logs (
    actor_type,
    actor_id,
    actor_org_id,
    action,
    target_table,
    target_id,
    metadata,
    ip_address
  ) VALUES (
    p_actor_type,
    p_actor_id,
    p_actor_org_id,
    p_action,
    p_target_table,
    p_target_id,
    p_metadata,
    p_ip_address
  );
END;
$$;


--
-- Name: org_roles_seed_defaults_after_org_insert(); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.org_roles_seed_defaults_after_org_insert() RETURNS trigger
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
BEGIN
  INSERT INTO public.org_roles (org_id, name, is_system_role, permissions)
  VALUES
    (NEW.id, 'leder', true, ARRAY[
      'view_dashboard','view_residents','write_journal','view_journal','view_360',
      'write_handover','view_handover','send_messages','view_messages','view_medications',
      'view_concern_notes','write_concern_notes','view_crisis_plans','write_medications',
      'approve_journal','view_park_plans','edit_park_plans','manage_shifts',
      'view_salary_estimate','invite_staff','manage_roles','import_residents',
      'view_audit_log','manage_residents'
    ]::text[]),
    (NEW.id, 'medarbejder', true, ARRAY[
      'view_dashboard','view_residents','write_journal','view_journal','view_360',
      'write_handover','view_handover','send_messages','view_messages','view_medications',
      'view_concern_notes','write_concern_notes','view_crisis_plans','view_park_plans'
    ]::text[]),
    (NEW.id, 'gæst', true, ARRAY[
      'view_dashboard','view_residents','view_journal','view_handover','view_messages'
    ]::text[])
  ON CONFLICT (org_id, name) DO NOTHING;
  RETURN NEW;
END;
$$;


--
-- Name: set_resident_pin(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.set_resident_pin(p_resident_id uuid, p_pin text) RETURNS void
    LANGUAGE sql SECURITY DEFINER
    AS $$
  INSERT INTO public.resident_pins (resident_id, pin_hash)
  VALUES (p_resident_id, crypt(p_pin, gen_salt('bf', 12)))
  ON CONFLICT (resident_id)
  DO UPDATE SET pin_hash = EXCLUDED.pin_hash, updated_at = now();
$$;


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: shared_lys_sessions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shared_lys_sessions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    session_code text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    support_user_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: shared_lys_join_session(text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.shared_lys_join_session(p_session_code text) RETURNS SETOF public.shared_lys_sessions
    LANGUAGE plpgsql SECURITY DEFINER
    SET search_path TO 'public'
    AS $$
DECLARE
  uid uuid := auth.uid();
  rec public.shared_lys_sessions%ROWTYPE;
BEGIN
  IF uid IS NULL OR p_session_code IS NULL OR length(trim(p_session_code)) = 0 THEN
    RETURN;
  END IF;

  SELECT * INTO rec
  FROM public.shared_lys_sessions
  WHERE upper(session_code) = upper(trim(p_session_code))
    AND is_active = true;

  IF NOT FOUND THEN
    RETURN;
  END IF;

  IF rec.user_id = uid THEN
    RETURN QUERY SELECT rec.*;
    RETURN;
  END IF;

  IF rec.support_user_id IS NOT NULL AND rec.support_user_id <> uid THEN
    RETURN;
  END IF;

  UPDATE public.shared_lys_sessions
  SET support_user_id = uid
  WHERE id = rec.id;

  SELECT * INTO rec FROM public.shared_lys_sessions WHERE id = rec.id;
  RETURN QUERY SELECT rec.*;
END;
$$;


--
-- Name: verify_resident_pin(uuid, text); Type: FUNCTION; Schema: public; Owner: -
--

CREATE FUNCTION public.verify_resident_pin(p_resident_id uuid, p_pin text) RETURNS boolean
    LANGUAGE sql SECURITY DEFINER
    AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.resident_pins
    WHERE resident_id = p_resident_id
    AND pin_hash = extensions.crypt(p_pin, pin_hash)
  );
$$;


--
-- Name: ai_daily_usage; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.ai_daily_usage (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id uuid NOT NULL,
    usage_date date NOT NULL,
    call_count integer DEFAULT 0 NOT NULL
);


--
-- Name: audit_logs; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.audit_logs (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    actor_type text NOT NULL,
    actor_id uuid,
    actor_org_id uuid,
    action text NOT NULL,
    target_table text,
    target_id uuid,
    metadata jsonb,
    ip_address text,
    CONSTRAINT audit_logs_action_check CHECK ((action = ANY (ARRAY['plan_proposal.approved'::text, 'plan_proposal.rejected'::text, 'daily_plan.created'::text, 'daily_plan.updated'::text, 'resident.created'::text, 'resident.updated'::text, 'resident_pin.changed'::text, 'resident.login'::text, 'resident.login_failed'::text, 'staff.login'::text, 'staff.logout'::text, 'staff.invite'::text, 'staff.registered'::text, 'org.created'::text, 'journal.entry_created'::text, 'checkin.submitted'::text]))),
    CONSTRAINT audit_logs_actor_type_check CHECK ((actor_type = ANY (ARRAY['care_staff'::text, 'resident'::text, 'system'::text])))
);


--
-- Name: care_challenge_completions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.care_challenge_completions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    resident_user_id uuid NOT NULL,
    challenge_id text NOT NULL,
    completed_date date NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: care_concern_notes; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.care_concern_notes (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    resident_id text NOT NULL,
    note text NOT NULL,
    category text NOT NULL,
    severity smallint NOT NULL,
    staff_name text DEFAULT ''::text NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    org_id uuid,
    CONSTRAINT care_concern_notes_note_check CHECK ((char_length(note) <= 2000)),
    CONSTRAINT care_concern_notes_severity_check CHECK (((severity >= 1) AND (severity <= 10)))
);


--
-- Name: care_planner_entries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.care_planner_entries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    org_id uuid,
    title text NOT NULL,
    category text DEFAULT ''::text NOT NULL,
    starts_at timestamp with time zone NOT NULL,
    ends_at timestamp with time zone NOT NULL,
    visible_to_resident boolean DEFAULT true NOT NULL,
    resident_user_id uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: care_portal_notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.care_portal_notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    resident_id uuid NOT NULL,
    type text NOT NULL,
    detail text NOT NULL,
    severity text NOT NULL,
    source_table text,
    source_id uuid,
    acknowledged_by uuid,
    acknowledged_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    org_id uuid,
    CONSTRAINT care_portal_notifications_severity_check CHECK ((severity = ANY (ARRAY['gul'::text, 'roed'::text]))),
    CONSTRAINT care_portal_notifications_type_check CHECK ((type = ANY (ARRAY['lav_stemning'::text, 'krise'::text, 'besked'::text, 'inaktivitet'::text])))
);


--
-- Name: care_residents; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.care_residents (
    user_id uuid DEFAULT gen_random_uuid() NOT NULL,
    display_name text NOT NULL,
    onboarding_data jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    org_id uuid,
    nickname text,
    preferred_language text DEFAULT 'da'::text,
    color_theme text DEFAULT 'purple'::text,
    avatar_url text,
    simple_mode boolean DEFAULT false NOT NULL,
    first_name text,
    last_name text,
    lys_voice_id text,
    lys_voice_autoplay boolean DEFAULT false,
    lys_voice_intro_played_at timestamp with time zone
);


--
-- Name: COLUMN care_residents.lys_voice_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.care_residents.lys_voice_id IS 'ElevenLabs voice ID som beboeren har valgt. NULL = brug organisations default eller app-fallback.';


--
-- Name: COLUMN care_residents.lys_voice_autoplay; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.care_residents.lys_voice_autoplay IS 'Hvis true, afspilles AI-svar automatisk (efter brugerinteraktion).';


--
-- Name: COLUMN care_residents.lys_voice_intro_played_at; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.care_residents.lys_voice_intro_played_at IS 'Første gang voice-intro blev vist/spillet. NULL = aldrig.';


--
-- Name: care_staff; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.care_staff (
    id uuid NOT NULL,
    org_id uuid NOT NULL,
    full_name text NOT NULL,
    role text DEFAULT 'medarbejder'::text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    role_id uuid,
    CONSTRAINT care_staff_role_check CHECK ((role = ANY (ARRAY['leder'::text, 'medarbejder'::text])))
);


--
-- Name: celebration_notifications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.celebration_notifications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id text NOT NULL,
    contact_id text NOT NULL,
    message text NOT NULL,
    emoji text DEFAULT '🎉'::text NOT NULL,
    is_read boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: crisis_alerts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.crisis_alerts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    resident_id uuid NOT NULL,
    triggered_at timestamp with time zone DEFAULT now() NOT NULL,
    status text DEFAULT 'active'::text NOT NULL,
    trin integer NOT NULL,
    acknowledged_by uuid,
    acknowledged_at timestamp with time zone,
    resolved_at timestamp with time zone,
    notes text,
    org_id uuid,
    CONSTRAINT crisis_alerts_status_check CHECK ((status = ANY (ARRAY['active'::text, 'acknowledged'::text, 'resolved'::text]))),
    CONSTRAINT crisis_alerts_trin_check CHECK (((trin >= 1) AND (trin <= 5)))
);


--
-- Name: crisis_plans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.crisis_plans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    resident_id uuid NOT NULL,
    warning_signs text[] DEFAULT '{}'::text[] NOT NULL,
    helpful_strategies text[] DEFAULT '{}'::text[] NOT NULL,
    steps jsonb DEFAULT '[]'::jsonb NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid
);


--
-- Name: daily_checkins; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.daily_checkins (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    profile_id text NOT NULL,
    user_id text,
    mood_score integer NOT NULL,
    what_filled_today text,
    checked_in_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT daily_checkins_mood_score_check CHECK (((mood_score >= 1) AND (mood_score <= 10)))
);


--
-- Name: daily_plans; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.daily_plans (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    resident_id uuid NOT NULL,
    org_id uuid,
    date date DEFAULT CURRENT_DATE NOT NULL,
    plan_items jsonb DEFAULT '[]'::jsonb NOT NULL,
    approved_by uuid,
    approved_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: facility_contacts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.facility_contacts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    facility_id uuid NOT NULL,
    label text NOT NULL,
    phone text NOT NULL,
    available_hours text,
    sort_order integer DEFAULT 0 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: garden_plots; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.garden_plots (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    resident_id text NOT NULL,
    facility_id uuid,
    slot_index integer NOT NULL,
    plant_type text DEFAULT 'flower'::text NOT NULL,
    plant_name text DEFAULT ''::text NOT NULL,
    goal_text text DEFAULT ''::text NOT NULL,
    park_goal_id uuid,
    growth_stage integer DEFAULT 0 NOT NULL,
    total_water integer DEFAULT 0 NOT NULL,
    last_watered_at timestamp with time zone,
    is_park_linked boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT garden_plots_growth_stage_check CHECK (((growth_stage >= 0) AND (growth_stage <= 4))),
    CONSTRAINT garden_plots_plant_type_check CHECK ((plant_type = ANY (ARRAY['tree'::text, 'flower'::text, 'herb'::text, 'bush'::text, 'vegetable'::text]))),
    CONSTRAINT garden_plots_slot_index_check CHECK (((slot_index >= 0) AND (slot_index <= 5)))
);


--
-- Name: goals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.goals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    profile_id text NOT NULL,
    goal_text text NOT NULL,
    current_score integer DEFAULT 5 NOT NULL,
    next_step text DEFAULT ''::text NOT NULL,
    is_active boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: journal_entries; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.journal_entries (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    resident_id uuid NOT NULL,
    staff_id uuid,
    staff_name text DEFAULT 'Personale'::text NOT NULL,
    entry_text text NOT NULL,
    category text DEFAULT 'observation'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    show_in_diary boolean DEFAULT true NOT NULL,
    org_id uuid
);


--
-- Name: COLUMN journal_entries.show_in_diary; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.journal_entries.show_in_diary IS 'Når true vises notatet på Dagens dagbog for dags dato (København).';


--
-- Name: lys_conversations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.lys_conversations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    resident_id uuid NOT NULL,
    title text,
    messages jsonb DEFAULT '[]'::jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: marketing_contact_submissions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.marketing_contact_submissions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    name text NOT NULL,
    institution text NOT NULL,
    role text NOT NULL,
    message text NOT NULL,
    source text DEFAULT 'marketing'::text NOT NULL,
    referrer text,
    user_agent text,
    client_ip text
);


--
-- Name: TABLE marketing_contact_submissions; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON TABLE public.marketing_contact_submissions IS 'Marketing/contact form posts; RLS uden policies — kun service role/admin.';


--
-- Name: marketing_content_blocks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.marketing_content_blocks (
    key text NOT NULL,
    draft jsonb DEFAULT '{}'::jsonb NOT NULL,
    published jsonb,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_by uuid,
    published_at timestamp with time zone,
    published_by uuid
);


--
-- Name: medication_reminders; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.medication_reminders (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    resident_id uuid NOT NULL,
    scheduled_time time without time zone NOT NULL,
    label text NOT NULL,
    taken_at timestamp with time zone,
    date date DEFAULT CURRENT_DATE NOT NULL,
    created_by uuid,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: on_call_staff; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.on_call_staff (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    org_id uuid NOT NULL,
    staff_id uuid NOT NULL,
    phone text NOT NULL,
    date date DEFAULT CURRENT_DATE NOT NULL,
    shift text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT on_call_staff_shift_check CHECK ((shift = ANY (ARRAY['day'::text, 'evening'::text, 'night'::text])))
);


--
-- Name: org_roles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.org_roles (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    org_id uuid NOT NULL,
    name text NOT NULL,
    is_system_role boolean DEFAULT false NOT NULL,
    permissions text[] DEFAULT '{}'::text[] NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: organisations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.organisations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    name text NOT NULL,
    slug text NOT NULL,
    logo_url text,
    primary_color text DEFAULT '#1D9E75'::text NOT NULL,
    invite_code text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    deactivated_at timestamp with time zone,
    resident_name_display_mode text DEFAULT 'first_name_initial'::text NOT NULL,
    lys_default_voice_id text,
    CONSTRAINT organisations_resident_name_display_mode_check CHECK ((resident_name_display_mode = ANY (ARRAY['first_name_initial'::text, 'full_name'::text, 'initials_only'::text])))
);


--
-- Name: COLUMN organisations.lys_default_voice_id; Type: COMMENT; Schema: public; Owner: -
--

COMMENT ON COLUMN public.organisations.lys_default_voice_id IS 'Standard ElevenLabs voice ID for nye beboere i organisationen.';


--
-- Name: park_daily_checkin; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.park_daily_checkin (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    resident_id text NOT NULL,
    mood_score integer NOT NULL,
    traffic_light text NOT NULL,
    note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    voice_transcript text,
    ai_summary text,
    CONSTRAINT park_daily_checkin_mood_score_check CHECK (((mood_score >= 1) AND (mood_score <= 10))),
    CONSTRAINT park_daily_checkin_traffic_light_check CHECK ((traffic_light = ANY (ARRAY['grøn'::text, 'gul'::text, 'rød'::text])))
);


--
-- Name: park_goal_steps; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.park_goal_steps (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    goal_id uuid NOT NULL,
    step_number integer NOT NULL,
    title text NOT NULL,
    description text,
    completed boolean DEFAULT false NOT NULL,
    completed_at timestamp with time zone,
    resident_note text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: park_goals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.park_goals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    resident_id text NOT NULL,
    created_by_staff uuid,
    title text NOT NULL,
    description text,
    target_date date,
    status text DEFAULT 'active'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: park_resource_profile; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.park_resource_profile (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    resident_id text NOT NULL,
    petal_social text,
    petal_activities text,
    petal_strengths text,
    petal_support text,
    petal_body text,
    petal_values text,
    petal_history text,
    petal_dreams text,
    version integer DEFAULT 1 NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: park_thought_catch; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.park_thought_catch (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    resident_id text NOT NULL,
    situation text NOT NULL,
    automatic_thought text NOT NULL,
    emotion text,
    emotion_score integer,
    counter_thought text,
    outcome_score integer,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: park_traffic_alerts; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.park_traffic_alerts (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    resident_id text NOT NULL,
    triggered_from text NOT NULL,
    color text NOT NULL,
    note text,
    acknowledged_by uuid,
    acknowledged_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: plan_proposals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.plan_proposals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    resident_id uuid NOT NULL,
    org_id uuid,
    date date DEFAULT CURRENT_DATE NOT NULL,
    proposed_items jsonb DEFAULT '[]'::jsonb NOT NULL,
    ai_reasoning text,
    status text DEFAULT 'pending'::text NOT NULL,
    reviewed_by uuid,
    reviewed_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT plan_proposals_status_check CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'rejected'::text])))
);

ALTER TABLE ONLY public.plan_proposals REPLICA IDENTITY FULL;


--
-- Name: portal_message_threads; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.portal_message_threads (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    org_id text NOT NULL,
    channel text NOT NULL,
    thread_type text DEFAULT 'intern'::text NOT NULL,
    subject text NOT NULL,
    created_by uuid,
    created_by_name text,
    created_at timestamp with time zone DEFAULT now(),
    last_message_at timestamp with time zone DEFAULT now(),
    last_message_preview text,
    pinned boolean DEFAULT false
);


--
-- Name: portal_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.portal_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    thread_id uuid,
    org_id text NOT NULL,
    sender_id uuid,
    sender_name text NOT NULL,
    sender_initials text NOT NULL,
    body text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    is_read boolean DEFAULT false
);


--
-- Name: push_subscriptions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.push_subscriptions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    resident_id uuid NOT NULL,
    subscription jsonb NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: resident_badges; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.resident_badges (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    resident_id uuid NOT NULL,
    badge_key text NOT NULL,
    earned_at timestamp with time zone DEFAULT now() NOT NULL,
    org_id uuid
);


--
-- Name: resident_medications; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.resident_medications (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    resident_id uuid NOT NULL,
    name text NOT NULL,
    dose text NOT NULL,
    frequency text NOT NULL,
    time_label text NOT NULL,
    time_group text NOT NULL,
    prescribed_by text NOT NULL,
    notes text,
    status text DEFAULT 'aktiv'::text NOT NULL,
    created_at timestamp with time zone DEFAULT now(),
    org_id uuid,
    CONSTRAINT resident_medications_status_check CHECK ((status = ANY (ARRAY['aktiv'::text, 'pauseret'::text, 'stoppet'::text]))),
    CONSTRAINT resident_medications_time_group_check CHECK ((time_group = ANY (ARRAY['morgen'::text, 'middag'::text, 'aften'::text, 'behoev'::text])))
);


--
-- Name: resident_plan_completions; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.resident_plan_completions (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    resident_id uuid NOT NULL,
    plan_item_id uuid,
    completion_date date DEFAULT CURRENT_DATE NOT NULL,
    completed_at timestamp with time zone DEFAULT now() NOT NULL,
    xp_awarded integer DEFAULT 5 NOT NULL
);


--
-- Name: resident_plan_items; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.resident_plan_items (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    resident_id uuid NOT NULL,
    facility_id uuid,
    title text NOT NULL,
    category text DEFAULT 'aktivitet'::text NOT NULL,
    emoji text,
    time_of_day time without time zone NOT NULL,
    recurrence text DEFAULT 'none'::text NOT NULL,
    recurrence_days integer[] DEFAULT '{}'::integer[],
    recurrence_week_parity text DEFAULT 'all'::text,
    notify boolean DEFAULT false NOT NULL,
    notify_minutes_before integer DEFAULT 10 NOT NULL,
    created_by text DEFAULT 'resident'::text NOT NULL,
    staff_suggestion boolean DEFAULT false NOT NULL,
    approved_by_resident boolean DEFAULT true NOT NULL,
    active_from date DEFAULT CURRENT_DATE NOT NULL,
    active_until date,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    org_id uuid,
    CONSTRAINT resident_plan_items_created_by_check CHECK ((created_by = ANY (ARRAY['resident'::text, 'staff'::text]))),
    CONSTRAINT resident_plan_items_recurrence_check CHECK ((recurrence = ANY (ARRAY['none'::text, 'daily'::text, 'weekly'::text, 'biweekly'::text, 'custom'::text]))),
    CONSTRAINT resident_plan_items_recurrence_week_parity_check CHECK ((recurrence_week_parity = ANY (ARRAY['all'::text, 'odd'::text, 'even'::text])))
);


--
-- Name: resident_xp; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.resident_xp (
    resident_id uuid NOT NULL,
    total_xp integer DEFAULT 0 NOT NULL,
    level integer DEFAULT 1 NOT NULL,
    last_hum_check timestamp with time zone,
    last_journal timestamp with time zone,
    last_lys_chat timestamp with time zone,
    last_plan_completion timestamp with time zone,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: resource_registrations; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.resource_registrations (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    profile_id text NOT NULL,
    week_number integer NOT NULL,
    year integer NOT NULL,
    category text NOT NULL,
    what_went_well text,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: shared_goals; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shared_goals (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    user_id text NOT NULL,
    contact_id text NOT NULL,
    title text NOT NULL,
    description text,
    progress integer DEFAULT 0 NOT NULL,
    is_completed boolean DEFAULT false NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: shared_lys_events; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.shared_lys_events (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    session_id uuid NOT NULL,
    sender_id uuid NOT NULL,
    event_type text NOT NULL,
    color text,
    message text,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT shared_lys_events_type_check CHECK ((event_type = ANY (ARRAY['color'::text, 'message'::text])))
);


--
-- Name: support_messages; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.support_messages (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    sender_id text NOT NULL,
    contact_id text NOT NULL,
    content text NOT NULL,
    is_from_user boolean DEFAULT true NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: thought_checks; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.thought_checks (
    id uuid DEFAULT gen_random_uuid() NOT NULL,
    profile_id text NOT NULL,
    troubling_thought text NOT NULL,
    counter_thought text NOT NULL,
    created_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: user_profiles; Type: TABLE; Schema: public; Owner: -
--

CREATE TABLE public.user_profiles (
    id uuid NOT NULL,
    role text DEFAULT 'user'::text NOT NULL,
    memory_payload jsonb,
    updated_at timestamp with time zone DEFAULT now() NOT NULL
);


--
-- Name: ai_daily_usage ai_daily_usage_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_daily_usage
    ADD CONSTRAINT ai_daily_usage_pkey PRIMARY KEY (id);


--
-- Name: ai_daily_usage ai_daily_usage_user_id_usage_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_daily_usage
    ADD CONSTRAINT ai_daily_usage_user_id_usage_date_key UNIQUE (user_id, usage_date);


--
-- Name: audit_logs audit_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_pkey PRIMARY KEY (id);


--
-- Name: care_challenge_completions care_challenge_completions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.care_challenge_completions
    ADD CONSTRAINT care_challenge_completions_pkey PRIMARY KEY (id);


--
-- Name: care_challenge_completions care_challenge_completions_resident_user_id_challenge_id_co_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.care_challenge_completions
    ADD CONSTRAINT care_challenge_completions_resident_user_id_challenge_id_co_key UNIQUE (resident_user_id, challenge_id, completed_date);


--
-- Name: care_concern_notes care_concern_notes_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.care_concern_notes
    ADD CONSTRAINT care_concern_notes_pkey PRIMARY KEY (id);


--
-- Name: care_planner_entries care_planner_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.care_planner_entries
    ADD CONSTRAINT care_planner_entries_pkey PRIMARY KEY (id);


--
-- Name: care_portal_notifications care_portal_notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.care_portal_notifications
    ADD CONSTRAINT care_portal_notifications_pkey PRIMARY KEY (id);


--
-- Name: care_residents care_residents_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.care_residents
    ADD CONSTRAINT care_residents_pkey PRIMARY KEY (user_id);


--
-- Name: care_staff care_staff_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.care_staff
    ADD CONSTRAINT care_staff_pkey PRIMARY KEY (id);


--
-- Name: celebration_notifications celebration_notifications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.celebration_notifications
    ADD CONSTRAINT celebration_notifications_pkey PRIMARY KEY (id);


--
-- Name: crisis_alerts crisis_alerts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crisis_alerts
    ADD CONSTRAINT crisis_alerts_pkey PRIMARY KEY (id);


--
-- Name: crisis_plans crisis_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crisis_plans
    ADD CONSTRAINT crisis_plans_pkey PRIMARY KEY (id);


--
-- Name: daily_checkins daily_checkins_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_checkins
    ADD CONSTRAINT daily_checkins_pkey PRIMARY KEY (id);


--
-- Name: daily_plans daily_plans_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_plans
    ADD CONSTRAINT daily_plans_pkey PRIMARY KEY (id);


--
-- Name: daily_plans daily_plans_resident_id_date_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_plans
    ADD CONSTRAINT daily_plans_resident_id_date_key UNIQUE (resident_id, date);


--
-- Name: facility_contacts facility_contacts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.facility_contacts
    ADD CONSTRAINT facility_contacts_pkey PRIMARY KEY (id);


--
-- Name: garden_plots garden_plots_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.garden_plots
    ADD CONSTRAINT garden_plots_pkey PRIMARY KEY (id);


--
-- Name: garden_plots garden_plots_resident_id_slot_index_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.garden_plots
    ADD CONSTRAINT garden_plots_resident_id_slot_index_key UNIQUE (resident_id, slot_index);


--
-- Name: goals goals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.goals
    ADD CONSTRAINT goals_pkey PRIMARY KEY (id);


--
-- Name: journal_entries journal_entries_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.journal_entries
    ADD CONSTRAINT journal_entries_pkey PRIMARY KEY (id);


--
-- Name: lys_conversations lys_conversations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lys_conversations
    ADD CONSTRAINT lys_conversations_pkey PRIMARY KEY (id);


--
-- Name: marketing_contact_submissions marketing_contact_submissions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketing_contact_submissions
    ADD CONSTRAINT marketing_contact_submissions_pkey PRIMARY KEY (id);


--
-- Name: marketing_content_blocks marketing_content_blocks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketing_content_blocks
    ADD CONSTRAINT marketing_content_blocks_pkey PRIMARY KEY (key);


--
-- Name: medication_reminders medication_reminders_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.medication_reminders
    ADD CONSTRAINT medication_reminders_pkey PRIMARY KEY (id);


--
-- Name: on_call_staff on_call_staff_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.on_call_staff
    ADD CONSTRAINT on_call_staff_pkey PRIMARY KEY (id);


--
-- Name: org_roles org_roles_org_id_name_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_roles
    ADD CONSTRAINT org_roles_org_id_name_key UNIQUE (org_id, name);


--
-- Name: org_roles org_roles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_roles
    ADD CONSTRAINT org_roles_pkey PRIMARY KEY (id);


--
-- Name: organisations organisations_invite_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organisations
    ADD CONSTRAINT organisations_invite_code_key UNIQUE (invite_code);


--
-- Name: organisations organisations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organisations
    ADD CONSTRAINT organisations_pkey PRIMARY KEY (id);


--
-- Name: organisations organisations_slug_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.organisations
    ADD CONSTRAINT organisations_slug_key UNIQUE (slug);


--
-- Name: park_daily_checkin park_daily_checkin_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.park_daily_checkin
    ADD CONSTRAINT park_daily_checkin_pkey PRIMARY KEY (id);


--
-- Name: park_goal_steps park_goal_steps_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.park_goal_steps
    ADD CONSTRAINT park_goal_steps_pkey PRIMARY KEY (id);


--
-- Name: park_goals park_goals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.park_goals
    ADD CONSTRAINT park_goals_pkey PRIMARY KEY (id);


--
-- Name: park_resource_profile park_resource_profile_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.park_resource_profile
    ADD CONSTRAINT park_resource_profile_pkey PRIMARY KEY (id);


--
-- Name: park_thought_catch park_thought_catch_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.park_thought_catch
    ADD CONSTRAINT park_thought_catch_pkey PRIMARY KEY (id);


--
-- Name: park_traffic_alerts park_traffic_alerts_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.park_traffic_alerts
    ADD CONSTRAINT park_traffic_alerts_pkey PRIMARY KEY (id);


--
-- Name: plan_proposals plan_proposals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_proposals
    ADD CONSTRAINT plan_proposals_pkey PRIMARY KEY (id);


--
-- Name: portal_message_threads portal_message_threads_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.portal_message_threads
    ADD CONSTRAINT portal_message_threads_pkey PRIMARY KEY (id);


--
-- Name: portal_messages portal_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.portal_messages
    ADD CONSTRAINT portal_messages_pkey PRIMARY KEY (id);


--
-- Name: push_subscriptions push_subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.push_subscriptions
    ADD CONSTRAINT push_subscriptions_pkey PRIMARY KEY (id);


--
-- Name: push_subscriptions push_subscriptions_resident_id_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.push_subscriptions
    ADD CONSTRAINT push_subscriptions_resident_id_key UNIQUE (resident_id);


--
-- Name: resident_badges resident_badges_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resident_badges
    ADD CONSTRAINT resident_badges_pkey PRIMARY KEY (id);


--
-- Name: resident_medications resident_medications_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resident_medications
    ADD CONSTRAINT resident_medications_pkey PRIMARY KEY (id);


--
-- Name: resident_plan_completions resident_plan_completions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resident_plan_completions
    ADD CONSTRAINT resident_plan_completions_pkey PRIMARY KEY (id);


--
-- Name: resident_plan_items resident_plan_items_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resident_plan_items
    ADD CONSTRAINT resident_plan_items_pkey PRIMARY KEY (id);


--
-- Name: resident_xp resident_xp_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resident_xp
    ADD CONSTRAINT resident_xp_pkey PRIMARY KEY (resident_id);


--
-- Name: resource_registrations resource_registrations_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resource_registrations
    ADD CONSTRAINT resource_registrations_pkey PRIMARY KEY (id);


--
-- Name: shared_goals shared_goals_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shared_goals
    ADD CONSTRAINT shared_goals_pkey PRIMARY KEY (id);


--
-- Name: shared_lys_events shared_lys_events_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shared_lys_events
    ADD CONSTRAINT shared_lys_events_pkey PRIMARY KEY (id);


--
-- Name: shared_lys_sessions shared_lys_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shared_lys_sessions
    ADD CONSTRAINT shared_lys_sessions_pkey PRIMARY KEY (id);


--
-- Name: shared_lys_sessions shared_lys_sessions_session_code_key; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shared_lys_sessions
    ADD CONSTRAINT shared_lys_sessions_session_code_key UNIQUE (session_code);


--
-- Name: support_messages support_messages_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.support_messages
    ADD CONSTRAINT support_messages_pkey PRIMARY KEY (id);


--
-- Name: thought_checks thought_checks_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.thought_checks
    ADD CONSTRAINT thought_checks_pkey PRIMARY KEY (id);


--
-- Name: user_profiles user_profiles_pkey; Type: CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_pkey PRIMARY KEY (id);


--
-- Name: audit_logs_org_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_logs_org_created_at_idx ON public.audit_logs USING btree (actor_org_id, created_at DESC);


--
-- Name: audit_logs_target_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX audit_logs_target_idx ON public.audit_logs USING btree (target_table, target_id);


--
-- Name: care_challenge_completions_resident_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX care_challenge_completions_resident_idx ON public.care_challenge_completions USING btree (resident_user_id, completed_date DESC);


--
-- Name: care_concern_notes_resident_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX care_concern_notes_resident_created_idx ON public.care_concern_notes USING btree (resident_id, created_at DESC);


--
-- Name: care_planner_entries_resident_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX care_planner_entries_resident_idx ON public.care_planner_entries USING btree (resident_user_id) WHERE (resident_user_id IS NOT NULL);


--
-- Name: care_planner_entries_window_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX care_planner_entries_window_idx ON public.care_planner_entries USING btree (starts_at, visible_to_resident);


--
-- Name: care_portal_notifications_created_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX care_portal_notifications_created_idx ON public.care_portal_notifications USING btree (created_at DESC);


--
-- Name: care_portal_notifications_resident_unacked_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX care_portal_notifications_resident_unacked_idx ON public.care_portal_notifications USING btree (resident_id, type) WHERE (acknowledged_at IS NULL);


--
-- Name: celebration_notifications_user_contact_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX celebration_notifications_user_contact_idx ON public.celebration_notifications USING btree (user_id, contact_id, created_at DESC);


--
-- Name: crisis_alerts_resident_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX crisis_alerts_resident_idx ON public.crisis_alerts USING btree (resident_id, triggered_at DESC);


--
-- Name: crisis_alerts_unresolved_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX crisis_alerts_unresolved_idx ON public.crisis_alerts USING btree (status, triggered_at DESC);


--
-- Name: crisis_plans_resident_unique_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX crisis_plans_resident_unique_idx ON public.crisis_plans USING btree (resident_id);


--
-- Name: crisis_plans_updated_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX crisis_plans_updated_at_idx ON public.crisis_plans USING btree (updated_at DESC);


--
-- Name: daily_checkins_profile_checked_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX daily_checkins_profile_checked_idx ON public.daily_checkins USING btree (profile_id, checked_in_at DESC);


--
-- Name: facility_contacts_facility_sort_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX facility_contacts_facility_sort_idx ON public.facility_contacts USING btree (facility_id, sort_order);


--
-- Name: garden_plots_resident_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX garden_plots_resident_idx ON public.garden_plots USING btree (resident_id);


--
-- Name: garden_plots_resident_slot_uidx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX garden_plots_resident_slot_uidx ON public.garden_plots USING btree (resident_id, slot_index);


--
-- Name: goals_profile_active_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX goals_profile_active_idx ON public.goals USING btree (profile_id, created_at DESC);


--
-- Name: idx_cpn_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cpn_created ON public.care_portal_notifications USING btree (created_at DESC);


--
-- Name: idx_cpn_resident_unacked; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_cpn_resident_unacked ON public.care_portal_notifications USING btree (resident_id) WHERE (acknowledged_at IS NULL);


--
-- Name: idx_messages_thread_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_messages_thread_id ON public.portal_messages USING btree (thread_id);


--
-- Name: idx_threads_last_message; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_threads_last_message ON public.portal_message_threads USING btree (last_message_at DESC);


--
-- Name: idx_threads_org_id; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX idx_threads_org_id ON public.portal_message_threads USING btree (org_id);


--
-- Name: journal_entries_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX journal_entries_created_at_idx ON public.journal_entries USING btree (created_at DESC);


--
-- Name: journal_entries_resident_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX journal_entries_resident_id_idx ON public.journal_entries USING btree (resident_id);


--
-- Name: lys_conversations_resident_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX lys_conversations_resident_idx ON public.lys_conversations USING btree (resident_id, updated_at DESC);


--
-- Name: marketing_contact_submissions_created_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX marketing_contact_submissions_created_at_idx ON public.marketing_contact_submissions USING btree (created_at DESC);


--
-- Name: medication_reminders_open_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX medication_reminders_open_idx ON public.medication_reminders USING btree (resident_id, date) WHERE (taken_at IS NULL);


--
-- Name: medication_reminders_resident_date_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX medication_reminders_resident_date_idx ON public.medication_reminders USING btree (resident_id, date, scheduled_time);


--
-- Name: on_call_staff_lookup_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX on_call_staff_lookup_idx ON public.on_call_staff USING btree (org_id, date, shift, created_at DESC);


--
-- Name: on_call_staff_org_date_shift_unique_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX on_call_staff_org_date_shift_unique_idx ON public.on_call_staff USING btree (org_id, date, shift);


--
-- Name: organisations_deactivated_at_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX organisations_deactivated_at_idx ON public.organisations USING btree (deactivated_at);


--
-- Name: park_daily_checkin_resident_created; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX park_daily_checkin_resident_created ON public.park_daily_checkin USING btree (resident_id, created_at DESC);


--
-- Name: park_goal_steps_goal_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX park_goal_steps_goal_idx ON public.park_goal_steps USING btree (goal_id, step_number);


--
-- Name: park_goals_resident_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX park_goals_resident_idx ON public.park_goals USING btree (resident_id, created_at DESC);


--
-- Name: park_resource_profile_resident_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX park_resource_profile_resident_idx ON public.park_resource_profile USING btree (resident_id, version DESC);


--
-- Name: park_thought_catch_resident_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX park_thought_catch_resident_idx ON public.park_thought_catch USING btree (resident_id, created_at DESC);


--
-- Name: park_traffic_alerts_resident_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX park_traffic_alerts_resident_idx ON public.park_traffic_alerts USING btree (resident_id, created_at DESC);


--
-- Name: plan_proposals_org_id_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX plan_proposals_org_id_idx ON public.plan_proposals USING btree (org_id);


--
-- Name: resident_badges_resident_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX resident_badges_resident_idx ON public.resident_badges USING btree (resident_id);


--
-- Name: resident_badges_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX resident_badges_unique ON public.resident_badges USING btree (resident_id, badge_key);


--
-- Name: resident_plan_completions_resident_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX resident_plan_completions_resident_idx ON public.resident_plan_completions USING btree (resident_id, completion_date);


--
-- Name: resident_plan_completions_unique; Type: INDEX; Schema: public; Owner: -
--

CREATE UNIQUE INDEX resident_plan_completions_unique ON public.resident_plan_completions USING btree (resident_id, plan_item_id, completion_date);


--
-- Name: resident_plan_items_resident_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX resident_plan_items_resident_idx ON public.resident_plan_items USING btree (resident_id);


--
-- Name: resource_registrations_profile_week_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX resource_registrations_profile_week_idx ON public.resource_registrations USING btree (profile_id, year, week_number);


--
-- Name: shared_goals_user_contact_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX shared_goals_user_contact_idx ON public.shared_goals USING btree (user_id, contact_id, created_at DESC);


--
-- Name: shared_lys_events_session_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX shared_lys_events_session_idx ON public.shared_lys_events USING btree (session_id, created_at);


--
-- Name: shared_lys_sessions_host_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX shared_lys_sessions_host_idx ON public.shared_lys_sessions USING btree (user_id);


--
-- Name: shared_lys_sessions_support_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX shared_lys_sessions_support_idx ON public.shared_lys_sessions USING btree (support_user_id);


--
-- Name: support_messages_thread_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX support_messages_thread_idx ON public.support_messages USING btree (sender_id, contact_id, created_at);


--
-- Name: thought_checks_profile_idx; Type: INDEX; Schema: public; Owner: -
--

CREATE INDEX thought_checks_profile_idx ON public.thought_checks USING btree (profile_id, created_at DESC);


--
-- Name: organisations trg_org_roles_seed_defaults; Type: TRIGGER; Schema: public; Owner: -
--

CREATE TRIGGER trg_org_roles_seed_defaults AFTER INSERT ON public.organisations FOR EACH ROW EXECUTE FUNCTION public.org_roles_seed_defaults_after_org_insert();


--
-- Name: ai_daily_usage ai_daily_usage_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.ai_daily_usage
    ADD CONSTRAINT ai_daily_usage_user_id_fkey FOREIGN KEY (user_id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: audit_logs audit_logs_actor_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.audit_logs
    ADD CONSTRAINT audit_logs_actor_org_id_fkey FOREIGN KEY (actor_org_id) REFERENCES public.organisations(id);


--
-- Name: care_concern_notes care_concern_notes_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.care_concern_notes
    ADD CONSTRAINT care_concern_notes_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: care_concern_notes care_concern_notes_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.care_concern_notes
    ADD CONSTRAINT care_concern_notes_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organisations(id);


--
-- Name: care_planner_entries care_planner_entries_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.care_planner_entries
    ADD CONSTRAINT care_planner_entries_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organisations(id) ON DELETE CASCADE;


--
-- Name: care_portal_notifications care_portal_notifications_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.care_portal_notifications
    ADD CONSTRAINT care_portal_notifications_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organisations(id);


--
-- Name: care_portal_notifications care_portal_notifications_resident_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.care_portal_notifications
    ADD CONSTRAINT care_portal_notifications_resident_id_fkey FOREIGN KEY (resident_id) REFERENCES public.care_residents(user_id) ON DELETE CASCADE;


--
-- Name: care_residents care_residents_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.care_residents
    ADD CONSTRAINT care_residents_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organisations(id);


--
-- Name: care_staff care_staff_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.care_staff
    ADD CONSTRAINT care_staff_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: care_staff care_staff_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.care_staff
    ADD CONSTRAINT care_staff_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organisations(id);


--
-- Name: care_staff care_staff_role_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.care_staff
    ADD CONSTRAINT care_staff_role_id_fkey FOREIGN KEY (role_id) REFERENCES public.org_roles(id);


--
-- Name: crisis_alerts crisis_alerts_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.crisis_alerts
    ADD CONSTRAINT crisis_alerts_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organisations(id);


--
-- Name: daily_plans daily_plans_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_plans
    ADD CONSTRAINT daily_plans_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES auth.users(id);


--
-- Name: daily_plans daily_plans_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_plans
    ADD CONSTRAINT daily_plans_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organisations(id);


--
-- Name: daily_plans daily_plans_resident_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.daily_plans
    ADD CONSTRAINT daily_plans_resident_id_fkey FOREIGN KEY (resident_id) REFERENCES public.care_residents(user_id) ON DELETE CASCADE;


--
-- Name: journal_entries journal_entries_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.journal_entries
    ADD CONSTRAINT journal_entries_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organisations(id);


--
-- Name: lys_conversations lys_conversations_resident_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.lys_conversations
    ADD CONSTRAINT lys_conversations_resident_id_fkey FOREIGN KEY (resident_id) REFERENCES public.care_residents(user_id) ON DELETE CASCADE;


--
-- Name: marketing_content_blocks marketing_content_blocks_published_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketing_content_blocks
    ADD CONSTRAINT marketing_content_blocks_published_by_fkey FOREIGN KEY (published_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: marketing_content_blocks marketing_content_blocks_updated_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.marketing_content_blocks
    ADD CONSTRAINT marketing_content_blocks_updated_by_fkey FOREIGN KEY (updated_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: on_call_staff on_call_staff_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.on_call_staff
    ADD CONSTRAINT on_call_staff_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organisations(id) ON DELETE CASCADE;


--
-- Name: org_roles org_roles_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.org_roles
    ADD CONSTRAINT org_roles_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organisations(id) ON DELETE CASCADE;


--
-- Name: park_goal_steps park_goal_steps_goal_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.park_goal_steps
    ADD CONSTRAINT park_goal_steps_goal_id_fkey FOREIGN KEY (goal_id) REFERENCES public.park_goals(id) ON DELETE CASCADE;


--
-- Name: park_goals park_goals_created_by_staff_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.park_goals
    ADD CONSTRAINT park_goals_created_by_staff_fkey FOREIGN KEY (created_by_staff) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: park_traffic_alerts park_traffic_alerts_acknowledged_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.park_traffic_alerts
    ADD CONSTRAINT park_traffic_alerts_acknowledged_by_fkey FOREIGN KEY (acknowledged_by) REFERENCES auth.users(id) ON DELETE SET NULL;


--
-- Name: plan_proposals plan_proposals_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_proposals
    ADD CONSTRAINT plan_proposals_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organisations(id);


--
-- Name: plan_proposals plan_proposals_resident_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_proposals
    ADD CONSTRAINT plan_proposals_resident_id_fkey FOREIGN KEY (resident_id) REFERENCES public.care_residents(user_id) ON DELETE CASCADE;


--
-- Name: plan_proposals plan_proposals_reviewed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.plan_proposals
    ADD CONSTRAINT plan_proposals_reviewed_by_fkey FOREIGN KEY (reviewed_by) REFERENCES auth.users(id);


--
-- Name: portal_message_threads portal_message_threads_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.portal_message_threads
    ADD CONSTRAINT portal_message_threads_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users(id);


--
-- Name: portal_messages portal_messages_sender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.portal_messages
    ADD CONSTRAINT portal_messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES auth.users(id);


--
-- Name: portal_messages portal_messages_thread_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.portal_messages
    ADD CONSTRAINT portal_messages_thread_id_fkey FOREIGN KEY (thread_id) REFERENCES public.portal_message_threads(id) ON DELETE CASCADE;


--
-- Name: push_subscriptions push_subscriptions_resident_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.push_subscriptions
    ADD CONSTRAINT push_subscriptions_resident_id_fkey FOREIGN KEY (resident_id) REFERENCES public.care_residents(user_id) ON DELETE CASCADE;


--
-- Name: resident_badges resident_badges_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resident_badges
    ADD CONSTRAINT resident_badges_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organisations(id);


--
-- Name: resident_badges resident_badges_resident_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resident_badges
    ADD CONSTRAINT resident_badges_resident_id_fkey FOREIGN KEY (resident_id) REFERENCES public.care_residents(user_id) ON DELETE CASCADE;


--
-- Name: resident_medications resident_medications_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resident_medications
    ADD CONSTRAINT resident_medications_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organisations(id);


--
-- Name: resident_medications resident_medications_resident_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resident_medications
    ADD CONSTRAINT resident_medications_resident_id_fkey FOREIGN KEY (resident_id) REFERENCES public.care_residents(user_id) ON DELETE CASCADE;


--
-- Name: resident_plan_completions resident_plan_completions_plan_item_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resident_plan_completions
    ADD CONSTRAINT resident_plan_completions_plan_item_id_fkey FOREIGN KEY (plan_item_id) REFERENCES public.resident_plan_items(id) ON DELETE SET NULL;


--
-- Name: resident_plan_completions resident_plan_completions_resident_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resident_plan_completions
    ADD CONSTRAINT resident_plan_completions_resident_id_fkey FOREIGN KEY (resident_id) REFERENCES public.care_residents(user_id) ON DELETE CASCADE;


--
-- Name: resident_plan_items resident_plan_items_org_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resident_plan_items
    ADD CONSTRAINT resident_plan_items_org_id_fkey FOREIGN KEY (org_id) REFERENCES public.organisations(id);


--
-- Name: resident_plan_items resident_plan_items_resident_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resident_plan_items
    ADD CONSTRAINT resident_plan_items_resident_id_fkey FOREIGN KEY (resident_id) REFERENCES public.care_residents(user_id) ON DELETE CASCADE;


--
-- Name: resident_xp resident_xp_resident_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.resident_xp
    ADD CONSTRAINT resident_xp_resident_id_fkey FOREIGN KEY (resident_id) REFERENCES public.care_residents(user_id) ON DELETE CASCADE;


--
-- Name: shared_lys_events shared_lys_events_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.shared_lys_events
    ADD CONSTRAINT shared_lys_events_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.shared_lys_sessions(id) ON DELETE CASCADE;


--
-- Name: user_profiles user_profiles_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: -
--

ALTER TABLE ONLY public.user_profiles
    ADD CONSTRAINT user_profiles_id_fkey FOREIGN KEY (id) REFERENCES auth.users(id) ON DELETE CASCADE;


--
-- Name: resident_medications Authenticated users can insert medications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can insert medications" ON public.resident_medications FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: resident_medications Authenticated users can read medications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can read medications" ON public.resident_medications FOR SELECT TO authenticated USING (true);


--
-- Name: resident_medications Authenticated users can update medications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Authenticated users can update medications" ON public.resident_medications FOR UPDATE TO authenticated USING (true);


--
-- Name: journal_entries Staff can insert journal entries; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can insert journal entries" ON public.journal_entries FOR INSERT TO authenticated WITH CHECK (true);


--
-- Name: journal_entries Staff can read journal entries; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff can read journal entries" ON public.journal_entries FOR SELECT TO authenticated USING (true);


--
-- Name: daily_plans Staff manage plans; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff manage plans" ON public.daily_plans TO authenticated USING (public.care_is_portal_staff()) WITH CHECK (public.care_is_portal_staff());


--
-- Name: plan_proposals Staff review proposals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff review proposals" ON public.plan_proposals FOR UPDATE TO authenticated USING (public.care_is_portal_staff()) WITH CHECK (public.care_is_portal_staff());


--
-- Name: daily_plans Staff see org plans; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff see org plans" ON public.daily_plans FOR SELECT TO authenticated USING ((public.care_is_portal_staff() AND ((org_id IS NULL) OR (org_id = ANY (public.care_visible_facility_ids())))));


--
-- Name: plan_proposals Staff see org proposals; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "Staff see org proposals" ON public.plan_proposals FOR SELECT TO authenticated USING ((public.care_is_portal_staff() AND ((org_id IS NULL) OR (org_id = ANY (public.care_visible_facility_ids())))));


--
-- Name: ai_daily_usage adu_self_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY adu_self_select ON public.ai_daily_usage FOR SELECT TO authenticated USING ((auth.uid() = user_id));


--
-- Name: ai_daily_usage; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.ai_daily_usage ENABLE ROW LEVEL SECURITY;

--
-- Name: garden_plots anon_all_plots; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY anon_all_plots ON public.garden_plots TO authenticated, anon USING (true) WITH CHECK (true);


--
-- Name: facility_contacts anon_read_facility_contacts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY anon_read_facility_contacts ON public.facility_contacts FOR SELECT TO authenticated, anon USING (true);


--
-- Name: audit_logs; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

--
-- Name: care_challenge_completions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.care_challenge_completions ENABLE ROW LEVEL SECURITY;

--
-- Name: care_concern_notes; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.care_concern_notes ENABLE ROW LEVEL SECURITY;

--
-- Name: care_planner_entries; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.care_planner_entries ENABLE ROW LEVEL SECURITY;

--
-- Name: care_portal_notifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.care_portal_notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: care_residents; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.care_residents ENABLE ROW LEVEL SECURITY;

--
-- Name: care_staff; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.care_staff ENABLE ROW LEVEL SECURITY;

--
-- Name: care_challenge_completions ccc_resident_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ccc_resident_insert ON public.care_challenge_completions FOR INSERT TO authenticated WITH CHECK ((auth.uid() = resident_user_id));


--
-- Name: care_challenge_completions ccc_resident_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ccc_resident_select ON public.care_challenge_completions FOR SELECT TO authenticated USING ((auth.uid() = resident_user_id));


--
-- Name: care_challenge_completions ccc_staff_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ccc_staff_select ON public.care_challenge_completions FOR SELECT TO authenticated USING (public.care_staff_can_access_resident((resident_user_id)::text));


--
-- Name: care_concern_notes ccn_staff_delete_org; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ccn_staff_delete_org ON public.care_concern_notes FOR DELETE TO authenticated USING ((public.care_is_portal_staff() AND (EXISTS ( SELECT 1
   FROM public.care_residents cr
  WHERE (((cr.user_id)::text = care_concern_notes.resident_id) AND (cr.org_id IS NOT NULL) AND (cr.org_id = ANY (public.care_visible_facility_ids())))))));


--
-- Name: care_concern_notes ccn_staff_insert_org; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ccn_staff_insert_org ON public.care_concern_notes FOR INSERT TO authenticated WITH CHECK ((public.care_is_portal_staff() AND (EXISTS ( SELECT 1
   FROM public.care_residents cr
  WHERE (((cr.user_id)::text = care_concern_notes.resident_id) AND (cr.org_id IS NOT NULL) AND (cr.org_id = ANY (public.care_visible_facility_ids())))))));


--
-- Name: care_concern_notes ccn_staff_select_org; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ccn_staff_select_org ON public.care_concern_notes FOR SELECT TO authenticated USING ((public.care_is_portal_staff() AND (EXISTS ( SELECT 1
   FROM public.care_residents cr
  WHERE (((cr.user_id)::text = care_concern_notes.resident_id) AND (cr.org_id IS NOT NULL) AND (cr.org_id = ANY (public.care_visible_facility_ids())))))));


--
-- Name: care_concern_notes ccn_staff_update_org; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ccn_staff_update_org ON public.care_concern_notes FOR UPDATE TO authenticated USING ((public.care_is_portal_staff() AND (EXISTS ( SELECT 1
   FROM public.care_residents cr
  WHERE (((cr.user_id)::text = care_concern_notes.resident_id) AND (cr.org_id IS NOT NULL) AND (cr.org_id = ANY (public.care_visible_facility_ids()))))))) WITH CHECK ((public.care_is_portal_staff() AND (EXISTS ( SELECT 1
   FROM public.care_residents cr
  WHERE (((cr.user_id)::text = care_concern_notes.resident_id) AND (cr.org_id IS NOT NULL) AND (cr.org_id = ANY (public.care_visible_facility_ids())))))));


--
-- Name: celebration_notifications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.celebration_notifications ENABLE ROW LEVEL SECURITY;

--
-- Name: celebration_notifications cn_owner_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cn_owner_insert ON public.celebration_notifications FOR INSERT TO authenticated WITH CHECK (((auth.uid())::text = user_id));


--
-- Name: celebration_notifications cn_owner_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cn_owner_select ON public.celebration_notifications FOR SELECT TO authenticated USING (((auth.uid())::text = user_id));


--
-- Name: celebration_notifications cn_owner_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cn_owner_update ON public.celebration_notifications FOR UPDATE TO authenticated USING (((auth.uid())::text = user_id)) WITH CHECK (((auth.uid())::text = user_id));


--
-- Name: care_planner_entries cpe_resident_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cpe_resident_select ON public.care_planner_entries FOR SELECT TO authenticated USING (((visible_to_resident = true) AND ((resident_user_id = auth.uid()) OR ((resident_user_id IS NULL) AND (org_id IS NOT NULL) AND (EXISTS ( SELECT 1
   FROM public.care_residents cr
  WHERE ((cr.user_id = auth.uid()) AND (cr.org_id = care_planner_entries.org_id))))))));


--
-- Name: care_planner_entries cpe_staff_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cpe_staff_delete ON public.care_planner_entries FOR DELETE TO authenticated USING ((public.care_is_portal_staff() AND (org_id IS NOT NULL) AND (org_id = ANY (public.care_visible_facility_ids()))));


--
-- Name: care_planner_entries cpe_staff_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cpe_staff_insert ON public.care_planner_entries FOR INSERT TO authenticated WITH CHECK ((public.care_is_portal_staff() AND (org_id IS NOT NULL) AND (org_id = ANY (public.care_visible_facility_ids())) AND ((resident_user_id IS NULL) OR public.care_staff_can_access_resident((resident_user_id)::text))));


--
-- Name: care_planner_entries cpe_staff_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cpe_staff_select ON public.care_planner_entries FOR SELECT TO authenticated USING ((public.care_is_portal_staff() AND (org_id IS NOT NULL) AND (org_id = ANY (public.care_visible_facility_ids())) AND ((resident_user_id IS NULL) OR public.care_staff_can_access_resident((resident_user_id)::text))));


--
-- Name: care_planner_entries cpe_staff_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cpe_staff_update ON public.care_planner_entries FOR UPDATE TO authenticated USING ((public.care_is_portal_staff() AND (org_id IS NOT NULL) AND (org_id = ANY (public.care_visible_facility_ids())))) WITH CHECK ((public.care_is_portal_staff() AND (org_id IS NOT NULL) AND (org_id = ANY (public.care_visible_facility_ids())) AND ((resident_user_id IS NULL) OR public.care_staff_can_access_resident((resident_user_id)::text))));


--
-- Name: care_portal_notifications cpn_staff_select_org; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cpn_staff_select_org ON public.care_portal_notifications FOR SELECT TO authenticated USING (public.care_staff_can_access_resident((resident_id)::text));


--
-- Name: care_portal_notifications cpn_staff_update_org; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY cpn_staff_update_org ON public.care_portal_notifications FOR UPDATE TO authenticated USING (public.care_staff_can_access_resident((resident_id)::text)) WITH CHECK (public.care_staff_can_access_resident((resident_id)::text));


--
-- Name: crisis_alerts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.crisis_alerts ENABLE ROW LEVEL SECURITY;

--
-- Name: crisis_alerts crisis_alerts_resident_insert_self; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY crisis_alerts_resident_insert_self ON public.crisis_alerts FOR INSERT TO authenticated WITH CHECK ((auth.uid() = resident_id));


--
-- Name: crisis_alerts crisis_alerts_resident_select_self; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY crisis_alerts_resident_select_self ON public.crisis_alerts FOR SELECT TO authenticated USING ((auth.uid() = resident_id));


--
-- Name: crisis_alerts crisis_alerts_staff_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY crisis_alerts_staff_delete ON public.crisis_alerts FOR DELETE TO authenticated USING (public.care_staff_can_access_resident((resident_id)::text));


--
-- Name: crisis_alerts crisis_alerts_staff_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY crisis_alerts_staff_insert ON public.crisis_alerts FOR INSERT TO authenticated WITH CHECK (public.care_staff_can_access_resident((resident_id)::text));


--
-- Name: crisis_alerts crisis_alerts_staff_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY crisis_alerts_staff_select ON public.crisis_alerts FOR SELECT TO authenticated USING (public.care_staff_can_access_resident((resident_id)::text));


--
-- Name: crisis_alerts crisis_alerts_staff_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY crisis_alerts_staff_update ON public.crisis_alerts FOR UPDATE TO authenticated USING (public.care_staff_can_access_resident((resident_id)::text)) WITH CHECK (public.care_staff_can_access_resident((resident_id)::text));


--
-- Name: crisis_plans; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.crisis_plans ENABLE ROW LEVEL SECURITY;

--
-- Name: crisis_plans crisis_plans_resident_select_self; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY crisis_plans_resident_select_self ON public.crisis_plans FOR SELECT TO authenticated USING ((auth.uid() = resident_id));


--
-- Name: crisis_plans crisis_plans_staff_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY crisis_plans_staff_delete ON public.crisis_plans FOR DELETE TO authenticated USING (public.care_staff_can_access_resident((resident_id)::text));


--
-- Name: crisis_plans crisis_plans_staff_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY crisis_plans_staff_insert ON public.crisis_plans FOR INSERT TO authenticated WITH CHECK (public.care_staff_can_access_resident((resident_id)::text));


--
-- Name: crisis_plans crisis_plans_staff_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY crisis_plans_staff_select ON public.crisis_plans FOR SELECT TO authenticated USING (public.care_staff_can_access_resident((resident_id)::text));


--
-- Name: crisis_plans crisis_plans_staff_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY crisis_plans_staff_update ON public.crisis_plans FOR UPDATE TO authenticated USING (public.care_staff_can_access_resident((resident_id)::text)) WITH CHECK (public.care_staff_can_access_resident((resident_id)::text));


--
-- Name: daily_checkins; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.daily_checkins ENABLE ROW LEVEL SECURITY;

--
-- Name: daily_plans; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.daily_plans ENABLE ROW LEVEL SECURITY;

--
-- Name: daily_checkins dc_owner_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY dc_owner_delete ON public.daily_checkins FOR DELETE TO authenticated USING (((auth.uid())::text = profile_id));


--
-- Name: daily_checkins dc_owner_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY dc_owner_insert ON public.daily_checkins FOR INSERT TO authenticated WITH CHECK ((((auth.uid())::text = profile_id) AND ((user_id IS NULL) OR ((auth.uid())::text = user_id))));


--
-- Name: daily_checkins dc_owner_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY dc_owner_select ON public.daily_checkins FOR SELECT TO authenticated USING (((auth.uid())::text = profile_id));


--
-- Name: daily_checkins dc_owner_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY dc_owner_update ON public.daily_checkins FOR UPDATE TO authenticated USING (((auth.uid())::text = profile_id)) WITH CHECK ((((auth.uid())::text = profile_id) AND ((user_id IS NULL) OR ((auth.uid())::text = user_id))));


--
-- Name: daily_checkins dc_staff_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY dc_staff_select ON public.daily_checkins FOR SELECT TO authenticated USING (public.care_staff_can_access_resident(profile_id));


--
-- Name: facility_contacts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.facility_contacts ENABLE ROW LEVEL SECURITY;

--
-- Name: facility_contacts fc_resident_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY fc_resident_select ON public.facility_contacts FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.care_residents cr
  WHERE ((cr.user_id = auth.uid()) AND (cr.org_id IS NOT NULL) AND ((cr.org_id)::text = (facility_contacts.facility_id)::text)))));


--
-- Name: facility_contacts fc_staff_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY fc_staff_delete ON public.facility_contacts FOR DELETE TO authenticated USING ((public.care_is_portal_staff() AND (facility_id = ANY (public.care_visible_facility_ids()))));


--
-- Name: facility_contacts fc_staff_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY fc_staff_insert ON public.facility_contacts FOR INSERT TO authenticated WITH CHECK ((public.care_is_portal_staff() AND (facility_id = ANY (public.care_visible_facility_ids()))));


--
-- Name: facility_contacts fc_staff_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY fc_staff_select ON public.facility_contacts FOR SELECT TO authenticated USING ((public.care_is_portal_staff() AND (facility_id = ANY (public.care_visible_facility_ids()))));


--
-- Name: facility_contacts fc_staff_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY fc_staff_update ON public.facility_contacts FOR UPDATE TO authenticated USING ((public.care_is_portal_staff() AND (facility_id = ANY (public.care_visible_facility_ids())))) WITH CHECK ((public.care_is_portal_staff() AND (facility_id = ANY (public.care_visible_facility_ids()))));


--
-- Name: garden_plots; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.garden_plots ENABLE ROW LEVEL SECURITY;

--
-- Name: goals; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.goals ENABLE ROW LEVEL SECURITY;

--
-- Name: goals goals_owner_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY goals_owner_delete ON public.goals FOR DELETE TO authenticated USING (((auth.uid())::text = profile_id));


--
-- Name: goals goals_owner_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY goals_owner_insert ON public.goals FOR INSERT TO authenticated WITH CHECK (((auth.uid())::text = profile_id));


--
-- Name: goals goals_owner_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY goals_owner_select ON public.goals FOR SELECT TO authenticated USING (((auth.uid())::text = profile_id));


--
-- Name: goals goals_owner_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY goals_owner_update ON public.goals FOR UPDATE TO authenticated USING (((auth.uid())::text = profile_id)) WITH CHECK (((auth.uid())::text = profile_id));


--
-- Name: goals goals_staff_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY goals_staff_select ON public.goals FOR SELECT TO authenticated USING (public.care_staff_can_access_resident(profile_id));


--
-- Name: garden_plots gp_resident_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY gp_resident_delete ON public.garden_plots FOR DELETE TO authenticated USING (((auth.uid())::text = resident_id));


--
-- Name: garden_plots gp_resident_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY gp_resident_insert ON public.garden_plots FOR INSERT TO authenticated WITH CHECK (((auth.uid())::text = resident_id));


--
-- Name: garden_plots gp_resident_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY gp_resident_select ON public.garden_plots FOR SELECT TO authenticated USING (((auth.uid())::text = resident_id));


--
-- Name: garden_plots gp_resident_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY gp_resident_update ON public.garden_plots FOR UPDATE TO authenticated USING (((auth.uid())::text = resident_id)) WITH CHECK (((auth.uid())::text = resident_id));


--
-- Name: garden_plots gp_staff_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY gp_staff_delete ON public.garden_plots FOR DELETE TO authenticated USING (public.care_staff_can_access_resident(resident_id));


--
-- Name: garden_plots gp_staff_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY gp_staff_insert ON public.garden_plots FOR INSERT TO authenticated WITH CHECK (public.care_staff_can_access_resident(resident_id));


--
-- Name: garden_plots gp_staff_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY gp_staff_select ON public.garden_plots FOR SELECT TO authenticated USING (public.care_staff_can_access_resident(resident_id));


--
-- Name: garden_plots gp_staff_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY gp_staff_update ON public.garden_plots FOR UPDATE TO authenticated USING (public.care_staff_can_access_resident(resident_id)) WITH CHECK (public.care_staff_can_access_resident(resident_id));


--
-- Name: journal_entries; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.journal_entries ENABLE ROW LEVEL SECURITY;

--
-- Name: lys_conversations lc_resident_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY lc_resident_delete ON public.lys_conversations FOR DELETE TO authenticated USING (((auth.uid())::text = (resident_id)::text));


--
-- Name: lys_conversations lc_resident_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY lc_resident_insert ON public.lys_conversations FOR INSERT TO authenticated WITH CHECK (((auth.uid())::text = (resident_id)::text));


--
-- Name: lys_conversations lc_resident_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY lc_resident_select ON public.lys_conversations FOR SELECT TO authenticated USING (((auth.uid())::text = (resident_id)::text));


--
-- Name: lys_conversations lc_resident_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY lc_resident_update ON public.lys_conversations FOR UPDATE TO authenticated USING (((auth.uid())::text = (resident_id)::text)) WITH CHECK (((auth.uid())::text = (resident_id)::text));


--
-- Name: lys_conversations lc_staff_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY lc_staff_delete ON public.lys_conversations FOR DELETE TO authenticated USING (public.care_staff_can_access_resident((resident_id)::text));


--
-- Name: lys_conversations lc_staff_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY lc_staff_insert ON public.lys_conversations FOR INSERT TO authenticated WITH CHECK (public.care_staff_can_access_resident((resident_id)::text));


--
-- Name: lys_conversations lc_staff_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY lc_staff_select ON public.lys_conversations FOR SELECT TO authenticated USING (public.care_staff_can_access_resident((resident_id)::text));


--
-- Name: lys_conversations lc_staff_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY lc_staff_update ON public.lys_conversations FOR UPDATE TO authenticated USING (public.care_staff_can_access_resident((resident_id)::text)) WITH CHECK (public.care_staff_can_access_resident((resident_id)::text));


--
-- Name: lys_conversations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.lys_conversations ENABLE ROW LEVEL SECURITY;

--
-- Name: marketing_contact_submissions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.marketing_contact_submissions ENABLE ROW LEVEL SECURITY;

--
-- Name: marketing_content_blocks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.marketing_content_blocks ENABLE ROW LEVEL SECURITY;

--
-- Name: marketing_content_blocks mcb_staff_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY mcb_staff_insert ON public.marketing_content_blocks FOR INSERT TO authenticated WITH CHECK (public.care_is_portal_staff());


--
-- Name: marketing_content_blocks mcb_staff_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY mcb_staff_select ON public.marketing_content_blocks FOR SELECT TO authenticated USING (public.care_is_portal_staff());


--
-- Name: marketing_content_blocks mcb_staff_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY mcb_staff_update ON public.marketing_content_blocks FOR UPDATE TO authenticated USING (public.care_is_portal_staff()) WITH CHECK (public.care_is_portal_staff());


--
-- Name: medication_reminders; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.medication_reminders ENABLE ROW LEVEL SECURITY;

--
-- Name: medication_reminders medication_reminders_resident_select_self; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY medication_reminders_resident_select_self ON public.medication_reminders FOR SELECT TO authenticated USING ((auth.uid() = resident_id));


--
-- Name: medication_reminders medication_reminders_resident_update_taken_at; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY medication_reminders_resident_update_taken_at ON public.medication_reminders FOR UPDATE TO authenticated USING ((auth.uid() = resident_id)) WITH CHECK ((auth.uid() = resident_id));


--
-- Name: medication_reminders medication_reminders_staff_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY medication_reminders_staff_delete ON public.medication_reminders FOR DELETE TO authenticated USING (public.care_staff_can_access_resident((resident_id)::text));


--
-- Name: medication_reminders medication_reminders_staff_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY medication_reminders_staff_insert ON public.medication_reminders FOR INSERT TO authenticated WITH CHECK (public.care_staff_can_access_resident((resident_id)::text));


--
-- Name: medication_reminders medication_reminders_staff_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY medication_reminders_staff_select ON public.medication_reminders FOR SELECT TO authenticated USING (public.care_staff_can_access_resident((resident_id)::text));


--
-- Name: medication_reminders medication_reminders_staff_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY medication_reminders_staff_update ON public.medication_reminders FOR UPDATE TO authenticated USING (public.care_staff_can_access_resident((resident_id)::text)) WITH CHECK (public.care_staff_can_access_resident((resident_id)::text));


--
-- Name: on_call_staff; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.on_call_staff ENABLE ROW LEVEL SECURITY;

--
-- Name: on_call_staff on_call_staff_resident_select_own_org; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY on_call_staff_resident_select_own_org ON public.on_call_staff FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.care_residents cr
  WHERE ((cr.user_id = auth.uid()) AND (cr.org_id = on_call_staff.org_id)))));


--
-- Name: on_call_staff on_call_staff_staff_delete_own_org; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY on_call_staff_staff_delete_own_org ON public.on_call_staff FOR DELETE TO authenticated USING ((public.care_is_portal_staff() AND (org_id = ANY (public.care_visible_facility_ids()))));


--
-- Name: on_call_staff on_call_staff_staff_insert_own_org; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY on_call_staff_staff_insert_own_org ON public.on_call_staff FOR INSERT TO authenticated WITH CHECK ((public.care_is_portal_staff() AND (org_id = ANY (public.care_visible_facility_ids()))));


--
-- Name: on_call_staff on_call_staff_staff_select_own_org; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY on_call_staff_staff_select_own_org ON public.on_call_staff FOR SELECT TO authenticated USING ((public.care_is_portal_staff() AND (org_id = ANY (public.care_visible_facility_ids()))));


--
-- Name: on_call_staff on_call_staff_staff_update_own_org; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY on_call_staff_staff_update_own_org ON public.on_call_staff FOR UPDATE TO authenticated USING ((public.care_is_portal_staff() AND (org_id = ANY (public.care_visible_facility_ids())))) WITH CHECK ((public.care_is_portal_staff() AND (org_id = ANY (public.care_visible_facility_ids()))));


--
-- Name: care_residents open_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY open_select ON public.care_residents FOR SELECT USING (true);


--
-- Name: org_roles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.org_roles ENABLE ROW LEVEL SECURITY;

--
-- Name: organisations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.organisations ENABLE ROW LEVEL SECURITY;

--
-- Name: park_daily_checkin; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.park_daily_checkin ENABLE ROW LEVEL SECURITY;

--
-- Name: park_goal_steps; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.park_goal_steps ENABLE ROW LEVEL SECURITY;

--
-- Name: park_goals; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.park_goals ENABLE ROW LEVEL SECURITY;

--
-- Name: park_resource_profile; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.park_resource_profile ENABLE ROW LEVEL SECURITY;

--
-- Name: park_thought_catch; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.park_thought_catch ENABLE ROW LEVEL SECURITY;

--
-- Name: park_traffic_alerts; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.park_traffic_alerts ENABLE ROW LEVEL SECURITY;

--
-- Name: park_goals pg_resident_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY pg_resident_select ON public.park_goals FOR SELECT TO authenticated USING (((auth.uid())::text = resident_id));


--
-- Name: park_goals pg_staff_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY pg_staff_delete ON public.park_goals FOR DELETE TO authenticated USING (public.care_staff_can_access_resident(resident_id));


--
-- Name: park_goals pg_staff_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY pg_staff_insert ON public.park_goals FOR INSERT TO authenticated WITH CHECK (public.care_staff_can_access_resident(resident_id));


--
-- Name: park_goals pg_staff_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY pg_staff_select ON public.park_goals FOR SELECT TO authenticated USING (public.care_staff_can_access_resident(resident_id));


--
-- Name: park_goals pg_staff_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY pg_staff_update ON public.park_goals FOR UPDATE TO authenticated USING (public.care_staff_can_access_resident(resident_id)) WITH CHECK (public.care_staff_can_access_resident(resident_id));


--
-- Name: park_goal_steps pgs_resident_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY pgs_resident_select ON public.park_goal_steps FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.park_goals g
  WHERE ((g.id = park_goal_steps.goal_id) AND ((auth.uid())::text = g.resident_id)))));


--
-- Name: park_goal_steps pgs_resident_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY pgs_resident_update ON public.park_goal_steps FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.park_goals g
  WHERE ((g.id = park_goal_steps.goal_id) AND ((auth.uid())::text = g.resident_id))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.park_goals g
  WHERE ((g.id = park_goal_steps.goal_id) AND ((auth.uid())::text = g.resident_id)))));


--
-- Name: park_goal_steps pgs_staff_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY pgs_staff_delete ON public.park_goal_steps FOR DELETE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.park_goals g
  WHERE ((g.id = park_goal_steps.goal_id) AND public.care_staff_can_access_resident(g.resident_id)))));


--
-- Name: park_goal_steps pgs_staff_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY pgs_staff_insert ON public.park_goal_steps FOR INSERT TO authenticated WITH CHECK ((EXISTS ( SELECT 1
   FROM public.park_goals g
  WHERE ((g.id = park_goal_steps.goal_id) AND public.care_staff_can_access_resident(g.resident_id)))));


--
-- Name: park_goal_steps pgs_staff_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY pgs_staff_select ON public.park_goal_steps FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.park_goals g
  WHERE ((g.id = park_goal_steps.goal_id) AND public.care_staff_can_access_resident(g.resident_id)))));


--
-- Name: park_goal_steps pgs_staff_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY pgs_staff_update ON public.park_goal_steps FOR UPDATE TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.park_goals g
  WHERE ((g.id = park_goal_steps.goal_id) AND public.care_staff_can_access_resident(g.resident_id))))) WITH CHECK ((EXISTS ( SELECT 1
   FROM public.park_goals g
  WHERE ((g.id = park_goal_steps.goal_id) AND public.care_staff_can_access_resident(g.resident_id)))));


--
-- Name: plan_proposals; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.plan_proposals ENABLE ROW LEVEL SECURITY;

--
-- Name: park_daily_checkin portal can read all checkins; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "portal can read all checkins" ON public.park_daily_checkin FOR SELECT USING (true);


--
-- Name: portal_messages portal insert messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "portal insert messages" ON public.portal_messages FOR INSERT WITH CHECK (true);


--
-- Name: portal_message_threads portal insert threads; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "portal insert threads" ON public.portal_message_threads FOR INSERT WITH CHECK (true);


--
-- Name: portal_messages portal read messages; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "portal read messages" ON public.portal_messages FOR SELECT USING (true);


--
-- Name: portal_message_threads portal read threads; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "portal read threads" ON public.portal_message_threads FOR SELECT USING (true);


--
-- Name: portal_message_threads; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.portal_message_threads ENABLE ROW LEVEL SECURITY;

--
-- Name: portal_messages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.portal_messages ENABLE ROW LEVEL SECURITY;

--
-- Name: park_resource_profile prp_resident_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY prp_resident_delete ON public.park_resource_profile FOR DELETE TO authenticated USING (((auth.uid())::text = resident_id));


--
-- Name: park_resource_profile prp_resident_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY prp_resident_insert ON public.park_resource_profile FOR INSERT TO authenticated WITH CHECK (((auth.uid())::text = resident_id));


--
-- Name: park_resource_profile prp_resident_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY prp_resident_select ON public.park_resource_profile FOR SELECT TO authenticated USING (((auth.uid())::text = resident_id));


--
-- Name: park_resource_profile prp_resident_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY prp_resident_update ON public.park_resource_profile FOR UPDATE TO authenticated USING (((auth.uid())::text = resident_id)) WITH CHECK (((auth.uid())::text = resident_id));


--
-- Name: park_resource_profile prp_staff_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY prp_staff_delete ON public.park_resource_profile FOR DELETE TO authenticated USING (public.care_staff_can_access_resident(resident_id));


--
-- Name: park_resource_profile prp_staff_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY prp_staff_insert ON public.park_resource_profile FOR INSERT TO authenticated WITH CHECK (public.care_staff_can_access_resident(resident_id));


--
-- Name: park_resource_profile prp_staff_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY prp_staff_select ON public.park_resource_profile FOR SELECT TO authenticated USING (public.care_staff_can_access_resident(resident_id));


--
-- Name: park_resource_profile prp_staff_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY prp_staff_update ON public.park_resource_profile FOR UPDATE TO authenticated USING (public.care_staff_can_access_resident(resident_id)) WITH CHECK (public.care_staff_can_access_resident(resident_id));


--
-- Name: park_traffic_alerts pta_resident_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY pta_resident_insert ON public.park_traffic_alerts FOR INSERT TO authenticated WITH CHECK (((auth.uid())::text = resident_id));


--
-- Name: park_traffic_alerts pta_resident_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY pta_resident_select ON public.park_traffic_alerts FOR SELECT TO authenticated USING (((auth.uid())::text = resident_id));


--
-- Name: park_traffic_alerts pta_staff_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY pta_staff_delete ON public.park_traffic_alerts FOR DELETE TO authenticated USING (public.care_staff_can_access_resident(resident_id));


--
-- Name: park_traffic_alerts pta_staff_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY pta_staff_select ON public.park_traffic_alerts FOR SELECT TO authenticated USING (public.care_staff_can_access_resident(resident_id));


--
-- Name: park_traffic_alerts pta_staff_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY pta_staff_update ON public.park_traffic_alerts FOR UPDATE TO authenticated USING (public.care_staff_can_access_resident(resident_id)) WITH CHECK (public.care_staff_can_access_resident(resident_id));


--
-- Name: park_thought_catch ptc_resident_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ptc_resident_delete ON public.park_thought_catch FOR DELETE TO authenticated USING (((auth.uid())::text = resident_id));


--
-- Name: park_thought_catch ptc_resident_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ptc_resident_insert ON public.park_thought_catch FOR INSERT TO authenticated WITH CHECK (((auth.uid())::text = resident_id));


--
-- Name: park_thought_catch ptc_resident_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ptc_resident_select ON public.park_thought_catch FOR SELECT TO authenticated USING (((auth.uid())::text = resident_id));


--
-- Name: park_thought_catch ptc_resident_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ptc_resident_update ON public.park_thought_catch FOR UPDATE TO authenticated USING (((auth.uid())::text = resident_id)) WITH CHECK (((auth.uid())::text = resident_id));


--
-- Name: park_thought_catch ptc_staff_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ptc_staff_delete ON public.park_thought_catch FOR DELETE TO authenticated USING (public.care_staff_can_access_resident(resident_id));


--
-- Name: park_thought_catch ptc_staff_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ptc_staff_insert ON public.park_thought_catch FOR INSERT TO authenticated WITH CHECK (public.care_staff_can_access_resident(resident_id));


--
-- Name: park_thought_catch ptc_staff_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ptc_staff_select ON public.park_thought_catch FOR SELECT TO authenticated USING (public.care_staff_can_access_resident(resident_id));


--
-- Name: park_thought_catch ptc_staff_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY ptc_staff_update ON public.park_thought_catch FOR UPDATE TO authenticated USING (public.care_staff_can_access_resident(resident_id)) WITH CHECK (public.care_staff_can_access_resident(resident_id));


--
-- Name: push_subscriptions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;

--
-- Name: resident_badges; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.resident_badges ENABLE ROW LEVEL SECURITY;

--
-- Name: resident_medications; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.resident_medications ENABLE ROW LEVEL SECURITY;

--
-- Name: resident_plan_completions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.resident_plan_completions ENABLE ROW LEVEL SECURITY;

--
-- Name: resident_plan_items; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.resident_plan_items ENABLE ROW LEVEL SECURITY;

--
-- Name: resident_xp; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.resident_xp ENABLE ROW LEVEL SECURITY;

--
-- Name: park_daily_checkin residents can insert own checkins; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "residents can insert own checkins" ON public.park_daily_checkin FOR INSERT WITH CHECK (true);


--
-- Name: resident_badges residents_own_badges; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY residents_own_badges ON public.resident_badges USING (((resident_id)::text = ((current_setting('request.jwt.claims'::text, true))::json ->> 'sub'::text)));


--
-- Name: resident_plan_completions residents_own_completions; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY residents_own_completions ON public.resident_plan_completions USING (((resident_id)::text = ((current_setting('request.jwt.claims'::text, true))::json ->> 'sub'::text)));


--
-- Name: lys_conversations residents_own_conversations; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY residents_own_conversations ON public.lys_conversations USING (((resident_id)::text = ((current_setting('request.jwt.claims'::text, true))::json ->> 'sub'::text)));


--
-- Name: resident_plan_items residents_own_plan_items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY residents_own_plan_items ON public.resident_plan_items USING (((resident_id)::text = ((current_setting('request.jwt.claims'::text, true))::json ->> 'sub'::text)));


--
-- Name: push_subscriptions residents_own_push; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY residents_own_push ON public.push_subscriptions USING (((resident_id)::text = ((current_setting('request.jwt.claims'::text, true))::json ->> 'sub'::text)));


--
-- Name: resident_xp residents_own_xp; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY residents_own_xp ON public.resident_xp USING (((resident_id)::text = ((current_setting('request.jwt.claims'::text, true))::json ->> 'sub'::text)));


--
-- Name: resource_registrations; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.resource_registrations ENABLE ROW LEVEL SECURITY;

--
-- Name: resource_registrations rr_owner_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rr_owner_delete ON public.resource_registrations FOR DELETE TO authenticated USING (((auth.uid())::text = profile_id));


--
-- Name: resource_registrations rr_owner_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rr_owner_insert ON public.resource_registrations FOR INSERT TO authenticated WITH CHECK (((auth.uid())::text = profile_id));


--
-- Name: resource_registrations rr_owner_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rr_owner_select ON public.resource_registrations FOR SELECT TO authenticated USING (((auth.uid())::text = profile_id));


--
-- Name: resource_registrations rr_staff_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY rr_staff_select ON public.resource_registrations FOR SELECT TO authenticated USING (public.care_staff_can_access_resident(profile_id));


--
-- Name: care_portal_notifications service insert notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "service insert notifications" ON public.care_portal_notifications FOR INSERT TO service_role WITH CHECK (true);


--
-- Name: garden_plots service_all_plots; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY service_all_plots ON public.garden_plots USING ((auth.role() = 'service_role'::text));


--
-- Name: shared_goals sg_owner_all; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sg_owner_all ON public.shared_goals TO authenticated USING (((auth.uid())::text = user_id)) WITH CHECK (((auth.uid())::text = user_id));


--
-- Name: shared_goals; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.shared_goals ENABLE ROW LEVEL SECURITY;

--
-- Name: shared_lys_events; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.shared_lys_events ENABLE ROW LEVEL SECURITY;

--
-- Name: shared_lys_sessions; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.shared_lys_sessions ENABLE ROW LEVEL SECURITY;

--
-- Name: shared_lys_events sle_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sle_insert ON public.shared_lys_events FOR INSERT TO authenticated WITH CHECK (((sender_id = auth.uid()) AND (EXISTS ( SELECT 1
   FROM public.shared_lys_sessions s
  WHERE ((s.id = shared_lys_events.session_id) AND ((auth.uid() = s.user_id) OR (auth.uid() = s.support_user_id)))))));


--
-- Name: shared_lys_events sle_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sle_select ON public.shared_lys_events FOR SELECT TO authenticated USING ((EXISTS ( SELECT 1
   FROM public.shared_lys_sessions s
  WHERE ((s.id = shared_lys_events.session_id) AND ((auth.uid() = s.user_id) OR (auth.uid() = s.support_user_id))))));


--
-- Name: shared_lys_sessions sls_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sls_delete ON public.shared_lys_sessions FOR DELETE TO authenticated USING ((auth.uid() = user_id));


--
-- Name: shared_lys_sessions sls_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sls_insert ON public.shared_lys_sessions FOR INSERT TO authenticated WITH CHECK ((auth.uid() = user_id));


--
-- Name: shared_lys_sessions sls_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sls_select ON public.shared_lys_sessions FOR SELECT TO authenticated USING (((auth.uid() = user_id) OR (auth.uid() = support_user_id)));


--
-- Name: shared_lys_sessions sls_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sls_update ON public.shared_lys_sessions FOR UPDATE TO authenticated USING (((auth.uid() = user_id) OR (auth.uid() = support_user_id))) WITH CHECK (((auth.uid() = user_id) OR (auth.uid() = support_user_id)));


--
-- Name: support_messages sm_participant_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sm_participant_select ON public.support_messages FOR SELECT TO authenticated USING ((((auth.uid())::text = sender_id) OR ((auth.uid())::text = contact_id)));


--
-- Name: support_messages sm_sender_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY sm_sender_insert ON public.support_messages FOR INSERT TO authenticated WITH CHECK (((auth.uid())::text = sender_id));


--
-- Name: care_portal_notifications staff acknowledge notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "staff acknowledge notifications" ON public.care_portal_notifications FOR UPDATE TO authenticated USING (true) WITH CHECK (true);


--
-- Name: organisations staff can read own org; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "staff can read own org" ON public.organisations FOR SELECT TO authenticated USING ((id = (((auth.jwt() -> 'user_metadata'::text) ->> 'org_id'::text))::uuid));


--
-- Name: audit_logs staff can read own org audit logs; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "staff can read own org audit logs" ON public.audit_logs FOR SELECT TO authenticated USING ((public.care_is_portal_staff() AND (actor_org_id = ANY (public.care_visible_facility_ids()))));


--
-- Name: care_portal_notifications staff read notifications; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY "staff read notifications" ON public.care_portal_notifications FOR SELECT TO authenticated USING (true);


--
-- Name: facility_contacts staff_all_facility_contacts; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY staff_all_facility_contacts ON public.facility_contacts TO authenticated USING (true) WITH CHECK (true);


--
-- Name: resident_badges staff_badges_org; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY staff_badges_org ON public.resident_badges USING ((org_id = ( SELECT care_staff.org_id
   FROM public.care_staff
  WHERE (care_staff.id = auth.uid()))));


--
-- Name: care_concern_notes staff_concern_notes_org; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY staff_concern_notes_org ON public.care_concern_notes USING ((org_id = ( SELECT care_staff.org_id
   FROM public.care_staff
  WHERE (care_staff.id = auth.uid()))));


--
-- Name: crisis_alerts staff_crisis_alerts_org; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY staff_crisis_alerts_org ON public.crisis_alerts USING ((org_id = ( SELECT care_staff.org_id
   FROM public.care_staff
  WHERE (care_staff.id = auth.uid()))));


--
-- Name: journal_entries staff_journal_org; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY staff_journal_org ON public.journal_entries USING ((org_id = ( SELECT care_staff.org_id
   FROM public.care_staff
  WHERE (care_staff.id = auth.uid()))));


--
-- Name: resident_medications staff_medications_org; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY staff_medications_org ON public.resident_medications USING ((org_id = ( SELECT care_staff.org_id
   FROM public.care_staff
  WHERE (care_staff.id = auth.uid()))));


--
-- Name: care_portal_notifications staff_notifications_org; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY staff_notifications_org ON public.care_portal_notifications USING ((org_id = ( SELECT care_staff.org_id
   FROM public.care_staff
  WHERE (care_staff.id = auth.uid()))));


--
-- Name: resident_plan_items staff_plan_items_org; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY staff_plan_items_org ON public.resident_plan_items USING ((org_id = ( SELECT care_staff.org_id
   FROM public.care_staff
  WHERE (care_staff.id = auth.uid()))));


--
-- Name: org_roles staff_roles_own_org; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY staff_roles_own_org ON public.org_roles USING ((org_id = ( SELECT care_staff.org_id
   FROM public.care_staff
  WHERE (care_staff.id = auth.uid()))));


--
-- Name: care_staff staff_select_own_org; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY staff_select_own_org ON public.care_staff FOR SELECT TO authenticated USING ((org_id IN ( SELECT unnest(public.care_visible_facility_ids()) AS unnest)));


--
-- Name: care_staff staff_select_self; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY staff_select_self ON public.care_staff FOR SELECT TO authenticated USING ((id = auth.uid()));


--
-- Name: resident_plan_items staff_suggest_plan_items; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY staff_suggest_plan_items ON public.resident_plan_items FOR INSERT WITH CHECK ((staff_suggestion = true));


--
-- Name: support_messages; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

--
-- Name: thought_checks tc_owner_delete; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tc_owner_delete ON public.thought_checks FOR DELETE TO authenticated USING (((auth.uid())::text = profile_id));


--
-- Name: thought_checks tc_owner_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tc_owner_insert ON public.thought_checks FOR INSERT TO authenticated WITH CHECK (((auth.uid())::text = profile_id));


--
-- Name: thought_checks tc_owner_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tc_owner_select ON public.thought_checks FOR SELECT TO authenticated USING (((auth.uid())::text = profile_id));


--
-- Name: thought_checks tc_staff_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY tc_staff_select ON public.thought_checks FOR SELECT TO authenticated USING (public.care_staff_can_access_resident(profile_id));


--
-- Name: thought_checks; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.thought_checks ENABLE ROW LEVEL SECURITY;

--
-- Name: user_profiles up_self_insert; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY up_self_insert ON public.user_profiles FOR INSERT TO authenticated WITH CHECK ((auth.uid() = id));


--
-- Name: user_profiles up_self_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY up_self_select ON public.user_profiles FOR SELECT TO authenticated USING ((auth.uid() = id));


--
-- Name: user_profiles up_self_update; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY up_self_update ON public.user_profiles FOR UPDATE TO authenticated USING ((auth.uid() = id)) WITH CHECK ((auth.uid() = id));


--
-- Name: user_profiles up_staff_select; Type: POLICY; Schema: public; Owner: -
--

CREATE POLICY up_staff_select ON public.user_profiles FOR SELECT TO authenticated USING (public.care_staff_can_access_resident((id)::text));


--
-- Name: user_profiles; Type: ROW SECURITY; Schema: public; Owner: -
--

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

--
-- PostgreSQL database dump complete
--

\unrestrict ClK9lP0RJHAi3Jgha6A92yCgNsvkDK0buiLPwRw9sCEEKhhfILyu9H6yXppgB86

