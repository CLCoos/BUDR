# BUDR – Project Context

**Til AI/assistenter:** Læs denne fil først. Kort indgang: [`AGENTS.md`](./AGENTS.md).

**Sidst opdateret (manuelt):** 2026-04-10 — **Marketing CSS + fonte:** `src/app/budr-landing-longform.css` samler HomeLanding-only (hero-mesh, flow, USP, Lys, live-demo/idemo, sammenligning m.m.); `budr-landing.css` er kerne (nav, intro, CTA, footer, kontaktform + `.hero-actions` til institutioner/pilot/SEO). Fælles `next/font` via `src/app/marketing-fonts.ts` (`marketingFontVariableClassName`) på institutioner-, pilotpakke- og for-botilbud-ruter. — **CareEntrySplit markup/CSS:** næsten ingen inline styles — deck-titler, accent-streg, panel-grid SVG, hover-shade og desktop feature-hints ligger i `care-entry-landing.css`; hint-tekster som konstante lister + `map`. — **Forside performance:** `src/app/care-entry-landing.css` (kun forsiden); `page.tsx` importerer ikke længere hele `budr-landing.css`. DM Sans/Serif via `next/font` på `<html>` i `layout.tsx`; Google Fonts-import i `tailwind.css` uden DM (Fraunces + Plus Jakarta). `CareEntrySplit`: kortere splash (~0,9 s), `sessionStorage` springer splash over i samme session, spring over ved `prefers-reduced-motion`, hover-overlay ~380 ms. **Øvrigt:** `AnalyticsGate` viser pending-banner efter dobbelt `requestAnimationFrame`; `npm run lighthouse:institutioner` + Lighthouse-filer i `.gitignore`; `ResidentOverblikTab` uden ubrugt simple_mode-kode. — **2026-04-13 — Forside (CareEntrySplit) redesign:** `src/components/marketing/CareEntrySplit.tsx` + entry-styles (nu i `care-entry-landing.css`, tidligere toppen af `budr-landing.css`). Paneler: `budr-panel-left/right`, statisk SVG grid (ingen CSS `::before`-gradient), opacity-hover-overlay (ingen flex-transition → ingen reflow). Midter-orb: `.budr-divider` absolut centreret (`translate(-50%,-50%)`) med to `.budr-divider-line` og `.budr-divider-orb` (mørk baggrund, teal kant). CTA-links: `budr-cta-dark` / `budr-cta-green` (`<a href>`). Feature hints: inline flex-row. “Læs mere” linker til `/institutioner`. Hover-logik: `handleMouseEnter`/`handleMouseLeave` med `hoverTimer` ref — overlay fader ud kort efter museforlader, kun for korrekt panel (`current === side ? null : current`). Splash-animation: kun `budr-entry`, ingen `budr-pulse`. **Theme scope:** `data-theme` flyttet fra `<html>` til `#care-portal-shell` div i `PortalShell.tsx`; `ThemeToggle` bruger `document.getElementById('care-portal-shell')?.setAttribute('data-theme', ...)`. CSS vars scoped til `#care-portal-shell, :root` (mørkt) og `#care-portal-shell[data-theme='light']` (lyst) — marketing-sider påvirkes ikke af portal-tema. **Portal animationer:** `cp-page-enter`, `cp-card-hover`, `cp-skeleton` tilføjet i `src/styles/tailwind.css`; `cp-page-enter` på children-wrapper i `PortalShell`. **ThemeToggle:** Lucide `Sun`/`Moon` ikoner, solid hvid/mørk knap. **Live Beskeder:** `portal_message_threads` + `portal_messages` tabeller i Supabase; `src/lib/beskeder.ts` (4 funktioner med null guards); `src/components/BeskederClient.tsx` med live auth + Realtime (postgres_changes subscription); `/care-portal-beskeder/page.tsx` bruger `BeskederClient`. **Medicin-widget (live):** Når `NEXT_PUBLIC_CARE_PORTAL_SIMULATED_DATA` er `false` (fx BingBong-produktion), henter `MedicationWidget` dagens opgaver fra `resident_medications` (status `aktiv`) for org-beboere i stedet for demo-mock; hus `TLS` i onboarding understøttes (`CARE_HOUSES` + `carePortalHouseChipLabel`). **Journal (Fønix-stil) + dagbog:** `WriteJournalEntry` med én tekstboks (overskrifterne *Aktivitet/Handling* / *Refleksion*), kategori-pills (bl.a. pædagogisk/sundhed/socialt), **Fagliggør med AI** via `POST /api/portal/journal-polish`, samt **Vis i dagbog** (`journal_entries.show_in_diary`, migration `20260418120000_journal_entries_show_in_diary.sql`). **Dagens dagbog:** `/resident-360-view/dagbog` (sidebar + link fra beboerlisten). **BingBong-seed:** 18 beboere med initialer pr. hus i `scripts/seed-bingbong-demo.sql`; fuld nulstilling i `scripts/seed-bingbong-from-scratch.sql`. **Mini CMS til institutions-copy**: nyt Supabase-lag `marketing_content_blocks` + API-ruter for hero og sektionstekster (`/api/portal/marketing-copy/institutioner`, `/api/portal/marketing-copy/institutioner-sections`, public read under `/api/public/marketing-copy/...`) og redigering/publicering i Care Portal settings (`MarketingCopyCmsCard`, `MarketingSectionsCmsCard`). **Nyhed:** versionshistorik + rollback i CMS (gemte revisioner i `marketing_content_blocks.revisions`, migration `20260409112000_marketing_content_revisions.sql`, “Seneste versioner” + “Gendan” i settings). `/institutioner` læser publiceret CMS-copy med fallback til indbygget tekst. **Live 360°** (`/resident-360-view/[id]`) matcher mørkt Care Portal-design. **Dataimport** (`importResidentsAction`) bruger staff `org_id`. **Testbosted:** `scripts/seed-bingbong-demo.sql`; tilfældige check-ins via `scripts/seed-bingbong-random-checkins.sql`.

**Forrige:** Live Care Portal (`PortalShell`) matcher demo-skallen: `CarePortalTopNav` (glas + dokumentsøgning), mørk mobil-header, sidemenu med **Vagtplan**, **Beskeder**, **Borger-app (Lys)**; nye ruter `/care-portal-vagtplan`, `/care-portal-beskeder`, `/care-portal-residents`, `/care-portal-resident-preview/[id]` (sidstnævnte: demo 360° bag login). **Pilot-simulering:** `NEXT_PUBLIC_CARE_PORTAL_SIMULATED_DATA` (`true` / `false`); uden værdi er det **kun i development** simuleret dashboard som demo — i **production** skal pilot sætte `=true` for demo-widgets + simuleret beboer-grid. Se `src/lib/carePortalPilotSimulated.ts`.

---

## Status snapshot (hvor projektet står)

- **Marketing / budrcare.dk forside:** `src/components/marketing/CareEntrySplit.tsx` — ét DOM-træ (`.care-entry-panels`): kolonne på mobil, side-om-side fra 768px; ingen duplikat mobil/desktop-markup. Mørk venstre panel (borgere/pårørende → `/institutioner`), lys højre (Care Portal → `/care-portal-login`). SVG grid, hover-shade, divider-orb kun desktop, feature hints kun ≥768px (`budr-feature-hints--entry-row`). Styles i `src/app/care-entry-landing.css`. `budr-landing.css` (+ ved behov `budr-landing-longform.css` med `HomeLanding`) til øvrige marketing-sider. **Institutions-CMS:** hero/CTA/pilot-link på `/institutioner` kan redigeres/publiceres uden kode via `care-portal-dashboard/settings`.
- **Dokumentsøgning:** `src/components/DokumentSøgning.tsx` — `?q=` i URL forudfylder feltet (Suspense omkring `useSearchParams`). **Live:** push til `/resident-360-view/[residentId]?tab=<overblik|medicin|dagsplan|plan|haven>` (+ valgfri `q`). **Demo:** `/care-portal-demo/residents/[id]?tab=…`; `ResidentsDemoGrid` læser også `q`.
- **Faglig støtte (Care Portal):** `src/lib/portalStaffAssistantFollowUps.ts` — strukturerede follow-ups med valgfri `searchQuery`, `resident360Id`, `residentTab`; `staffAssistantFollowUpHref()` bygger href inkl. dybe 360°-links. `POST /api/portal/staff-assistant` beriger kontekst med **`care_residents.user_id`** (til model-output). UI: `AssistantClient.tsx` (demo + live).
- **Lys — journal mod Supabase (live beboere):** `GET`/`POST` `src/app/api/park/resident-journal/route.ts` (service role + beboer-cookie), `src/lib/residentUuid.ts`, `src/lib/dataService.ts` (`shouldUseCloudJournal`, `saveJournalEntry`, `getJournalEntries`), `LysJournalTab.tsx` — kategori **Lys journal**; **kladde** vs **godkendt**. Badge-logik: `residentBadges.ts`, `residentBadgeSync.ts` (koblet til journal-/plan-forløb).
- **Haven / Lys-oplevelse:** `havenGamification.ts`, `havenCustomization.ts`, udvidet haven-UI (`HavenGardenScene` m.fl.), **Lys**-layouts/onboarding/chrome (`park-hub/layout.tsx`, `LysOnboarding`, `LysStatusChrome`, `useOnlineStatus`). **Park-hub faner:** `lysParkHubShell()` i `lysTheme.ts` — Hjem/Mig/Kalender/Journal + onboarding/demo-banner bruger faste læsefarver på den lyse shell (`#F7F5F1`); fuldskærms-flows (stemning, blomst, tankefanger, mål, daglig sejr, sanser, AAC) bruger stadig `lysTheme(phase)` til baggrund og accent.
- **Analytics:** `AnalyticsGate.tsx`, `Ga4Scripts.tsx`, `src/lib/analyticsConsent.ts` / `analytics.ts` — GA4 kun når måling er tilladt; `NEXT_PUBLIC_GA_MEASUREMENT_ID` (valgfrit), `NEXT_PUBLIC_GA_BYPASS_CONSENT` til test.
- **Vagtoverlevering (live):** `HandoverClient` loader org-beboere via `resolveStaffOrgResidents`; progress og tom/loading-tilstand uden demo-banner når data er reel.
- **Live-dashboard (journal/varsler):** `POST /api/portal/journal-polish` kalder Anthropic via `src/lib/ai/anthropicJournalPolish.ts` (model-fallback, `maxDuration` 60, samler alle `text`-blokke). `AlertPanel` henter beboernavne i separat query — ingen `care_residents(...)`-embed (PostgREST kræver FK; `crisis_alerts` / `care_portal_notifications` har ikke FK i migrationer). `resolveStaffOrgResidents` returnerer kun gyldige UUID `user_id` (undgår 400 på `.in('resident_id', …)`).
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
