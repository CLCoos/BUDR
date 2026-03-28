# BUDR – Project Context

## Overview

**BUDR** is a Danish gamified health and wellbeing app for residents in social psychiatric care facilities ("socialpsykiatriske bosteder"). It has two distinct interfaces:

1. **Borger-app (Resident App)** – Mobile-first interface for residents to track wellbeing using the PARK method
2. **Care Portal** – Staff dashboard for monitoring residents and managing shift handovers

The app is a Next.js 15 full-stack project with Supabase as backend, currently in prototype state with some mock data and placeholder AI integrations.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 15.1.11 (App Router) |
| Language | TypeScript 5 (strict mode) |
| React | React 19.0.3 |
| Styling | Tailwind CSS 3.4 + custom BUDR theme |
| Backend | Supabase (PostgreSQL + Edge Functions) |
| Auth | PIN (4-digit) + WebAuthn/biometric |
| Icons | Lucide React + Heroicons |
| Charts | Recharts |
| Toasts | Sonner |
| Edge Functions | Deno (TypeScript) |
| Deployment | Netlify |

---

## Directory Structure

```
budr-luksus/
├── src/
│   ├── app/
│   │   ├── login/[resident_id]/          # Resident PIN login
│   │   ├── park-hub/                     # Resident app (PARK features)
│   │   │   └── components/
│   │   │       ├── ParkHubClient.tsx     # Tab container
│   │   │       ├── DailyCheckin.tsx      # Mood + traffic light
│   │   │       ├── ThoughtCatcher.tsx    # CBT 5-step exercise
│   │   │       ├── GoalLadder.tsx        # Sequential goal steps
│   │   │       └── ResourceFlower.tsx    # 8-petal SVG assessment
│   │   ├── care-portal-dashboard/        # Staff overview
│   │   ├── resident-360-view/            # Individual resident profile
│   │   ├── handover-workspace/           # Shift handover editor
│   │   └── api/resident-session/         # Cookie session API route
│   ├── components/
│   │   ├── TopNav.tsx
│   │   ├── PortalSidebar.tsx
│   │   ├── ui/                           # AppLogo, AppIcon, AppImage
│   │   └── auth/                         # BiometricPrompt, PinSetupFlow
│   ├── lib/
│   │   └── residentAuth.ts               # Server actions for session
│   └── styles/
│       ├── tailwind.css                  # CSS variables + Tailwind base
│       └── index.css
├── supabase/
│   ├── migrations/
│   └── functions/
│       ├── resident-pin-verify/
│       ├── resident-pin-set/
│       ├── resident-session-validate/
│       ├── resident-webauthn-register/
│       └── resident-webauthn-verify/
├── middleware.ts                          # Auth guard for /park-hub
├── next.config.mjs                        # Redirects / → /care-portal-dashboard
├── tailwind.config.js
└── .env
```

---

## Features

### Resident App (`/park-hub`)

Four tabbed features under the PARK methodology:

1. **Daglig Check-in** – Mood slider (1–10), traffic light (grøn/gul/rød), optional note
2. **Tankefanger** – 5-step CBT exercise: situation → thought → emotion + intensity → AI counter-thought → new intensity
3. **Mål (Goal Ladder)** – Sequential goal steps; must complete each step in order
4. **Ressourceblomst** – Interactive SVG flower with 8 life-domain petals scored 1–5

### Care Portal

- **Dashboard** (`/care-portal-dashboard`) – KPI cards, active alerts, searchable/filterable resident list with traffic light status
- **Beboer 360** (`/resident-360-view`) – Tabbed profile: overview, PARK data, goals, medications, shift notes
- **Vagtoverleveringsrum** (`/handover-workspace`) – Per-resident note editor with flag colors (grøn/gul/rød/sort), shift selector (dag/aften/nat), progress tracker, export to `.txt`

---

## Authentication

### Residents
- 4-digit numeric PIN, validated via Supabase edge function using `pgcrypto`
- Optional WebAuthn/biometric (stored credential in localStorage)
- Session: HttpOnly cookie `budr_resident_session`, 12-hour expiry
- Lockout: 5 failed attempts → 60-second lockout

### Staff
- Supabase JWT authentication (Supabase Auth)
- Staff can set/reset resident PINs via `resident-pin-set` edge function

### Middleware
- `middleware.ts` protects `/park-hub` routes
- Validates session token against `resident-session-validate` edge function
- Redirects unauthenticated to `/login/unknown?redirect=[path]`

---

## Data Flow

```
Server Component (page.tsx)
  → fetches initial data from Supabase
  → passes as props to Client Component

Client Component
  → manages local UI state (useState)
  → calls Supabase edge functions for mutations
  → shows toast feedback via Sonner
```

No global state library. No Redux/Zustand. Server/client split follows Next.js App Router conventions.

---

## Database (Supabase)

**Project URL:** `https://olszwyeikwbtjcoopfid.supabase.co`

Key tables (inferred from code — schema not in migrations):

| Table | Purpose |
|---|---|
| `care_residents` | Resident profiles (display_name, user_id, onboarding_data) |
| `resident_sessions` | Active sessions (token, expires_at) |
| `park_daily_checkin` | Daily mood + traffic light + note |
| `park_thought_catch` | CBT thought-catcher entries |
| `park_goal_steps` | Goal ladder step tracking |
| `park_resource_profile` | Resource flower scores |
| `care_handover_notes` | Shift notes with flag color |
| `care_portal_notifications` | Alerts (inaktivitet, lav_stemning, krise) |

Database RPC functions:
- `set_resident_pin(resident_id, pin)` – hashes and stores PIN
- `verify_resident_pin(resident_id, pin)` – validates PIN with pgcrypto

---

## Theme & Styling

Custom BUDR color palette in Tailwind:

```js
budr: {
  lavender:     '#F5F4FF',
  purple:       '#7F77DD',
  'purple-dark':'#5E56C0',
  navy:         '#0F1B2D',
  teal:         '#1D9E75',
  'teal-light': '#E6F7F2',
  groen:        '#22C55E',
  gul:          '#EAB308',
  roed:         '#EF4444',
}
```

Fonts: **DM Sans** (UI) + **IBM Plex Mono** (code/data)

Path alias: `@/*` → `src/*`

---

## Environment Variables

```env
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
OPENAI_API_KEY=          # AI counter-thought generation (not yet implemented)
ANTHROPIC_API_KEY=       # Alternative AI provider
NEXT_PUBLIC_SITE_URL=
```

---

## Known Limitations / TODOs

- Migration file is empty — database schema is managed in Supabase dashboard, not version-controlled
- Most PARK components use mock/hardcoded data instead of live DB queries
- AI counter-thought generation is mocked (no real LLM call yet)
- Staff portal lacks full auth protection (no middleware for `/care-portal-dashboard`)
- No test suite
- Lockout enforcement is client-side only (not server-side)
