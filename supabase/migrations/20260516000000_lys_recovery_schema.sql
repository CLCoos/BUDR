-- ═════════════════════════════════════════════════════════
-- DEL 1: DROP gamle PARK-tabeller (ren rebuild, ingen data at bevare)
-- ═════════════════════════════════════════════════════════

DROP TABLE IF EXISTS public.park_goal_steps CASCADE;
DROP TABLE IF EXISTS public.park_goals CASCADE;
DROP TABLE IF EXISTS public.park_traffic_alerts CASCADE;
DROP TABLE IF EXISTS public.park_resource_profile CASCADE;
DROP TABLE IF EXISTS public.park_thought_catch CASCADE;
DROP TABLE IF EXISTS public.park_daily_checkin CASCADE;

-- ═════════════════════════════════════════════════════════
-- DEL 2: UDVID audit_logs CHECK constraint med nye actions
-- ═════════════════════════════════════════════════════════

ALTER TABLE public.audit_logs DROP CONSTRAINT IF EXISTS audit_logs_action_check;

ALTER TABLE public.audit_logs ADD CONSTRAINT audit_logs_action_check CHECK (
  action = ANY (ARRAY[
    'plan_proposal.approved',
    'plan_proposal.rejected',
    'daily_plan.created',
    'daily_plan.updated',
    'resident.created',
    'resident.updated',
    'resident_pin.changed',
    'resident.login',
    'resident.login_failed',
    'staff.login',
    'staff.logout',
    'staff.invite',
    'staff.registered',
    'org.created',
    'journal.entry_created',
    'checkin.submitted',
    'reflection.created',
    'next_step.created',
    'next_step.completed',
    'recovery_story.approved',
    'recovery_profile.updated'
  ])
);

-- ═════════════════════════════════════════════════════════
-- DEL 3: Opret lys_checkin (trivselspuls med CHIME-domæne-scoring)
-- ═════════════════════════════════════════════════════════

CREATE TABLE public.lys_checkin (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id uuid NOT NULL REFERENCES public.care_residents(user_id) ON DELETE CASCADE,
  org_id uuid REFERENCES public.organisations(id),

  -- Generel trivsel (videreført fra park_daily_checkin)
  mood_score smallint NOT NULL CHECK (mood_score BETWEEN 1 AND 10),
  mood_label text,
  traffic_light text CHECK (traffic_light = ANY (ARRAY['grøn', 'gul', 'rød'])),
  free_text text,
  voice_transcript text,
  ai_summary text,

  -- CHIME-domæne-scoring (alle optional, roteres dagligt i UI)
  connectedness_score smallint CHECK (connectedness_score BETWEEN 1 AND 10),
  hope_score smallint CHECK (hope_score BETWEEN 1 AND 10),
  identity_score smallint CHECK (identity_score BETWEEN 1 AND 10),
  meaning_score smallint CHECK (meaning_score BETWEEN 1 AND 10),
  empowerment_score smallint CHECK (empowerment_score BETWEEN 1 AND 10),

  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX lys_checkin_resident_created_idx ON public.lys_checkin USING btree (resident_id, created_at DESC);
CREATE INDEX lys_checkin_org_idx ON public.lys_checkin USING btree (org_id, created_at DESC);

ALTER TABLE public.lys_checkin ENABLE ROW LEVEL SECURITY;

CREATE POLICY lys_checkin_staff_select ON public.lys_checkin FOR SELECT TO authenticated
  USING (public.care_staff_can_access_resident((resident_id)::text));

CREATE POLICY lys_checkin_staff_insert ON public.lys_checkin FOR INSERT TO authenticated
  WITH CHECK (public.care_staff_can_access_resident((resident_id)::text));

CREATE POLICY lys_checkin_staff_delete ON public.lys_checkin FOR DELETE TO authenticated
  USING (public.care_staff_can_access_resident((resident_id)::text));

-- ═════════════════════════════════════════════════════════
-- DEL 4: Opret lys_recovery_profile (CHIME-organiseret ressourceprofil)
-- ═════════════════════════════════════════════════════════

CREATE TABLE public.lys_recovery_profile (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id uuid NOT NULL REFERENCES public.care_residents(user_id) ON DELETE CASCADE,
  org_id uuid REFERENCES public.organisations(id),

  -- Connectedness (Forbundethed)
  connectedness_people text,
  connectedness_support text,
  connectedness_belonging text,

  -- Hope (Håb)
  hope_dreams text,
  hope_small_wishes text,

  -- Identity (Identitet)
  identity_strengths text,
  identity_proud_of text,
  identity_likes text,
  identity_body text,

  -- Meaning (Mening)
  meaning_values text,
  meaning_purpose text,

  -- Empowerment (Handlekraft)
  empowerment_choices text,
  empowerment_capabilities text,

  version integer NOT NULL DEFAULT 1,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX lys_recovery_profile_resident_idx ON public.lys_recovery_profile USING btree (resident_id, version DESC);
CREATE INDEX lys_recovery_profile_org_idx ON public.lys_recovery_profile USING btree (org_id);

ALTER TABLE public.lys_recovery_profile ENABLE ROW LEVEL SECURITY;

CREATE POLICY lys_recovery_profile_staff_select ON public.lys_recovery_profile FOR SELECT TO authenticated
  USING (public.care_staff_can_access_resident((resident_id)::text));

CREATE POLICY lys_recovery_profile_staff_insert ON public.lys_recovery_profile FOR INSERT TO authenticated
  WITH CHECK (public.care_staff_can_access_resident((resident_id)::text));

CREATE POLICY lys_recovery_profile_staff_update ON public.lys_recovery_profile FOR UPDATE TO authenticated
  USING (public.care_staff_can_access_resident((resident_id)::text))
  WITH CHECK (public.care_staff_can_access_resident((resident_id)::text));

CREATE POLICY lys_recovery_profile_staff_delete ON public.lys_recovery_profile FOR DELETE TO authenticated
  USING (public.care_staff_can_access_resident((resident_id)::text));

-- ═════════════════════════════════════════════════════════
-- DEL 5: Opret lys_reflection (recovery-orienteret refleksion, erstatter park_thought_catch)
-- ═════════════════════════════════════════════════════════

CREATE TABLE public.lys_reflection (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id uuid NOT NULL REFERENCES public.care_residents(user_id) ON DELETE CASCADE,
  org_id uuid REFERENCES public.organisations(id),

  situation text NOT NULL,
  what_was_hard text,
  what_gave_strength text,
  ai_suggested_next_step text,
  resident_chosen_step text,
  feeling text,
  feeling_score smallint CHECK (feeling_score BETWEEN 1 AND 10),

  primary_chime_domain text CHECK (primary_chime_domain = ANY (ARRAY[
    'connectedness', 'hope', 'identity', 'meaning', 'empowerment'
  ])),

  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX lys_reflection_resident_idx ON public.lys_reflection USING btree (resident_id, created_at DESC);
CREATE INDEX lys_reflection_org_idx ON public.lys_reflection USING btree (org_id);

ALTER TABLE public.lys_reflection ENABLE ROW LEVEL SECURITY;

CREATE POLICY lys_reflection_staff_select ON public.lys_reflection FOR SELECT TO authenticated
  USING (public.care_staff_can_access_resident((resident_id)::text));

CREATE POLICY lys_reflection_staff_insert ON public.lys_reflection FOR INSERT TO authenticated
  WITH CHECK (public.care_staff_can_access_resident((resident_id)::text));

CREATE POLICY lys_reflection_staff_update ON public.lys_reflection FOR UPDATE TO authenticated
  USING (public.care_staff_can_access_resident((resident_id)::text))
  WITH CHECK (public.care_staff_can_access_resident((resident_id)::text));

CREATE POLICY lys_reflection_staff_delete ON public.lys_reflection FOR DELETE TO authenticated
  USING (public.care_staff_can_access_resident((resident_id)::text));

-- ═════════════════════════════════════════════════════════
-- DEL 6: Opret lys_next_steps (hybrid borger/medarbejder næste skridt, erstatter park_goals + park_goal_steps)
-- ═════════════════════════════════════════════════════════

CREATE TABLE public.lys_next_steps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id uuid NOT NULL REFERENCES public.care_residents(user_id) ON DELETE CASCADE,
  org_id uuid REFERENCES public.organisations(id),

  created_by_type text NOT NULL CHECK (created_by_type = ANY (ARRAY['resident', 'staff'])),
  created_by_user_id uuid,

  title text NOT NULL,
  description text,
  target_date date,

  status text NOT NULL DEFAULT 'aktiv' CHECK (status = ANY (ARRAY['aktiv', 'fuldført', 'sat på pause', 'annulleret'])),

  resident_note text,
  staff_note text,

  related_chime_domain text CHECK (related_chime_domain = ANY (ARRAY[
    'connectedness', 'hope', 'identity', 'meaning', 'empowerment'
  ])),

  completed_at timestamp with time zone,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX lys_next_steps_resident_active_idx ON public.lys_next_steps USING btree (resident_id, status, created_at DESC);
CREATE INDEX lys_next_steps_org_idx ON public.lys_next_steps USING btree (org_id);

ALTER TABLE public.lys_next_steps ENABLE ROW LEVEL SECURITY;

CREATE POLICY lys_next_steps_staff_select ON public.lys_next_steps FOR SELECT TO authenticated
  USING (public.care_staff_can_access_resident((resident_id)::text));

CREATE POLICY lys_next_steps_staff_insert ON public.lys_next_steps FOR INSERT TO authenticated
  WITH CHECK (public.care_staff_can_access_resident((resident_id)::text));

CREATE POLICY lys_next_steps_staff_update ON public.lys_next_steps FOR UPDATE TO authenticated
  USING (public.care_staff_can_access_resident((resident_id)::text))
  WITH CHECK (public.care_staff_can_access_resident((resident_id)::text));

CREATE POLICY lys_next_steps_staff_delete ON public.lys_next_steps FOR DELETE TO authenticated
  USING (public.care_staff_can_access_resident((resident_id)::text));

-- ═════════════════════════════════════════════════════════
-- DEL 7: Opret lys_recovery_stories (bevaret borger-fortælling parallelt med journal)
-- ═════════════════════════════════════════════════════════

CREATE TABLE public.lys_recovery_stories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id uuid NOT NULL REFERENCES public.care_residents(user_id) ON DELETE CASCADE,
  org_id uuid REFERENCES public.organisations(id),

  related_journal_entry_id uuid REFERENCES public.journal_entries(id) ON DELETE SET NULL,

  raw_transcript text NOT NULL,
  cleaned_story text NOT NULL,
  resident_approved boolean NOT NULL DEFAULT false,

  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX lys_recovery_stories_resident_idx ON public.lys_recovery_stories USING btree (resident_id, created_at DESC);
CREATE INDEX lys_recovery_stories_org_idx ON public.lys_recovery_stories USING btree (org_id);
CREATE INDEX lys_recovery_stories_journal_idx ON public.lys_recovery_stories USING btree (related_journal_entry_id) WHERE related_journal_entry_id IS NOT NULL;

ALTER TABLE public.lys_recovery_stories ENABLE ROW LEVEL SECURITY;

CREATE POLICY lys_recovery_stories_staff_select ON public.lys_recovery_stories FOR SELECT TO authenticated
  USING (public.care_staff_can_access_resident((resident_id)::text));

CREATE POLICY lys_recovery_stories_staff_insert ON public.lys_recovery_stories FOR INSERT TO authenticated
  WITH CHECK (public.care_staff_can_access_resident((resident_id)::text));

CREATE POLICY lys_recovery_stories_staff_update ON public.lys_recovery_stories FOR UPDATE TO authenticated
  USING (public.care_staff_can_access_resident((resident_id)::text))
  WITH CHECK (public.care_staff_can_access_resident((resident_id)::text));

CREATE POLICY lys_recovery_stories_staff_delete ON public.lys_recovery_stories FOR DELETE TO authenticated
  USING (public.care_staff_can_access_resident((resident_id)::text));

-- ═════════════════════════════════════════════════════════
-- DEL 8: Opret lys_safety_events (matcher app-koden eksakt)
-- ═════════════════════════════════════════════════════════

-- Denne tabel eksisterer i koden men er aldrig blevet oprettet i Supabase. Lys-chat skriver til den ved hver classifier-detektion, men fejler lydløst i dag. Schemaet matcher safetyEventsService.ts: tre risk_level-værdier (none, elevated, acute) og ack-kolonner til staff-håndtering.

CREATE TABLE public.lys_safety_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  resident_id uuid NOT NULL REFERENCES public.care_residents(user_id) ON DELETE CASCADE,
  organisation_id uuid REFERENCES public.organisations(id),
  conversation_id uuid REFERENCES public.lys_conversations(id) ON DELETE SET NULL,

  risk_level text NOT NULL CHECK (risk_level = ANY (ARRAY['none', 'elevated', 'acute'])),
  category text NOT NULL CHECK (category = ANY (ARRAY[
    'suicidalitet', 'selvskade', 'vold', 'psykose',
    'overgreb', 'medicin_misbrug', 'none', 'other'
  ])),
  reasoning text,
  user_utterance text NOT NULL,

  acknowledged_at timestamp with time zone,
  acknowledged_by uuid REFERENCES public.care_staff(id) ON DELETE SET NULL,

  created_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX lys_safety_events_resident_idx ON public.lys_safety_events USING btree (resident_id, created_at DESC);
CREATE INDEX lys_safety_events_org_idx ON public.lys_safety_events USING btree (organisation_id, created_at DESC);
CREATE INDEX lys_safety_events_unacked_idx ON public.lys_safety_events USING btree (organisation_id, created_at DESC)
  WHERE acknowledged_at IS NULL AND risk_level = ANY (ARRAY['elevated', 'acute']);

ALTER TABLE public.lys_safety_events ENABLE ROW LEVEL SECURITY;

-- Staff kan læse events for beboere i deres org
CREATE POLICY lys_safety_events_staff_select ON public.lys_safety_events FOR SELECT TO authenticated
  USING (public.care_staff_can_access_resident((resident_id)::text));

-- Staff kan acknowledge events (UPDATE acknowledged_at / acknowledged_by)
CREATE POLICY lys_safety_events_staff_update ON public.lys_safety_events FOR UPDATE TO authenticated
  USING (public.care_staff_can_access_resident((resident_id)::text))
  WITH CHECK (public.care_staff_can_access_resident((resident_id)::text));

-- Service-role inserts (lys-chat-route bruger service-client)
CREATE POLICY lys_safety_events_service_insert ON public.lys_safety_events FOR INSERT TO service_role
  WITH CHECK (true);

-- ═════════════════════════════════════════════════════════
-- DEL 9: Realtime publication for relevante tabeller
-- ═════════════════════════════════════════════════════════

ALTER PUBLICATION supabase_realtime ADD TABLE public.lys_checkin;
ALTER PUBLICATION supabase_realtime ADD TABLE public.lys_reflection;
ALTER PUBLICATION supabase_realtime ADD TABLE public.lys_safety_events;
ALTER PUBLICATION supabase_realtime ADD TABLE public.lys_next_steps;
