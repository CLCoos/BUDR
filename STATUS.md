# STATUS — budr-luksus

Genereret: 2026-08-25. Kun observationer fra kodebasen og git. Ingen kodeændringer. «uklart» = ikke verificeret.

---

## 1. ROUTES

Alle `src/app/**/page.tsx` (61 sider). Status: **live** = Supabase/auth; **demodata** = fiktive/localStorage/demo-flag; **halvfærdig** = UI uden fuld backend eller kun redirect/stub.

| Rute | Formål | Status |
|------|--------|--------|
| `/` | Marketingforside | live |
| `/institutioner` | Institutions-salg | live |
| `/pilotpakke` | Pilottilbud | live |
| `/for-botilbud/journal-og-digital-tilsyn` | SEO-landing | live |
| `/for-botilbud/plan-og-medicinoverblik` | SEO-landing | live |
| `/for-botilbud/varsling-socialpsykiatri` | SEO-landing | live |
| `/privacy` | Privatliv | live |
| `/cookies` | Cookies | live |
| `/terms` | Vilkår | live |
| `/app` | Ældre Lys-story landing | uklart (ingen Supabase; markedsføring/story) |
| `/app/[resident_id]` | Borger-entry → session | live |
| `/login/[resident_id]` | Legacy redirect til `/app/...` | live |
| `/onboarding` | Borger-onboarding UI | **halvfærdig** (TODO: gemmer ikke profil til Supabase) |
| `/invite/[code]` | Staff-invitation | live |
| `/care-portal-login` | Staff-login | live |
| `/care-portal-reset-password` | Nulstil password | live |
| `/care-portal-update-password` | Sæt nyt password | live |
| `/care-portal-dashboard` | Live dashboard | live |
| `/care-portal-dashboard/settings` | Org-indstillinger | live |
| `/care-portal-dashboard/setup` | Ufuldstændig staff-konto | live |
| `/care-portal-journal` | Dashboard journal-widget | live |
| `/care-portal-planner` | Dashboard planlægning | live |
| `/care-portal-alerts` | Dashboard advarsler | live |
| `/care-portal-assistant` | Faglig støtte | live |
| `/care-portal-beskeder` | Beskeder | live |
| `/care-portal-import` | CSV-import | live |
| `/care-portal-roles` | Roller | live |
| `/care-portal-settings` | Krisekontakter | live |
| `/care-portal-residents` | Leder beboer-ops | live |
| `/care-portal-resident-preview/[id]` | Demo-360 bag login eller redirect til live 360 | demodata / live (afhænger af `NEXT_PUBLIC_CARE_PORTAL_SIMULATED_DATA`) |
| `/care-portal-vagtplan` | Vagtplan | live (`care_staff_shifts`; demo-klient med `demoMode={false}`) |
| `/care-portal-vagtplan/loen` | Løn/timer | live (egne rækker i `care_staff_shifts`; demo-klient med `demoMode={false}`) |
| `/care-portal-indsatsdok` | Indsatsdokumentation | **halvfærdig** (kun `localStorage` via `IndsatsModal`) |
| `/care-portal-tilsynsrapport` | Tilsynsrapport | live (kan falde tilbage til demodata via modal-flag) |
| `/handover-workspace` | Vagtoverlevering | live |
| `/resident-360-view` | Beboerliste | live |
| `/resident-360-view/[residentId]` | Beboer 360° | live |
| `/resident-360-view/dagbog` | Dagbog/aftenopsamling | live |
| `/budr-admin` | Intern admin (Basic Auth) | live |
| `/design-system` | Design system (gated) | live |
| `/lys-voice-test` | Stemme-test (gated) | live |
| `/lys-chat` | Lys-chat | live |
| `/lys-settings` | Lys stemmeindstillinger | live |
| `/park-hub` | Lys hjem | live (+ demodata uden gyldig cookie) |
| `/park-hub/dag` | Dagens plan | live |
| `/park-hub/jording` | Jording-øvelser | live |
| `/haven` | Haven/gamification | live (kan bruge lokal/demo-lagring via dataService) |
| `/resident-demo` | Borger-showroom | demodata |
| `/care-portal-demo` | Demo-dashboard | demodata |
| `/care-portal-demo/om-demo` | Demo-forklaring | demodata |
| `/care-portal-demo/assistant` | Demo faglig støtte | demodata |
| `/care-portal-demo/handover` | Demo overlevering | demodata |
| `/care-portal-demo/import` | Demo import (ingen server-upload) | demodata |
| `/care-portal-demo/residents` | Demo beboerliste | demodata |
| `/care-portal-demo/residents/[id]` | Demo 360° | demodata |
| `/care-portal-demo/settings` | Demo indstillinger | demodata |
| `/care-portal-demo/beskeder` | Demo beskeder | demodata |
| `/care-portal-demo/vagtplan` | Demo vagtplan | demodata |
| `/care-portal-demo/vagtplan/loen` | Demo løn | demodata |
| `/care-portal-demo/indsatsdok` | Demo indsatsdok | demodata |
| `/care-portal-demo/tilsynsrapport` | Demo tilsyn | demodata |

Middleware: `/care-portal-demo/*` returnerer **404** når `NEXT_PUBLIC_CARE_PORTAL_SIMULATED_DATA` ikke er `true`. Branding-konstanten `CARE_PORTAL_DEMO_FACILITY_NAME` er stadig «Bosted Solhaven» mens Sara-profilen er i demo-data — inkonsistens, ikke nødvendigvis «halvfærdig side».

---

## 2. API

Alle `route.ts` under `src/app` (52 filer). «Tabeller» = direkte `.from(...)` / RPC i filen (eller i delt helper kaldet herfra).

### Cron / AI-briefs
| Endpoint | Gør | Tabeller |
|----------|-----|----------|
| `POST /api/cron/generate-briefs` | Cron: generér briefs for alle/én beboer (`CRON_SECRET`) | `care_residents`; via `generateBrief`: `lys_checkin`, `journal_entries`, `ai_briefs` |
| `POST /api/portal/generate-brief` | Staff: generér brief for én beboer | `care_residents` + samme som ovenfor |

### Portal
| Endpoint | Gør | Tabeller |
|----------|-----|----------|
| `POST /api/portal/staff-assistant` | Faglig støtte (Anthropic) | `care_residents`, `journal_entries` |
| `POST /api/portal/staff-assistant-demo` | Demo faglig støtte (ingen login) | ingen DB (hardcodet demoprofiler) |
| `POST /api/portal/journal-polish` | «Fagliggør» journaltekst | ingen DB |
| `POST /api/portal/journal-day-synthesis` | Saml dagens kladder til ét notat | `care_residents`, `journal_entries` |
| `POST /api/portal/import-residents` | NDJSON CSV-import | `care_staff`, `care_residents` |
| `POST /api/portal/invite-staff` | Invite + care_staff | `care_staff`, `org_roles` (+ Auth admin) |
| `GET/POST /api/portal/roles` | List/opret roller | `care_staff`, `org_roles` |
| `PATCH/DELETE /api/portal/roles/[roleId]` | Opdater/slet rolle | `org_roles`, `care_staff` |
| `GET/PATCH /api/portal/org-lys-default-voice` | Org default Lys-stemme | `organisations` |
| `GET/PATCH /api/portal/resident-name-display-mode` | Navnevisning | `organisations` |
| `GET/PUT /api/portal/marketing-copy/institutioner` | CMS hero/copy | `marketing_content_blocks` |
| `GET/PUT /api/portal/marketing-copy/institutioner-sections` | CMS sektioner | `marketing_content_blocks` |
| `POST /api/portal/approve-proposal` | Godkend dagsplanforslag | `plan_proposals`, `daily_plans` |
| `POST /api/portal/reject-proposal` | Afvis forslag | `plan_proposals` |
| `POST /api/portal/mood-alert` | Indsæt stemnings-alert | `care_portal_notifications`, `care_residents` |
| `GET/DELETE /api/portal/resident-sessions` | List/revoke beboer-enheder | `resident_sessions` |
| `POST /api/portal/staff-login-audit` | Audit staff.login | RPC `create_audit_log` → `audit_logs` |
| `GET/POST /api/portal/logout` | Sign out + redirect | Auth (ingen tabel) |

### Lys / park
| Endpoint | Gør | Tabeller |
|----------|-----|----------|
| `POST /api/lys-chat` | Lys-chat + safety | `care_residents`, `lys_safety_events` (ingen `lys_conversations`-skriv i denne fil) |
| `POST /api/lys/daily-checkin` | Check-in | `care_residents`, `lys_checkin`, `care_portal_notifications` |
| `GET/POST /api/lys/reflection` | Refleksion (+ AI) | `care_residents`, `lys_reflection` |
| `GET/POST /api/lys/next-step` | Næste skridt | `lys_next_steps`, `lys_reflection`, `care_residents` |
| `PATCH/DELETE /api/lys/next-step/[id]` | Opdater/slet skridt | `lys_next_steps` |
| `GET/POST /api/lys/weekly-reflection` | Ugentlig refleksion | `lys_checkin`, `care_residents` |
| `GET /api/lys/weekly-reflection/status` | Status for ugentlig | `care_residents`, `lys_checkin` |
| `GET /api/lys/my-stories` | Recovery-stories | `lys_recovery_stories` |
| `POST /api/lys/my-stories/[id]/approve` | Godkend story | `lys_recovery_stories` |
| `POST /api/lys/voice-journal` | Stemme→journal/story | `care_residents`, `journal_entries`, `lys_recovery_stories` |
| `POST /api/lys/crisis-alert` | Krise-alert | `care_residents`, `crisis_alerts`, `care_portal_notifications` |
| `GET /api/lys/resident-on-call` | Vagtliste til borger | `care_residents`, `on_call_staff`, `care_staff` |
| `GET/PATCH /api/lys/resident-me` | Beboerprofil | `care_residents`, `organisations` |
| `GET/POST /api/lys/resident-journal` | Lys-journal cloud | `journal_entries`, `care_residents` |
| `POST /api/lys/message-staff` | Besked → journal | `care_residents`, `journal_entries`, `care_portal_notifications` |
| `POST /api/lys/lys-plan-proposal` | Planforslag (cookie) | `care_residents`, `plan_proposals` |
| `POST /api/lys/propose-plan` | AI-planforslag | `care_residents`, `plan_proposals` |
| `GET/POST/PATCH/DELETE /api/lys/garden-plot` | Haven | `garden_plots` |

### Voice
| Endpoint | Gør | Tabeller |
|----------|-----|----------|
| `POST /api/voice/tts` | ElevenLabs TTS | ingen |
| `POST /api/voice/stt` | Whisper STT | ingen |
| `POST /api/voice/save-preference` | Stemmepræference | `care_residents` |
| `POST /api/voice/mark-intro-played` | Marker intro afspillet | `care_residents` |

### Auth / session
| Endpoint | Gør | Tabeller |
|----------|-----|----------|
| `GET/POST /api/resident-auth/session` | Opret/valider beboer-session cookies | `resident_sessions` (via `residentSessions.ts`) |
| `POST/DELETE /api/resident-session` | Sæt/ryd legacy `budr_resident_session` cookie | ingen DB |

### AI øvrigt
| Endpoint | Gør | Tabeller |
|----------|-----|----------|
| `POST /api/ai/chat-completion` | Generisk LLM (+ daglig kvote) | `user_profiles`, `ai_daily_usage` |
| `POST /api/ai/summarize-checkin` | Opsummer check-in-tekst | ingen |

### Marketing / public
| Endpoint | Gør | Tabeller |
|----------|-----|----------|
| `POST /api/marketing/contact` | Kontaktformular | `marketing_contact_submissions` |
| `GET /api/public/marketing-copy/institutioner` | Public CMS | `marketing_content_blocks` |
| `GET /api/public/marketing-copy/institutioner-sections` | Public CMS sektioner | `marketing_content_blocks` |

### Budr-admin
| Endpoint | Gør | Tabeller |
|----------|-----|----------|
| `POST /budr-admin/attach-user` | Kobl auth-bruger til org/rolle | `org_roles`, `care_staff` |
| `POST /budr-admin/deactivate` | Deaktiver org | `organisations` |
| `GET /budr-admin/export/[orgId]` | ZIP CSV-eksport | `organisations`, `care_residents` + dynamisk alle public-tabeller med `org_id`/`resident_id` (via `information_schema.columns`) |

---

## 3. DATABASE

### Migrations
- **Aktive** (rod `supabase/migrations/`, 12 filer):  
  `20260101000000_baseline.sql` … `20260616224126_security_hardening_p1.sql`
- **Arkiv** (`supabase/migrations/archive/`, 45 filer): historiske inkrementelle migrationer; indhold forventes dækket af baseline + nyere.
- **Nyeste fil (filnavns-timestamp):** `20260616224126_security_hardening_p1.sql`  
  - Kommentar i filen: anvendt på prod **2026-06-16 22:41:26 UTC**.  
  - Git-commit der tilføjede sporing: `9e6592d` **2026-08-25**.
- Næstnyeste sporet: `20260529124110_create_ai_briefs.sql` (staging **2026-05-29**; git `e39b8e0` 2026-08-25).

### Tabeller / views (formål)

Fra baseline + senere aktive migrationer:

| Tabel / view | Formål |
|--------------|--------|
| `organisations` | Bosted/org, invite, stemme-default, navnevisning |
| `org_roles` | Roller + permissions |
| `care_staff` | Portal-personale |
| `care_residents` | Borgere/beboere |
| `resident_sessions` | HttpOnly beboer-enhedssessioner |
| `resident_pins` | PIN-hashes (refereret i baseline-funktioner; **CREATE TABLE mangler i aktive migrationer** — uklart om kun i remote/legacy) |
| `audit_logs` | Revisionsspor |
| `journal_entries` | Journal (kladde/godkendt) |
| `daily_plans` | Dagens plan |
| `plan_proposals` | Planforslag til godkendelse |
| `care_concern_notes` | Bekymringsnotater |
| `care_portal_notifications` | Dashboard-alerts |
| `crisis_alerts` / `crisis_plans` | Krise |
| `facility_contacts` | Krise-/vagttelefoner |
| `on_call_staff` | Vagtliste |
| `medication_reminders` / `resident_medications` | Medicin |
| `lys_conversations` | Lys-samtaler (historik) |
| `lys_safety_events` | Safety-klassifikation fra chat |
| `lys_checkin` | Recovery check-in (CHIME-scores) |
| `park_daily_checkin` | **View** over `lys_checkin` (compat) |
| `lys_recovery_profile` | CHIME-ressourceprofil |
| `lys_reflection` | Refleksioner |
| `lys_next_steps` | Næste skridt |
| `lys_recovery_stories` | Borger-fortællinger |
| `ai_briefs` | AI-mønsterbriefs til 360° |
| `ai_daily_usage` | AI-kvote pr. bruger |
| `garden_plots` | Haven |
| `resident_plan_items` / `resident_plan_completions` / `resident_badges` / `resident_xp` | Plan, badges, XP |
| `portal_message_threads` / `portal_messages` | Intern beskeder |
| `marketing_contact_submissions` | Kontaktformular |
| `marketing_content_blocks` | Institutions-CMS |
| `shared_lys_sessions` / `shared_lys_events` | Delt Lys |
| `shared_goals` / `support_messages` / `celebration_notifications` | Social |
| `care_challenge_completions` / `care_planner_entries` | Challenges / planner |
| `daily_checkins` / `goals` / `thought_checks` / `resource_registrations` / `user_profiles` | Ældre KRAP-lignende tabeller i baseline |
| `push_subscriptions` | Push |
| `park_goals`, `park_goal_steps`, `park_thought_catch`, `park_resource_profile`, `park_traffic_alerts` | Oprettet i baseline; **droppes** i `20260516000000_lys_recovery_schema.sql` |

**Ikke på main:** `vum_assessments` (kun på branch `feature/vum-2-sprint-1`).

---

## 4. HALVFÆRDIGT

### TODO / FIXME (kode)
- `src/lib/marketing/saraTimeline.ts` — `TODO: replace hardcoded data with /api/demo/sara when ready`
- `src/app/onboarding/components/StepCelebration.tsx` — `TODO: Backend — save profile to Supabase...`
- `TODO.md` — Cal.com-booking markeret åben, men `BOOKING_URL` i `constants.ts` er allerede `https://cal.com/budr-care/introduktion` (TODO.md forældet)

Ingen `FIXME`-hits i `src/`.

### Hardcodet demodata (udvalg)
- `src/lib/careDemoResidents.ts`, `careDemoResidentDetail.ts`, `journalDemoDrafts.ts`, `demoShiftPlan.ts`
- `src/lib/marketing/saraTimeline.ts`, `src/lib/tilsynsrapport/demoResidents.ts`, `src/lib/overrapport/*`
- Demo-seeds i `AlertPanel`, `HurtigJournalModal`, `HandoverClient`, `DashboardDemoMain`, `DemoSeeder`, `/resident-demo`
- Live vagtplan/løn genbruger demo-klienter + localStorage
- Indsatsdok: kun localStorage

### Udkommenteret kode
Ingen tydelige blokke med udkommenterede `import`/`export`/`function`/`return <` fundet via søgning. Enkeltstående forklarende kommentarer findes (fx i `BiometricPrompt`).

### Filer uden import-referencer (heuristik: ingen `@/`- eller relative import af stem)
Ikke bevist «død» (kan være dynamisk/legacy), men **ingen fundne imports**:

- `src/app/login/[resident_id]/PinLoginScreen.tsx`
- `src/app/park-hub/components/DailyCheckin.tsx`
- `src/app/park-hub/components/LysChat.tsx`
- `src/app/park-hub/components/LysDagensProgram.tsx`
- `src/app/park-hub/components/LysSocialTab.tsx`
- `src/app/park-hub/components/LysUgeTilbageblik.tsx`
- `src/app/park-hub/components/ParkHubClient.tsx`
- `src/app/resident-360-view/components/Resident360Client.tsx`
- `src/components/BareEtSkridt.tsx`
- `src/components/CareTeamPlannerStrip.tsx`
- `src/components/CelebrationNotifications.tsx`
- `src/components/DirectMessage.tsx`
- `src/components/LandingPage.tsx`
- `src/components/OfflineIndicator.tsx`
- `src/components/SharedGoalUpdate.tsx`
- `src/components/TopNav.tsx`
- `src/components/auth/PinSetupFlow.tsx` (kommentar siger Care Portal — ingen call site fundet)
- `src/components/marketing/CareEntrySplit.tsx`
- `src/components/marketing/LandingInteractiveDemo.tsx` (nævnt i docs som brugt; **ikke importeret** fra `HomeLandingPage` nu)
- `src/components/marketing/ParkLoginNotice.tsx`
- `src/lib/hooks/useChat.ts`
- `src/lib/supabase/profileMemory.ts`

---

## 5. AI-BRIEFS

### Hvor kaldes `ai_briefs`?
1. **`src/lib/ai/generateBrief.ts`** — `insert` efter Anthropic-kald (læser `lys_checkin` + `journal_entries`).
2. **`src/app/api/portal/generate-brief/route.ts`** — staff POST → `generateBriefForResident`.
3. **`src/app/api/cron/generate-briefs/route.ts`** — cron POST → samme helper.
4. **`src/app/resident-360-view/[residentId]/page.tsx`** — `select` seneste brief til SSR.
5. **`src/app/resident-360-view/components/ResidentHeader.tsx`** — UI kalder `POST /api/portal/generate-brief` (skriver via API, ikke direkte tabel).

Migration: `supabase/migrations/20260529124110_create_ai_briefs.sql`.

### Netlify scheduled function
- Fil **findes:** `netlify/functions/scheduled-briefs.mts`  
  - `export const config = { schedule: '0 5 * * *' }`  
  - Kalder `POST ${URL}/api/cron/generate-briefs` med `x-cron-secret` / `CRON_SECRET`, fan-out pr. borger, weekly om mandage.
- **`netlify.toml`:** indeholder **ikke** `[functions]` / `scheduled` / cron-config. Kun `[build]`, `NODE_VERSION`, tom `SENTRY_DSN`, `@netlify/plugin-nextjs`.
- Konklusion: scheduled-funktionen er **kildekode i repo**; om Netlify stadig kører den er **uklart** (afhænger af Netlify-deploy + at `netlify/functions` auto-opdages). Den er **ikke** deklareret i `netlify.toml`.

---

## 6. MILJØVARIABLER

### Nøgler refereret i kode (`process.env.*`)
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SITE_URL`, `ANTHROPIC_API_KEY`, `ANTHROPIC_JOURNAL_POLISH_MODEL`, `ANTHROPIC_MODEL`, `ANTHROPIC_SAFETY_MODEL` (scripts), `OPENAI_API_KEY`, `GEMINI_API_KEY`, `PERPLEXITY_API_KEY`, `ELEVENLABS_API_KEY`, `CRON_SECRET`, `NEXT_PUBLIC_GA_MEASUREMENT_ID`, `NEXT_PUBLIC_GA_BYPASS_CONSENT`, `NEXT_PUBLIC_CARE_PORTAL_SIMULATED_DATA`, `BUDR_ALLOW_PARK_DEMO_COOKIE`, `BUDR_ADMIN_SECRET`, `BUDR_ADMIN_BASIC_USER`, `BUDR_ADMIN_BASIC_PASS`, `NEXT_PUBLIC_DESIGN_SYSTEM_ENABLED`, `NEXT_PUBLIC_DESIGN_SYSTEM_ACCESS`, `NEXT_PUBLIC_VOICE_TEST_ENABLED`, `NEXT_PUBLIC_LYS_VOICE_OBSERVABILITY`, `AI_DAILY_LIMIT`, `API_RL_AI_COMPLETION_PER_MIN`, `API_RL_LYS_CHAT_PER_MIN`, `SENTRY_DSN`, `SENTRY_ORG`, `SENTRY_PROJECT`, `BUDR_PRODUCTION_SOURCE_MAPS`, `DIST_DIR`, `PLAYWRIGHT_BASE_URL`, `NODE_ENV`, `NEXT_RUNTIME`.

`.env.example` nævner også `NEXT_PUBLIC_ADSENSE_ID`, `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` — **ingen** `process.env`-brug fundet i app-kode.

Netlify function bruger desuden `URL` (Netlify-platform) + `CRON_SECRET`.

### Til stede i `.env.local` (nøgler kun; værdier ikke gentaget her)
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `ANTHROPIC_API_KEY`, `ELEVENLABS_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`, `CRON_SECRET`.

### Refereret i kode, **mangler** i `.env.local`
`NEXT_PUBLIC_SITE_URL`, `OPENAI_API_KEY`, `GEMINI_API_KEY`, `PERPLEXITY_API_KEY`, `ANTHROPIC_JOURNAL_POLISH_MODEL`, `ANTHROPIC_MODEL`, `NEXT_PUBLIC_GA_MEASUREMENT_ID`, `NEXT_PUBLIC_GA_BYPASS_CONSENT`, `NEXT_PUBLIC_CARE_PORTAL_SIMULATED_DATA`, `BUDR_ALLOW_PARK_DEMO_COOKIE`, `BUDR_ADMIN_SECRET`, `BUDR_ADMIN_BASIC_USER`, `BUDR_ADMIN_BASIC_PASS`, `NEXT_PUBLIC_DESIGN_SYSTEM_ENABLED`, `NEXT_PUBLIC_DESIGN_SYSTEM_ACCESS`, `NEXT_PUBLIC_VOICE_TEST_ENABLED`, `NEXT_PUBLIC_LYS_VOICE_OBSERVABILITY`, `AI_DAILY_LIMIT`, `API_RL_*`, `SENTRY_*`, `BUDR_PRODUCTION_SOURCE_MAPS`, `DIST_DIR`, `PLAYWRIGHT_BASE_URL`.

Mange er valgfrie (fallback/`NODE_ENV`). **STT** (`OPENAI_API_KEY`) og **admin** (`BUDR_ADMIN_SECRET`) vil fejle/blokere uden dem. `NEXT_PUBLIC_SITE_URL` fallbacker til `https://budrcare.dk` / `window.location.origin`.

---

## 7. SIDSTE 30 COMMITS

| Periode | Hvad der reelt blev bygget |
|---------|----------------------------|
| 2026-08-25 | Next **15.5.24** (middleware auth bypass); marketing datalokation EU; **git-sporing** af allerede anvendte prod/staging-migrationer (`ai_briefs`, security hardening) + revisionsdokumenter |
| 2026-06-14 | Security hygiene: untrack `.env`, fjern dublerede `route 2.ts`, tilføj `.env.example` |
| 2026-06-03 | **AI-briefs stack:** portal generate + 360-visning; cron-endpoint + `generateBrief`; Netlify `scheduled-briefs` fan-out; prettier/e2e-oprydning |
| 2026-05-29 | AI-briefs første route; diagnostics-oprydning; `/resident-demo` showroom; Sara/Anders Lys-demo-konsistens |
| 2026-05-22 | Merge **Sara-univers** Care Portal-demo; guidet tour + render-loop/prettier fixes |
| 2026-05-21 | CI (type-check/lint/build/test), lockfile, unit tests (uuid/sessions/redirect/safety), helper-refactor |
| 2026-05-20 | Resident-auth RSC cookie-fix (#17); marketing CHIME (#13), login-nav (#14), CHIME mobil (#15); 360 prettier |

---

## 8. DE 25 BRANCHES

**Faktisk lokalt:** 24 branches inkl. `main` (ikke 25).  
**Remote ekstra:** mange `origin/cursor/critical-*` / `cursor/dev-env-setup-*` (ikke lokalt).  
Kriterium «merged»: tip er ancestor af `main`, **eller** squash/PR-commit findes på main mens unikke filer allerede er på main.

### Merged ind i main (tip ⊆ main, eller tydeligt squash + indhold på main)
| Branch | Note |
|--------|------|
| `main` | — |
| `chore/ci-and-lockfile` | ancestor; PR #22 |
| `cursor-cleanup` | ancestor |
| `demo/sara-univers` | ancestor (merge `c83ec90`) |
| `feature/ai-briefs-cron` | ancestor |
| `feature/resident-auth-flow` | ancestor |
| `test/critical-path-units` | ancestor; PR #24 |
| `feature/chime-interactive-section` | tip ≠ ancestor, men `ChimeInteractive` på main via #13; branch har residuale diffs |
| `feature/login-nav-and-text-polish` | tip ≠ ancestor; #14 på main; residuale diffs |
| `fix/resident-auth-rsc-cookie` | tip ≠ ancestor; #17 på main |
| `hotfix/chime-mobile-layout` | tip ≠ ancestor; #15 på main |
| `feature/resident-session-auth` | tip ≠ ancestor; sessions-filer/migration **findes på main** |
| `hotfix/care-residents-rls` | tip ≠ ancestor; migration **på main** |
| `hotfix/rls-consolidation-7-tables` | tip ≠ ancestor; migration **på main** |
| `marketing/recovery-narrative` | tip ≠ ancestor; store dele via #9 m.fl. på main — **uklart** om 100 % af tip er med |
| `rebuild/lys-recovery-architecture` | tip ≠ ancestor; recovery-schema/API’er på main — **uklart** om 100 % |

### Arbejde der ikke (fuldt) kom med på main
| Branch | Hvad mangler på main |
|--------|----------------------|
| `design/360-mockup-v2` | HTML-mockups under `docs/mockups/` |
| `docs/360-audit` | `docs/audit/360-resident-view-audit.md` |
| `docs/feature-audit` | `docs/audit/feature-status.md` |
| `feature/360-i-dag-tab` | `ResidentTodayTab.tsx` |
| `feature/360-i-dag-foldud` | Udvidet `ResidentTodayTab` |
| `feature/360-rebuild` | Samme spor som foldud (overlap) |
| `feature/vum-2-sprint-1` | VUM API (`/api/portal/vum-assessments`), `ResidentVumTab`, `src/lib/vum/*`, migration `20260518120000_vum_assessments.sql`, `vum_demo_seed.sql` (+ docs) |
| `fix/resident-auth-strip-query` | Strip af querystring ved session-redirect (diff findes ikke på main tip) |

### Remote-only (ikke blandt de 24 lokale)
`origin/cursor/critical-bug-inspection-*`, `critical-bug-investigation-*`, `critical-correctness-bugs-*`, `dev-env-setup-b6a2` — indhold ift. main: **uklart** (ikke gennemgået commit-for-commit her).

---

*Slut. Ingen andre filer ændret.*
