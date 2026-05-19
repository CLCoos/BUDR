# BUDR Feature-status — 19. maj 2026

## Opsummering

- **Demo-kritiske features (kunde #1):** 12 ✅ virker · 8 🟡 delvist · 2 🔴 brudt/pauset
- **Død kode at fjerne:** 9 tabeller uden aktiv UI · 4 orphan-komponenter · 1 legacy login-skærm · duplikerede `route 2.ts`-API-filer i repo
- **Største huller før salgsklar:**
  1. **Beboer-auth:** `/app/<uuid>` sætter kun `budr_resident_id`-cookie — PIN/WebAuthn-flow (`PinLoginScreen`, `resident_sessions`) er ikke koblet til entry (PR #5 lukket, ikke merged).
  2. **Voice/TTS+STT:** API’er findes, men workstream er **pauset** (dansk udtale utilfredsstillende).
  3. **Pilot/demo-lag:** `NEXT_PUBLIC_CARE_PORTAL_SIMULATED_DATA`, handover-demo-notater og vagtplan via `VagtplanDemoClient` — risiko for at vise simuleret data ved live-demo uden tjek af env.

**Data-rækker** i parentes er fra MCP DB-audit (prod/staging); kode kan stadig være aktiv uden rækker.

---

## Care Portal (staff-facing)

## Staff auth + login

**Domæne:** Care Portal  
**Status:** ✅ Virker  
**Routes:** `/care-portal-login`, middleware staff-guard på `/care-portal-*`, `/handover-workspace`, `/resident-360-view`  
**Tabeller:** `care_staff` (2), Supabase Auth  
**Komponenter:** `src/app/care-portal-login/page.tsx`, `middleware.ts`, `src/lib/portalAuth.ts`  
**Hvad virker:** Email/password-login, session via Supabase JWT, redirect til dashboard når `care_staff`-række findes.  
**Hvad mangler/er brudt:** Intet kritisk; invite-flow via `/api/portal/invite-staff`.  
**Demo-kritisk for kunde #1:** Ja  
**Anbefaling:** Behold

---

## Cockpit / dashboard forside

**Domæne:** Care Portal  
**Status:** 🟡 Virker delvist  
**Routes:** `/care-portal-dashboard`, `/care-portal-journal`, `/care-portal-planner`, `/care-portal-alerts` (widget-mode via `DashboardClient`)  
**Tabeller:** `care_residents`, `park_daily_checkin` (view → `lys_checkin`), `journal_entries`, `care_portal_notifications`, `crisis_alerts`  
**Komponenter:** `DashboardClient.tsx`, `AlertPanel.tsx`, `ResidentList.tsx`, `StatCards.tsx`, `ActionCards.tsx`, `JournalOverblikWidget.tsx`, `BekymringsnotatWidget.tsx`, `KalenderWidget.tsx`, `OpgaveWidget.tsx`, `OnCallStaffWidget.tsx`  
**Hvad virker:** Live beboerliste, journal-widget, bekymringsnotat, advarsler (crisis + notifications), hurtig journal-modal, realtime på check-ins/notifikationer.  
**Hvad mangler/er brudt:** Ved `NEXT_PUBLIC_CARE_PORTAL_SIMULATED_DATA=true` vises `ResidentListDemo` og simuleret medicin — skal være **false** ved kundedemo. Nogle widgets (opgaver, kalender) er UI-shells uden fuld backend.  
**Demo-kritisk for kunde #1:** Ja  
**Anbefaling:** Behold — verificér env før demo

---

## Resident 360 / borgerprofil

**Domæne:** Care Portal  
**Status:** ✅ Virker  
**Routes:** `/resident-360-view`, `/resident-360-view/[residentId]`, `/care-portal-residents`  
**Tabeller:** `care_residents` (26), `journal_entries`, `resident_medications`, `lys_*`, `daily_plans`, `plan_proposals`, `care_concern_notes`, `garden_plots`  
**Komponenter:** `resident-360-view/[residentId]/page.tsx`, `ResidentOverblikTab`, `ResidentRecoveryTab`, `ResidentPlanTab`, `ResidentMedicinTab`, `ResidentHavenTab`, `WriteJournalEntry`, `DagsPlanPortal`  
**Hvad virker:** Fuld 360 med journal, medicin, recovery (CHIME), plan/dagsplan, haven-overblik, export, lys-samtaler-fane.  
**Hvad mangler/er brudt:** Fanen “Mål” på `/resident-360-view` (ikke `[residentId]`) bruger `GoalProgress` mock; live `park_goals` kan være tom (parallel til `resident_plan_items`).  
**Demo-kritisk for kunde #1:** Ja  
**Anbefaling:** Behold — vis recovery + journal ved demo

---

## Vagtoverdragelse / shift handover

**Domæne:** Care Portal  
**Status:** 🟡 Virker delvist  
**Routes:** `/handover-workspace`  
**Tabeller:** `care_residents`, `park_daily_checkin`, `audit_logs` (ved export)  
**Komponenter:** `HandoverClient.tsx`, `ResidentHandoverCard.tsx`  
**Hvad virker:** Live path henter org-beboere + dagens check-in-trafiklys; export til tekst/PDF.  
**Hvad mangler/er brudt:** `initialEntries` er hardcodet demo-navne (`res-001` …) — bruges kun når `useDemoData`. Vagtskift-label afledes af **localStorage** `loadShifts()` (vagtplan-demo), ikke `on_call_staff`. Notater persisteres ikke tydeligt til DB i live-flow (primært session/export).  
**Demo-kritisk for kunde #1:** Ja  
**Anbefaling:** Færdiggør — persist handover-notater eller dokumentér “read-only overblik” ved demo

---

## Journal-modul

**Domæne:** Care Portal  
**Status:** ✅ Virker  
**Routes:** `/care-portal-journal`, 360 `WriteJournalEntry`, `/api/portal/journal-polish`, `/api/portal/journal-day-synthesis`  
**Tabeller:** `journal_entries` (41)  
**Komponenter:** `HurtigJournalModal.tsx`, `JournalOverblikWidget.tsx`, `WriteJournalEntry.tsx`, `JournalRowRecoveryStory.tsx`  
**Hvad virker:** Opret/læs journal med `journal_status`, godkendelse, kategorier; staff org-scoped via RLS (#11).  
**Hvad mangler/er brudt:** AI-polish/synthesis kræver API-nøgler; ikke blocker for manuel journal.  
**Demo-kritisk for kunde #1:** Ja  
**Anbefaling:** Behold

---

## Plan & mål (resident_plan_items + daily_plans)

**Domæne:** Care Portal / Lys  
**Status:** 🟡 Virker delvist  
**Routes:** 360 `ResidentPlanTab`, `DagsPlanPortal`; Lys `LysDagTab`, `/api/lys/propose-plan`, `/api/portal/approve-proposal`, `/api/portal/reject-proposal`  
**Tabeller:** `resident_plan_items` (8), `daily_plans` (0), `plan_proposals` (0)  
**Komponenter:** `ResidentPlanTab.tsx`, `DagsPlanPortal.tsx`, `LysDagTab.tsx`, `LysNextSteps.tsx`  
**Hvad virker:** Personlige planpunkter (`resident_plan_items`) i portal + Lys; AI-planforslag + approve/reject API’er.  
**Hvad mangler/er brudt:** `daily_plans` / `plan_proposals` har **0 rækker** — dagsplan-UI i 360 er klar men ofte tom; forslag-flow ikke bevist i prod-data.  
**Demo-kritisk for kunde #1:** Nice-to-have  
**Anbefaling:** Færdiggør dagsplan-pipeline eller demo med seed på `resident_plan_items` kun

---

## Medicin-modul

**Domæne:** Care Portal  
**Status:** ✅ Virker  
**Routes:** `/resident-360-view/[residentId]` (medicin-fane), dashboard `MedicationWidget`  
**Tabeller:** `resident_medications` (16), `medication_reminders` (0)  
**Komponenter:** `ResidentMedicinTab.tsx`, `MedicationWidget.tsx`, `MedicationList.tsx`, `MedicinReminder.tsx` (Lys)  
**Hvad virker:** Læs/skriv medicinliste per beboer; org-scoped RLS; widget på dashboard.  
**Hvad mangler/er brudt:** `medication_reminders` (0) — UI i portal-fane og Lys-reminder findes, men ingen prod-data.  
**Demo-kritisk for kunde #1:** Ja  
**Anbefaling:** Behold — seed 2–3 medicin + evt. reminders til demo

---

## Crisis / safety system

**Domæne:** Care Portal / Lys  
**Status:** 🟡 Virker delvist  
**Routes:** `/api/lys/crisis-alert`, `AlertPanel`, `LysKrisekort.tsx`, `/api/lys-chat` (safety events)  
**Tabeller:** `crisis_plans` (1), `crisis_alerts` (0), `lys_safety_events` (0)  
**Komponenter:** `AlertPanel.tsx`, `LysKrisekort.tsx`, `safetyEventsService.ts`, `LysChatView` (safety insert)  
**Hvad virker:** Beboer kan trigge krise-alert → `crisis_alerts` + `care_portal_notifications`; staff ser crisis i `AlertPanel` (realtime); krisekort læser `crisis_plans`.  
**Hvad mangler/er brudt:** Ingen historiske alerts/events i DB — realtime/demo af “rød alarm” kræver live trigger eller seed. `lys_safety_events` knyttet til lys-chat (0 samtaler).  
**Demo-kritisk for kunde #1:** Ja (visuel “vi tager sikkerhed alvorligt”)  
**Anbefaling:** Behold — forbered én demo-trigger + seed `crisis_plans`

---

## Care concern notes / advarsler

**Domæne:** Care Portal  
**Status:** ✅ Virker  
**Routes:** Dashboard `BekymringsnotatWidget`, 360 `ResidentOverblikTab`  
**Tabeller:** `care_concern_notes` (2)  
**Komponenter:** `BekymringsnotatWidget.tsx`  
**Hvad virker:** Opret/læs bekymringsnotater per beboer.  
**Hvad mangler/er brudt:** Intet  
**Demo-kritisk for kunde #1:** Nice-to-have  
**Anbefaling:** Behold

---

## Portal beskeder

**Domæne:** Care Portal  
**Status:** ✅ Virker  
**Routes:** `/care-portal-beskeder`  
**Tabeller:** `portal_message_threads` (3), `portal_messages` (4)  
**Komponenter:** `BeskederClient.tsx`, `src/lib/beskeder.ts`  
**Hvad virker:** Interne + Lys-kanaler, tråde/beskeder med org-scoped RLS (#11).  
**Hvad mangler/er brudt:** Lav datamængde — demo bør have 1–2 tråde med indhold.  
**Demo-kritisk for kunde #1:** Nice-to-have  
**Anbefaling:** Behold

---

## Care Portal notifikationer

**Domæne:** Care Portal  
**Status:** 🟡 Virker delvist  
**Routes:** Dashboard `AlertPanel`, `/api/lys/daily-checkin`, `/api/lys/message-staff`, `/api/portal/mood-alert`  
**Tabeller:** `care_portal_notifications` (0)  
**Komponenter:** `AlertPanel.tsx`, `useAlertCount.ts`, `PortalNotificationBar` (via shell)  
**Hvad virker:** Insert fra Lys (check-in rød, besked til personale, krise); staff read/update org-scoped; realtime subscription.  
**Hvad mangler/er brudt:** **0 rækker** — UI er klar men tom indtil beboer-handling eller seed.  
**Demo-kritisk for kunde #1:** Ja (sammen med crisis)  
**Anbefaling:** Behold — trigger check-in eller seed notifikationer

---

## Settings + rolle-styring

**Domæne:** Care Portal  
**Status:** ✅ Virker  
**Routes:** `/care-portal-dashboard/settings`, `/care-portal-roles`, `/care-portal-settings` (facility contacts)  
**Tabeller:** `org_roles` (9), `organisations`, `facility_contacts` (5)  
**Komponenter:** `SettingsClient.tsx`, `roles-client.tsx`, `FacilityContactsManager.tsx`, `/api/portal/roles`  
**Hvad virker:** Roller/rettigheder (`MANAGE_ROLES`, `INVITE_STAFF`, …), org-indstillinger, facility contacts, marketing CMS-kort i settings (hero/sections).  
**Hvad mangler/er brudt:** `/care-portal-settings` er kun facility contacts — roller ligger separat.  
**Demo-kritisk for kunde #1:** Nice-to-have  
**Anbefaling:** Behold

---

## Marketing CMS (portal)

**Domæne:** Care Portal / Marketing  
**Status:** ✅ Virker  
**Routes:** `/api/portal/marketing-copy/institutioner`, `institutioner-sections`; public read `/api/public/marketing-copy/*`  
**Tabeller:** `marketing_content_blocks` (2)  
**Komponenter:** `SettingsClient` (CMS cards), `institutionerCopyCms.ts`  
**Hvad virker:** Rediger hero/sections for `/institutioner` med fallback defaults.  
**Hvad mangler/er brudt:** Kræver staff med `MANAGE_ROLES` (ikke alle demo-brugere).  
**Demo-kritisk for kunde #1:** Nej  
**Anbefaling:** Behold

---

## Admin-værktøjer (BUDR internal)

**Domæne:** Admin  
**Status:** ✅ Virker  
**Routes:** `/budr-admin`, `/budr-admin/export/[orgId]`  
**Tabeller:** `organisations`, `care_staff`, `audit_logs`  
**Komponenter:** `BudrAdminClient.tsx`, `adminOverview.ts`  
**Hvad virker:** Org-oversigt, health filter, export inkl. audit logs; basic auth i middleware.  
**Hvad mangler/er brudt:** Ikke kunde-facing.  
**Demo-kritisk for kunde #1:** Nej  
**Anbefaling:** Behold

---

## Audit logs

**Domæne:** Care Portal / Admin  
**Status:** 🟡 Virker delvist  
**Routes:** Skrives fra `OverrapportPanel`, `OnboardingChecklist`; læses i `budr-admin`  
**Tabeller:** `audit_logs` (44)  
**Komponenter:** `OverrapportPanel.tsx`, `adminOverview.ts`  
**Hvad virker:** Staff-handlinger logges selektivt; admin kan eksportere.  
**Hvad mangler/er brudt:** Ingen dedikeret portal-UI til at browse logs (kun admin export).  
**Demo-kritisk for kunde #1:** Nej  
**Anbefaling:** Behold — overvej lille “seneste aktivitet” senere

---

## On-call staff / vagtplan (portal)

**Domæne:** Care Portal / Lys  
**Status:** 🟡 Virker delvist  
**Routes:** `/care-portal-vagtplan`, `/api/lys/resident-on-call`, Lys `LysVagtplan.tsx`  
**Tabeller:** `on_call_staff` (1)  
**Komponenter:** `VagtplanDemoClient.tsx`, `OnCallStaffWidget.tsx`, `LysVagtplan.tsx`  
**Hvad virker:** `on_call_staff` + `care_staff` join i API; widget på dashboard; beboer ser vagt i Lys.  
**Hvad mangler/er brudt:** `/care-portal-vagtplan` bruger **demo-klient** (`loadShifts` localStorage), ikke `on_call_staff` CRUD.  
**Demo-kritisk for kunde #1:** Nice-to-have  
**Anbefaling:** Færdiggør vagtplan mod DB eller undgå vagtplan-route i demo

---

## Facility contacts

**Domæne:** Care Portal  
**Status:** ✅ Virker  
**Routes:** `/care-portal-settings`, bruges i Lys krisekort  
**Tabeller:** `facility_contacts` (5)  
**Komponenter:** `FacilityContactsManager.tsx`, `LysKrisekort.tsx`  
**Hvad virker:** CRUD for kontakter per facility; beboer læser via RLS.  
**Hvad mangler/er brudt:** Intet  
**Demo-kritisk for kunde #1:** Nice-to-have  
**Anbefaling:** Behold

---

## Beboer-import

**Domæne:** Care Portal  
**Status:** ✅ Virker  
**Routes:** `/care-portal-import`, `/api/portal/import-residents`  
**Tabeller:** `care_residents`  
**Komponenter:** `ImportWizard.tsx`  
**Hvad virker:** CSV/import med rettighed `IMPORT_RESIDENTS`.  
**Hvad mangler/er brudt:** Ikke demo-flow for kunde #1 (data findes).  
**Demo-kritisk for kunde #1:** Nej  
**Anbefaling:** Behold

---

## Staff AI-assistant

**Domæne:** Care Portal  
**Status:** 🟡 Virker delvist  
**Routes:** `/care-portal-assistant`, `/api/portal/staff-assistant`, `/api/portal/staff-assistant-demo`  
**Tabeller:** `care_residents`, `journal_entries` (context)  
**Komponenter:** `AssistantClient.tsx`  
**Hvad virker:** Chat med org-scoped context (live route); demo-route separat.  
**Hvad mangler/er brudt:** Kræver OpenAI + service role; kvalitet ikke auditet.  
**Demo-kritisk for kunde #1:** Nice-to-have  
**Anbefaling:** Park til efter pilot — eller kun demo-route

---

## Care Portal demo-miljø

**Domæne:** Care Portal  
**Status:** 🟡 Virker delvist  
**Routes:** `/care-portal-demo/*`  
**Tabeller:** Demo IDs (`res-001`), ikke prod UUIDs  
**Komponenter:** `ResidentsDemoGrid`, `ResidentDemo360Client`, m.fl.  
**Hvad virker:** Komplet sandbox uden login-krav (egen layout).  
**Hvad mangler/er brudt:** Adskilt fra live portal — forvirring hvis team mixer demo- og live-URL.  
**Demo-kritisk for kunde #1:** Nej (brug live portal)  
**Anbefaling:** Behold til salgstræning — ikke til kunde #1 live-demo

---

## Tilsynsrapport / indsatsdok / aften-dagbog

**Domæne:** Care Portal  
**Status:** 🟡 Virker delvist  
**Routes:** `/care-portal-indsatsdok`, `/care-portal-tilsynsrapport`, `/resident-360-view/dagbog`  
**Tabeller:** `journal_entries`, `park_daily_checkin`  
**Komponenter:** `TilsynsrapportModal.tsx`, `IndsatsModal.tsx`, `DagbogEveningTools.tsx`  
**Hvad virker:** Modaler/tooling til rapport og dagbog fra dashboard/360.  
**Hvad mangler/er brudt:** Ikke gennemtestet i denne audit; afhænger af journal/check-in data.  
**Demo-kritisk for kunde #1:** Nice-to-have  
**Anbefaling:** Behold — smoke-test før demo

---

## Lys (resident-facing app)

## Resident auth (entry)

**Domæne:** Lys  
**Status:** 🟡 Virker delvist  
**Routes:** `/app/[resident_id]`, `/login/[resident_id]` (redirect), `/park-hub`, middleware `isResidentRoute`  
**Tabeller:** `care_residents`, `resident_sessions` (PIN — tabel findes, flow inaktivt)  
**Komponenter:** `app/[resident_id]/page.tsx`, `PinLoginScreen.tsx` (orphan), `middleware.ts`, `/api/resident-session`  
**Hvad virker:** QR/bookmark → cookie `budr_resident_id` → `/park-hub`; middleware validerer UUID + eksisterende beboer + aktiv org.  
**Hvad mangler/er brudt:** **Ingen PIN/WebAuthn** i aktiv flow (`login` redirecter til `app`); `budr_resident_session` HttpOnly bruges ikke konsekvent (PR #5 ikke merged). Svaghed: client-læsbar resident-id cookie.  
**Demo-kritisk for kunde #1:** Ja  
**Anbefaling:** Færdiggør Fase 2.3 session-fix før kundedrift

---

## Daglige check-ins

**Domæne:** Lys  
**Status:** ✅ Virker  
**Routes:** `/api/lys/daily-checkin`, `LysStemningskort`, `park_daily_checkin` view  
**Tabeller:** `lys_checkin` (42)  
**Komponenter:** `LysDagTab.tsx`, `LysStemningskort.tsx`, check-in overlay i `LysShell`  
**Hvad virker:** Humør/trafiklys, gemmes til `lys_checkin`; portal læser via `park_daily_checkin`; kan trigge notifications.  
**Hvad mangler/er brudt:** Intet  
**Demo-kritisk for kunde #1:** Ja  
**Anbefaling:** Behold

---

## Refleksioner

**Domæne:** Lys  
**Status:** ✅ Virker  
**Routes:** `/api/lys/reflection`, `/api/lys/weekly-reflection`, `/api/lys/weekly-reflection/status`  
**Tabeller:** `lys_reflection` (12)  
**Komponenter:** `LysReflection.tsx`, `LysWeeklyReflection.tsx`, `LysWeeklyBanner.tsx`  
**Hvad virker:** Daglig/ugentlig refleksion med status-endpoint.  
**Hvad mangler/er brudt:** Intet  
**Demo-kritisk for kunde #1:** Ja  
**Anbefaling:** Behold

---

## Recovery profile (CHIME)

**Domæne:** Lys / Care Portal  
**Status:** ✅ Virker  
**Routes:** `LysRecoveryProfile`, 360 `ResidentRecoveryTab`, `src/lib/lys-queries.ts`  
**Tabeller:** `lys_recovery_profile` (3)  
**Komponenter:** `LysRecoveryProfile.tsx`, `ResidentRecoveryTab.tsx`  
**Hvad virker:** CHIME-profil, completion %, staff read-only i 360.  
**Hvad mangler/er brudt:** Intet  
**Demo-kritisk for kunde #1:** Ja  
**Anbefaling:** Behold

---

## Next steps / handlingsplan

**Domæne:** Lys / Care Portal  
**Status:** ✅ Virker  
**Routes:** `/api/lys/next-step`, `/api/lys/next-step/[id]`  
**Tabeller:** `lys_next_steps` (16)  
**Komponenter:** `LysNextSteps.tsx`, `ResidentRecoveryTab`  
**Hvad virker:** CRUD på næste skridt, kobling til refleksion.  
**Hvad mangler/er brudt:** Intet  
**Demo-kritisk for kunde #1:** Ja  
**Anbefaling:** Behold

---

## Recovery stories

**Domæne:** Lys / Care Portal  
**Status:** ✅ Virker  
**Routes:** `/api/lys/my-stories`, `/api/lys/my-stories/[id]/approve`  
**Tabeller:** `lys_recovery_stories` (6)  
**Komponenter:** `LysMyStories.tsx`, `JournalRowRecoveryStory.tsx`  
**Hvad virker:** Beboer skriver historier; staff godkender.  
**Hvad mangler/er brudt:** Intet  
**Demo-kritisk for kunde #1:** Nice-to-have  
**Anbefaling:** Behold

---

## Voice / TTS + STT

**Domæne:** Lys  
**Status:** 🔴 Brudt / pauset  
**Routes:** `/api/voice/tts`, `/api/voice/stt`, `/api/voice/save-preference`, `/lys-voice-test`, `LysVoiceSettingsClient`  
**Tabeller:** `care_residents` (voice prefs columns)  
**Komponenter:** `voiceApiAuth.ts`, `useSpeech.ts`, `LysVoiceSettingsClient.tsx`  
**Hvad virker:** Teknisk wiring til ElevenLabs/OpenAI findes; indstillinger kan gemmes.  
**Hvad mangler/er brudt:** **Workstream pauset** — dansk udtale utilfredsstillende; ikke salgsklar.  
**Demo-kritisk for kunde #1:** Nej (undgå i demo)  
**Anbefaling:** Park til efter pilot

---

## Lys conversations / lys-chat

**Domæne:** Lys  
**Status:** 🟡 Virker delvist  
**Routes:** `/lys-chat`, `/api/lys-chat`  
**Tabeller:** `lys_conversations` (0), `lys_safety_events` (0)  
**Komponenter:** `LysChatView.tsx`, `dataService.ts` (conversation persist), `ResidentLysSamtalerTab`  
**Hvad virker:** Fuld chat-UI + API med safety event insert; staff kan læse samtaler i 360.  
**Hvad mangler/er brudt:** **0 samtaler i DB** — feature ikke brugt i prod; afhænger af AI/config.  
**Demo-kritisk for kunde #1:** Nej  
**Anbefaling:** Park til efter pilot — eller kort “koncept-demo” med disclaimers

---

## Crisis-flow i appen (5-trins)

**Domæne:** Lys  
**Status:** ✅ Virker  
**Routes:** `LysKrisekort.tsx`, `/api/lys/crisis-alert`  
**Tabeller:** `crisis_plans`, `crisis_alerts`, `facility_contacts`, `on_call_staff`  
**Komponenter:** `LysKrisekort.tsx`  
**Hvad virker:** Eskalation, kontakter, alert til portal.  
**Hvad mangler/er brudt:** Kræver seedet kriseplan + facility contacts til overbevisende demo.  
**Demo-kritisk for kunde #1:** Ja  
**Anbefaling:** Behold

---

## Push notifications

**Domæne:** Lys  
**Status:** 🔴 Brudt  
**Routes:** Ingen aktiv subscription-UI fundet i `src/app`  
**Tabeller:** `push_subscriptions` (0)  
**Komponenter:** Ingen aktive imports af push registration i app-router  
**Hvad virker:** Tabel + RLS i baseline.  
**Hvad mangler/er brudt:** Ingen implementeret web-push flow i nuværende app.  
**Demo-kritisk for kunde #1:** Nej  
**Anbefaling:** Park til efter pilot

---

## Haven / garden plots

**Domæne:** Lys / Care Portal  
**Status:** 🟡 Virker delvist  
**Routes:** `/haven`, `/api/lys/garden-plot`, 360 `ResidentHavenTab`  
**Tabeller:** `garden_plots` (3)  
**Komponenter:** `haven/page.tsx`, `HavenGardenScene.tsx`, `dataService.ts`, `ResidentHavenTab.tsx`  
**Hvad virker:** Gamification-have med plots i DB; staff kan se i 360.  
**Hvad mangler/er brudt:** Sekundært produkt narrativ (recovery-fokus); kan distrahere fra demo.  
**Demo-kritisk for kunde #1:** Nej  
**Anbefaling:** Park til efter pilot — eller kort visning

---

## Besked til personale (Lys)

**Domæne:** Lys  
**Status:** ✅ Virker  
**Routes:** `/api/lys/message-staff`  
**Tabeller:** `care_portal_notifications`  
**Komponenter:** `LysBeskedTilPersonale.tsx` (eller tilsvarende i park-hub)  
**Hvad virker:** Besked → notification til portal.  
**Hvad mangler/er brudt:** 0 notifications indtil brugt.  
**Demo-kritisk for kunde #1:** Nice-to-have  
**Anbefaling:** Behold

---

## Voice journal

**Domæne:** Lys  
**Status:** 🟡 Virker delvist  
**Routes:** `/api/lys/voice-journal`  
**Tabeller:** `journal_entries` / lys journal flow  
**Komponenter:** API route + journal integration  
**Hvad virker:** API findes.  
**Hvad mangler/er brudt:** Afhænger af pauset voice stack.  
**Demo-kritisk for kunde #1:** Nej  
**Anbefaling:** Park sammen med voice

---

## Lys onboarding

**Domæne:** Lys  
**Status:** ✅ Virker  
**Routes:** `/onboarding`, `LysOnboarding` overlay  
**Tabeller:** `care_residents.onboarding_data`  
**Komponenter:** `OnboardingFlow.tsx`, `LysOnboarding.tsx`  
**Hvad virker:** Førstegangs-flow for beboer.  
**Hvad mangler/er brudt:** Intet  
**Demo-kritisk for kunde #1:** Nice-to-have  
**Anbefaling:** Behold

---

## Marketing (budrcare.dk)

## Forside

**Domæne:** Marketing  
**Status:** ✅ Virker  
**Routes:** `/`  
**Tabeller:** Ingen  
**Komponenter:** `HomeLandingPage.tsx`, `page.tsx`  
**Hvad virker:** Recovery/driftssystem-narrativ, SEO, CTAs.  
**Hvad mangler/er brudt:** OG-URL kan stadig være forkert hvis Netlify `NEXT_PUBLIC_SITE_URL` ikke er `budrcare.dk`.  
**Demo-kritisk for kunde #1:** Ja  
**Anbefaling:** Behold — tjek Netlify env

---

## /institutioner

**Domæne:** Marketing  
**Status:** ✅ Virker  
**Routes:** `/institutioner`, `/api/public/marketing-copy/*`  
**Tabeller:** `marketing_content_blocks`, `marketing_contact_submissions`  
**Komponenter:** `InstitutionerPage.tsx`, `institutionerCopyCms.ts`  
**Hvad virker:** CMS copy + kontaktformular.  
**Hvad mangler/er brudt:** Intet funktionelt  
**Demo-kritisk for kunde #1:** Ja  
**Anbefaling:** Behold

---

## /pilotpakke

**Domæne:** Marketing  
**Status:** ✅ Virker  
**Routes:** `/pilotpakke`  
**Komponenter:** `PilotpakkePage.tsx`  
**Hvad virker:** Print-venlig pilotpakke, booking CTA.  
**Hvad mangler/er brudt:** Intet  
**Demo-kritisk for kunde #1:** Ja  
**Anbefaling:** Behold

---

## Cal.com booking

**Domæne:** Marketing  
**Status:** ✅ Virker  
**Routes:** Eksterne links (ingen API)  
**Tabeller:** Ingen  
**Komponenter:** `constants.ts` (`BOOKING_URL`, `BOOKING_URL_DETAILED`)  
**Hvad virker:** Links til cal.com/budr-care.  
**Hvad mangler/er brudt:** Intet  
**Demo-kritisk for kunde #1:** Ja  
**Anbefaling:** Behold

---

## Kontaktformular

**Domæne:** Marketing  
**Status:** ✅ Virker  
**Routes:** `/api/marketing/contact`  
**Tabeller:** `marketing_contact_submissions` (1)  
**Komponenter:** `InstitutionerPage` kontaktsektion  
**Hvad virker:** POST med rate limit + service role insert.  
**Hvad mangler/er brudt:** Intet  
**Demo-kritisk for kunde #1:** Nice-to-have  
**Anbefaling:** Behold

---

## Død kode / tomme tabeller

## daily_plans + plan_proposals

**Domæne:** Shared  
**Status:** 🟡 Virker delvist (kode aktiv, 0 rækker)  
**Routes:** 360 `DagsPlanPortal`, approve/reject API  
**Tabeller:** `daily_plans` (0), `plan_proposals` (0)  
**Komponenter:** `DagsPlanPortal.tsx`  
**Hvad virker:** Schema + UI + AI-forslag API.  
**Hvad mangler/er brudt:** Ingen prod-data.  
**Demo-kritisk for kunde #1:** Nej  
**Anbefaling:** Færdiggør eller park

---

## shared_goals, support_messages, celebration_notifications

**Domæne:** Shared  
**Status:** ⚫ Død kode  
**Routes:** Ingen ( `/shared-lys` fjernet fra app)  
**Tabeller:** 0 rækker  
**Komponenter:** `SharedGoalUpdate.tsx`, `DirectMessage.tsx`, `CelebrationNotifications.tsx` — **ingen imports**  
**Hvad virker:** Intet i app.  
**Hvad mangler/er brudt:** Social planner feature dropped.  
**Demo-kritisk for kunde #1:** Nej  
**Anbefaling:** Fjern komponenter + overvej tabel-drop efter migration review

---

## care_challenge_completions, care_planner_entries

**Domæne:** Care Portal  
**Status:** ⚫ Død kode  
**Routes:** Kun `CareTeamPlannerStrip.tsx` (ubrugt)  
**Tabeller:** 0 rækker  
**Komponenter:** `CareTeamPlannerStrip.tsx` — **ingen imports**  
**Hvad virker:** Intet.  
**Hvad mangler/er brudt:** Planner strip aldrig integreret.  
**Demo-kritisk for kunde #1:** Nej  
**Anbefaling:** Fjern

---

## shared_lys_sessions, shared_lys_events

**Domæne:** Lys  
**Status:** ⚫ Død kode  
**Routes:** `shared-lys` page **slettet**; RPC i DB  
**Tabeller:** 0 rækker  
**Komponenter:** Ingen  
**Hvad virker:** Kun database/RPC legacy.  
**Hvad mangler/er brudt:** Feature removed from app shell.  
**Demo-kritisk for kunde #1:** Nej  
**Anbefaling:** Park tabel-drop til senere

---

## daily_checkins, goals, thought_checks, resource_registrations (legacy KRAP)

**Domæne:** Lys  
**Status:** ⚫ Død kode  
**Routes:** KRAP routes slettet (`/journal`, `/krise`, …)  
**Tabeller:** Legacy tabeller i baseline; **0 rækker**  
**Komponenter:** `dataService.saveCheckin` / `getCheckins` er **no-op stubs**  
**Hvad virker:** Intet.  
**Hvad mangler/er brudt:** Erstattet af `lys_checkin` + recovery flows.  
**Demo-kritisk for kunde #1:** Nej  
**Anbefaling:** Fjern stubs ved oprydning; park DB-drop

---

## park_goals / park_goal_steps

**Domæne:** Care Portal  
**Status:** ⚫ Død kode (parallel model)  
**Routes:** `GoalProgress.tsx` (live variant)  
**Tabeller:** Ikke i MCP-liste (mulig legacy)  
**Komponenter:** `GoalProgress.tsx` — live query returnerer ofte tom  
**Hvad virker:** Mock variant i demo 360.  
**Hvad mangler/er brudt:** Erstattet af `resident_plan_items` / `lys_next_steps`.  
**Demo-kritisk for kunde #1:** Nej  
**Anbefaling:** Fjern live `park_goals` query eller migrér

---

## user_profiles

**Domæne:** Shared  
**Status:** ⚫ Død kode (prod)  
**Routes:** `profileMemory.ts`, `/api/ai/chat-completion`  
**Tabeller:** `user_profiles` (0)  
**Komponenter:** Minimal  
**Hvad virker:** AI chat completion læser profil hvis sat.  
**Hvad mangler/er brudt:** Ingen profiler oprettet.  
**Demo-kritisk for kunde #1:** Nej  
**Anbefaling:** Park

---

## ai_daily_usage

**Domæne:** Shared  
**Status:** ⚫ Død kode (prod)  
**Routes:** `/api/ai/chat-completion`  
**Tabeller:** `ai_daily_usage` (0)  
**Komponenter:** Rate limit helper i chat-completion  
**Hvad virker:** Kode til daglig kvote.  
**Hvad mangler/er brudt:** Ingen usage rows.  
**Demo-kritisk for kunde #1:** Nej  
**Anbefaling:** Behold hvis AI genaktiveres

---

## medication_reminders

**Domæne:** Care Portal / Lys  
**Status:** 🟡 Virker delvist (0 rækker)  
**Routes:** `ResidentMedicinTab`, `MedicinReminder.tsx`  
**Tabeller:** `medication_reminders` (0)  
**Komponenter:** Se medicin-modul  
**Hvad virker:** CRUD UI klar.  
**Hvad mangler/er brudt:** Ingen data.  
**Demo-kritisk for kunde #1:** Nej  
**Anbefaling:** Seed til demo eller park

---

## Duplikerede API-filer (`route 2.ts`)

**Domæne:** Shared  
**Status:** ⚫ Død kode  
**Routes:** `src/app/api/lys/**/route 2.ts` (ikke Next.js routes)  
**Tabeller:** N/A  
**Komponenter:** Orphan filer i working tree  
**Hvad virker:** Intet — Next ignorerer filnavne med mellemrum.  
**Hvad mangler/er brudt:** Oprydning mangler.  
**Demo-kritisk for kunde #1:** Nej  
**Anbefaling:** Fjern fra repo

---

## PinLoginScreen (orphan)

**Domæne:** Lys  
**Status:** ⚫ Død kode  
**Routes:** `/login/[resident_id]` redirecter til `/app`  
**Komponenter:** `PinLoginScreen.tsx` — **ikke importeret**  
**Hvad virker:** Intet i prod-flow.  
**Hvad mangler/er brudt:** Session hardening ikke aktiveret.  
**Demo-kritisk for kunde #1:** Nej  
**Anbefaling:** Genaktiver ved Fase 2.3 auth-fix

---

*Audit-metode: statisk gennemgang af `src/app` routes, `src/app/api` routes, komponent-imports og Supabase tabel-referencer i `src/`. Ingen runtime smoke-test.*
