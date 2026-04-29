# BUDR – Project Context

**Til AI/assistenter:** Læs denne fil først. Kort indgang: [`AGENTS.md`](./AGENTS.md).

**Sidst opdateret (manuelt):** 2026-04-29 — **Deploy-fix (manglende Tooltip-komponent):** `src/components/ui/Tooltip.tsx` + `src/components/ui/Tooltip.module.css` er tilføjet til git, så importen `@/components/ui/Tooltip` i `ResidentLysSamtalerTab` kan resolv'es på Linux/case-sensitive build-miljøer (Netlify). Verificeret med lokal `npm run build`.

**Forrige:** 2026-04-28 — **Care Portal Lys safety-events UI:** Ny delt service `src/lib/lys/safetyEventsService.ts` til hent/ack/realtime af `lys_safety_events` + danske relative tidslabels. Ny `PortalNotificationBar` i header (`TopHeader`) viser bell-badge, dropdown med 5 nyeste ubekræftede events og realtime-opdatering med cleanup. `ActionCards` udvidet med “Lys-advarsler” (acute/elevated sortering, udtalelses-uddrag, “Åbn samtale” + “Bekræft set”). Nyt `ResidentLysSamtalerTab` på beboerkortet (`resident-360-view`) viser `lys_conversations`, modal-transskript, inline risk-flags med reasoning-tooltip og samlet “Bekræft set”.

**Forrige:** 2026-04-28 — **Lys safety-klassifikator (chat):** Ny migration `20260428162000_lys_safety_events.sql` opretter `lys_safety_events` (RLS + realtime publication). Ny `src/lib/lys/safetyClassifier.ts` kalder Anthropic Haiku (`claude-haiku-4-5-20251001`) og returnerer struktureret risikoniveau (`none|elevated|acute`) med fail-safe til `elevated`. `/api/lys-chat` kører klassifikation parallelt med chat-svar (5s timeout), logger elevated/acute events via service-role som fire-and-forget (blokkerer ikke borgerens svar), og accepterer valgfri `conversation_id` fra `LysChatView`.

**Forrige:** 2026-04-28 — **Lys stemmevalg + UX:** “Daniel” rettet til **Stine** (kvinde); valg i Lys/Portal begrænset til **Stine** og **Chris** (`LYS_VOICE_CHOICES`). `/lys-chat` har nu hurtig stemme-switch i toppen (Stine/Chris) som gemmer direkte via `/api/voice/save-preference`. `/lys-settings` tilbageknap har fallback til `/lys-chat` hvis der ikke er browserhistorik, og 401 viser tydelig beboersession-hjælp.

**Forrige:** 2026-04-27 — **Lys TTS:** `eleven_v3` + `output_format=mp3_44100_128`; `elevenLabsTtsErrors` klassificerer ikke længere alle **422** som plan-fejl. **502** i development kan indeholde `detail` (rå ElevenLabs-body) for hurtigere debug i `/lys-voice-test`.

**Forrige:** 2026-04-26 — **`assertVoiceApiCaller`:** I `NODE_ENV !== 'production'` accepteres TTS/STT uden beboer-cookie/staff-session (så `/lys-voice-test` matcher sidens dev-adgang). Production uændret (resident eller staff).

**Forrige:** 2026-04-26 — **Lys stemme (TTS/STT):** Migration `20260426220000_lys_voice_preferences.sql` (`care_residents`: `lys_voice_id`, `lys_voice_autoplay`, `lys_voice_intro_played_at`; `organisations`: `lys_default_voice_id`). API: `POST /api/voice/tts` (ElevenLabs REST, `eleven_v3`, `output_format=mp3_44100_128`), `POST /api/voice/stt` (OpenAI Whisper), `POST /api/voice/save-preference`, `POST /api/voice/mark-intro-played`, `GET/PATCH /api/portal/org-lys-default-voice` (kræver `MANAGE_ROLES`). `GET/PATCH /api/park/resident-me` udvidet med stemme + `lys_voice_effective_id`. Komponenter: `VoiceMessageButton`, `VoiceInputWhisper` (intro-TTS første gang). `/lys-chat`: afspil-knap på AI-svar, Whisper-mikrofon, autoplay efter pointer-gesture, tandhjul → `/lys-settings`. `/lys-voice-test` (staff + `canAccessLysVoiceTestPage`), `/design-system` sektioner Voice/*. Afhængighed: **`openai`** (npm); TTS uden deprecated `elevenlabs`-pakke — `ELEVENLABS_API_KEY` + `OPENAI_API_KEY` på server. **Kør migration på Supabase** før prod.

**Forrige:** 2026-04-26 — **Beboerliste `/resident-360-view` (finpuds):** Kl. 10-regel og liste-«i dag»-check-in følger **Europe/Copenhagen** (`copenhagenIsAtOrAfterClock`, `copenhagenStartOfTodayUtcIso` / `copenhagenYmd` i fetch). Standard **status**-sortering: manglende dags-check-in først inden for samme trafiklys; ved **check-in**-kolonne startes **desc** (seneste først). Hurtigmenu: journal → `?tab=overblik&writeJournal=1` + `WriteJournalEntry.openFromQueryParam` (fjerner query efter åbning; `Suspense` omkring `useSearchParams`), medicin → `?tab=medicin`, check-in → overblik + `#resident-park-checkin` (scroll i `ResidentOverblikTab`), 360° → `?tab=overblik`.

**Forrige:** 2026-04-26 — **Care Portal indstillinger (UX):** `SettingsClient` har tydeligere «Organisations-ID»-tekst, bedre forklaring når invitation er spærret (rolle/rettighed), kort intro til navnevisning for ledere, og rolle-redigering med **grupperede** rettigheder på dansk + teknisk id som undertekst, søgefelt og scrollbar i lange lister.

**Forrige:** 2026-04-26 — **Staff-rettigheder (invite/roller):** portal-rettigheder kommer fra `care_staff.role` + `care_staff.role_id` → `org_roles.permissions` (`getStaffPermissions` / `getPortalStaffPermissions`), ikke fra `auth.user_metadata.org_id` alene. Bruger `christiancloos@outlook.com` var knyttet til rollen **gæst** i `care_staff`, derfor manglede bl.a. `invite_staff`. Data-migration `supabase/migrations/20260426200000_promote_christiancloos_care_staff_leder.sql` sætter `role = leder` og `role_id` til organisationens systemrolle **leder** (join på `auth.users` via email). Kørt på prod med `supabase db push --linked --include-all` (efter `migration repair` for legacy `20260408` som tidligere).

**Forrige:** 2026-04-25 — **Prod-migration kørt (navnefelter):** migration `supabase/migrations/20260424112000_resident_name_display_mode_and_name_fields.sql` er nu anvendt på produktion via `supabase db push --linked --include-all`, så `care_residents.first_name` og `care_residents.last_name` findes i prod. Root-cause for navnefejl var manglende deploy af denne migration. Bemærk: migrationshistorik har stadig en historisk særhed omkring version `20260408` vs `20260408_001` (duplikat/legacy), men push er gennemført og nyeste migrationer er anvendt.

**Forrige:** 2026-04-20 — **Lys hjem + vagtplan:** `LysHome` bruger nu shell-`tokens` til kort/tekst (mørkt tema læsbar). Krise-FAB `fixed` med `right` udregnet ud fra centreret `max-w-lg`-kolonne. Genvej **Vagtplan** åbner overlay med `LysVagtplan` (live: `GET /api/park/resident-on-call` → `on_call_staff` + `care_staff.full_name` for beboerens `org_id`); tom tilstand med CTA til kalender-fanen; demo beholder eksempeldata.

**Forrige:** 2026-04-20 — **Lys (`/park-hub`):** Bruger kan vælge lyst eller mørkt tema (knap ved initialer; `localStorage` `budr-lys-theme`). Fuldskærms-flows (stemning, blomst, tankefanger, mål, …) bruger samme palet som hovedskallen — ikke længere døgnbaseret `lysTheme`-baggrund, så lys/mørk ikke blandes. Nyt `lysParkHubShellDark()` + `colorScheme` på `LysThemeTokens`. Stemning: én “fortæl mere”-sektion; `VoiceJournal` kan styles med tokens (`showTitle={false}` i stemningsflow). Kalender/vagtplan: færre hårdkodede hvide flader.

**Forrige:** 2026-04-20 — **Marketing `/institutioner` hero:** Top-række (logo + booking-CTA) og anker-navigation på egen fuld bredde-række med diskret separator; `BOOK_DEMO_CTA` bruges konsekvent; `institutioner-hero-title` med bredere `max-width` + `text-wrap: balance` for bedre linjeskift. Styles i `budr-landing.css`.

**Forrige:** 2026-04-20 — **Middleware (prod-sikkerhed):** `/park-hub` og `/park/*` validerer `budr_resident_id` som UUID + findes i `care_residents` (service role); ugyldig cookie ryddes (`budr_resident_id` + `budr_resident_session`) og redirect til `/`; IP-rate-limit ved mislykkede valideringer (10/60s, in-memory). `/care-portal-demo/*` giver **404** når `NEXT_PUBLIC_CARE_PORTAL_SIMULATED_DATA` ikke er `true`. Øvrige staff-ruter kræver JWT + række i `care_staff` (ellers `?error=unauthorized`). `POST /api/resident-session`: `budr_resident_session` med `SameSite=lax`, `maxAge=31536000`.

**Forrige:** **Beboer-import (2026-04-20):** `/care-portal-import` bruger `ImportWizard` (3 trin: CSV-upload med `parseResidentsCsv`, gennemgang, import med live status via **NDJSON-stream** fra `POST /api/portal/import-residents`). API kræver **`SUPABASE_SERVICE_ROLE_KEY`**, sætter `user_id` med `crypto.randomUUID()`, org fra `care_staff`, standardfelter (`da` / `purple` / `simple_mode false`) + `onboarding_data`-minimum som før. Sidebar-link **Importer beboere** kun for `care_staff.role === 'leder'`; rolle hentes i `PortalShell` (`getPortalStaffRole`) og sendes som prop (ikke længere kun client-fetch). Afhængighed **`xlsx`** fjernet fra import-flow.

**Forrige:** 2026-04-15 — **Marketing overhaul:** Forside og institutioner omskrevet til konvertering. Falske metrics fjernet. `LandingInteractiveDemo` tilføjet til forside (`#live-demo`, dynamisk import). OG-billeder genereret via `next/og` (`src/app/opengraph-image.tsx`, `src/app/institutioner/opengraph-image.tsx`). Delt `MarketingFooter`-komponent oprettet og tilføjet til begge sider. Nav på `/institutioner` tilføjet med anker-links + "Book demo"-knap. FAQ-sektion (`#faq`) med 5 indvendinger tilføjet til institutioner-siden. USP-labels rettet (ikke længere "USP 01/02/03"). Cal.com booking-URL som konstant i `InstitutionerPage.tsx` linje 13 — afventer rigtigt link. Se `TODO.md` for åbne opgaver.

**Forrige:** 2026-04-14 — **Marketing rewrite (/ + /institutioner):** Forsiden er nu en reel landing page i `src/components/marketing/HomeLandingPage.tsx` (hero i fuld viewport, social proof-bar, problemblok, løsningsblok og én tydelig CTA til `/institutioner`). `src/app/page.tsx` bruger nu denne komponent + `budr-landing.css` + `marketingFontVariableClassName`. **Institutioner-siden** er omskrevet fra bunden i `src/components/marketing/InstitutionerPage.tsx` med ny struktur: hero, problem, samlet løsning (Care Portal + Lys), differentiering, ærlig social proof, kort målgruppe/implementering, nedprioriteret pilot, IT/DPO-linje og aktiv kontaktsektion. **Styling:** nye, scoped klasser i `src/app/budr-landing.css` (`.home-v2`, `.institutioner-v2` m.fl.), ingen nye dependencies, ingen inline styles i de nye komponenter. **Kvalitet:** `npm run type-check && npm run lint && npm run build` grønt efter formatteringsrettelser.

**Forrige:** Live Care Portal (`PortalShell`) matcher demo-skallen: `CarePortalTopNav` (glas + dokumentsøgning), mørk mobil-header, sidemenu med **Vagtplan**, **Beskeder**, **Borger-app (Lys)**; nye ruter `/care-portal-vagtplan`, `/care-portal-beskeder`, `/care-portal-residents`, `/care-portal-resident-preview/[id]` (sidstnævnte: demo 360° bag login). **Pilot-simulering:** `NEXT_PUBLIC_CARE_PORTAL_SIMULATED_DATA` (`true` / `false`); uden værdi er det **kun i development** simuleret dashboard som demo — i **production** skal pilot sætte `=true` for demo-widgets + simuleret beboer-grid. Se `src/lib/carePortalPilotSimulated.ts`.

---

## Status snapshot (hvor projektet står)

- **UI — Care Portal + Lys:** `lysParkHubShell()` bruger samme lyse baggrund/teal-accent som Care Portal light (`#f4f6fb` / `#1d9e75`); `LysShell`, bundmenu og “Mere”-skuffe læser tokens; `park-hub/layout` wrapper `#budr-lys-root` med DM Sans via `--font-landing-body`. Care Portal topnav: link til Lys bruger `var(--cp-green)`. **PortalShell:** `cp-page-enter` bruger kun opacity; tunge `fixed`-overlays (fx `OverrapportPanel`) bør porteres til `document.body` så de ikke påvirkes af layout/animation på forældre.
- **Middleware:** `middleware.ts` — park-ruter vs. `care_residents`; demo-portal bag env-flag; staff via `care_staff` (inkl. **`/design-system`**); se **Sidst opdateret** ovenfor.
- **Care Portal — import:** `src/app/care-portal-import/page.tsx` + `ImportWizard.tsx`; `src/app/api/portal/import-residents/route.ts` (max 100 pr. request, stream `application/x-ndjson`). Demo-import (`/care-portal-demo/import`) uændret separat demo-side.
- **Marketing / budrcare.dk forside:** `src/components/marketing/CareEntrySplit.tsx` — ét DOM-træ (`.care-entry-panels`): kolonne på mobil, side-om-side fra 768px; ingen duplikat mobil/desktop-markup. Mørk venstre panel (borgere/pårørende → `/institutioner`), lys højre (Care Portal → `/care-portal-login`). SVG grid, hover-shade, divider-orb kun desktop, feature hints kun ≥768px (`budr-feature-hints--entry-row`). Styles i `src/app/care-entry-landing.css`. `budr-landing.css` (+ ved behov `budr-landing-longform.css` med `HomeLanding`) til øvrige marketing-sider. **Institutions-CMS:** hero/CTA/pilot-link på `/institutioner` kan redigeres/publiceres uden kode via `care-portal-dashboard/settings`.
- **Marketing / budrcare.dk forside (aktuel):** `src/components/marketing/HomeLandingPage.tsx` er nu primær forsidekomponent (ikke split/splash). Struktur: hero + social proof-bar + problem + løsning + CTA til `/institutioner`. Route: `src/app/page.tsx`.
- **Marketing / institutioner (aktuel):** `src/components/marketing/InstitutionerPage.tsx` er omskrevet med skarp B2B-copy og kortere beslutningssektioner; anonym case og tung IT/DPO-blok er fjernet til fordel for ærlig social proof og kontakt-link til teknisk dokumentation.
- **Dokumentsøgning:** `src/components/DokumentSøgning.tsx` — `?q=` i URL forudfylder feltet (Suspense omkring `useSearchParams`). **Live:** push til `/resident-360-view/[residentId]?tab=<overblik|medicin|dagsplan|plan|haven>` (+ valgfri `q`). **Demo:** `/care-portal-demo/residents/[id]?tab=…`; `ResidentsDemoGrid` læser også `q`. **Afdeling:** ved valgt hus (ikke «Alle») og aktiv søgning vises to blokke (egen afdeling øverst, øvrige nederst); live-rækker har `house` udledt fra `onboarding_data`.
- **Faglig støtte (Care Portal):** `src/lib/portalStaffAssistantFollowUps.ts` — strukturerede follow-ups med valgfri `searchQuery`, `resident360Id`, `residentTab`; `staffAssistantFollowUpHref()` bygger href inkl. dybe 360°-links. `POST /api/portal/staff-assistant` beriger kontekst med **`care_residents.user_id`** (til model-output). UI: `AssistantClient.tsx` (demo + live).
- **Lys — journal mod Supabase (live beboere):** `GET`/`POST` `src/app/api/park/resident-journal/route.ts` (service role + beboer-cookie), `src/lib/residentUuid.ts`, `src/lib/dataService.ts` (`shouldUseCloudJournal`, `saveJournalEntry`, `getJournalEntries`), `LysJournalTab.tsx` — kategori **Lys journal**; **kladde** vs **godkendt**. Badge-logik: `residentBadges.ts`, `residentBadgeSync.ts` (koblet til journal-/plan-forløb).
- **Haven / Lys-oplevelse:** `havenGamification.ts`, `havenCustomization.ts`, udvidet haven-UI (`HavenGardenScene` m.fl.), **Lys**-layouts/onboarding/chrome (`park-hub/layout.tsx`, `LysOnboarding`, `LysStatusChrome`, `useOnlineStatus`). **Park-hub:** `lysParkHubShell()` / `lysParkHubShellDark()` + bruger-toggle; faner og fuldskærms-flows deler samme tokens. `lysTheme(phase)` findes stadig (fx `lys-chat`, `DailyPlanView`), med `colorScheme` pr. fase.
- **Analytics:** `AnalyticsGate.tsx`, `Ga4Scripts.tsx`, `src/lib/analyticsConsent.ts` / `analytics.ts` — GA4 kun når måling er tilladt; `NEXT_PUBLIC_GA_MEASUREMENT_ID` (valgfrit), `NEXT_PUBLIC_GA_BYPASS_CONSENT` til test.
- **Vagtoverlevering (live):** `HandoverClient` loader org-beboere via `resolveStaffOrgResidents`; progress og tom/loading-tilstand uden demo-banner når data er reel.
- **Live-dashboard (journal/varsler):** `POST /api/portal/journal-polish` kalder Anthropic via `src/lib/ai/anthropicJournalPolish.ts` (model-fallback, `maxDuration` 60, samler alle `text`-blokke). `AlertPanel` henter beboernavne i separat query — ingen `care_residents(...)`-embed (PostgREST kræver FK; `crisis_alerts` / `care_portal_notifications` har ikke FK i migrationer). `resolveStaffOrgResidents` returnerer kun gyldige UUID `user_id` (undgår 400 på `.in('resident_id', …)`).
- **BingBong + pilot-env:** Selv med `NEXT_PUBLIC_CARE_PORTAL_SIMULATED_DATA=true` bruger org med slug `bingbong-demo` det **live** dashboard (ingen `ResidentListDemo` / pilot-modaler): `useStaffOrgIsBingbong` + `DashboardClient`; medicin henter live i `MedicationWidget` når slug matcher. `DashboardLiveNotice` viser ikke pilot-banner for den org. `getOrganisationForStaff` inkluderer `slug` til server-checks. **Dashboard zone 2:** `md` giver medicin `col-span-2` (fuld række — undgår halv bredde); `lg` bruger `minmax(280px,1fr)` på tredje spor + `min-w-[min(100%,280px)]` på `MedicationWidget`.
- **Journal — original vs. AI-forslag:** Efter **Fagliggør med AI** kan personalet skifte mellem **Original** og **AI-forslag** via `JournalVersionToggle` i `WriteJournalEntry` (360°) og `HurtigJournalModal` (dashboard); den synlige version gemmes ved kladde/gem. Ingen andre call sites til `POST /api/portal/journal-polish`. **Dagens dagbog** (`DagbogEveningTools`) bruger `journal-day-synthesis`, ikke polish — anden funktion, samme mønster er ikke påkrævet dér med mindre produktet vil sammenligne “rå AI-udkast” med manuelt redigeret tekst før gem. **Journal UI (2026):** Bredere 360°-modal (`max-w-2xl`), scroll kun i indhold, fast **handlingsbjælke** (Gem/Annuller), foldet **kladde/dagbog**-hjælp (`<details>`), **tegntæller** ved notat, **farvet venstrekant** på felter i sammenligning (`compareEditorChrome.ts`). **Hurtig journal:** `max-w-xl`, samme mønster + **Stram med AI** som kompakt knap i værktøjslinjen (ikke fuld bredde under feltet).
- **Aftenopsamling / journal-schema:** Miljøer uden `journal_entries.journal_status` eller `show_in_diary` får fallback-queries (`src/lib/journalEntriesQueryCompat.ts`, `POST /api/portal/journal-day-synthesis`, `dagbog/page.tsx`, `DagbogEveningTools` insert). **Anbefalet:** kør migrationer `20260404120000_journal_entries_journal_status.sql` og `20260418120000_journal_entries_show_in_diary.sql` på produktion.
- **360° overblik (live):** `ResidentHeader`, `ResidentOverblikTab`, `GoalProgress` / `ShiftNotesFeed` (valgfri `carePortalDark`), eksport og **Skriv notat** matcher **PortalShell**-paletten; data som før (**Mål** fra `park_goals` / `park_goal_steps`, godkendt journal i `ShiftNotesFeed`). **Journal i dag:** afgrænsning med `copenhagenStartOfTodayUtcIso()` (`src/lib/copenhagenDay.ts`); side `force-dynamic`; `ResidentOverblikTab` genhenter ved `portal-journal-updated` så nye notater vises uden at stole kun på `router.refresh()`.
- **Marketing / institutioner:** `https://…/institutioner` — institutionssti inkl. anonym case (tillid) og **sikkerhed/governance** til IT/DPO (Netlify, Supabase, RLS, journal kladde/godkendt, Anthropic ved AI); link fra forsidenav og `HomeLanding`-intro.
- **Marketing / kontakt:** `POST /api/marketing/contact` gemmer henvendelser i `marketing_contact_submissions` (migration `20260406180000_marketing_contact_submissions.sql`); kræver **`SUPABASE_SERVICE_ROLE_KEY`** på serveren. Formular på forsiden (`#kontakt`) og `/institutioner#kontakt`. Privatliv: opdateret afsnit om kontaktformular.
- **Marketing / SEO-landingssider:** Under `/for-botilbud/` — `journal-og-digital-tilsyn`, `varsling-socialpsykiatri`, `plan-og-medicinoverblik` (indhold i `src/lib/marketing/seoIntentContent.ts`, UI `SeoIntentLanding.tsx`). CTA: demo + `#kontakt` med `formSource` pr. side. `src/app/sitemap.ts` inkluderer dem; root `metadataBase` sættes fra `NEXT_PUBLIC_SITE_URL` (fallback `https://budrcare.dk`) for kanoniske URL’er.
- **Marketing / pilotpakke:** `/pilotpakke` — produktbeskrivelse (8–12 uger, leverancer, bostedets bidrag, måling med konkrete indikator), print/PDF via browser (`pilotpakke-print.css`). Kontaktformular med `source=pilotpakke`. Link fra institutionsstien og footers.
- **Øvrigt:** `src/lib/apiRateLimit.ts` på udvalgte API-ruter, `public/manifest.webmanifest`, demo-navigation (`DemoTopNav`, `DemoPortalMobileNav`).

---

## Overview

**BUDR** is a Danish wellbeing platform for residents in social psychiatric care facilities and the staff who support them. It includes:

1. **Borger-app (resident webapp)** — PARK-oriented flows under `/park-hub` (mood, journal, goals, crisis tools).
2. **Care Portal** — Staff dashboard (overview, resident 360°, handover, documentation helpers).

Stack: **Next.js 15** (App Router), **Supabase** (Postgres, Auth, Edge Functions), **Netlify** (typical deployment).

---

## Authentication

### Residents

- PIN (4 digits) via Supabase Edge Functions; optional WebAuthn.
- Session cookies and validation via edge functions (`resident-session-validate`, etc.). The app route `POST/DELETE /api/resident-session` can set or clear the HttpOnly `budr_resident_session` cookie after client-side verification.
- **Preview:** `middleware.ts` can set a demo resident cookie when none exists so `/park-hub` is viewable without login — **disable or tighten for real production** where each resident must authenticate.

### Staff (Care Portal)

- **Supabase Auth** (email/password). Middleware redirects unauthenticated users from portal routes to `/care-portal-login`.
- **Organisation scoping:** Staff users should have `org_id` (UUID) in **Auth user metadata**. Client queries filter `care_residents` (and related alerts, journals, plans) by that organisation.
- **Audit:** Successful staff logins can be logged with `create_audit_log` (`staff.login`) when `SUPABASE_SERVICE_ROLE_KEY` is set on the server.

---

## Database

Schema is versioned under `supabase/migrations/` (organisations, `org_id` on residents, audit logs, daily plans, plan proposals, **journal workflow**, etc.). Apply migrations to each Supabase environment with `supabase db push` (linked project) or by running new SQL files in the dashboard.

Do **not** commit real project URLs or secrets; use environment variables only.

**`care_concern_notes`:** Bekymringsnotater på live dashboard + 360° overblik (hurtige observationer, ikke journal-godkendelse). Migrationer: `20260411120000_care_concern_notes.sql` (tabel + SELECT/INSERT/DELETE), `20260412110000_care_concern_notes_staff_update.sql` (staff UPDATE + RLS).

**`care_portal_notifications`:** Dashboard-/AlertPanel notifikationer (service role indsætter fra park-API’er; personale SELECT/UPDATE med org-scope). Migration: `20260413120000_care_portal_notifications_rls.sql` (tabel hvis mangler, indeks, RLS, ingen INSERT for `authenticated`).

**`facility_contacts` + KRAP/park-flow (`park_thought_catch`, `park_resource_profile`, `park_traffic_alerts`, `park_goals`, `park_goal_steps`):** Migration `20260414100000_facility_contacts_park_flow_rls.sql` — staff via `care_visible_facility_ids()` / `care_staff_can_access_resident`; beboer SELECT på kontakter for egen `care_residents.org_id`, egne park-rækker som ved plan-items (`src/lib/park-queries.ts`, krisekort).

**Sociale / planner / delt Lys:** `20260415100000_social_planner_shared_lys_rls.sql` — `shared_goals`, `support_messages`, `celebration_notifications`, `care_challenge_completions`, `care_planner_entries` (beboer: synlige rækker + org-matchende broadcast), `shared_lys_sessions` / `shared_lys_events`, RPC `shared_lys_join_session(code)` til sikker tilslutning. App: `SharedLysView` bruger RPC ved join (`/shared-lys`).

**KRAP + AI-profil:** `20260416100000_krap_user_profiles_ai_usage_rls.sql` — `daily_checkins`, `goals`, `thought_checks`, `resource_registrations` (eje via `profile_id` = `auth.uid()`; staff SELECT via `care_staff_can_access_resident`), `user_profiles` (egen række + staff SELECT for org-beboer), `ai_daily_usage` (kun SELECT egen række for `authenticated`; INSERT/UPDATE forbliver service role i `chat-completion`).

**Supabase projects:** Production is **`olszwyeikwbtjcoopfid`** (`https://olszwyeikwbtjcoopfid.supabase.co`). Run `supabase link --project-ref olszwyeikwbtjcoopfid` before `db push` so the CLI targets production. An older unused staging project (`mxlivgnynoagulrmqipf`) can be ignored or deleted in the Supabase dashboard if you do not need it.

### Journal (`journal_entries`) — kladde → godkendt (2026-04)

- **Columns (migrations):** `journal_status` (`kladde` | `godkendt`, default `godkendt`), `approved_at`, `approved_by`. Existing rows are backfilled as `godkendt`.
- **RLS:** `20260405100000_journal_entries_rls.sql` — authenticated **portal staff** (`care_is_portal_staff()` + `org_id` in JWT) may **SELECT / INSERT / UPDATE** only for rows whose `resident_id` matches a `care_residents` row in `care_visible_facility_ids()`. **DELETE** is not opened to the client. Routes using the **service role** bypass RLS (e.g. beboerbesked → `journal_entries`, some server reads).
- **App behaviour:** Staff can save a note as **kladde** or **godkendt** from `WriteJournalEntry` on `/resident-360-view/...`. Overblik lists drafts with **Godkend journal**. **OverrapportPanel** (vagtoverblik) and **staff-assistant** context only load **`journal_status = godkendt`**. Beboerbeskeder indsættes som godkendt med `approved_at`.
- **Resident 360 (live):** `/resident-360-view` and `/resident-360-view/[residentId]` use **`createServerSupabaseClient()`** (staff JWT). Data is filtered by **RLS**; ukendt `residentId` uden for org giver tom data → **404**.

### Lys journal (`/api/park/resident-journal`) — cloud for rigtige beboere

- **Rolle:** Beboer-session (cookie / identitet som øvrige park-API’er) + **service role** på serveren; gemmer/læser rækker i **`journal_entries`** når cloud-mode er aktiv for det aktive resident-id.
- **App:** `shouldUseCloudJournal` i `dataService.ts` styrer om `LysJournalTab` kalder API eller lokalt lager; kategori **Lys journal**; status **kladde** / **godkendt** matcher portal-journal flows.

### Org-RLS (`care_residents` m.fl.) — 2026-04

- **Migration:** `20260406130000_staff_org_rls.sql` — helper `care_staff_can_access_resident(text)`, **RLS** på `care_residents` (staff: `org_id` i JWT; beboer: `auth.uid() = user_id` for SELECT/UPDATE egen række), `park_daily_checkin` (staff SELECT), `daily_plans` / `plan_proposals` (staff CRUD via org-beboer), `resident_medications` (staff SELECT hvis tabellen findes).
- **Lys uden staff-JWT:** `POST /api/park/daily-checkin` og **`GET`/`PATCH` `/api/park/resident-me`** samt **`POST` `/api/park/lys-plan-proposal`** bruger **service role** + cookie `budr_resident_id` (server validerer ikke PIN her — det er et separat sikkerhedslag). `park-hub` SSR henter beboer med service role.
- **Plan + badges (RLS):** `20260407120000_resident_plan_items_badges_rls.sql` — `resident_plan_items` / `resident_badges` med samme beboer- og org-staff-model som øvrigt (`care_staff_can_access_resident`, `auth.uid()::text = resident_id` for beboer).
- **Lys-samtaler (RLS):** `20260412100000_lys_conversations_rls.sql` — tabel `lys_conversations` + RLS parallelt med plan-items (staff i org, beboer egen `resident_id`). Policies bruger `resident_id::text` så både `text` og ældre `uuid`-kolonner virker med `care_staff_can_access_resident(text)`.

---

## Care Portal: demo vs live

| Route | Behaviour |
|--------|-----------|
| `/care-portal-demo` | **Simulated** data, dark portal shell (sidebar + top bar + mobile menu). Same navigation pattern as live; no staff session required. |
| `/care-portal-dashboard` (after login) | **Live** data from Supabase, scoped by staff `org_id`. |

**Demo routes** (all under `/care-portal-demo/…`): dashboard (tabs `journal` / `planner` / `alerts`), handover, residents, import, assistant, settings, indsatsdokumentation, tilsynsrapport, **vagtplan** (+ `/vagtplan/loen` for hours, vacation, estimated gross pay; shifts stored in `localStorage`), **beskeder** (internal + Lys-style mock threads). Shared clients (`HandoverClient`, `AssistantClient`, indsats/tilsyn) accept `carePortalDark` and demo `returnHref` where relevant.

**Dokumentsøgning** — se **Status snapshot** (URL’er, `q`, Suspense). Mock data i komponenten; live 360° bruger de rigtige app-ruter med danske `tab`-navne.

**Demo 360° (`/care-portal-demo/residents/[residentId]`, `ResidentDemo360Client`):** Simulated resident detail from `getResidentDemoDetail` / `careDemoResidentDetail.ts`. Includes **situation templates** (`SITUATION_TEMPLATES`: nat, weekend, nyindflytning, udskrivning, …), **standard events**, unified status, and **journal** split into **Kladder** vs **Godkendt journal** with local demo approval (toast + `journalApprovedIds`). Medication demo uses **PN** (medicin efter behov), not “PRN”. Hooks for journal approval run **before** any early return so React hook order stays valid.

---

## Legal / compliance (site)

- `/privacy` — Privatlivspolitik (GDPR-oriented template; adjust with counsel for your DPA).
- `/cookies` — Cookies og lokal lagring.
- `/terms` — Vilkår, herunder ansvar for dokumentation og serviceloven.

Marketing copy avoids implying automatic myndighedsgodkendelse or “GDPR-certified” without basis; native app store links are not shown until apps exist (webapp CTA instead).

---

## Environment variables

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=   # server only — audit log, imports, APIs
NEXT_PUBLIC_SITE_URL=

# Valgfrit — GA4 efter samtykke (AnalyticsGate)
NEXT_PUBLIC_GA_MEASUREMENT_ID=
NEXT_PUBLIC_GA_BYPASS_CONSENT=   # "true" kun til test uden cookie-banner

# Server — Faglig støtte (Anthropic)
ANTHROPIC_API_KEY=
# Valgfrit — kun journal-polish (Fagliggør med AI). Hvis udeladt: samme som øvrige Claude-kald + intern fallback-liste.
# ANTHROPIC_JOURNAL_POLISH_MODEL=claude-sonnet-4-5-20250929
```

### Netlify (production)

In **Site configuration → Environment variables**, set at least the following for **Production** (and **Preview** if previews should talk to the real Supabase project):

| Variable | Notes |
|----------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Must match production project, e.g. `https://olszwyeikwbtjcoopfid.supabase.co`. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key from the same Supabase project (Settings → API). |
| `SUPABASE_SERVICE_ROLE_KEY` | **Service role** secret (same screen). **Server-only** — never prefix with `NEXT_PUBLIC_`. Required so cookie-based residents (`budr_resident_id`) can use **`/api/park/garden-plot`**, **`/api/park/daily-checkin`**, **`/api/park/resident-me`**, **`/api/park/resident-journal`**, **`/api/park/lys-plan-proposal`**, **`/api/park/message-staff`**, park-hub SSR, proposal approve/reject, and staff audit paths. If this is missing, the app falls back to the anon key and those routes often fail with RLS or empty writes. |
| `ANTHROPIC_API_KEY` | Påkrævet for **`/api/portal/staff-assistant`** (Faglig støtte i portalen) og for **`/api/portal/journal-polish`** (journal AI). |
| `ANTHROPIC_JOURNAL_POLISH_MODEL` | **Valgfrit.** Styrer **kun** hvilken Claude-model der bruges til **Fagliggør med AI** på journal (360° + hurtig journal). Sættes i Netlify → Environment variables (Production) eller i `.env.local` lokalt. Brug et model-id din Anthropic-konto understøtter (se [Anthropic docs](https://docs.anthropic.com/en/docs/about-claude/models)); fx stærkere sprog: `claude-sonnet-4-5-20250929` eller alias som dokumenteret hos Anthropic. Uden variabel: først `ANTHROPIC_CHAT_MODEL` (`src/lib/ai/anthropicModel.ts`), derefter intern fallback i `anthropicJournalPolish.ts`. Efter ændring: **ny deploy** (prod) eller genstart `npm run dev` (lokalt). |
| `NEXT_PUBLIC_SITE_URL` | Public site origin (canonical URLs, links). |

Ud over **Haven** (kun Supabase-trio på serveren) kan **GA4** og **Anthropic** tilføjes — se miljølisten ovenfor.

After changing variables, trigger a **new deploy** so Next.js picks them up.

**Verify (names + runtime):** The Netlify UI is the source of truth for secret values. To confirm keys exist without opening the UI, install the [Netlify CLI](https://docs.netlify.com/cli/get-started/), run `netlify link` in the repo, then `netlify env:list` — you should see `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, and `NEXT_PUBLIC_SUPABASE_ANON_KEY` scoped to Production. A quick runtime check: `curl -s -o /dev/null -w '%{http_code}\n' 'https://<dit-site>/api/park/garden-plot'` → **401** without cookies means the route is live (it does not prove the service role is valid; if the key were wrong, authenticated cookie flows could still return 500).

### Post-deploy smoke (Min have / Lys)

1. **Lys (live):** Open `/park-hub` with `budr_resident_id` set. **Vand** i Min have forudsætter **vand optjent** ved at fuldføre opgaver på **Din dag** (ét vand pr. fuldført opgave). Tilføj plante → fuldfør mindst én dag-opgave → vand → tjek Network: **`/api/park/garden-plot`** **200**.
2. **360° Haven (live):** Staff login → `/resident-360-view/[residentId]` → **Haven** tab; same plant/water/remove if the resident uses cloud haven for that id.
3. **Demo:** `/care-portal-demo/residents/[demoId]?tab=haven` — UI is simulated; optional check that navigation and copy match expectations.

**Local quick API check** (dev server on port 4028, valid `.env.local`):  
`curl -H "Cookie: budr_resident_id=<id>" http://127.0.0.1:4028/api/park/garden-plot` → `{"data":[...]}`. Then POST/PATCH/DELETE with JSON as in `src/app/api/park/garden-plot/route.ts`.

---

## Quality gates

- `npm run build` — TypeScript check + ESLint (Prettier via ESLint). Build fails on TS errors; remaining ESLint issues are mostly **warnings** (some rules relaxed to `warn` so legacy code does not block deploy — tighten over time).
- `npm run type-check` — `tsc --noEmit` (Deno edge functions under `supabase/functions` are excluded in `tsconfig.json`).
- `npm run lint` / `npm run lint:fix` — full ESLint + Prettier.
- `npm test` — Vitest (`src/lib/staffOrgScope.test.ts`).

---

## Current product focus (short)

Leveringsmønster: **små vertikale skiver** (ét gennemført flow ad gangen). Seneste spor: **marketing** (troværdig copy + rolig hero-indgang), **portal-navigation** (dokumentsøgning med `q`, dybe links fra Faglig støtte), **Lys journal i skyen** for rigtige beboere, **badges/haven** for engagement og demo/kvalitet.


Mål på mellemlang sigt: **én sandhed pr. beboer**, tydelig **borger ↔ portal**-synlighed, **kladde → godkendt journal** på tværs af demo og live, og skærpede **RLS**-grænser på flere tabeller.

**Supabase CLI:** The repo root `.env.local` must be valid dotenv (every line `KEY=value`). A stray line without `=` breaks `supabase` commands. Run **`supabase db push`** after pulling new migrations; **`supabase link`** must use project ref **`olszwyeikwbtjcoopfid`** (same host as `NEXT_PUBLIC_SUPABASE_URL`). Local link metadata lives under `supabase/.temp/` (gitignored).

---

## Known gaps (non-exhaustive)

- **RLS** — `journal_entries` og dele af org-model er på plads; **`resident_plan_items` / `resident_badges`** m.fl. bør gennemgås (se migrations-noter). Andre tabeller kan stadig mangle staff/beboer-adskillelse.
- **Resident 360 / service role** — nogle beboerflows bruger service role bevidst; dokumentér og harmonisér med org-scoped klienter løbende.
- **AI** (journal, plan, Faglig støtte) — alt output er **udkast** indtil faglig godkendelse; ingen kliniske påstande uden menneskelig vurdering.
- **Rate limits** — `apiRateLimit` på udvalgte ruter; udvid/hårdnål hvor misbrug er relevant.
- **Middleware preview** — demo-resident cookie til `/park-hub` skal **strammes eller fra** i ægte produktion (se Authentication).
