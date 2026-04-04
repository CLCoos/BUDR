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

Schema is versioned under `supabase/migrations/` (organisations, `org_id` on residents, audit logs, daily plans, etc.). Apply migrations in Supabase for each environment.

Do **not** commit real project URLs or secrets; use environment variables only.

---

## Care Portal: demo vs live

| Route | Behaviour |
|--------|-----------|
| `/care-portal-demo` | **Simulated** data, dark portal shell (sidebar + top bar + mobile menu). Same navigation pattern as live; no staff session required. |
| `/care-portal-dashboard` (after login) | **Live** data from Supabase, scoped by staff `org_id`. |

**Demo routes** (all under `/care-portal-demo/…`): dashboard (tabs `journal` / `planner` / `alerts`), handover, residents, import, assistant, settings, indsatsdokumentation, tilsynsrapport, **vagtplan** (+ `/vagtplan/loen` for hours, vacation, estimated gross pay; shifts stored in `localStorage`), **beskeder** (internal + Lys-style mock threads). Shared clients (`HandoverClient`, `AssistantClient`, indsats/tilsyn) accept `carePortalDark` and demo `returnHref` where relevant.

**Dokumentsøgning** (`DokumentSøgning`): live top nav uses mock index → `resident-360-view`. In the demo, `linkTarget="demo"` sends results to `/care-portal-demo/residents?resident=…&tab=…` with a short on-page context panel. Search appears in the fixed demo top bar from `sm` and up, and in the **mobile sub-header** below `sm` so narrow phones still have search.

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

## Known gaps (non-exhaustive)

- Full **RLS** on all tables for staff/resident separation should mirror app-side `org_id` filtering.
- **AI** features may be partial or mocked in places — verify before clinical claims.
- **Lockout** and rate limits: combine client UX with server-side enforcement where security-critical.
