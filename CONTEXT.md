# BUDR – Project Context

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

### Journal (`journal_entries`) — kladde → godkendt (2026-04)

- **Columns (migrations):** `journal_status` (`kladde` | `godkendt`, default `godkendt`), `approved_at`, `approved_by`. Existing rows are backfilled as `godkendt`.
- **RLS:** `20260405100000_journal_entries_rls.sql` — authenticated **portal staff** (`care_is_portal_staff()` + `org_id` in JWT) may **SELECT / INSERT / UPDATE** only for rows whose `resident_id` matches a `care_residents` row in `care_visible_facility_ids()`. **DELETE** is not opened to the client. Routes using the **service role** bypass RLS (e.g. beboerbesked → `journal_entries`, some server reads).
- **App behaviour:** Staff can save a note as **kladde** or **godkendt** from `WriteJournalEntry` on `/resident-360-view/...`. Overblik lists drafts with **Godkend journal**. **OverrapportPanel** (vagtoverblik) and **staff-assistant** context only load **`journal_status = godkendt`**. Beboerbeskeder indsættes som godkendt med `approved_at`.
- **Resident 360 (live):** `/resident-360-view` and `/resident-360-view/[residentId]` use **`createServerSupabaseClient()`** (staff JWT). Data is filtered by **RLS**; ukendt `residentId` uden for org giver tom data → **404**.

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

**Dokumentsøgning** (`DokumentSøgning`): live top nav uses mock index → `resident-360-view`. In the demo, `linkTarget="demo"` sends results to `/care-portal-demo/residents?resident=…&tab=…` with a short on-page context panel. Search appears in the fixed demo top bar from `sm` and up, and in the **mobile sub-header** below `sm` so narrow phones still have search.

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
# AI keys as needed for features that call LLMs
```

---

## Quality gates

- `npm run build` — TypeScript check + ESLint (Prettier via ESLint). Build fails on TS errors; remaining ESLint issues are mostly **warnings** (some rules relaxed to `warn` so legacy code does not block deploy — tighten over time).
- `npm run type-check` — `tsc --noEmit` (Deno edge functions under `supabase/functions` are excluded in `tsconfig.json`).
- `npm run lint` / `npm run lint:fix` — full ESLint + Prettier.
- `npm test` — Vitest (`src/lib/staffOrgScope.test.ts`).

---

## Current product focus (short)

The team is driving toward a **complete care portal** on a short horizon: **one source of truth per resident**, **borger ↔ portal** visibility, **standardiserede hændelser**, **skabeloner pr. situation**, and **kladde → godkendt journal** (demo + live). Work is intentionally sequenced in **small vertical slices** (one finished flow at a time) to avoid many half-done features.

**Supabase CLI:** The repo root `.env.local` must be valid dotenv (every line `KEY=value`). A stray line without `=` breaks `supabase` commands. Run **`supabase db push`** after pulling new migrations; ensure **`supabase link`** project ref matches `NEXT_PUBLIC_SUPABASE_URL`.

---

## Known gaps (non-exhaustive)

- **RLS** on other tables (`care_residents`, `daily_plans`, …) still needs the same rigour as `journal_entries` where staff/resident separation matters.
- **Resident 360 server fetch** (service role) — align with org-scoped user client when ready.
- **AI** features may be partial or mocked in places — verify before clinical claims.
- **Lockout** and rate limits: combine client UX with server-side enforcement where security-critical.
