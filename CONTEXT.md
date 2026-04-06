# BUDR – Project Context

**Til AI/assistenter:** Læs denne fil først. Kort indgang: [`AGENTS.md`](./AGENTS.md).

**Sidst opdateret (manuelt):** 2026-04-06 — beskriver repo efter seneste marketing-, portal-, Lys-journal- og org-RLS-ændringer.

---

## Status snapshot (hvor projektet står)

- **Marketing / budrcare.dk:** `src/components/marketing/HomeLanding.tsx` + `src/app/budr-landing.css` — dansk copy (bl.a. CTA og sammenligning), **hero** med let baggrunds-indtoning og **to-trins overskrift** (borger → team); `src/app/page.tsx` med strammere `metadata` / Open Graph.
- **Dokumentsøgning:** `src/components/DokumentSøgning.tsx` — `?q=` i URL forudfylder feltet (Suspense omkring `useSearchParams`). **Live:** push til `/resident-360-view/[residentId]?tab=<overblik|medicin|dagsplan|plan|haven>` (+ valgfri `q`). **Demo:** `/care-portal-demo/residents/[id]?tab=…`; `ResidentsDemoGrid` læser også `q`.
- **Faglig støtte (Care Portal):** `src/lib/portalStaffAssistantFollowUps.ts` — strukturerede follow-ups med valgfri `searchQuery`, `resident360Id`, `residentTab`; `staffAssistantFollowUpHref()` bygger href inkl. dybe 360°-links. `POST /api/portal/staff-assistant` beriger kontekst med **`care_residents.user_id`** (til model-output). UI: `AssistantClient.tsx` (demo + live).
- **Lys — journal mod Supabase (live beboere):** `GET`/`POST` `src/app/api/park/resident-journal/route.ts` (service role + beboer-cookie), `src/lib/residentUuid.ts`, `src/lib/dataService.ts` (`shouldUseCloudJournal`, `saveJournalEntry`, `getJournalEntries`), `LysJournalTab.tsx` — kategori **Lys journal**; **kladde** vs **godkendt**. Badge-logik: `residentBadges.ts`, `residentBadgeSync.ts` (koblet til journal-/plan-forløb).
- **Haven / Lys-oplevelse:** `havenGamification.ts`, `havenCustomization.ts`, udvidet haven-UI (`HavenGardenScene` m.fl.), **Lys**-layouts/onboarding/chrome (`park-hub/layout.tsx`, `LysOnboarding`, `LysStatusChrome`, `useOnlineStatus`).
- **Analytics:** `AnalyticsGate.tsx`, `Ga4Scripts.tsx`, `src/lib/analyticsConsent.ts` / `analytics.ts` — GA4 kun når måling er tilladt; `NEXT_PUBLIC_GA_MEASUREMENT_ID` (valgfrit), `NEXT_PUBLIC_GA_BYPASS_CONSENT` til test.
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

**`care_concern_notes`:** Bekymringsnotater på live dashboard + 360° overblik (hurtige observationer, ikke journal-godkendelse). Migration: `20260411120000_care_concern_notes.sql`.

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
- **Still to harden:** `resident_plan_items` / `resident_badges` (Plan-fanen) har ikke RLS i denne migration; øvrige tabeller (notifikationer, osv.) kan tilsvarende strammes.

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
```

### Netlify (production)

In **Site configuration → Environment variables**, set at least the following for **Production** (and **Preview** if previews should talk to the real Supabase project):

| Variable | Notes |
|----------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Must match production project, e.g. `https://olszwyeikwbtjcoopfid.supabase.co`. |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Anon key from the same Supabase project (Settings → API). |
| `SUPABASE_SERVICE_ROLE_KEY` | **Service role** secret (same screen). **Server-only** — never prefix with `NEXT_PUBLIC_`. Required so cookie-based residents (`budr_resident_id`) can use **`/api/park/garden-plot`**, **`/api/park/daily-checkin`**, **`/api/park/resident-me`**, **`/api/park/resident-journal`**, **`/api/park/lys-plan-proposal`**, **`/api/park/message-staff`**, park-hub SSR, proposal approve/reject, and staff audit paths. If this is missing, the app falls back to the anon key and those routes often fail with RLS or empty writes. |
| `ANTHROPIC_API_KEY` | Påkrævet for **`/api/portal/staff-assistant`** (Faglig støtte i portalen). |
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
